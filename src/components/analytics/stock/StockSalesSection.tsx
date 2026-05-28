import {
  CheckCircleIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { KPICard } from '../KPICard'
import { BarChartWidget } from '../BarChartWidget'
import { LineChartWidget } from '../LineChartWidget'
import { DataTableWidget } from '../DataTableWidget'
import type {
  ProductSalesStats,
  TopSellingProduct,
  ProductSalesOverTimePoint,
  ProductSaleListItem,
} from '../../../types'

interface StockSalesSectionProps {
  loading: boolean
  stats: ProductSalesStats | null
  topSelling: TopSellingProduct[]
  salesOverTime: ProductSalesOverTimePoint[]
  salesList: ProductSaleListItem[]
  formatCurrency: (value: number) => string
}

export function StockSalesSection({
  loading,
  stats,
  topSelling,
  salesOverTime,
  salesList,
  formatCurrency,
}: StockSalesSectionProps) {
  const listTotals = salesList.length > 0
    ? {
        product_name: `Total (${salesList.length.toLocaleString('pt-BR')})`,
        quantidade_vendida: salesList.reduce((s, r) => s + r.quantidade_vendida, 0).toLocaleString('pt-BR'),
        unit_price: '',
        sold_value: formatCurrency(salesList.reduce((s, r) => s + (r.sold_value || 0), 0)),
        sold_at: '',
        responsible_name: '',
      }
    : undefined

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="border-t border-gray-200 pt-4 lg:pt-6">
        <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">
          Vendas no Período
        </h2>

        {/* KPIs de vendas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
          <KPICard
            title="Vendas"
            value={stats?.total_sales ?? 0}
            subtitle="Operações"
            icon={<CheckCircleIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="green"
            loading={loading}
          />
          <KPICard
            title="Receita"
            value={formatCurrency(stats?.total_revenue ?? 0)}
            subtitle="Total vendido"
            icon={<CurrencyDollarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="teal"
            loading={loading}
          />
          <KPICard
            title="Unidades"
            value={(stats?.total_units ?? 0).toLocaleString('pt-BR')}
            subtitle="Itens vendidos"
            icon={<ShoppingBagIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="blue"
            loading={loading}
          />
          <KPICard
            title="Ticket Médio"
            value={formatCurrency(stats?.average_ticket ?? 0)}
            subtitle="Por venda"
            icon={<ChartBarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="purple"
            loading={loading}
          />
        </div>
      </div>

      {/* Evolução temporal */}
      <LineChartWidget
        title="Evolução de Vendas"
        data={salesOverTime}
        dataKey="count"
        dataKeyLabel="Vendas por dia"
        xAxisKey="date"
        loading={loading}
      />

      {/* Ranking de top vendidos + lista */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <BarChartWidget
          title="Top 10 Mais Vendidos"
          data={topSelling.map(t => ({ ...t, name: t.product_name }))}
          dataKey="total_quantity"
          dataKeyLabel="Quantidade"
          xAxisKey="name"
          color="#10B981"
          loading={loading}
        />
        <DataTableWidget
          title="Ranking Detalhado"
          data={topSelling}
          columns={[
            { key: 'product_name', label: 'Produto/Serviço', render: (v) => v || 'N/A' },
            { key: 'marca', label: 'Marca', render: (v) => v || '-' },
            { key: 'total_quantity', label: 'Qtd', render: (v) => v.toLocaleString('pt-BR') },
            { key: 'sales_count', label: 'Vendas', render: (v) => v.toLocaleString('pt-BR') },
            { key: 'total_revenue', label: 'Receita', render: (v) => formatCurrency(v || 0) },
          ]}
          loading={loading}
        />
      </div>

      {/* Lista de vendas no período */}
      <DataTableWidget
        title="Vendas Detalhadas"
        data={salesList}
        columns={[
          { key: 'product_name', label: 'Produto/Serviço', render: (v) => v || 'N/A' },
          { key: 'quantidade_vendida', label: 'Qtd', render: (v) => v.toLocaleString('pt-BR') },
          { key: 'unit_price', label: 'Preço Unit.', render: (v) => v != null ? formatCurrency(v) : '-' },
          { key: 'sold_value', label: 'Total', render: (v) => v != null ? formatCurrency(v) : '-' },
          { key: 'responsible_name', label: 'Vendedor', render: (v) => v || 'Sem responsável' },
          {
            key: 'sold_at',
            label: 'Data',
            render: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-',
          },
        ]}
        loading={loading}
        totals={listTotals}
      />
    </div>
  )
}
