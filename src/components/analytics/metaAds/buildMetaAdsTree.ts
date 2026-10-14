import type { MetaAdsMetrics, MetaAdsSummaryRow, MetaAdsTreeNode } from '../../../types'

const UNKNOWN_LABEL = '(sem identificação)'

function pickMetrics(row: MetaAdsSummaryRow): MetaAdsMetrics {
  const { clicks, leads, sales, revenue, losses, open_leads, conversion_rate } = row
  return { clicks, leads, sales, revenue, losses, open_leads, conversion_rate }
}

function toNode(
  row: MetaAdsSummaryRow,
  level: MetaAdsTreeNode['level'],
  key: string,
  name: string | null
): MetaAdsTreeNode {
  return { ...pickMetrics(row), key, name: name || UNKNOWN_LABEL, level, children: [] }
}

/**
 * Monta a árvore Campanha > Conjunto > Anúncio a partir das linhas da RPC.
 * As métricas de cada nó vêm prontas do banco (leads distintos por nível),
 * então nada é somado aqui: a soma dos filhos pode passar do pai quando um
 * lead clicou em mais de um anúncio.
 */
export function buildMetaAdsTree(rows: MetaAdsSummaryRow[]): MetaAdsTreeNode[] {
  const campaigns = new Map<string, MetaAdsTreeNode>()
  const adsets = new Map<string, MetaAdsTreeNode>()

  for (const row of rows) {
    if (row.level !== 'campaign' || !row.campaign_id) continue
    campaigns.set(row.campaign_id, toNode(row, 'campaign', row.campaign_id, row.campaign_name))
  }

  for (const row of rows) {
    if (row.level !== 'adset' || !row.campaign_id || !row.adset_id) continue
    const node = toNode(row, 'adset', `${row.campaign_id}|${row.adset_id}`, row.adset_name)
    adsets.set(node.key, node)
    campaigns.get(row.campaign_id)?.children.push(node)
  }

  for (const row of rows) {
    if (row.level !== 'ad' || !row.ad_id) continue
    const node = toNode(row, 'ad', `${row.campaign_id}|${row.adset_id}|${row.ad_id}`, row.ad_name)
    adsets.get(`${row.campaign_id}|${row.adset_id}`)?.children.push(node)
  }

  return Array.from(campaigns.values())
}

export type MetaAdsSortKey = keyof MetaAdsMetrics | 'name'

/** Ordena a árvore inteira (todos os níveis) pela mesma coluna. */
export function sortMetaAdsTree(
  nodes: MetaAdsTreeNode[],
  sortKey: MetaAdsSortKey,
  direction: 'asc' | 'desc'
): MetaAdsTreeNode[] {
  const factor = direction === 'asc' ? 1 : -1
  const compare = (a: MetaAdsTreeNode, b: MetaAdsTreeNode) =>
    sortKey === 'name'
      ? a.name.localeCompare(b.name, 'pt-BR') * factor
      : (a[sortKey] - b[sortKey]) * factor

  return [...nodes]
    .sort(compare)
    .map((node) => ({ ...node, children: sortMetaAdsTree(node.children, sortKey, direction) }))
}
