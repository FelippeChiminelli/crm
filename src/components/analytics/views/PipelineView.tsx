import { 
  ChartBarIcon, 
  ChartPieIcon, 
  FunnelIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline'
import { KPICard } from '../KPICard'
import { BarChartWidget } from '../BarChartWidget'
import { LineChartWidget } from '../LineChartWidget'
import { DataTableWidget } from '../DataTableWidget'
import { FunnelChartWidget } from '../FunnelChartWidget'
import { AnalyticsViewHeader } from '../layout/AnalyticsViewHeader'
import { LeadFilterSelector } from '../LeadFilterSelector'
import type { LeadAnalyticsFilters } from '../../../types'

interface PipelineViewProps {
  data: any
  filters: LeadAnalyticsFilters
  onFiltersChange: (filters: LeadAnalyticsFilters) => void
  formatCurrency: (value: number) => string
  formatPeriod: (start: string, end: string) => string
}

export function PipelineView({ data, filters, onFiltersChange, formatCurrency, formatPeriod }: PipelineViewProps) {
  const { 
    loading, 
    stats, 
    leadsByPipeline, 
    leadsByOrigin, 
    leadsOverTime,
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
        title="Leads / Pipeline"
        subtitle="Análise de leads, conversão e origem"
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
      <div className="p-6 space-y-6">
        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total de Leads"
              value={stats.total_leads}
              subtitle={`${stats.active_pipelines} pipelines ativos`}
              icon={<ChartBarIcon className="w-6 h-6" />}
              color="blue"
              loading={loading}
            />
            <KPICard
              title="Valor Total"
              value={formatCurrency(stats.total_value)}
              subtitle="Soma de todos os leads"
              icon={<ChartPieIcon className="w-6 h-6" />}
              color="green"
              loading={loading}
            />
            <KPICard
              title="Valor Médio"
              value={formatCurrency(stats.average_value)}
              subtitle="Por lead"
              icon={<TableCellsIcon className="w-6 h-6" />}
              color="purple"
              loading={loading}
            />
            <KPICard
              title="Usuários Ativos"
              value={stats.active_users}
              subtitle="Responsáveis por leads"
              icon={<FunnelIcon className="w-6 h-6" />}
              color="yellow"
              loading={loading}
            />
          </div>
        )}

        {/* Gráficos */}
        <BarChartWidget
          title="Leads por Pipeline"
          data={leadsByPipeline}
          dataKey="count"
          dataKeyLabel="Quantidade"
          xAxisKey="pipeline_name"
          loading={loading}
        />

        {/* Leads por Origem - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Leads por Origem"
            data={leadsByOrigin}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="origin"
            color="#10B981"
            loading={loading}
          />
          <DataTableWidget
            title="Detalhes por Origem"
            data={leadsByOrigin}
            columns={[
              { 
                key: 'origin', 
                label: 'Origem',
                render: (val) => val || 'Não informado'
              },
              { 
                key: 'count', 
                label: 'Quantidade',
                render: (val) => val.toLocaleString('pt-BR')
              },
              { 
                key: 'percentage', 
                label: 'Percentual',
                render: (val) => `${val.toFixed(1)}%`
              },
              { 
                key: 'total_value', 
                label: 'Valor Total',
                render: (val) => formatCurrency(val || 0)
              }
            ]}
            loading={loading}
          />
        </div>

        <LineChartWidget
          title="Evolução de Leads no Tempo"
          data={leadsOverTime}
          dataKey="value"
          dataKeyLabel="Quantidade de Leads"
          xAxisKey="date"
          loading={loading}
        />

        {/* Funil de Conversão por Pipeline */}
        <FunnelChartWidget
          title="Funil de Conversão por Pipeline"
          data={pipelineFunnel}
          loading={loading}
        />
      </div>
    </div>
  )
}

