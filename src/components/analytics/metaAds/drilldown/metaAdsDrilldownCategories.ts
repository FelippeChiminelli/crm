import type { MetaAdsLeadCategory } from '../../../../types'

interface DrilldownCategoryConfig {
  key: MetaAdsLeadCategory
  label: string
  description: string
}

// Ordem das abas do modal
export const META_ADS_DRILLDOWN_CATEGORIES: DrilldownCategoryConfig[] = [
  { key: 'leads', label: 'Todos os leads', description: 'Leads que clicaram em um anúncio no período, com o último anúncio clicado' },
  { key: 'open', label: 'Em aberto', description: 'Leads ainda sem venda nem perda registrada' },
  { key: 'sales', label: 'Vendas', description: 'Leads com venda confirmada, da venda mais recente para a mais antiga' },
  { key: 'losses', label: 'Perdas', description: 'Leads marcados como perdidos, com o motivo registrado' },
  { key: 'clicks', label: 'Cliques', description: 'Cada clique em anúncio; um lead pode aparecer mais de uma vez' }
]

export function getDrilldownCategory(key: MetaAdsLeadCategory): DrilldownCategoryConfig {
  return META_ADS_DRILLDOWN_CATEGORIES.find((item) => item.key === key) ?? META_ADS_DRILLDOWN_CATEGORIES[0]
}
