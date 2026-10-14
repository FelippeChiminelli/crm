-- Evolução de Meta Ads agrupada por dia, semana ou mês no próprio banco.
-- Somar dias no front contaria duas vezes o lead que clicou em dias diferentes.
-- Linhas com campaign_id nulo trazem o total de leads distintos do período.

drop function if exists public.get_meta_ads_timeline(date, date, text[], text[], text[], text[]);

create or replace function public.get_meta_ads_timeline(
  p_start date, p_end date,
  p_platforms text[] default null, p_campaign_ids text[] default null,
  p_adset_ids text[] default null, p_ad_ids text[] default null,
  p_granularity text default 'day'
)
returns table(day date, campaign_id text, campaign_name text, leads bigint)
language plpgsql stable security definer
set search_path to 'public'
as $$
#variable_conflict use_column
declare
  v_empresa_id uuid := public._meta_ads_current_empresa();
begin
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'Granularidade invalida: %', p_granularity;
  end if;

  return query
  select t.bucket, t.campaign_key, max(t.campaign_name), count(distinct t.lead_id)::bigint
  from (
    select
      date_trunc(p_granularity, b.clicked_at at time zone 'America/Sao_Paulo')::date bucket,
      b.campaign_key, b.campaign_name, b.lead_id
    from public._meta_ads_filtered(
      v_empresa_id, p_start, p_end, p_platforms, p_campaign_ids, p_adset_ids, p_ad_ids) b
  ) t
  group by grouping sets ((t.bucket, t.campaign_key), (t.bucket))
  order by 1, 2 nulls first;
end;
$$;

revoke execute on function public.get_meta_ads_timeline(date, date, text[], text[], text[], text[], text) from public, anon;
grant execute on function public.get_meta_ads_timeline(date, date, text[], text[], text[], text[], text) to authenticated;
