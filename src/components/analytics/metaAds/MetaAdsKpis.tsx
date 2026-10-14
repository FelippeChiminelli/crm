import type { ReactNode } from 'react'
import {
  BanknotesIcon,
  CheckCircleIcon,
  CursorArrowRaysIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { KPICard } from '../KPICard'
import { formatPercent } from './metaAdsLabels'
import type { MetaAdsLeadCategory, MetaAdsSummaryRow } from '../../../types'

interface MetaAdsKpisProps {
  totals: MetaAdsSummaryRow | null
  loading: boolean
  formatCurrency: (value: number) => string
  onSelect: (category: MetaAdsLeadCategory) => void
}

interface KpiConfig {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  color: 'blue' | 'indigo' | 'green' | 'teal' | 'purple' | 'red'
  // Lista aberta no clique; receita e conversão abrem as vendas que as compõem
  category: MetaAdsLeadCategory
  count: number
}

const iconClass = 'w-4 h-4 lg:w-5 lg:h-5'

function buildKpis(totals: MetaAdsSummaryRow | null, formatCurrency: (value: number) => string): KpiConfig[] {
  const leads = totals?.leads ?? 0
  const sales = totals?.sales ?? 0
  const losses = totals?.losses ?? 0
  const revenue = totals?.revenue ?? 0

  return [
    { title: 'Leads', value: leads, subtitle: `${totals?.open_leads ?? 0} em aberto`, icon: <UserGroupIcon className={iconClass} />, color: 'blue', category: 'leads', count: leads },
    { title: 'Cliques', value: totals?.clicks ?? 0, subtitle: 'Entradas por anúncio', icon: <CursorArrowRaysIcon className={iconClass} />, color: 'indigo', category: 'clicks', count: totals?.clicks ?? 0 },
    { title: 'Vendas', value: sales, icon: <CheckCircleIcon className={iconClass} />, color: 'green', category: 'sales', count: sales },
    { title: 'Receita', value: formatCurrency(revenue), subtitle: sales > 0 ? `Ticket ${formatCurrency(revenue / sales)}` : undefined, icon: <BanknotesIcon className={iconClass} />, color: 'teal', category: 'sales', count: sales },
    { title: 'Conversão', value: formatPercent(totals?.conversion_rate ?? 0), subtitle: 'Leads que viraram venda', icon: <ArrowTrendingUpIcon className={iconClass} />, color: 'purple', category: 'sales', count: sales },
    { title: 'Perdas', value: losses, subtitle: leads > 0 ? `${formatPercent((100 * losses) / leads)} dos leads` : undefined, icon: <XCircleIcon className={iconClass} />, color: 'red', category: 'losses', count: losses }
  ]
}

export function MetaAdsKpis({ totals, loading, formatCurrency, onSelect }: MetaAdsKpisProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <span className="text-xs text-gray-500">Clique em um indicador para ver a lista</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
        {buildKpis(totals, formatCurrency).map((kpi) => (
          <button
            key={kpi.title}
            type="button"
            onClick={() => onSelect(kpi.category)}
            disabled={loading || kpi.count === 0}
            className="text-left rounded-lg hover:ring-2 hover:ring-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 transition-shadow disabled:cursor-default disabled:hover:ring-0"
          >
            <KPICard
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              icon={kpi.icon}
              color={kpi.color}
              loading={loading}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
