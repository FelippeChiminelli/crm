import type { AnalyticsPeriod } from './index'

// Filtros da aba Meta Ads. Os IDs são as chaves geradas pelas RPCs
// (ID da Meta ou, na falta dele, o nome).
export interface MetaAdsAnalyticsFilters {
  period: AnalyticsPeriod
  platforms?: string[]
  campaign_ids?: string[]
  adset_ids?: string[]
  ad_ids?: string[]
}

export type MetaAdsLevel = 'total' | 'campaign' | 'adset' | 'ad' | 'platform'

export interface MetaAdsMetrics {
  clicks: number
  leads: number
  sales: number
  revenue: number
  losses: number
  open_leads: number
  conversion_rate: number
}

export interface MetaAdsSummaryRow extends MetaAdsMetrics {
  level: MetaAdsLevel
  campaign_id: string | null
  campaign_name: string | null
  adset_id: string | null
  adset_name: string | null
  ad_id: string | null
  ad_name: string | null
  platform: string | null
  thumbnail_url: string | null
  title_ads: string | null
  body_ads: string | null
}

export type MetaAdsGranularity = 'day' | 'week' | 'month'

// `day` é o início do período (dia, segunda-feira da semana ou dia 1 do mês).
// Linhas com campaign_id nulo trazem o total de leads distintos do período.
export interface MetaAdsTimelinePoint {
  day: string
  campaign_id: string | null
  campaign_name: string | null
  leads: number
}

export interface MetaAdsOption {
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  ad_id: string
  ad_name: string
}

// Listas do drill-down dos KPIs. 'clicks' traz uma linha por clique;
// as demais, uma linha por lead com os dados do último clique.
export type MetaAdsLeadCategory = 'leads' | 'open' | 'sales' | 'losses' | 'clicks'

export interface MetaAdsLeadRow {
  lead_id: string
  lead_name: string | null
  phone: string | null
  lead_status: string | null
  responsible_name: string | null
  sold_value: number
  sold_at: string | null
  lost_at: string | null
  loss_reason: string | null
  clicked_at: string
  clicks: number
  campaign_name: string | null
  adset_name: string | null
  ad_name: string | null
  platform: string | null
}

// Nó da tabela hierárquica Campanha > Conjunto > Anúncio
export interface MetaAdsTreeNode extends MetaAdsMetrics {
  key: string
  name: string
  level: 'campaign' | 'adset' | 'ad'
  children: MetaAdsTreeNode[]
}
