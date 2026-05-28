import { cacheService } from './cacheService'

/**
 * Barril (re-export) dos services de analytics de estoque.
 *
 * Estrutura:
 *  - productAnalyticsHelpers.ts: helpers compartilhados (auth, escopo, fetch base)
 *  - productInventoryService.ts: snapshot atual (KPIs, distribuições, baixo estoque)
 *  - productSalesAnalyticsService.ts: vendas no período (KPIs, ranking, série, lista)
 */

export {
  getProductInventoryStats,
  getProductsByMarca,
  getProductsByStatus,
  getProductsByType,
  getLowStockProducts,
} from './productInventoryService'

export {
  getProductSalesStats,
  getTopSellingProducts,
  getProductSalesOverTime,
  getProductSalesList,
} from './productSalesAnalyticsService'

/** Invalida todo o cache de analytics de estoque. */
export function invalidateStockCache(): void {
  cacheService.invalidateType('stock_inventory_stats')
  cacheService.invalidateType('stock_by_marca')
  cacheService.invalidateType('stock_by_status')
  cacheService.invalidateType('stock_by_type')
  cacheService.invalidateType('stock_low')
  cacheService.invalidateType('stock_sales_stats')
  cacheService.invalidateType('stock_top_selling')
  cacheService.invalidateType('stock_sales_over_time')
  cacheService.invalidateType('stock_sales_list')
}
