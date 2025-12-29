import { 
  CheckCircleIcon,
  CurrencyDollarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { KPICard } from '../KPICard'
import { BarChartWidget } from '../BarChartWidget'
import { LineChartWidget } from '../LineChartWidget'
import { DataTableWidget } from '../DataTableWidget'
import { AnalyticsViewHeader } from '../layout/AnalyticsViewHeader'
import { SalesFilterSelector } from '../SalesFilterSelector'
import type { SalesAnalyticsFilters } from '../../../types'

interface SalesViewProps {
  data: any
  filters: SalesAnalyticsFilters
  onFiltersChange: (filters: SalesAnalyticsFilters) => void
  formatCurrency: (value: number) => string
  formatPeriod: (start: string, end: string) => string
}

export function SalesView({ data, filters, onFiltersChange, formatCurrency, formatPeriod }: SalesViewProps) {
  const { loading, salesStats, salesByOrigin, salesByResponsible, salesOverTime } = data

  // Contar filtros ativos
  const activeFiltersCount = [
    filters.pipelines?.length || 0,
    filters.origins?.length || 0,
    filters.responsibles?.length || 0
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <AnalyticsViewHeader
        title="Vendas"
        subtitle="Análise de vendas confirmadas e conversão"
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
        {/* KPIs de Vendas */}
        {salesStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard
              title="Quantidade de Vendas"
              value={salesStats.total_sales}
              subtitle="Vendas confirmadas no período"
              icon={<CheckCircleIcon className="w-6 h-6" />}
              color="green"
              loading={loading}
            />
            <KPICard
              title="Valor Vendido"
              value={formatCurrency(salesStats.sales_value)}
              subtitle="Total de vendas realizadas"
              icon={<CurrencyDollarIcon className="w-6 h-6" />}
              color="teal"
              loading={loading}
            />
            <KPICard
              title="Ticket Médio"
              value={formatCurrency(salesStats.average_ticket)}
              subtitle="Valor médio por venda"
              icon={<FunnelIcon className="w-6 h-6" />}
              color="purple"
              loading={loading}
            />
          </div>
        )}

        {/* Vendas por Origem - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Vendas por Origem"
            data={salesByOrigin}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="origin"
            color="#10B981"
            loading={loading}
          />
          <DataTableWidget
            title="Detalhes de Vendas por Origem"
            data={salesByOrigin}
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
                label: 'Valor Total',
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

        {/* Vendas por Responsável - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Vendas por Vendedor"
            data={salesByResponsible}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="responsible_name"
            color="#8B5CF6"
            loading={loading}
          />
          <DataTableWidget
            title="Detalhes de Vendas por Vendedor"
            data={salesByResponsible}
            columns={[
              { 
                key: 'responsible_name', 
                label: 'Vendedor',
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
                label: 'Valor Total',
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

        {/* Evolução de Vendas no Tempo */}
        <LineChartWidget
          title="Evolução de Vendas"
          data={salesOverTime || []}
          dataKey="value"
          dataKeyLabel="Quantidade de Vendas"
          xAxisKey="date"
          loading={loading}
        />
      </div>
    </div>
  )
}

