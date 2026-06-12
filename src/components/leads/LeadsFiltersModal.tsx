import { XMarkIcon, FunnelIcon, TagIcon, GlobeAltIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import type { Pipeline, Stage, LeadCustomField, LossReason } from '../../types'
import { getEmpresaUsers } from '../../services/empresaService'
import { FilterChipGroup } from '../ui/FilterChipGroup'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { getCustomFieldsByPipeline } from '../../services/leadCustomFieldService'
import { getLossReasons } from '../../services/lossReasonService'
import { useAuthContext } from '../../contexts/AuthContext'
import { VehicleSelector } from './forms/VehicleSelector'
import { ProductSelector } from './forms/ProductSelector'

// Interface para filtros de campos personalizados
export interface CustomFieldFilter {
  field_id: string
  value: string
}

interface LeadsFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: LeadsFilters
  onApplyFilters: (filters: LeadsFilters) => void
  pipelines: Pipeline[]
  stages: Stage[]
  availableTags?: string[]
  availableOrigins?: string[]
}

export interface LeadsFilters {
  searchTerm: string
  selectedPipelines: string[]
  selectedStages: string[]
  selectedStatuses: string[]
  dateFrom?: string
  dateTo?: string
  showLostLeads: boolean
  showSoldLeads: boolean
  responsible_uuids?: string[]
  selectedTags?: string[]
  selectedOrigins?: string[]
  customFieldFilters?: CustomFieldFilter[]
  selectedLossReasons?: string[]
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
  stages,
  availableTags = [],
  availableOrigins = []
}: LeadsFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<LeadsFilters>(filters)
  const [users, setUsers] = useState<Array<{ uuid: string; full_name: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [loadingCustomFields, setLoadingCustomFields] = useState(false)
  const [lossReasons, setLossReasons] = useState<LossReason[]>([])
  const [loadingLossReasons, setLoadingLossReasons] = useState(false)
  const { profile } = useAuthContext()
  const empresaId = profile?.empresa_id

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

  // Carregar motivos de perda
  useEffect(() => {
    const loadLossReasons = async () => {
      if (isOpen) {
        try {
          setLoadingLossReasons(true)
          const pipelineId = localFilters.selectedPipelines.length === 1 ? localFilters.selectedPipelines[0] : null
          const { data, error } = await getLossReasons(pipelineId)
          if (!error && data) {
            setLossReasons(data as LossReason[])
          }
        } catch (err) {
          console.error('Erro ao carregar motivos de perda:', err)
          setLossReasons([])
        } finally {
          setLoadingLossReasons(false)
        }
      }
    }

    loadLossReasons()
  }, [isOpen, localFilters.selectedPipelines])

  // Carregar campos personalizados
  useEffect(() => {
    const loadCustomFields = async () => {
      if (isOpen) {
        try {
          setLoadingCustomFields(true)
          // Buscar campos globais (null) + campos da pipeline selecionada (quando há apenas uma)
          const pipelineId = localFilters.selectedPipelines.length === 1 ? localFilters.selectedPipelines[0] : null
          const { data, error } = await getCustomFieldsByPipeline(pipelineId)
          if (!error && data) {
            setCustomFields(data)
          }
        } catch (err) {
          console.error('Erro ao carregar campos personalizados:', err)
          setCustomFields([])
        } finally {
          setLoadingCustomFields(false)
        }
      }
    }

    loadCustomFields()
  }, [isOpen, localFilters.selectedPipelines])

  const handleApply = () => {
    onApplyFilters(localFilters)
    onClose()
  }

  const handleClearAndApply = () => {
    const resetFilters: LeadsFilters = {
      searchTerm: '',
      selectedPipelines: [],
      selectedStages: [],
      selectedStatuses: [],
      dateFrom: undefined,
      dateTo: undefined,
      showLostLeads: false,
      showSoldLeads: false,
      responsible_uuids: [],
      selectedTags: [],
      selectedOrigins: [],
      customFieldFilters: [],
      selectedLossReasons: [],
    }
    onApplyFilters(resetFilters)
    onClose()
  }

  // Helper genérico para alternar um valor dentro de um array
  const toggleValue = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value]

  // Atualizar filtro de campo personalizado
  const updateCustomFieldFilter = (fieldId: string, value: string) => {
    const currentFilters = localFilters.customFieldFilters || []
    const existingIndex = currentFilters.findIndex(f => f.field_id === fieldId)
    
    let newFilters: CustomFieldFilter[]
    if (value.trim() === '') {
      // Remove o filtro se valor vazio
      newFilters = currentFilters.filter(f => f.field_id !== fieldId)
    } else if (existingIndex >= 0) {
      // Atualiza filtro existente
      newFilters = currentFilters.map((f, i) => 
        i === existingIndex ? { ...f, value } : f
      )
    } else {
      // Adiciona novo filtro
      newFilters = [...currentFilters, { field_id: fieldId, value }]
    }
    
    setLocalFilters({ ...localFilters, customFieldFilters: newFilters })
  }

  // Obter valor de um filtro de campo personalizado
  const getCustomFieldFilterValue = (fieldId: string): string => {
    const filter = (localFilters.customFieldFilters || []).find(f => f.field_id === fieldId)
    return filter?.value || ''
  }

  // Filtrar stages dos pipelines selecionados (união)
  const availableStages = localFilters.selectedPipelines.length > 0
    ? stages.filter(s => localFilters.selectedPipelines.includes(s.pipeline_id))
    : []
  
  useEscapeKey(isOpen, onClose)

  // Toggle pipeline (multi-select); remove etapas que deixaram de pertencer aos pipelines escolhidos
  const togglePipeline = (pipelineId: string) => {
    const nextPipelines = toggleValue(localFilters.selectedPipelines, pipelineId)
    const validStageIds = stages
      .filter(s => nextPipelines.includes(s.pipeline_id))
      .map(s => s.id)
    setLocalFilters({
      ...localFilters,
      selectedPipelines: nextPipelines,
      selectedStages: localFilters.selectedStages.filter(id => validStageIds.includes(id))
    })
  }

  // Toggle etapa (multi-select)
  const toggleStage = (stageId: string) => {
    setLocalFilters({
      ...localFilters,
      selectedStages: toggleValue(localFilters.selectedStages, stageId)
    })
  }

  // Toggle status (multi-select)
  const toggleStatus = (status: string) => {
    setLocalFilters({
      ...localFilters,
      selectedStatuses: toggleValue(localFilters.selectedStatuses, status)
    })
  }

  // Toggle responsável (multi-select)
  const toggleResponsible = (uuid: string) => {
    setLocalFilters({
      ...localFilters,
      responsible_uuids: toggleValue(localFilters.responsible_uuids || [], uuid)
    })
  }

  // Toggle origem (multi-select)
  const toggleOrigin = (origin: string) => {
    setLocalFilters({
      ...localFilters,
      selectedOrigins: toggleValue(localFilters.selectedOrigins || [], origin)
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

  // Toggle motivo de perda (multi-select)
  const toggleLossReason = (reasonId: string) => {
    const current = localFilters.selectedLossReasons || []
    const isSelected = current.includes(reasonId)
    
    setLocalFilters({
      ...localFilters,
      selectedLossReasons: isSelected
        ? current.filter(id => id !== reasonId)
        : [...current, reasonId]
    })
  }

  // Verificar se deve mostrar filtro de motivos de perda
  const showLossReasonFilter = localFilters.showLostLeads || localFilters.selectedStatuses.includes('perdido')

  // Contar filtros ativos
  const activeFiltersCount = 
    (localFilters.searchTerm.trim() ? 1 : 0) +
    (localFilters.selectedPipelines.length > 0 ? 1 : 0) +
    (localFilters.selectedStages.length > 0 ? 1 : 0) +
    (localFilters.selectedStatuses.length > 0 ? 1 : 0) +
    (localFilters.dateFrom || localFilters.dateTo ? 1 : 0) +
    (localFilters.showLostLeads ? 1 : 0) +
    (localFilters.showSoldLeads ? 1 : 0) +
    ((localFilters.responsible_uuids?.length || 0) > 0 ? 1 : 0) +
    ((localFilters.selectedTags?.length || 0) > 0 ? 1 : 0) +
    ((localFilters.selectedOrigins?.length || 0) > 0 ? 1 : 0) +
    ((localFilters.customFieldFilters?.length || 0) > 0 ? 1 : 0) +
    ((localFilters.selectedLossReasons?.length || 0) > 0 ? 1 : 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
              <FunnelIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <h2 className="text-base sm:text-xl font-semibold text-gray-900">
              Filtros de Leads
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
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
            <FilterChipGroup
              options={pipelines.map(p => ({ value: p.id, label: p.name }))}
              selected={localFilters.selectedPipelines}
              onToggle={togglePipeline}
              helperText="{count} pipeline(s) selecionado(s)"
              emptyMessage="Nenhum pipeline disponível"
            />
          </div>

          {/* Seção: Etapa */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Etapa
            </h3>
            {localFilters.selectedPipelines.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1">
                Selecione um pipeline primeiro
              </p>
            ) : (
              <FilterChipGroup
                options={availableStages.map(s => ({ value: s.id, label: s.name }))}
                selected={localFilters.selectedStages}
                onToggle={toggleStage}
                helperText="{count} etapa(s) selecionada(s)"
                emptyMessage="Nenhuma etapa disponível"
              />
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
                    ${localFilters.selectedStatuses.includes(option.value)
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
            {loadingUsers ? (
              <p className="text-xs text-gray-500">Carregando responsáveis...</p>
            ) : (
              <FilterChipGroup
                options={users.map(user => ({ value: user.uuid, label: user.full_name }))}
                selected={localFilters.responsible_uuids || []}
                onToggle={toggleResponsible}
                helperText="{count} responsável(is) selecionado(s)"
                emptyMessage="Nenhum responsável disponível"
              />
            )}
          </div>

          {/* Seção: Tags */}
          {availableTags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1.5">
                <TagIcon className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => {
                  const isSelected = (localFilters.selectedTags || []).includes(tag)
                  return (
                    <button
                      key={tag}
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
                  {localFilters.selectedTags?.length} tag(s) selecionada(s) - mostrando leads com qualquer uma delas
                </p>
              )}
            </div>
          )}

          {/* Seção: Origem */}
          {availableOrigins.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1.5">
                <GlobeAltIcon className="w-4 h-4" />
                Origem
              </h3>
              <FilterChipGroup
                options={availableOrigins.map(origin => ({ value: origin, label: origin }))}
                selected={localFilters.selectedOrigins || []}
                onToggle={toggleOrigin}
                helperText="{count} origem(ns) selecionada(s)"
              />
            </div>
          )}

          {/* Seção: Campos Personalizados */}
          {customFields.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1.5">
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
                Campos Personalizados
              </h3>
              <div className="space-y-3">
                {loadingCustomFields ? (
                  <p className="text-xs text-gray-500">Carregando campos...</p>
                ) : (
                  customFields.map(field => (
                    <div key={field.id}>
                      <label className="block text-xs text-gray-600 mb-1">
                        {field.name}
                      </label>
                      {field.type === 'select' || field.type === 'multiselect' ? (
                        <select
                          value={getCustomFieldFilterValue(field.id)}
                          onChange={(e) => updateCustomFieldFilter(field.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        >
                          <option value="">Todos</option>
                          {(field.options || []).map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'vehicle' ? (
                        empresaId ? (
                          <VehicleSelector
                            value={getCustomFieldFilterValue(field.id)}
                            onChange={(value) => updateCustomFieldFilter(field.id, value)}
                            empresaId={empresaId}
                          />
                        ) : (
                          <div className="text-sm text-gray-500 py-2">Carregando...</div>
                        )
                      ) : field.type === 'product' ? (
                        empresaId ? (
                          <ProductSelector
                            value={getCustomFieldFilterValue(field.id)}
                            onChange={(value) => updateCustomFieldFilter(field.id, value)}
                            empresaId={empresaId}
                          />
                        ) : (
                          <div className="text-sm text-gray-500 py-2">Carregando...</div>
                        )
                      ) : field.type === 'date' ? (
                        <input
                          type="date"
                          value={getCustomFieldFilterValue(field.id)}
                          onChange={(e) => updateCustomFieldFilter(field.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        />
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          value={getCustomFieldFilterValue(field.id)}
                          onChange={(e) => updateCustomFieldFilter(field.id, e.target.value)}
                          placeholder={`Filtrar por ${field.name.toLowerCase()}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        />
                      ) : (
                        <input
                          type="text"
                          value={getCustomFieldFilterValue(field.id)}
                          onChange={(e) => updateCustomFieldFilter(field.id, e.target.value)}
                          placeholder={`Filtrar por ${field.name.toLowerCase()}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
              {(localFilters.customFieldFilters?.length || 0) > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {localFilters.customFieldFilters?.length} campo(s) personalizado(s) em uso
                </p>
              )}
            </div>
          )}

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
                    showLostLeads: e.target.checked,
                    selectedLossReasons: e.target.checked ? localFilters.selectedLossReasons : []
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

            {/* Motivos de perda - aparece quando showLostLeads está ativo ou status é perdido */}
            {showLossReasonFilter && (
              <div className="ml-9 mt-1 mb-2">
                <label className="block text-xs text-gray-600 mb-1.5">
                  Filtrar por motivo de perda
                </label>
                {loadingLossReasons ? (
                  <p className="text-xs text-gray-500">Carregando motivos...</p>
                ) : lossReasons.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {lossReasons.map(reason => {
                      const isSelected = (localFilters.selectedLossReasons || []).includes(reason.id)
                      return (
                        <button
                          key={reason.id}
                          onClick={() => toggleLossReason(reason.id)}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${isSelected
                              ? 'bg-red-100 text-red-700 ring-2 ring-offset-1 ring-orange-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                        >
                          {reason.name}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Nenhum motivo cadastrado</p>
                )}
                {(localFilters.selectedLossReasons?.length || 0) > 0 && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    {localFilters.selectedLossReasons?.length} motivo(s) selecionado(s)
                  </p>
                )}
              </div>
            )}
            
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
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3 p-3 sm:p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={handleClearAndApply}
            className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
          >
            Limpar Filtros
          </button>
          <div className="flex gap-2 order-1 sm:order-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

