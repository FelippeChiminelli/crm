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
import type { SalesAnalyticsFilters } from '../../../types'

interface LossesViewProps {
  data: any
  filters: SalesAnalyticsFilters
  formatCurrency: (value: number) => string
  formatPeriod: (start: string, end: string) => string
  onOpenMobileMenu?: () => void
  onOpenFilters: () => void
}

export function LossesView({ data, filters, formatCurrency, formatPeriod, onOpenMobileMenu, onOpenFilters }: LossesViewProps) {
  const { loading, lossesStats, lossesByOrigin, lossesByResponsible, lossesByReason, lossesOverTime } = data

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
        subtitle="Análise de leads perdidos"
        period={formatPeriod(filters.period.start, filters.period.end)}
        activeFiltersCount={activeFiltersCount}
        onOpenMobileMenu={onOpenMobileMenu}
        onOpenFilters={onOpenFilters}
      />

      {/* Conteúdo */}
      <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPIs de Perdas */}
        {lossesStats && (
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            <KPICard
              title="Perdas"
              value={lossesStats.total_losses}
              subtitle="No período"
              icon={<XMarkIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="red"
              loading={loading}
            />
            <KPICard
              title="Valor Perdido"
              value={formatCurrency(lossesStats.losses_value)}
              subtitle="Potencial"
              icon={<CurrencyDollarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="amber"
              loading={loading}
            />
            <KPICard
              title="Ticket Médio"
              value={formatCurrency(lossesStats.average_ticket)}
              subtitle="Por perda"
              icon={<ChartBarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="amber"
              loading={loading}
            />
          </div>
        )}

        {/* Perdas por Origem - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
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
            title="Detalhes por Origem"
            data={lossesByOrigin}
            columns={[
              { 
                key: 'origin', 
                label: 'Origem',
                render: (val) => val || 'N/A'
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
                label: 'Valor',
                render: (val) => formatCurrency(val || 0)
              }
            ]}
            loading={loading}
          />
        </div>

        {/* Perdas por Responsável - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
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
            title="Detalhes por Responsável"
            data={lossesByResponsible}
            columns={[
              { 
                key: 'responsible_name', 
                label: 'Responsável',
                render: (val) => val || 'N/A'
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
                label: 'Valor',
                render: (val) => formatCurrency(val || 0)
              }
            ]}
            loading={loading}
          />
        </div>

        {/* Perdas por Motivo - Gráfico + Tabela */}
        {lossesByReason && lossesByReason.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <BarChartWidget
              title="Perdas por Motivo"
              data={lossesByReason}
              dataKey="count"
              dataKeyLabel="Quantidade"
              xAxisKey="reason_name"
              color="#DC2626"
              loading={loading}
            />
            <DataTableWidget
              title="Detalhes por Motivo"
              data={lossesByReason}
              columns={[
                { 
                  key: 'reason_name', 
                  label: 'Motivo',
                  render: (val) => val || 'N/A'
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
                  label: 'Valor',
                  render: (val) => formatCurrency(val || 0)
                }
              ]}
              loading={loading}
            />
          </div>
        )}

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

