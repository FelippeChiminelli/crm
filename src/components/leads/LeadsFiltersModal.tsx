import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import type { Pipeline, Stage } from '../../types'
import { getEmpresaUsers } from '../../services/empresaService'
import { StyledSelect } from '../ui/StyledSelect'

interface LeadsFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: LeadsFilters
  onApplyFilters: (filters: LeadsFilters) => void
  pipelines: Pipeline[]
  stages: Stage[]
}

export interface LeadsFilters {
  searchTerm: string
  selectedPipeline: string
  selectedStage: string
  selectedStatus: string
  dateFrom?: string
  dateTo?: string
  showLostLeads: boolean
  showSoldLeads: boolean
  responsible_uuid?: string
}

// Opções de status (definidas fora do componente para performance)
const statusOptions = [
  { value: 'quente', label: 'Quente', color: 'bg-red-100 text-red-700' },
  { value: 'morno', label: 'Morno', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'frio', label: 'Frio', color: 'bg-blue-100 text-blue-700' },
  { value: 'vendido', label: 'Vendidos', color: 'bg-green-100 text-green-700' },
  { value: 'perdido', label: 'Perdidos', color: 'bg-red-100 text-red-700' },
]

export function LeadsFiltersModal({ 
  isOpen, 
  onClose, 
  filters,
  onApplyFilters,
  pipelines,
  stages
}: LeadsFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<LeadsFilters>(filters)
  const [users, setUsers] = useState<Array<{ uuid: string; full_name: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Atualizar filtros locais quando props mudam
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters)
    }
  }, [isOpen, filters])

  // Carregar usuários da empresa
  useEffect(() => {
    const loadUsers = async () => {
      if (isOpen) {
        try {
          setLoadingUsers(true)
          const usersData = await getEmpresaUsers()
          setUsers(usersData || [])
        } catch (err) {
          console.error('Erro ao carregar usuários:', err)
          setUsers([])
        } finally {
          setLoadingUsers(false)
        }
      }
    }

    loadUsers()
  }, [isOpen])

  const handleApply = () => {
    onApplyFilters(localFilters)
    onClose()
  }

  const handleClearAndApply = () => {
    const resetFilters: LeadsFilters = {
      searchTerm: '',
      selectedPipeline: '',
      selectedStage: '',
      selectedStatus: '',
      dateFrom: undefined,
      dateTo: undefined,
      showLostLeads: false,
      showSoldLeads: false,
      responsible_uuid: undefined,
    }
    onApplyFilters(resetFilters)
    onClose()
  }

  // Filtrar stages do pipeline selecionado
  const availableStages = localFilters.selectedPipeline
    ? stages.filter(s => s.pipeline_id === localFilters.selectedPipeline)
    : []
  
  // Toggle status
  const toggleStatus = (status: string) => {
    setLocalFilters({
      ...localFilters,
      selectedStatus: localFilters.selectedStatus === status ? '' : status
    })
  }

  // Contar filtros ativos
  const activeFiltersCount = 
    (localFilters.searchTerm.trim() ? 1 : 0) +
    (localFilters.selectedPipeline ? 1 : 0) +
    (localFilters.selectedStage ? 1 : 0) +
    (localFilters.selectedStatus ? 1 : 0) +
    (localFilters.dateFrom || localFilters.dateTo ? 1 : 0) +
    (localFilters.showLostLeads ? 1 : 0) +
    (localFilters.showSoldLeads ? 1 : 0) +
    (localFilters.responsible_uuid ? 1 : 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-[90%] sm:w-[450px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FunnelIcon className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Filtros de Leads
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
              placeholder="Nome, empresa, telefone ou email..."
              value={localFilters.searchTerm}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                searchTerm: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>

          {/* Seção: Pipeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Pipeline
            </h3>
            <select
              value={localFilters.selectedPipeline}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                selectedPipeline: e.target.value,
                selectedStage: '' // Limpar stage ao mudar pipeline
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            >
              <option value="">Todos os Pipelines</option>
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </div>

          {/* Seção: Etapa */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Etapa
            </h3>
            <select
              value={localFilters.selectedStage}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                selectedStage: e.target.value
              })}
              disabled={!localFilters.selectedPipeline}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Todas as Etapas</option>
              {availableStages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            {!localFilters.selectedPipeline && (
              <p className="text-xs text-gray-500 mt-1">
                Selecione um pipeline primeiro
              </p>
            )}
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
                    ${localFilters.selectedStatus === option.value
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

          {/* Seção: Responsável */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Responsável
            </h3>
            <StyledSelect
              value={localFilters.responsible_uuid || ''}
              onChange={(value) => setLocalFilters({
                ...localFilters,
                responsible_uuid: value || undefined
              })}
              options={[
                { value: '', label: 'Todos os Responsáveis' },
                ...users.map(user => ({
                  value: user.uuid,
                  label: user.full_name
                }))
              ]}
              placeholder="Selecionar responsável"
              disabled={loadingUsers}
            />
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
              <span className="text-sm font-bold text-orange-600">
                {activeFiltersCount}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleClearAndApply}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Limpar Filtros
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-orange-500 border border-transparent rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  )
}

