-- =============================================================================
-- Relatório: SLA de resposta por vendedor (clientes aguardando resposta agora).
--
-- Chamada: POST /rest/v1/rpc/report_sla_vendedores (chave service_role)
--   { "p_empresa_id": "...", "p_minutos_limite": 30,
--     "p_hora_abertura": "08:00", "p_hora_fechamento": "18:00",
--     "p_max_dias_espera": 7, "p_limite_por_vendedor": 20, "p_app_url": "https://app..." }
--
-- Aguardando = a última mensagem da conversa é do cliente (outbound) e a loja
-- (inbound) não respondeu depois. A espera começa na primeira mensagem do cliente
-- após a última resposta da loja (mesma regra de _chat_response_waits) e conta só
-- minutos dentro do horário comercial. Só conversas com lead aberto e esperas
-- iniciadas dentro de p_max_dias_espera (mais antigas = conversa abandonada).
-- =============================================================================

create or replace function public._minutos_uteis(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_abertura time,
  p_fechamento time
) returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(greatest(0, extract(epoch from (
           least(p_fim, (d::date + p_fechamento) at time zone 'America/Sao_Paulo')
           - greatest(p_inicio, (d::date + p_abertura) at time zone 'America/Sao_Paulo')
         )) / 60.0)), 0)
  from generate_series(
    (p_inicio at time zone 'America/Sao_Paulo')::date,
    (p_fim at time zone 'America/Sao_Paulo')::date,
    interval '1 day'
  ) as d
  where p_fim > p_inicio
$$;

create or replace function public.report_sla_vendedores(
  p_empresa_id uuid,
  p_minutos_limite integer,
  p_hora_abertura time default '08:00',
  p_hora_fechamento time default '18:00',
  p_max_dias_espera integer default 7,
  p_limite_por_vendedor integer default 20,
  p_app_url text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_url text := nullif(rtrim(trim(p_app_url), '/'), '');
  v_result jsonb;
begin
  if p_empresa_id is null or p_minutos_limite is null or p_minutos_limite < 1 then
    return jsonb_build_object('error', true, 'message', 'p_empresa_id e p_minutos_limite (>= 1) são obrigatórios');
  end if;
  if p_hora_abertura >= p_hora_fechamento then
    return jsonb_build_object('error', true, 'message', 'p_hora_abertura deve ser menor que p_hora_fechamento');
  end if;

  -- chat_conversations.last_message_at não é mantido; a janela vem das mensagens.
  with recentes as (
    select distinct m.conversation_id
    from public.chat_messages m
    where m.empresa_id = p_empresa_id
      and m."timestamp" >= now() - make_interval(days => coalesce(p_max_dias_espera, 7))
  ),
  conversas as (
    select c.id as conversation_id, c.instance_id,
           coalesce(l.responsible_uuid, c.assigned_user_id) as vendedor_id,
           l.id as lead_id, l.name, coalesce(nullif(trim(c.fone), ''), l.phone) as telefone
    from recentes rc
    join public.chat_conversations c on c.id = rc.conversation_id
    join public.leads l on l.id = c.lead_id
    where c.empresa_id = p_empresa_id
      and coalesce(l.status, '') not in ('perdido', 'venda_confirmada')
      and l.lost_at is null
      and l.sold_at is null
  ),
  esperas as (
    select cv.*, w.aguardando_desde, u.conteudo as ultima_mensagem
    from conversas cv
    cross join lateral (
      select min(m."timestamp") as aguardando_desde
      from public.chat_messages m
      where m.conversation_id = cv.conversation_id
        and m.direction = 'outbound'
        and m."timestamp" > coalesce((
              select max(r."timestamp") from public.chat_messages r
              where r.conversation_id = cv.conversation_id and r.direction = 'inbound'
            ), '-infinity'::timestamptz)
    ) w
    cross join lateral (
      select left(nullif(trim(m.content), ''), 120) as conteudo
      from public.chat_messages m
      where m.conversation_id = cv.conversation_id and m.direction = 'outbound'
      order by m."timestamp" desc
      limit 1
    ) u
    where w.aguardando_desde >= now() - make_interval(days => coalesce(p_max_dias_espera, 7))
  ),
  atrasadas as (
    select e.*,
           round(public._minutos_uteis(e.aguardando_desde, now(), p_hora_abertura, p_hora_fechamento))::int as minutos
    from esperas e
  ),
  estourados as (
    select a.*, row_number() over (partition by a.vendedor_id order by a.minutos desc) as rn
    from atrasadas a
    where a.minutos >= p_minutos_limite
  ),
  por_vendedor as (
    select e.vendedor_id,
           coalesce(nullif(trim(pr.full_name), ''), 'Sem responsável') as vendedor,
           count(*) as total,
           max(e.minutos) as maior,
           round(avg(e.minutos))::int as media,
           jsonb_agg(
             jsonb_build_object(
               'lead_id', e.lead_id,
               'nome', coalesce(nullif(trim(e.name), ''), 'Sem nome'),
               'telefone', e.telefone,
               'instancia', coalesce(nullif(trim(wi.display_name), ''), wi.name),
               'aguardando_desde', to_char(e.aguardando_desde at time zone v_tz, 'DD/MM/YYYY HH24:MI'),
               'minutos_esperando', e.minutos,
               'ultima_mensagem', e.ultima_mensagem,
               'link', case when v_url is not null then v_url || '/chat?conversation=' || e.conversation_id end
             ) order by e.minutos desc
           ) filter (where e.rn <= coalesce(p_limite_por_vendedor, 20)) as conversas
    from estourados e
    left join public.profiles pr on pr.uuid = e.vendedor_id
    left join public.whatsapp_instances wi on wi.id = e.instance_id
    group by e.vendedor_id, pr.full_name
  )
  select jsonb_build_object(
    'gerado_em', to_char(now() at time zone v_tz, 'YYYY-MM-DD HH24:MI'),
    'parametros', jsonb_build_object(
      'minutos_limite', p_minutos_limite,
      'hora_abertura', to_char(p_hora_abertura, 'HH24:MI'),
      'hora_fechamento', to_char(p_hora_fechamento, 'HH24:MI'),
      'max_dias_espera', p_max_dias_espera,
      'limite_por_vendedor', p_limite_por_vendedor
    ),
    'total_aguardando', coalesce((select sum(total) from por_vendedor), 0),
    'maior_espera_minutos', coalesce((select max(maior) from por_vendedor), 0),
    'por_vendedor', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'vendedor_id', v.vendedor_id,
          'vendedor', v.vendedor,
          'total', v.total,
          'maior_espera_minutos', v.maior,
          'media_espera_minutos', v.media,
          'conversas', coalesce(v.conversas, '[]'::jsonb)
        ) order by v.total desc, v.maior desc
      )
      from por_vendedor v
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;

exception
  when others then
    return jsonb_build_object('error', true, 'message', sqlerrm);
end;
$$;

revoke execute on function public._minutos_uteis(timestamptz, timestamptz, time, time)
  from public, anon, authenticated;
revoke execute on function public.report_sla_vendedores(uuid, integer, time, time, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.report_sla_vendedores(uuid, integer, time, time, integer, integer, text)
  to service_role;
