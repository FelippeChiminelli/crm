import type { MetaAdsAnalyticsFilters, MetaAdsOption } from '../../../types'

interface NamedOption {
  id: string
  name: string
}

function uniqueOptions(rows: MetaAdsOption[], idKey: keyof MetaAdsOption, nameKey: keyof MetaAdsOption): NamedOption[] {
  const map = new Map<string, string>()
  rows.forEach((row) => {
    if (!map.has(row[idKey])) map.set(row[idKey], row[nameKey])
  })
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

const matches = (selected: string[] | undefined, value: string) =>
  !selected || selected.length === 0 || selected.includes(value)

/** Opções de cada nível, restritas ao que foi escolhido no nível acima. */
export function getCascadeOptions(rows: MetaAdsOption[], filters: MetaAdsAnalyticsFilters) {
  const inCampaigns = rows.filter((row) => matches(filters.campaign_ids, row.campaign_id))
  const inAdsets = inCampaigns.filter((row) => matches(filters.adset_ids, row.adset_id))

  return {
    campaigns: uniqueOptions(rows, 'campaign_id', 'campaign_name'),
    adsets: uniqueOptions(inCampaigns, 'adset_id', 'adset_name'),
    ads: uniqueOptions(inAdsets, 'ad_id', 'ad_name')
  }
}

const emptyToUndefined = (values: string[]) => (values.length > 0 ? values : undefined)

/**
 * Aplica uma nova seleção e descarta, nos níveis abaixo, os itens que
 * deixaram de pertencer ao recorte (ex.: conjunto de uma campanha desmarcada).
 */
export function applyCascadeSelection(
  rows: MetaAdsOption[],
  filters: MetaAdsAnalyticsFilters,
  level: 'campaign_ids' | 'adset_ids' | 'ad_ids',
  selected: string[]
): MetaAdsAnalyticsFilters {
  const next: MetaAdsAnalyticsFilters = { ...filters, [level]: emptyToUndefined(selected) }

  const validAdsets = new Set(getCascadeOptions(rows, next).adsets.map((option) => option.id))
  next.adset_ids = emptyToUndefined((next.adset_ids ?? []).filter((id) => validAdsets.has(id)))

  // Recalcula com os conjuntos já podados, pois eles restringem os anúncios
  const validAds = new Set(getCascadeOptions(rows, next).ads.map((option) => option.id))
  next.ad_ids = emptyToUndefined((next.ad_ids ?? []).filter((id) => validAds.has(id)))

  return next
}
