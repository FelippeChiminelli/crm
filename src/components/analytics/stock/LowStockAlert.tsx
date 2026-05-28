import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { DataTableWidget } from '../DataTableWidget'
import type { LowStockItem } from '../../../types'

interface LowStockAlertProps {
  items: LowStockItem[]
  loading: boolean
  formatCurrency: (value: number) => string
}

export function LowStockAlert({ items, loading, formatCurrency }: LowStockAlertProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
        <h2 className="text-base lg:text-lg font-semibold text-gray-900">
          Alertas de Baixo Estoque
        </h2>
        {items.length > 0 && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
            {items.length}
          </span>
        )}
      </div>

      <DataTableWidget
        title=""
        data={items}
        columns={[
          { key: 'product_name', label: 'Produto', render: (v) => v || 'N/A' },
          { key: 'marca', label: 'Marca', render: (v) => v || '-' },
          { key: 'categoria_nome', label: 'Categoria', render: (v) => v || 'Sem categoria' },
          {
            key: 'quantidade_estoque',
            label: 'Estoque',
            render: (v) => (
              <span className={`font-semibold ${v <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                {v.toLocaleString('pt-BR')}
              </span>
            ),
          },
          { key: 'preco', label: 'Preço', render: (v) => v != null ? formatCurrency(v) : '-' },
        ]}
        loading={loading}
      />
    </div>
  )
}
