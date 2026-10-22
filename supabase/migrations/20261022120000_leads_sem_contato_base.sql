-- =============================================================================
-- Leads sem contato: regra única compartilhada entre o relatório do n8n
-- (report_leads_parados) e a tela do CRM (get_leads_sem_contato).
--
-- _leads_sem_contato devolve os leads abertos cujo último contato real
-- (qualquer mensagem de WhatsApp, em qualquer direção) — ou a criação, se nunca
-- houve mensagem — está entre p_limite_antigo e p_corte.
--
-- report_leads_parados passa a usá-la e ganha links para a lista completa:
--   * link_lista (geral) e por_vendedor[].link_lista (filtrado pelo vendedor).
-- Demais chaves do JSON continuam iguais.
-- =============================================================================

create or replace function public._leads_sem_contato(
  p_empresa_id uuid,
  p_corte timestamptz,
  p_limite_antigo timestamptz default null,
  p_responsavel uuid default null,
  p_somente_sem_responsavel boolean default false
) returns table (
  lead_id uuid,
  nome text,
  telefone text,
  responsavel_id uuid,
  pipeline_id uuid,
  stage_id uuid,
  ultimo_contato timestamptz,
  referencia timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  -- Plano genérico: abertos só filtra por empresa/responsável (índice por
  -- empresa) e o último contato lê 1 mensagem por conversa.
  return query
  with abertos as materialized (
    select l.id, l.name, l.phone, l.responsible_uuid, l.pipeline_id, l.stage_id, l.created_at
    from public.leads l
    where l.empresa_id = p_empresa_id
      and coalesce(l.status, '') not in ('perdido', 'venda_confirmada')
      and l.lost_at is null
      and l.sold_at is null
      and (p_responsavel is null or l.responsible_uuid = p_responsavel)
      and (not coalesce(p_somente_sem_responsavel, false) or l.responsible_uuid is null)
  ),
  contato as materialized (
    select a.*,
           (select max(ult.ts)
              from public.chat_conversations c
              cross join lateral (
                select m."timestamp" as ts
                from public.chat_messages m
                where m.conversation_id = c.id
                order by m."timestamp" desc
                limit 1
              ) ult
             where c.lead_id = a.id) as ultimo
    from abertos a
    where a.created_at < p_corte
  )
  select ct.id, ct.name, ct.phone, ct.responsible_uuid, ct.pipeline_id, ct.stage_id,
         ct.ultimo, coalesce(ct.ultimo, ct.created_at)
  from contato ct
  where coalesce(ct.ultimo, ct.created_at) < p_corte
    and (p_limite_antigo is null or coalesce(ct.ultimo, ct.created_at) >= p_limite_antigo);
end;
$$;

revoke execute on function public._leads_sem_contato(uuid, timestamptz, timestamptz, uuid, boolean)
  from public, anon, authenticated;


create or replace function public.report_leads_parados(
  p_empresa_id uuid,
  p_dias_parado integer,
  p_max_dias_parado integer default null,
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
  v_corte timestamptz;
  v_limite_antigo timestamptz;
  v_url text := nullif(rtrim(trim(p_app_url), '/'), '');
  v_lista text;
  v_result jsonb;
begin
  if p_empresa_id is null or p_dias_parado is null or p_dias_parado < 1 then
    return jsonb_build_object('error', true, 'message', 'p_empresa_id e p_dias_parado (>= 1) são obrigatórios');
  end if;

  v_corte := now() - make_interval(days => p_dias_parado);
  v_limite_antigo := case when p_max_dias_parado is not null
                          then now() - make_interval(days => p_max_dias_parado) end;
  v_lista := case when v_url is not null
                  then v_url || '/leads/sem-contato?dias=' || p_dias_parado
                       || coalesce('&max=' || p_max_dias_parado, '') end;

  with parados as (
    select s.*,
           floor(extract(epoch from (now() - s.referencia)) / 86400)::int as dias,
           row_number() over (partition by s.responsavel_id order by s.referencia) as rn
    from public._leads_sem_contato(p_empresa_id, v_corte, v_limite_antigo) s
  ),
  por_vendedor as (
    select p.responsavel_id,
           coalesce(nullif(trim(pr.full_name), ''), 'Sem responsável') as vendedor,
           count(*) as total,
           max(p.dias) as maior,
           jsonb_agg(
             jsonb_build_object(
               'lead_id', p.lead_id,
               'nome', coalesce(nullif(trim(p.nome), ''), 'Sem nome'),
               'telefone', p.telefone,
               'pipeline', pl.name,
               'etapa', st.name,
               'ultimo_contato', to_char(p.ultimo_contato at time zone v_tz, 'DD/MM/YYYY HH24:MI'),
               'nunca_contatado', p.ultimo_contato is null,
               'dias_parado', p.dias,
               'link', case when v_url is not null then v_url || '/leads/' || p.lead_id end
             ) order by p.referencia
           ) filter (where p.rn <= coalesce(p_limite_por_vendedor, 20)) as leads
    from parados p
    left join public.profiles pr on pr.uuid = p.responsavel_id
    left join public.pipelines pl on pl.id = p.pipeline_id
    left join public.stages st on st.id = p.stage_id
    group by p.responsavel_id, pr.full_name
  )
  select jsonb_build_object(
    'gerado_em', to_char(now() at time zone v_tz, 'YYYY-MM-DD HH24:MI'),
    'parametros', jsonb_build_object(
      'dias_parado', p_dias_parado,
      'max_dias_parado', p_max_dias_parado,
      'limite_por_vendedor', p_limite_por_vendedor
    ),
    'total', coalesce((select sum(total) from por_vendedor), 0),
    'link_lista', v_lista,
    'por_vendedor', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'vendedor_id', v.responsavel_id,
          'vendedor', v.vendedor,
          'total', v.total,
          'maior_tempo_parado_dias', v.maior,
          'link_lista', v_lista || '&vendedor=' || coalesce(v.responsavel_id::text, 'sem'),
          'leads', coalesce(v.leads, '[]'::jsonb)
        ) order by v.total desc
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

revoke execute on function public.report_leads_parados(uuid, integer, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.report_leads_parados(uuid, integer, integer, integer, text)
  to service_role;
