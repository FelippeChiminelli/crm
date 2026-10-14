import { supabase } from './supabaseClient'
// Apesar do nome, useCachedQuery não é um hook React: é um wrapper assíncrono
// de cache. O apelido evita que o eslint o trate como hook fora de componente.
import { useCachedQuery as withCache, cacheService } from './cacheService'
import type {
  MetaAdsAnalyticsFilters,
  MetaAdsGranularity,
  MetaAdsLeadCategory,
  MetaAdsLeadRow,
  MetaAdsLevel,
  MetaAdsOption,
  MetaAdsSummaryRow,
  MetaAdsTimelinePoint
} from '../types'

/**
 * Analytics de Meta Ads (tabela meta_ads cruzada com o resultado dos leads).
 *
 * A agregação roda em SQL (RPCs get_meta_ads_*) porque um lead pode ter vários
 * cliques e precisa ser contado uma única vez em cada nível da hierarquia.
 * As RPCs derivam o empresa_id do usuário autenticado.
 */

const CACHE_PREFIX = 'analytics_meta_ads'
const SUMMARY_CACHE_KEY = `${CACHE_PREFIX}_summary`
const TIMELINE_CACHE_KEY = `${CACHE_PREFIX}_timeline`
const OPTIONS_CACHE_KEY = `${CACHE_PREFIX}_options`
const LEADS_CACHE_KEY = `${CACHE_PREFIX}_leads`

function toNumber(value: unknown): number {
  // O Postgres devolve numeric como string no PostgREST
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function nullIfEmpty(values?: string[]): string[] | null {
  return values && values.length > 0 ? values : null
}

function buildRpcParams(filters: MetaAdsAnalyticsFilters) {
  return {
    p_start: filters.period.start,
    p_end: filters.period.end,
    p_platforms: nullIfEmpty(filters.platforms),
    p_campaign_ids: nullIfEmpty(filters.campaign_ids),
    p_adset_ids: nullIfEmpty(filters.adset_ids),
    p_ad_ids: nullIfEmpty(filters.ad_ids)
  }
}

export function invalidateMetaAdsCache(): void {
  cacheService.invalidateType(CACHE_PREFIX)
}

export async function getMetaAdsSummary(
  filters: MetaAdsAnalyticsFilters
): Promise<MetaAdsSummaryRow[]> {
  const params = buildRpcParams(filters)

  return withCache(SUMMARY_CACHE_KEY, params, async () => {
    const { data, error } = await supabase.rpc('get_meta_ads_summary', params)

    if (error) {
      console.error('Erro ao buscar resumo de Meta Ads:', error)
      throw error
    }

    return (data || []).map((row: any) => ({
      level: row.level as MetaAdsLevel,
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      adset_id: row.adset_id,
      adset_name: row.adset_name,
      ad_id: row.ad_id,
      ad_name: row.ad_name,
      platform: row.platform,
      clicks: toNumber(row.clicks),
      leads: toNumber(row.leads),
      sales: toNumber(row.sales),
      revenue: toNumber(row.revenue),
      losses: toNumber(row.losses),
      open_leads: toNumber(row.open_leads),
      conversion_rate: toNumber(row.conversion_rate),
      thumbnail_url: row.thumbnail_url,
      title_ads: row.title_ads,
      body_ads: row.body_ads
    }))
  })
}

export async function getMetaAdsTimeline(
  filters: MetaAdsAnalyticsFilters,
  granularity: MetaAdsGranularity
): Promise<MetaAdsTimelinePoint[]> {
  const params = { ...buildRpcParams(filters), p_granularity: granularity }

  return withCache(TIMELINE_CACHE_KEY, params, async () => {
    const { data, error } = await supabase.rpc('get_meta_ads_timeline', params)

    if (error) {
      console.error('Erro ao buscar evolução de Meta Ads:', error)
      throw error
    }

    return (data || []).map((row: any) => ({
      day: row.day,
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      leads: toNumber(row.leads)
    }))
  })
}

export const META_ADS_LEADS_PAGE_SIZE = 50

export interface MetaAdsLeadsPage {
  rows: MetaAdsLeadRow[]
  total: number
}

export async function getMetaAdsLeads(
  filters: MetaAdsAnalyticsFilters,
  category: MetaAdsLeadCategory,
  page = 0,
  pageSize = META_ADS_LEADS_PAGE_SIZE
): Promise<MetaAdsLeadsPage> {
  const params = {
    ...buildRpcParams(filters),
    p_category: category,
    p_limit: pageSize,
    p_offset: page * pageSize
  }

  return withCache(LEADS_CACHE_KEY, params, async () => {
    const { data, error } = await supabase.rpc('get_meta_ads_leads', params)

    if (error) {
      console.error('Erro ao buscar leads de Meta Ads:', error)
      throw error
    }

    const rows = data || []

    return {
      // total_count vem repetido em todas as linhas (count(*) over ())
      total: rows.length > 0 ? toNumber(rows[0].total_count) : 0,
      rows: rows.map((row: any) => ({
        lead_id: row.lead_id,
        lead_name: row.lead_name,
        phone: row.phone,
        lead_status: row.lead_status,
        responsible_name: row.responsible_name,
        sold_value: toNumber(row.sold_value),
        sold_at: row.sold_at,
        lost_at: row.lost_at,
        loss_reason: row.loss_reason,
        clicked_at: row.clicked_at,
        clicks: toNumber(row.clicks),
        campaign_name: row.campaign_name,
        adset_name: row.adset_name,
        ad_name: row.ad_name,
        platform: row.platform
      }))
    }
  })
}

export async function getMetaAdsOptions(): Promise<MetaAdsOption[]> {
  return withCache(OPTIONS_CACHE_KEY, {}, async () => {
    const { data, error } = await supabase.rpc('get_meta_ads_options')

    if (error) {
      console.error('Erro ao buscar opções de Meta Ads:', error)
      throw error
    }

    return (data || []) as MetaAdsOption[]
  })
}
