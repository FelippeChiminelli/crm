import { 
  XMarkIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { KPICard } from '../KPICard'
import { BarChartWidget } from '../BarChartWidget'
import { LineChartWidget } from '../LineChartWidget'
import { DataTableWidget } from '../DataTableWidget'
import { AnalyticsViewHeader } from '../layout/AnalyticsViewHeader'
import { SalesFilterSelector } from '../SalesFilterSelector'
import type { SalesAnalyticsFilters } from '../../../types'

interface LossesViewProps {
  data: any
  filters: SalesAnalyticsFilters
  onFiltersChange: (filters: SalesAnalyticsFilters) => void
  formatCurrency: (value: number) => string
  formatPeriod: (start: string, end: string) => string
}

export function LossesView({ data, filters, onFiltersChange, formatCurrency, formatPeriod }: LossesViewProps) {
  const { loading, lossesStats, lossesByOrigin, lossesByResponsible, lossesOverTime } = data

  // Contar filtros ativos
  const activeFiltersCount = [
    filters.pipelines?.length || 0,
    filters.origins?.length || 0,
    filters.responsibles?.length || 0
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <AnalyticsViewHeader
        title="Perdas"
        subtitle="Análise de leads perdidos e oportunidades"
        period={formatPeriod(filters.period.start, filters.period.end)}
        filterComponent={
          <SalesFilterSelector
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        }
        activeFiltersCount={activeFiltersCount}
      />

      {/* Conteúdo */}
      <div className="p-6 space-y-6">
        {/* KPIs de Perdas */}
        {lossesStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard
              title="Quantidade de Perdas"
              value={lossesStats.total_losses}
              subtitle="Leads perdidos no período"
              icon={<XMarkIcon className="w-6 h-6" />}
              color="red"
              loading={loading}
            />
            <KPICard
              title="Valor Potencial Perdido"
              value={formatCurrency(lossesStats.losses_value)}
              subtitle="Total de oportunidades perdidas"
              icon={<CurrencyDollarIcon className="w-6 h-6" />}
              color="amber"
              loading={loading}
            />
            <KPICard
              title="Ticket Médio"
              value={formatCurrency(lossesStats.average_ticket)}
              subtitle="Valor médio por perda"
              icon={<ChartBarIcon className="w-6 h-6" />}
              color="amber"
              loading={loading}
            />
          </div>
        )}

        {/* Perdas por Origem - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Perdas por Origem"
            data={lossesByOrigin}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="origin"
            color="#EF4444"
            loading={loading}
          />
          <DataTableWidget
            title="Detalhes de Perdas por Origem"
            data={lossesByOrigin}
            columns={[
              { 
                key: 'origin', 
                label: 'Origem',
                render: (val) => val || 'Não informado'
              },
              { 
                key: 'count', 
                label: 'Qtd',
                render: (val) => val.toLocaleString('pt-BR')
              },
              { 
                key: 'percentage', 
                label: '%',
                render: (val) => `${val.toFixed(1)}%`
              },
              { 
                key: 'total_value', 
                label: 'Valor Potencial',
                render: (val) => formatCurrency(val || 0)
              },
              { 
                key: 'average_value', 
                label: 'Ticket Médio',
                render: (val) => formatCurrency(val || 0)
              }
            ]}
            loading={loading}
          />
        </div>

        {/* Perdas por Responsável - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Perdas por Responsável"
            data={lossesByResponsible}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="responsible_name"
            color="#F59E0B"
            loading={loading}
          />
          <DataTableWidget
            title="Detalhes de Perdas por Responsável"
            data={lossesByResponsible}
            columns={[
              { 
                key: 'responsible_name', 
                label: 'Responsável',
                render: (val) => val || 'Sem responsável'
              },
              { 
                key: 'count', 
                label: 'Qtd',
                render: (val) => val.toLocaleString('pt-BR')
              },
              { 
                key: 'percentage', 
                label: '%',
                render: (val) => `${val.toFixed(1)}%`
              },
              { 
                key: 'total_value', 
                label: 'Valor Potencial',
                render: (val) => formatCurrency(val || 0)
              },
              { 
                key: 'average_value', 
                label: 'Ticket Médio',
                render: (val) => formatCurrency(val || 0)
              }
            ]}
            loading={loading}
          />
        </div>

        {/* Evolução de Perdas no Tempo */}
        <LineChartWidget
          title="Evolução de Perdas"
          data={lossesOverTime || []}
          dataKey="value"
          dataKeyLabel="Quantidade de Perdas"
          xAxisKey="date"
          loading={loading}
        />
      </div>
    </div>
  )
}

