import { FunnelChartWidget } from '../FunnelChartWidget'
import { AnalyticsViewHeader } from '../layout/AnalyticsViewHeader'
import { LeadFilterSelector } from '../LeadFilterSelector'
import type { LeadAnalyticsFilters } from '../../../types'

interface FunnelViewProps {
  data: any
  filters: LeadAnalyticsFilters
  onFiltersChange: (filters: LeadAnalyticsFilters) => void
  formatPeriod: (start: string, end: string) => string
}

export function FunnelView({ data, filters, onFiltersChange, formatPeriod }: FunnelViewProps) {
  const { 
    loading, 
    pipelineFunnel
  } = data

  // Contar filtros ativos
  const activeFiltersCount = [
    filters.pipelines?.length || 0,
    filters.stages?.length || 0,
    filters.origins?.length || 0,
    filters.status?.length || 0
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <AnalyticsViewHeader
        title="Funil de Conversão"
        subtitle="Análise detalhada do funil de conversão por pipeline"
        period={formatPeriod(filters.period.start, filters.period.end)}
        filterComponent={
          <LeadFilterSelector
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        }
        activeFiltersCount={activeFiltersCount}
      />

      {/* Conteúdo */}
      <div className="p-6">
        <FunnelChartWidget
          title="Funil de Conversão por Pipeline"
          data={pipelineFunnel}
          loading={loading}
        />
      </div>
    </div>
  )
}

