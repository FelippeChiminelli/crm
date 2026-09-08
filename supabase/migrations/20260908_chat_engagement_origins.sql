-- Estágio do Atendimento: filtro por origem do lead
--
-- Acrescenta p_origins às três funções e devolve, no resumo, quantas conversas
-- ficaram de fora por não terem lead vinculado (origem é atributo do lead, então
-- conversa sem lead nunca casa com nenhuma origem).
--
-- As grafias equivalentes ("WhatsApp" / "whatsapp") são agrupadas no front, que
-- envia todas as variantes brutas em p_origins. Assim a comparação aqui continua
-- sendo igualdade simples e aproveita índice, sem lower() sobre a coluna.
--
-- DROP antes de CREATE porque tanto a assinatura quanto o retorno mudam, e
-- CREATE OR REPLACE criaria sobrecargas em vez de substituir.

drop function if exists public.get_chat_engagement_summary(date, date, uuid[], integer);
drop function if exists public.get_chat_engagement_conversations(date, date, text, uuid[], integer, integer, integer);
drop function if exists public._chat_engagement_classified(uuid, date, date, uuid[], integer);

-- Classificação interna. Não é exposta na API: recebe empresa_id já resolvido
-- pelas funções públicas, que o derivam de auth.uid().
create or replace function public._chat_engagement_classified(
  p_empresa_id uuid,
  p_start date,
  p_end date,
  p_instances uuid[],
  p_inactive_hours integer,
  p_origins text[] default null
)
returns table (
  conversation_id uuid,
  category text,
  msgs_loja bigint,
  msgs_cliente bigint,
  last_message_at timestamptz,
  idle_hours numeric
)
language sql
stable
set search_path to 'public'
as $function$
  with conv as (
    select c.id
    from public.chat_conversations c
    where c.empresa_id = p_empresa_id
      and c.created_at >= p_start::timestamp
      and c.created_at < (p_end + 1)::timestamp
      and (p_instances is null or c.instance_id = any (p_instances))
      -- exists em vez de join: conversa sem lead cai fora naturalmente
      and (
        p_origins is null
        or exists (
          select 1
          from public.leads l
          where l.id = c.lead_id
            and l.origin = any (p_origins)
        )
      )
  ),
  agg as (
    -- Agregados condicionais em vez de ORDER BY: permite Index Only Scan
    -- puro sobre idx_messages_direction (conversation_id, direction, timestamp).
    select
      m.conversation_id as conv_id,
      count(*) filter (where m.direction = 'inbound') as loja,
      count(*) filter (where m.direction = 'outbound') as cliente,
      max(m.timestamp) filter (where m.direction = 'inbound') as ultima_loja,
      max(m.timestamp) filter (where m.direction = 'outbound') as ultima_cliente
    from public.chat_messages m
    join conv on conv.id = m.conversation_id
    group by m.conversation_id
  )
  select
    a.conv_id,
    case
      when a.loja = 0 then 'nao_respondido'
      when a.cliente = 0 then 'sem_resposta_cliente'
      when greatest(a.ultima_loja, a.ultima_cliente) >= now() - make_interval(hours => p_inactive_hours)
        then 'em_conversa'
      when a.ultima_cliente > a.ultima_loja then 'aguardando_loja'
      else 'cliente_parou'
    end,
    a.loja,
    a.cliente,
    greatest(a.ultima_loja, a.ultima_cliente),
    round(extract(epoch from (now() - greatest(a.ultima_loja, a.ultima_cliente))) / 3600.0, 2)
  from agg a
$function$;

create or replace function public.get_chat_engagement_summary(
  p_start date,
  p_end date,
  p_instances uuid[] default null,
  p_inactive_hours integer default 24,
  p_origins text[] default null
)
returns table (
  category text,
  conversations bigint,
  stale_conversations bigint,
  percentage numeric,
  avg_idle_hours numeric,
  excluded_no_lead bigint
)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_empresa_id uuid;
  v_excluded bigint := 0;
begin
  select p.empresa_id into v_empresa_id
  from public.profiles p
  where p.uuid = auth.uid();

  if v_empresa_id is null then
    raise exception 'Usuario sem empresa vinculada';
  end if;

  if not public.has_analytics_permission(auth.uid()) then
    raise exception 'Usuario sem permissao de analytics';
  end if;

  -- Só custa a varredura extra quando o filtro está ativo. Conta apenas
  -- conversas com mensagem, para bater com o universo dos cartões.
  if p_origins is not null then
    select count(*) into v_excluded
    from public.chat_conversations c
    where c.empresa_id = v_empresa_id
      and c.created_at >= p_start::timestamp
      and c.created_at < (p_end + 1)::timestamp
      and (p_instances is null or c.instance_id = any (p_instances))
      and c.lead_id is null
      and exists (
        select 1 from public.chat_messages m where m.conversation_id = c.id
      );
  end if;

  return query
  select
    b.category,
    count(*)::bigint,
    count(*) filter (where b.idle_hours > p_inactive_hours)::bigint,
    round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1),
    round(avg(b.idle_hours), 1),
    v_excluded
  from public._chat_engagement_classified(
    v_empresa_id, p_start, p_end, p_instances, p_inactive_hours, p_origins
  ) b
  group by b.category;
end;
$function$;

create or replace function public.get_chat_engagement_conversations(
  p_start date,
  p_end date,
  p_category text,
  p_instances uuid[] default null,
  p_inactive_hours integer default 24,
  p_limit integer default 50,
  p_offset integer default 0,
  p_origins text[] default null
)
returns table (
  conversation_id uuid,
  lead_id uuid,
  lead_name text,
  contact_name text,
  phone text,
  instance_name text,
  responsible_name text,
  msgs_loja bigint,
  msgs_cliente bigint,
  last_message_at timestamptz,
  idle_hours numeric,
  total_count bigint
)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_empresa_id uuid;
begin
  select p.empresa_id into v_empresa_id
  from public.profiles p
  where p.uuid = auth.uid();

  if v_empresa_id is null then
    raise exception 'Usuario sem empresa vinculada';
  end if;

  if not public.has_analytics_permission(auth.uid()) then
    raise exception 'Usuario sem permissao de analytics';
  end if;

  return query
  select
    b.conversation_id,
    c.lead_id,
    l.name,
    c."Nome_Whatsapp",
    c.fone,
    coalesce(wi.display_name, wi.name, wc.verified_name, c.nome_instancia),
    pr.full_name,
    b.msgs_loja,
    b.msgs_cliente,
    b.last_message_at,
    b.idle_hours,
    count(*) over ()
  from public._chat_engagement_classified(
    v_empresa_id, p_start, p_end, p_instances, p_inactive_hours, p_origins
  ) b
  join public.chat_conversations c on c.id = b.conversation_id
  left join public.leads l on l.id = c.lead_id
  -- instance_id é polimórfico: aponta para whatsapp_instances ou waba_config
  left join public.whatsapp_instances wi on wi.id = c.instance_id
  left join public.waba_config wc on wc.id = c.instance_id
  left join public.profiles pr on pr.uuid = c.assigned_user_id
  where b.category = p_category
  order by b.last_message_at asc
  limit least(coalesce(p_limit, 50), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;
