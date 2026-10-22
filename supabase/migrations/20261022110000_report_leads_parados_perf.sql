-- =============================================================================
-- Leads parados: corrige statement timeout (57014) na chamada via PostgREST.
--
-- Dentro da função o plano é genérico (parâmetros desconhecidos) e o filtro
-- created_at < v_corte fazia o Postgres varrer o índice de created_at de TODAS
-- as empresas. Além disso a última mensagem era recalculada até 3x por lead,
-- lendo todas as mensagens da conversa.
--
-- Agora:
--   * abertos é materializado só com o filtro da empresa (índice por empresa);
--   * ultimo_contato é calculado uma única vez por lead, pegando só a mensagem
--     mais recente de cada conversa (idx_messages_conversation_timestamp).
-- Mesma assinatura, mesma regra (contato real) e mesmo JSON.
-- =============================================================================

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
  v_result jsonb;
begin
  if p_empresa_id is null or p_dias_parado is null or p_dias_parado < 1 then
    return jsonb_build_object('error', true, 'message', 'p_empresa_id e p_dias_parado (>= 1) são obrigatórios');
  end if;

  v_corte := now() - make_interval(days => p_dias_parado);
  v_limite_antigo := case when p_max_dias_parado is not null
                          then now() - make_interval(days => p_max_dias_parado) end;

  with abertos as materialized (
    select l.id, l.name, l.phone, l.responsible_uuid, l.pipeline_id, l.stage_id, l.created_at
    from public.leads l
    where l.empresa_id = p_empresa_id
      and coalesce(l.status, '') not in ('perdido', 'venda_confirmada')
      and l.lost_at is null
      and l.sold_at is null
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
             where c.lead_id = a.id) as ultimo_contato
    from abertos a
    where a.created_at < v_corte
  ),
  parados as (
    select ct.*,
           coalesce(ct.ultimo_contato, ct.created_at) as referencia,
           floor(extract(epoch from (now() - coalesce(ct.ultimo_contato, ct.created_at))) / 86400)::int as dias,
           row_number() over (
             partition by ct.responsible_uuid
             order by coalesce(ct.ultimo_contato, ct.created_at)
           ) as rn
    from contato ct
    where coalesce(ct.ultimo_contato, ct.created_at) < v_corte
      and (v_limite_antigo is null or coalesce(ct.ultimo_contato, ct.created_at) >= v_limite_antigo)
  ),
  por_vendedor as (
    select p.responsible_uuid,
           coalesce(nullif(trim(pr.full_name), ''), 'Sem responsável') as vendedor,
           count(*) as total,
           max(p.dias) as maior,
           jsonb_agg(
             jsonb_build_object(
               'lead_id', p.id,
               'nome', coalesce(nullif(trim(p.name), ''), 'Sem nome'),
               'telefone', p.phone,
               'pipeline', pl.name,
               'etapa', st.name,
               'ultimo_contato', to_char(p.ultimo_contato at time zone v_tz, 'DD/MM/YYYY HH24:MI'),
               'nunca_contatado', p.ultimo_contato is null,
               'dias_parado', p.dias,
               'link', case when v_url is not null then v_url || '/leads/' || p.id end
             ) order by p.referencia
           ) filter (where p.rn <= coalesce(p_limite_por_vendedor, 20)) as leads
    from parados p
    left join public.profiles pr on pr.uuid = p.responsible_uuid
    left join public.pipelines pl on pl.id = p.pipeline_id
    left join public.stages st on st.id = p.stage_id
    group by p.responsible_uuid, pr.full_name
  )
  select jsonb_build_object(
    'gerado_em', to_char(now() at time zone v_tz, 'YYYY-MM-DD HH24:MI'),
    'parametros', jsonb_build_object(
      'dias_parado', p_dias_parado,
      'max_dias_parado', p_max_dias_parado,
      'limite_por_vendedor', p_limite_por_vendedor
    ),
    'total', coalesce((select sum(total) from por_vendedor), 0),
    'por_vendedor', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'vendedor_id', v.responsible_uuid,
          'vendedor', v.vendedor,
          'total', v.total,
          'maior_tempo_parado_dias', v.maior,
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
