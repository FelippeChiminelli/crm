import { BarChartWidget } from '../BarChartWidget'
import { PieChartWidget } from '../PieChartWidget'
import { DataTableWidget } from '../DataTableWidget'
import type { ProductDistributionItem } from '../../../types'

interface StockDistributionsProps {
  loading: boolean
  byMarca: ProductDistributionItem[]
  byStatus: ProductDistributionItem[]
  byType: ProductDistributionItem[]
  formatCurrency: (value: number) => string
}

export function StockDistributions({
  loading,
  byMarca,
  byStatus,
  byType,
  formatCurrency,
}: StockDistributionsProps) {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Distribuição por Marca - Top 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <BarChartWidget
          title="Top 10 Marcas (Estoque)"
          data={byMarca.slice(0, 10).map(d => ({ ...d, name: d.label }))}
          dataKey="count"
          dataKeyLabel="Quantidade"
          xAxisKey="name"
          color="#F59E0B"
          loading={loading}
        />
        <DataTableWidget
          title="Detalhes por Marca"
          data={byMarca}
          columns={[
            { key: 'label', label: 'Marca', render: (v) => v || 'Sem marca' },
            { key: 'count', label: 'Qtd', render: (v) => v.toLocaleString('pt-BR') },
            { key: 'percentage', label: '%', render: (v) => `${v.toFixed(1)}%` },
            { key: 'total_value', label: 'Valor', render: (v) => formatCurrency(v || 0) },
          ]}
          loading={loading}
        />
      </div>

      {/* Produto vs Serviço + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <PieChartWidget
          title="Produtos vs Serviços"
          data={byType.map(d => ({ name: d.label, value: d.count, percentage: d.percentage }))}
          dataKey="value"
          nameKey="name"
          loading={loading}
        />
        <PieChartWidget
          title="Distribuição por Status"
          data={byStatus.map(d => ({ name: d.label, value: d.count, percentage: d.percentage }))}
          dataKey="value"
          nameKey="name"
          loading={loading}
        />
      </div>
    </div>
  )
}
