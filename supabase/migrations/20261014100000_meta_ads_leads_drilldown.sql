-- Drill-down dos KPIs de Meta Ads: lista paginada de leads (ou cliques) do recorte.
-- Categorias: leads, open, sales, losses (uma linha por lead, com o último clique)
-- e clicks (uma linha por clique).

create or replace function public.get_meta_ads_leads(
  p_start date, p_end date,
  p_platforms text[] default null, p_campaign_ids text[] default null,
  p_adset_ids text[] default null, p_ad_ids text[] default null,
  p_category text default 'leads',
  p_limit integer default 50, p_offset integer default 0
)
returns table(
  lead_id uuid, lead_name text, phone text, lead_status text, responsible_name text,
  sold_value numeric, sold_at timestamptz, lost_at timestamptz, loss_reason text,
  clicked_at timestamptz, clicks bigint,
  campaign_name text, adset_name text, ad_name text, platform text,
  total_count bigint
)
language plpgsql stable security definer
set search_path to 'public'
as $$
#variable_conflict use_column
declare
  v_empresa_id uuid := public._meta_ads_current_empresa();
begin
  if p_category not in ('leads', 'open', 'sales', 'losses', 'clicks') then
    raise exception 'Categoria invalida: %', p_category;
  end if;

  return query
  with base as (
    select * from public._meta_ads_filtered(
      v_empresa_id, p_start, p_end, p_platforms, p_campaign_ids, p_adset_ids, p_ad_ids)
  ),
  click_counts as (
    select b.lead_id, count(*) clicks from base b group by b.lead_id
  ),
  -- Para listas por lead, o último clique representa a origem exibida
  rows_by_category as (
    select b.*, 1::bigint clicks from base b
    where p_category = 'clicks'
    union all
    select last_click.*, cc.clicks
    from (
      select distinct on (b.lead_id) b.* from base b
      order by b.lead_id, b.clicked_at desc
    ) last_click
    join click_counts cc on cc.lead_id = last_click.lead_id
    where p_category <> 'clicks'
      and (
        p_category = 'leads'
        or (p_category = 'sales' and last_click.lead_status = 'venda_confirmada')
        or (p_category = 'losses' and last_click.lead_status = 'perdido')
        or (p_category = 'open' and last_click.lead_status not in ('venda_confirmada', 'perdido'))
      )
  )
  select
    r.lead_id, l.name, l.phone, l.status, p.full_name,
    l.sold_value, l.sold_at, l.lost_at,
    coalesce(lr.name::text, l.loss_reason_category),
    r.clicked_at, r.clicks,
    r.campaign_name, r.adset_name, r.ad_name, r.platform,
    count(*) over ()
  from rows_by_category r
  join public.leads l on l.id = r.lead_id
  left join public.profiles p on p.uuid = l.responsible_uuid
  left join public.loss_reasons lr on lr.id::text = l.loss_reason_category
  order by
    case when p_category = 'sales' then l.sold_at end desc nulls last,
    case when p_category = 'losses' then l.lost_at end desc nulls last,
    r.clicked_at desc
  limit p_limit offset p_offset;
end;
$$;

revoke execute on function public.get_meta_ads_leads(date, date, text[], text[], text[], text[], text, integer, integer) from public, anon;
grant execute on function public.get_meta_ads_leads(date, date, text[], text[], text[], text[], text, integer, integer) to authenticated;
