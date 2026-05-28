import {
  CubeIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  TagIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { KPICard } from '../KPICard'
import type { ProductInventoryStats } from '../../../types'

interface StockKpisProps {
  stats: ProductInventoryStats | null
  loading: boolean
  formatCurrency: (value: number) => string
}

export function StockKpis({ stats, loading, formatCurrency }: StockKpisProps) {
  if (!stats && !loading) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4">
      <KPICard
        title="Produtos"
        value={stats?.total_products ?? 0}
        subtitle="Em estoque"
        icon={<CubeIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
        color="blue"
        loading={loading}
      />
      <KPICard
        title="Serviços"
        value={stats?.total_services ?? 0}
        subtitle="Cadastrados"
        icon={<WrenchScrewdriverIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
        color="purple"
        loading={loading}
      />
      <KPICard
        title="Valor em Estoque"
        value={formatCurrency(stats?.total_value ?? 0)}
        subtitle="Soma (preço × qtd)"
        icon={<CurrencyDollarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
        color="teal"
        loading={loading}
      />
      <KPICard
        title="Preço Médio"
        value={formatCurrency(stats?.average_price ?? 0)}
        subtitle="Itens disponíveis"
        icon={<TagIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
        color="indigo"
        loading={loading}
      />
      <KPICard
        title="Baixo Estoque"
        value={stats?.low_stock_count ?? 0}
        subtitle="Itens com pouca qtd"
        icon={<ExclamationTriangleIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
        color="amber"
        loading={loading}
      />
    </div>
  )
}
