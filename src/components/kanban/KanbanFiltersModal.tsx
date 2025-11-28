import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

interface KanbanFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: KanbanFilters
  onApplyFilters: (filters: KanbanFilters) => void
}

export interface KanbanFilters {
  showLostLeads: boolean
  showSoldLeads: boolean
  status: string[]
  dateFrom?: string
  dateTo?: string
  searchText: string
}

// Opções de status (definidas fora do componente para performance)
const statusOptions = [
  { value: 'quente', label: 'Quente', color: 'bg-red-100 text-red-700' },
  { value: 'morno', label: 'Morno', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'frio', label: 'Frio', color: 'bg-blue-100 text-blue-700' },
]

export function KanbanFiltersModal({ 
  isOpen, 
  onClose, 
  filters,
  onApplyFilters 
}: KanbanFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<KanbanFilters>(filters)

  // Atualizar filtros locais quando props mudam
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters)
    }
  }, [isOpen, filters])

  const handleApply = () => {
    onApplyFilters(localFilters)
    onClose()
  }

  const handleClearAndApply = () => {
    const resetFilters: KanbanFilters = {
      showLostLeads: false,
      showSoldLeads: false,
      status: [],
      dateFrom: undefined,
      dateTo: undefined,
      searchText: '',
    }
    onApplyFilters(resetFilters)
    onClose()
  }
  
  // Toggle status
  const toggleStatus = (status: string) => {
    setLocalFilters({
      ...localFilters,
      status: localFilters.status.includes(status)
        ? localFilters.status.filter(s => s !== status)
        : [...localFilters.status, status]
    })
  }
  
  // Contar filtros ativos
  const activeFiltersCount = 
    (localFilters.showLostLeads ? 1 : 0) +
    (localFilters.showSoldLeads ? 1 : 0) + // Contar se estiver LIGADO (pois padrão é não mostrar)
    localFilters.status.length +
    (localFilters.dateFrom || localFilters.dateTo ? 1 : 0) +
    (localFilters.searchText.trim() ? 1 : 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FunnelIcon className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Filtros do Kanban
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Seção: Busca */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Buscar
            </h3>
            <input
              type="text"
              placeholder="Nome ou telefone do lead..."
              value={localFilters.searchText}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                searchText: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>

          {/* Seção: Data de Criação */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Data de Criação
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">De</label>
                <input
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    dateFrom: e.target.value || undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Até</label>
                <input
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    dateTo: e.target.value || undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Seção: Status */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Status do Lead
            </h3>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleStatus(option.value)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${localFilters.status.includes(option.value)
                      ? `${option.color} ring-2 ring-offset-1 ring-orange-500`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seção: Visualização */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Visualização
            </h3>
            <label className="flex items-start gap-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={localFilters.showLostLeads}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    showLostLeads: e.target.checked
                  })}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Mostrar leads perdidos
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Exibe leads marcados como perdidos com destaque vermelho
                </p>
              </div>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={localFilters.showSoldLeads}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    showSoldLeads: e.target.checked
                  })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Mostrar leads vendidos
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Exibe leads marcados como venda concluída com destaque verde
                </p>
              </div>
            </label>
          </div>

          {/* Contador de filtros ativos */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                Filtros ativos:
              </span>
              <span className="text-sm font-semibold text-orange-600">
                {activeFiltersCount}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClearAndApply}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpar Filtros
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

