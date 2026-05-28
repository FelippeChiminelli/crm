import { useCachedQuery } from './cacheService'
import type {
  StockAnalyticsFilters,
  ProductSalesStats,
  TopSellingProduct,
  ProductSalesOverTimePoint,
  ProductSaleListItem,
} from '../types'
import {
  STOCK_CONSTANTS,
  fetchSalesInPeriod,
  getUserEmpresaId,
} from './productAnalyticsHelpers'

// ============================================================================
// KPIs DE VENDAS NO PERÍODO
// ============================================================================

export function getProductSalesStats(
  filters: StockAnalyticsFilters
): Promise<ProductSalesStats> {
  return useCachedQuery('stock_sales_stats', filters, async () => {
    const empresaId = await getUserEmpresaId()
    const sales = await fetchSalesInPeriod(empresaId, filters)

    const totalSales = sales.length
    const totalRevenue = sales.reduce((s, r: any) => s + (r.sold_value || 0), 0)
    const totalUnits = sales.reduce((s, r: any) => s + (r.quantidade_vendida || 0), 0)
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

    return {
      total_sales: totalSales,
      total_revenue: totalRevenue,
      total_units: totalUnits,
      average_ticket: averageTicket,
    }
  })
}

// ============================================================================
// RANKING DE MAIS VENDIDOS
// ============================================================================

export function getTopSellingProducts(
  filters: StockAnalyticsFilters,
  limit: number = STOCK_CONSTANTS.TOP_SELLING_LIMIT
): Promise<TopSellingProduct[]> {
  return useCachedQuery('stock_top_selling', { filters, limit }, async () => {
    const empresaId = await getUserEmpresaId()
    const sales = await fetchSalesInPeriod(empresaId, filters)

    const groups = new Map<string, TopSellingProduct>()
    for (const s of sales) {
      const pid = s.product_id
      const existing = groups.get(pid)
      if (existing) {
        existing.total_quantity += s.quantidade_vendida || 0
        existing.total_revenue += s.sold_value || 0
        existing.sales_count += 1
      } else {
        groups.set(pid, {
          product_id: pid,
          product_name: s.product?.nome || 'Produto removido',
          product_tipo: (s.product?.tipo as any) || 'produto',
          marca: s.product?.marca || null,
          total_quantity: s.quantidade_vendida || 0,
          total_revenue: s.sold_value || 0,
          sales_count: 1,
        })
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, limit)
  })
}

// ============================================================================
// SÉRIE TEMPORAL DE VENDAS
// ============================================================================

export function getProductSalesOverTime(
  filters: StockAnalyticsFilters
): Promise<ProductSalesOverTimePoint[]> {
  return useCachedQuery('stock_sales_over_time', filters, async () => {
    const empresaId = await getUserEmpresaId()
    const sales = await fetchSalesInPeriod(empresaId, filters)

    const byDay = new Map<string, ProductSalesOverTimePoint>()
    for (const s of sales) {
      const day = (s.sold_at as string).slice(0, 10)
      const existing = byDay.get(day)
      if (existing) {
        existing.count += 1
        existing.revenue += s.sold_value || 0
        existing.units += s.quantidade_vendida || 0
      } else {
        byDay.set(day, {
          date: day,
          count: 1,
          revenue: s.sold_value || 0,
          units: s.quantidade_vendida || 0,
        })
      }
    }
    return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
  })
}

// ============================================================================
// LISTA DETALHADA DE VENDAS NO PERÍODO
// ============================================================================

export function getProductSalesList(
  filters: StockAnalyticsFilters
): Promise<ProductSaleListItem[]> {
  return useCachedQuery('stock_sales_list', filters, async () => {
    const empresaId = await getUserEmpresaId()
    const sales = await fetchSalesInPeriod(empresaId, filters)

    return sales.slice(0, STOCK_CONSTANTS.PRODUCT_SALES_LIST_LIMIT).map((s: any) => ({
      id: s.id,
      product_id: s.product_id,
      product_name: s.product?.nome || 'Produto removido',
      product_tipo: (s.product?.tipo as any) || 'produto',
      quantidade_vendida: s.quantidade_vendida || 0,
      unit_price: s.unit_price ?? null,
      sold_value: s.sold_value ?? null,
      sold_at: s.sold_at,
      responsible_name: s.responsible?.full_name || null,
      lead_name: s.lead?.name || null,
    }))
  })
}
