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
import type { SalesAnalyticsFilters } from '../../../types'

interface SalesViewProps {
  data: any
  filters: SalesAnalyticsFilters
  formatCurrency: (value: number) => string
  formatPeriod: (start: string, end: string) => string
  onOpenMobileMenu?: () => void
  onOpenFilters: () => void
}

export function SalesView({ data, filters, formatCurrency, formatPeriod, onOpenMobileMenu, onOpenFilters }: SalesViewProps) {
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
        subtitle="Análise de vendas e conversão"
        period={formatPeriod(filters.period.start, filters.period.end)}
        activeFiltersCount={activeFiltersCount}
        onOpenMobileMenu={onOpenMobileMenu}
        onOpenFilters={onOpenFilters}
      />

      {/* Conteúdo */}
      <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPIs de Vendas */}
        {salesStats && (
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            <KPICard
              title="Vendas"
              value={salesStats.total_sales}
              subtitle="Confirmadas"
              icon={<CheckCircleIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="green"
              loading={loading}
            />
            <KPICard
              title="Valor"
              value={formatCurrency(salesStats.sales_value)}
              subtitle="Total"
              icon={<CurrencyDollarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="teal"
              loading={loading}
            />
            <KPICard
              title="Ticket Médio"
              value={formatCurrency(salesStats.average_ticket)}
              subtitle="Por venda"
              icon={<FunnelIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="purple"
              loading={loading}
            />
          </div>
        )}

        {/* Vendas por Origem - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
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
            title="Detalhes por Origem"
            data={salesByOrigin}
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

        {/* Vendas por Responsável - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
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
            title="Detalhes por Vendedor"
            data={salesByResponsible}
            columns={[
              { 
                key: 'responsible_name', 
                label: 'Vendedor',
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

