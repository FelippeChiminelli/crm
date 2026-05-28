import { supabase } from './supabaseClient'
import { useCachedQuery } from './cacheService'
import type {
  StockAnalyticsFilters,
  ProductInventoryStats,
  ProductDistributionItem,
  LowStockItem,
} from '../types'
import {
  STOCK_CONSTANTS,
  applyProductScopeFilters,
  getScopedProductIds,
  getUserEmpresaId,
  periodRange,
} from './productAnalyticsHelpers'

// ============================================================================
// SNAPSHOT DE INVENTÁRIO (KPIs do topo)
// ============================================================================

export function getProductInventoryStats(
  filters: StockAnalyticsFilters
): Promise<ProductInventoryStats> {
  return useCachedQuery('stock_inventory_stats', filters, async () => {
    const empresaId = await getUserEmpresaId()
    const { startIso, endIso } = periodRange(filters)

    let productQuery = supabase
      .from('products')
      .select('preco, preco_promocional, quantidade_estoque, status, tipo')
      .eq('empresa_id', empresaId)
    productQuery = applyProductScopeFilters(productQuery, filters)

    const [{ data: products, error }, scopedIds] = await Promise.all([
      productQuery,
      getScopedProductIds(empresaId, filters),
    ])

    if (error) throw error

    let salesPeriodQuery = supabase
      .from('product_sales')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .gte('sold_at', startIso)
      .lte('sold_at', endIso)
    if (scopedIds) salesPeriodQuery = salesPeriodQuery.in('product_id', scopedIds)
    const { count: salesCount } = await salesPeriodQuery

    const available = (products || []).filter((p: any) => p.status !== 'vendido')
    const totalProducts = available.filter((p: any) => (p.tipo || 'produto') === 'produto').length
    const totalServices = available.filter((p: any) => p.tipo === 'servico').length
    const totalValue = available.reduce(
      (sum: number, p: any) => sum + (p.preco || 0) * (p.quantidade_estoque || 0),
      0
    )
    const withPrice = available.filter((p: any) => p.preco && p.preco > 0)
    const averagePrice = withPrice.length > 0
      ? withPrice.reduce((s: number, p: any) => s + (p.preco || 0), 0) / withPrice.length
      : 0
    const onPromotion = available.filter((p: any) => p.preco_promocional).length
    const lowStock = available.filter(
      (p: any) =>
        (p.tipo || 'produto') === 'produto' &&
        (p.quantidade_estoque ?? 0) > 0 &&
        (p.quantidade_estoque ?? 0) <= STOCK_CONSTANTS.LOW_STOCK_THRESHOLD
    ).length

    return {
      total_products: totalProducts,
      total_services: totalServices,
      total_value: totalValue,
      average_price: averagePrice,
      products_on_promotion: onPromotion,
      products_sold_period: salesCount || 0,
      low_stock_count: lowStock,
    }
  })
}

// ============================================================================
// DISTRIBUIÇÕES (marca, status, tipo)
// ============================================================================

const DISTRIBUTION_LABELS: Record<string, string> = {
  produto: 'Produto',
  servico: 'Serviço',
  ativo: 'Ativo',
  inativo: 'Inativo',
  esgotado: 'Esgotado',
  vendido: 'Vendido',
}

async function getDistribution(
  filters: StockAnalyticsFilters,
  field: 'marca' | 'status' | 'tipo'
): Promise<ProductDistributionItem[]> {
  const empresaId = await getUserEmpresaId()
  let query = supabase
    .from('products')
    .select('marca, status, tipo, preco, quantidade_estoque')
    .eq('empresa_id', empresaId)
  query = applyProductScopeFilters(query, filters)

  const { data, error } = await query
  if (error) throw error

  const groups = new Map<string, { count: number; total_value: number }>()
  for (const p of data || []) {
    const raw = ((p as any)[field] ?? '') as string
    const key = raw && raw.trim() !== '' ? raw : '__sem_valor__'
    const current = groups.get(key) || { count: 0, total_value: 0 }
    current.count += 1
    current.total_value += ((p as any).preco || 0) * ((p as any).quantidade_estoque || 0)
    groups.set(key, current)
  }

  const total = Array.from(groups.values()).reduce((s, g) => s + g.count, 0)
  const items: ProductDistributionItem[] = Array.from(groups.entries()).map(([key, g]) => ({
    key,
    label: key === '__sem_valor__' ? 'Sem valor' : DISTRIBUTION_LABELS[key] || key,
    count: g.count,
    total_value: g.total_value,
    percentage: total > 0 ? (g.count / total) * 100 : 0,
  }))

  return items.sort((a, b) => b.count - a.count)
}

export function getProductsByMarca(filters: StockAnalyticsFilters) {
  return useCachedQuery('stock_by_marca', filters, () => getDistribution(filters, 'marca'))
}

export function getProductsByStatus(filters: StockAnalyticsFilters) {
  return useCachedQuery('stock_by_status', filters, () => getDistribution(filters, 'status'))
}

export function getProductsByType(filters: StockAnalyticsFilters) {
  return useCachedQuery('stock_by_type', filters, () => getDistribution(filters, 'tipo'))
}

// ============================================================================
// BAIXO ESTOQUE
// ============================================================================

export function getLowStockProducts(
  filters: StockAnalyticsFilters,
  threshold: number = STOCK_CONSTANTS.LOW_STOCK_THRESHOLD
): Promise<LowStockItem[]> {
  return useCachedQuery('stock_low', { filters, threshold }, async () => {
    const empresaId = await getUserEmpresaId()
    let query = supabase
      .from('products')
      .select('id, nome, marca, quantidade_estoque, status, preco, tipo, category:product_categories(nome)')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'produto')
      .neq('status', 'vendido')
      .lte('quantidade_estoque', threshold)
      .order('quantidade_estoque', { ascending: true })
      .limit(50)
    query = applyProductScopeFilters(query, filters)

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((p: any) => ({
      product_id: p.id,
      product_name: p.nome,
      marca: p.marca || null,
      categoria_nome: p.category?.nome || null,
      quantidade_estoque: p.quantidade_estoque ?? 0,
      status: p.status,
      preco: p.preco ?? null,
    }))
  })
}
