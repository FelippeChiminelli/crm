import { useMemo } from 'react'
import { PieChartWidget } from '../PieChartWidget'
import { DataTableWidget } from '../DataTableWidget'
import { formatPercent, getPlatformLabel } from './metaAdsLabels'
import type { MetaAdsSummaryRow } from '../../../types'

interface MetaAdsPlatformSectionProps {
  platforms: MetaAdsSummaryRow[]
  totals: MetaAdsSummaryRow | null
  loading: boolean
  formatCurrency: (value: number) => string
}

export function MetaAdsPlatformSection({ platforms, totals, loading, formatCurrency }: MetaAdsPlatformSectionProps) {
  // Percentual sobre a soma das plataformas: um lead que entrou por duas conta nas duas
  const rows = useMemo(() => {
    const total = platforms.reduce((sum, row) => sum + row.leads, 0)
    return [...platforms]
      .sort((a, b) => b.leads - a.leads)
      .map((row) => ({
        ...row,
        name: getPlatformLabel(row.platform),
        percentage: total > 0 ? (100 * row.leads) / total : 0
      }))
  }, [platforms])

  const totalsRow = totals && rows.length > 0
    ? {
        name: 'Total',
        leads: totals.leads.toLocaleString('pt-BR'),
        percentage: '100%',
        sales: totals.sales.toLocaleString('pt-BR'),
        conversion_rate: formatPercent(totals.conversion_rate),
        revenue: formatCurrency(totals.revenue)
      }
    : undefined

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <PieChartWidget
        title="Leads por plataforma"
        data={rows}
        dataKey="leads"
        nameKey="name"
        loading={loading}
        showLabels={false}
      />
      <DataTableWidget
        title="Detalhes por plataforma"
        data={rows}
        loading={loading}
        totals={totalsRow}
        columns={[
          { key: 'name', label: 'Plataforma' },
          { key: 'leads', label: 'Leads', render: (value: number) => value.toLocaleString('pt-BR') },
          { key: 'percentage', label: '%', render: (value: number) => formatPercent(value) },
          { key: 'sales', label: 'Vendas', render: (value: number) => value.toLocaleString('pt-BR') },
          { key: 'conversion_rate', label: 'Conversão', render: (value: number) => formatPercent(value) },
          { key: 'revenue', label: 'Receita', render: (value: number) => formatCurrency(value) }
        ]}
      />
    </div>
  )
}
