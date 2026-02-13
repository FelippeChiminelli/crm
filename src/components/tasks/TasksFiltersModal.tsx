import { XMarkIcon, FunnelIcon, TagIcon, UserIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { ds } from '../../utils/designSystem'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface ProfileOption {
  uuid: string
  full_name: string
  email: string
}

interface TasksFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: TasksFilters
  onApplyFilters: (filters: TasksFilters) => void
  availableTags?: string[]
  profiles?: ProfileOption[]
}

export interface TasksFilters {
  searchTerm: string
  statusFilter: string
  priorityFilter: string
  sortBy: string
  sortOrder: string
  selectedTags?: string[]
  assignedToFilter?: string[]
}

const statusOptions = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'pendente', label: '⏳ Pendentes' },
  { value: 'em_andamento', label: '🔄 Em Andamento' },
  { value: 'concluida', label: '✅ Concluídas' },
  { value: 'cancelada', label: '❌ Canceladas' },
  { value: 'atrasada', label: '⚠️ Atrasadas' },
]

const priorityOptions = [
  { value: 'all', label: 'Todas as Prioridades' },
  { value: 'baixa', label: '🟢 Baixa' },
  { value: 'media', label: '🟡 Média' },
  { value: 'alta', label: '🟠 Alta' },
  { value: 'urgente', label: '🔴 Urgente' },
]

const sortByOptions = [
  { value: 'due_date', label: '📅 Data de Vencimento' },
  { value: 'created_at', label: '📝 Data de Criação' },
  { value: 'priority', label: '⚡ Prioridade' },
  { value: 'status', label: '📊 Status' },
]

const sortOrderOptions = [
  { value: 'asc', label: '↗️ Crescente' },
  { value: 'desc', label: '↘️ Decrescente' },
]

export function TasksFiltersModal({ 
  isOpen, 
  onClose, 
  filters,
  onApplyFilters,
  availableTags = [],
  profiles = []
}: TasksFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<TasksFilters>(filters)

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
    const resetFilters: TasksFilters = {
      searchTerm: '',
      statusFilter: 'all',
      priorityFilter: 'all',
      sortBy: 'due_date',
      sortOrder: 'asc',
      selectedTags: [],
      assignedToFilter: [],
    }
    onApplyFilters(resetFilters)
    onClose()
  }

  // Toggle responsável (multi-select)
  const toggleAssignee = (uuid: string) => {
    const currentAssignees = localFilters.assignedToFilter || []
    const isSelected = currentAssignees.includes(uuid)
    
    setLocalFilters({
      ...localFilters,
      assignedToFilter: isSelected 
        ? currentAssignees.filter(a => a !== uuid)
        : [...currentAssignees, uuid]
    })
  }

  // Toggle tag (multi-select)
  const toggleTag = (tag: string) => {
    const currentTags = localFilters.selectedTags || []
    const isSelected = currentTags.includes(tag)
    
    setLocalFilters({
      ...localFilters,
      selectedTags: isSelected 
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag]
    })
  }
  
  useEscapeKey(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={ds.modal.header()}>
            <div className="flex items-center gap-3">
              <FunnelIcon className="w-6 h-6 text-orange-500" />
              <h2 className={ds.modal.title()}>Filtros de Tarefas</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className={ds.modal.content()}>
            <div className="space-y-6">
              {/* Busca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar tarefas
                </label>
                <input
                  type="text"
                  placeholder="Digite para buscar..."
                  value={localFilters.searchTerm}
                  onChange={(e) => setLocalFilters({ ...localFilters, searchTerm: e.target.value })}
                  className={ds.input()}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={localFilters.statusFilter}
                  onChange={(e) => setLocalFilters({ ...localFilters, statusFilter: e.target.value })}
                  className={ds.input()}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridade
                </label>
                <select
                  value={localFilters.priorityFilter}
                  onChange={(e) => setLocalFilters({ ...localFilters, priorityFilter: e.target.value })}
                  className={ds.input()}
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Responsável */}
              {profiles.length > 0 && (
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                    <UserIcon className="w-4 h-4" />
                    Responsável
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map(profile => {
                      const isSelected = (localFilters.assignedToFilter || []).includes(profile.uuid)
                      return (
                        <button
                          key={profile.uuid}
                          type="button"
                          onClick={() => toggleAssignee(profile.uuid)}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-orange-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                        >
                          {profile.full_name || profile.email}
                        </button>
                      )
                    })}
                  </div>
                  {(localFilters.assignedToFilter?.length || 0) > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {localFilters.assignedToFilter?.length} responsável(is) selecionado(s)
                    </p>
                  )}
                </div>
              )}

              {/* Tags */}
              {availableTags.length > 0 && (
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                    <TagIcon className="w-4 h-4" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const isSelected = (localFilters.selectedTags || []).includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-orange-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                  {(localFilters.selectedTags?.length || 0) > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {localFilters.selectedTags?.length} tag(s) selecionada(s) - mostrando tarefas com qualquer uma delas
                    </p>
                  )}
                </div>
              )}

              {/* Ordenação */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordenar por
                  </label>
                  <select
                    value={localFilters.sortBy}
                    onChange={(e) => setLocalFilters({ ...localFilters, sortBy: e.target.value })}
                    className={ds.input()}
                  >
                    {sortByOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordem
                  </label>
                  <select
                    value={localFilters.sortOrder}
                    onChange={(e) => setLocalFilters({ ...localFilters, sortOrder: e.target.value })}
                    className={ds.input()}
                  >
                    {sortOrderOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={ds.modal.footer()}>
            <button
              onClick={handleClearAndApply}
              className={ds.button('outline')}
            >
              Limpar Filtros
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className={ds.button('secondary')}
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                className={ds.button('primary')}
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

