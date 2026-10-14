-- Analytics de Meta Ads: agregações por campanha > conjunto > anúncio e plataforma.
-- Datas cortadas no fuso America/Sao_Paulo (o banco roda em UTC).

-- Base filtrada de cliques com o resultado atual do lead. Recebe o empresa_id
-- como parâmetro, por isso não fica exposta aos clientes.
create or replace function public._meta_ads_filtered(
  p_empresa_id uuid, p_start date, p_end date,
  p_platforms text[], p_campaign_ids text[], p_adset_ids text[], p_ad_ids text[]
)
returns table(
  lead_id uuid, clicked_at timestamptz, platform text,
  campaign_key text, campaign_name text, adset_key text, adset_name text,
  ad_key text, ad_name text, thumbnail_url text, title_ads text, body_ads text,
  lead_status text, sold_value numeric
)
language sql stable
set search_path to 'public'
as $$
  select * from (
    select
      m.lead_id,
      m.created_at,
      coalesce(m.source_app, 'desconhecido'),
      -- A integração ainda grava o ID da campanha na coluna legada "campaing-id"
      coalesce(m.id_campaign, m."campaing-id", m.name_campaign, '(sem identificação)'),
      coalesce(m.name_campaign, m.id_campaign, m."campaing-id", '(sem identificação)'),
      coalesce(m.id_conjunto_anuncio, m.name_conjunto_anuncio, '(sem identificação)'),
      coalesce(m.name_conjunto_anuncio, m.id_conjunto_anuncio, '(sem identificação)'),
      coalesce(m.source_id, m.name_ads, '(sem identificação)'),
      coalesce(m.name_ads, m.title_ads, m.source_id, '(sem identificação)'),
      m.thumbnail_url, m.title_ads, m.body_ads,
      l.status, l.sold_value
    from public.meta_ads m
    join public.leads l on l.id = m.lead_id and l.empresa_id = m.empresa_id
    where m.empresa_id = p_empresa_id
      and m.created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
      and m.created_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
  ) f(lead_id, clicked_at, platform, campaign_key, campaign_name, adset_key, adset_name,
      ad_key, ad_name, thumbnail_url, title_ads, body_ads, lead_status, sold_value)
  where (p_platforms is null or f.platform = any (p_platforms))
    and (p_campaign_ids is null or f.campaign_key = any (p_campaign_ids))
    and (p_adset_ids is null or f.adset_key = any (p_adset_ids))
    and (p_ad_ids is null or f.ad_key = any (p_ad_ids));
$$;

revoke execute on function public._meta_ads_filtered(uuid, date, date, text[], text[], text[], text[])
  from public, anon, authenticated;

create or replace function public._meta_ads_current_empresa()
returns uuid
language plpgsql stable security definer
set search_path to 'public'
as $$
declare
  v_empresa_id uuid;
begin
  select p.empresa_id into v_empresa_id from public.profiles p where p.uuid = auth.uid();

  if v_empresa_id is null then
    raise exception 'Usuario sem empresa vinculada';
  end if;

  if not public.has_analytics_permission(auth.uid()) then
    raise exception 'Usuario sem permissao de analytics';
  end if;

  return v_empresa_id;
end;
$$;

revoke execute on function public._meta_ads_current_empresa() from public, anon;
grant execute on function public._meta_ads_current_empresa() to authenticated;

-- Níveis retornados: total, campaign, adset, ad e platform.
create or replace function public.get_meta_ads_summary(
  p_start date, p_end date,
  p_platforms text[] default null, p_campaign_ids text[] default null,
  p_adset_ids text[] default null, p_ad_ids text[] default null
)
returns table(
  level text, campaign_id text, campaign_name text, adset_id text, adset_name text,
  ad_id text, ad_name text, platform text,
  clicks bigint, leads bigint, sales bigint, revenue numeric, losses bigint, open_leads bigint,
  conversion_rate numeric, thumbnail_url text, title_ads text, body_ads text
)
language plpgsql stable security definer
set search_path to 'public'
as $$
#variable_conflict use_column
declare
  v_empresa_id uuid := public._meta_ads_current_empresa();
begin
  return query
  with base as (
    select * from public._meta_ads_filtered(
      v_empresa_id, p_start, p_end, p_platforms, p_campaign_ids, p_adset_ids, p_ad_ids)
  ),
  -- Uma linha por (grupo, lead): o lead conta uma vez em cada grupo em que clicou,
  -- e a receita não é somada em dobro quando ele clicou várias vezes.
  per_lead as (
    select 'total' lvl, null::text ck, null::text sk, null::text ak, null::text pf,
           b.lead_id, count(*) clicks, max(b.lead_status) st, max(b.sold_value) sv
    from base b group by b.lead_id
    union all
    select 'campaign', b.campaign_key, null, null, null,
           b.lead_id, count(*), max(b.lead_status), max(b.sold_value)
    from base b group by b.campaign_key, b.lead_id
    union all
    select 'adset', b.campaign_key, b.adset_key, null, null,
           b.lead_id, count(*), max(b.lead_status), max(b.sold_value)
    from base b group by b.campaign_key, b.adset_key, b.lead_id
    union all
    select 'ad', b.campaign_key, b.adset_key, b.ad_key, null,
           b.lead_id, count(*), max(b.lead_status), max(b.sold_value)
    from base b group by b.campaign_key, b.adset_key, b.ad_key, b.lead_id
    union all
    select 'platform', null, null, null, b.platform,
           b.lead_id, count(*), max(b.lead_status), max(b.sold_value)
    from base b group by b.platform, b.lead_id
  ),
  agg as (
    select p.lvl, p.ck, p.sk, p.ak, p.pf,
           sum(p.clicks)::bigint clicks,
           count(*)::bigint leads,
           count(*) filter (where p.st = 'venda_confirmada')::bigint sales,
           coalesce(sum(p.sv) filter (where p.st = 'venda_confirmada'), 0)::numeric revenue,
           count(*) filter (where p.st = 'perdido')::bigint losses
    from per_lead p
    group by p.lvl, p.ck, p.sk, p.ak, p.pf
  ),
  campaign_names as (
    select b.campaign_key, max(b.campaign_name) nm from base b group by b.campaign_key
  ),
  adset_names as (
    select b.campaign_key, b.adset_key, max(b.adset_name) nm
    from base b group by b.campaign_key, b.adset_key
  ),
  latest_creative as (
    select distinct on (b.campaign_key, b.adset_key, b.ad_key)
           b.campaign_key, b.adset_key, b.ad_key, b.ad_name, b.thumbnail_url, b.title_ads, b.body_ads
    from base b
    order by b.campaign_key, b.adset_key, b.ad_key, b.clicked_at desc
  )
  select a.lvl, a.ck, cn.nm, a.sk, an.nm, a.ak, lc.ad_name, a.pf,
         a.clicks, a.leads, a.sales, a.revenue, a.losses,
         (a.leads - a.sales - a.losses)::bigint,
         round(100.0 * a.sales / nullif(a.leads, 0), 1),
         lc.thumbnail_url, lc.title_ads, lc.body_ads
  from agg a
  left join campaign_names cn on cn.campaign_key = a.ck
  left join adset_names an on an.campaign_key = a.ck and an.adset_key = a.sk
  left join latest_creative lc on lc.campaign_key = a.ck and lc.adset_key = a.sk and lc.ad_key = a.ak
  order by a.leads desc;
end;
$$;

create or replace function public.get_meta_ads_timeline(
  p_start date, p_end date,
  p_platforms text[] default null, p_campaign_ids text[] default null,
  p_adset_ids text[] default null, p_ad_ids text[] default null
)
returns table(day date, campaign_id text, campaign_name text, leads bigint)
language plpgsql stable security definer
set search_path to 'public'
as $$
#variable_conflict use_column
declare
  v_empresa_id uuid := public._meta_ads_current_empresa();
begin
  return query
  select (b.clicked_at at time zone 'America/Sao_Paulo')::date,
         b.campaign_key, max(b.campaign_name), count(distinct b.lead_id)::bigint
  from public._meta_ads_filtered(
    v_empresa_id, p_start, p_end, p_platforms, p_campaign_ids, p_adset_ids, p_ad_ids) b
  group by 1, 2
  order by 1, 2;
end;
$$;

-- Hierarquia completa (sem período) para os filtros em cascata.
create or replace function public.get_meta_ads_options()
returns table(
  campaign_id text, campaign_name text, adset_id text, adset_name text, ad_id text, ad_name text
)
language plpgsql stable security definer
set search_path to 'public'
as $$
#variable_conflict use_column
declare
  v_empresa_id uuid := public._meta_ads_current_empresa();
begin
  return query
  select coalesce(m.id_campaign, m."campaing-id", m.name_campaign, '(sem identificação)'),
         max(coalesce(m.name_campaign, m.id_campaign, m."campaing-id", '(sem identificação)')),
         coalesce(m.id_conjunto_anuncio, m.name_conjunto_anuncio, '(sem identificação)'),
         max(coalesce(m.name_conjunto_anuncio, m.id_conjunto_anuncio, '(sem identificação)')),
         coalesce(m.source_id, m.name_ads, '(sem identificação)'),
         max(coalesce(m.name_ads, m.title_ads, m.source_id, '(sem identificação)'))
  from public.meta_ads m
  where m.empresa_id = v_empresa_id
  group by 1, 3, 5
  order by 2, 4, 6;
end;
$$;

revoke execute on function public.get_meta_ads_summary(date, date, text[], text[], text[], text[]) from public, anon;
revoke execute on function public.get_meta_ads_timeline(date, date, text[], text[], text[], text[]) from public, anon;
revoke execute on function public.get_meta_ads_options() from public, anon;
grant execute on function public.get_meta_ads_summary(date, date, text[], text[], text[], text[]) to authenticated;
grant execute on function public.get_meta_ads_timeline(date, date, text[], text[], text[], text[]) to authenticated;
grant execute on function public.get_meta_ads_options() to authenticated;
