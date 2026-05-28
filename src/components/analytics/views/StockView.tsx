import { AnalyticsViewHeader } from '../layout/AnalyticsViewHeader'
import { StockKpis } from '../stock/StockKpis'
import { StockDistributions } from '../stock/StockDistributions'
import { StockSalesSection } from '../stock/StockSalesSection'
import { LowStockAlert } from '../stock/LowStockAlert'
import type { StockAnalyticsFilters } from '../../../types'

interface StockViewProps {
  data: any
  filters: StockAnalyticsFilters
  formatCurrency: (value: number) => string
  formatPeriod: (start: string, end: string) => string
  onOpenMobileMenu?: () => void
  onOpenFilters: () => void
}

export function StockView({
  data,
  filters,
  formatCurrency,
  formatPeriod,
  onOpenMobileMenu,
  onOpenFilters,
}: StockViewProps) {
  const {
    loading,
    stockInventoryStats,
    stockByMarca,
    stockByStatus,
    stockByType,
    lowStockProducts,
    productSalesStats,
    topSellingProducts,
    productSalesOverTime,
    productSalesList,
  } = data

  const activeFiltersCount = [
    filters.categoria_ids?.length || 0,
    filters.marcas?.length || 0,
    filters.tipos?.length || 0,
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <AnalyticsViewHeader
        title="Estoque"
        subtitle="Análise de produtos, serviços e vendas"
        period={formatPeriod(filters.period.start, filters.period.end)}
        activeFiltersCount={activeFiltersCount}
        onOpenMobileMenu={onOpenMobileMenu}
        onOpenFilters={onOpenFilters}
      />

      <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
        <StockKpis
          stats={stockInventoryStats}
          loading={loading}
          formatCurrency={formatCurrency}
        />

        <StockDistributions
          loading={loading}
          byMarca={stockByMarca || []}
          byStatus={stockByStatus || []}
          byType={stockByType || []}
          formatCurrency={formatCurrency}
        />

        <StockSalesSection
          loading={loading}
          stats={productSalesStats}
          topSelling={topSellingProducts || []}
          salesOverTime={productSalesOverTime || []}
          salesList={productSalesList || []}
          formatCurrency={formatCurrency}
        />

        <LowStockAlert
          items={lowStockProducts || []}
          loading={loading}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  )
}
