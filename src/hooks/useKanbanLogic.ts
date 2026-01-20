import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import SecureLogger from '../utils/logger'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import { useDeleteConfirmation } from './useDeleteConfirmation'
import { getLeadsByPipelineForKanban, createLead, deleteLead } from '../services/leadService'
import type { CreateLeadData, CustomFieldFilter } from '../services/leadService'
import type { Lead, LeadCustomValue } from '../types'
import { getCustomValuesByLeads } from '../services/leadCustomValueService'

interface UseKanbanLogicProps {
  selectedPipeline: string
  stages: any[]
}

export function useKanbanLogic({ selectedPipeline, stages }: UseKanbanLogicProps) {
  const { user } = useAuthContext()
  const { showError } = useToastContext()
  const { executeDelete } = useDeleteConfirmation({
    defaultConfirmMessage: 'Tem certeza que deseja excluir este lead?',
    defaultErrorContext: 'ao excluir lead'
  })
  const [leadsByStage, setLeadsByStage] = useState<{ [key: string]: Lead[] }>({})
  const [leadsLimitReached, setLeadsLimitReached] = useState(false)
  const [totalLeads, setTotalLeads] = useState(0)
  const [leadsLoading, setLeadsLoading] = useState(false)
  // Flag para controlar se já estamos carregando leads (evita duplicação)
  const [isLoadingLeads, setIsLoadingLeads] = useState(false)
  // Ref para armazenar o último estado carregado (pipeline + stages)
  const lastLoadedStateRef = useRef<string>('')
  // Estado para armazenar custom values em batch
  const [customValuesByLead, setCustomValuesByLead] = useState<{ [leadId: string]: { [fieldId: string]: LeadCustomValue } }>({})
  // Estado para armazenar contagens totais por estágio
  const [totalCountsByStage, setTotalCountsByStage] = useState<{ [stageId: string]: number }>({})

  // Estados do modal de criação de lead
  const [showNewLeadForm, setShowNewLeadForm] = useState(false)
  const [newLeadStageId, setNewLeadStageId] = useState<string>('')

  // Estados para filtros do Kanban
  const [showLostLeads, setShowLostLeads] = useState(false)
  const [showSoldLeads, setShowSoldLeads] = useState(false) // Por padrão não mostra vendidos
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [dateFromFilter, setDateFromFilter] = useState<string | undefined>(undefined)
  const [dateToFilter, setDateToFilter] = useState<string | undefined>(undefined)
  const [searchTextFilter, setSearchTextFilter] = useState('')
  const [responsibleFilter, setResponsibleFilter] = useState<string | undefined>(undefined)
  const [tagsFilter, setTagsFilter] = useState<string[]>([])
  const [originFilter, setOriginFilter] = useState<string | undefined>(undefined)
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilter[]>([])

  // Criar identificador único para a combinação pipeline + stages + filtros
  const currentStateId = useMemo(() => {
    if (!selectedPipeline || stages.length === 0) return ''
    const customFieldsKey = customFieldFilters.map(f => `${f.field_id}:${f.value}`).sort().join(',')
    return `${selectedPipeline}:${stages.map(s => s.id).sort().join(',')}:lost-${showLostLeads}:sold-${showSoldLeads}:status-${statusFilter.sort().join(',')}:date-${dateFromFilter}-${dateToFilter}:search-${searchTextFilter}:responsible-${responsibleFilter}:tags-${tagsFilter.sort().join(',')}:origin-${originFilter}:custom-${customFieldsKey}`
  }, [selectedPipeline, stages, showLostLeads, showSoldLeads, statusFilter, dateFromFilter, dateToFilter, searchTextFilter, responsibleFilter, tagsFilter, originFilter, customFieldFilters])

  // Estados do formulário de criação
  const [newLeadData, setNewLeadData] = useState<CreateLeadData>({
    name: '',
    company: '',
    value: 0,
    phone: '',
    email: '',
    origin: '',
    status: undefined,
    notes: '',
    pipeline_id: '',
    stage_id: '',
    responsible_uuid: user?.id || ''
  })

  // OTIMIZAÇÃO: Carregar leads uma única vez quando pipeline ou stages mudarem
  useEffect(() => {
    async function loadPipelineLeads() {
      // Não carregar se não há pipeline
      if (!selectedPipeline) {
        // Limpar leads apenas se não houver pipeline
        setLeadsByStage({})
        lastLoadedStateRef.current = ''
        setLeadsLoading(false)
        return
      }

      // Permitir carregamento mesmo com stages vazio (será rápido no backend)
      if (stages.length === 0) {
        // Não retornar, apenas aguardar um pouco
        // O useEffect será chamado novamente quando stages chegarem
        setLeadsLoading(false)
        return
      }

      // Verificar se já carregamos este estado exato
      if (lastLoadedStateRef.current === currentStateId) {
        return
      }

      // Se já estamos carregando E é para um estado diferente, 
      // significa que o usuário trocou de pipeline durante o carregamento
      // Neste caso, vamos resetar e permitir que o novo carregamento prossiga
      if (isLoadingLeads && lastLoadedStateRef.current !== currentStateId) {
        setIsLoadingLeads(false)
        // Permitir que o novo carregamento prossiga
      }
      
      const startTime = performance.now()

      try {
        setIsLoadingLeads(true)
        setLeadsLoading(true)
        
        // Preparar filtros para o backend
        const filters = {
          status: statusFilter,
          showLostLeads,
          showSoldLeads,
          dateFrom: dateFromFilter,
          dateTo: dateToFilter,
          search: searchTextFilter,
          responsible_uuid: responsibleFilter,
          tags: tagsFilter.length > 0 ? tagsFilter : undefined,
          origin: originFilter,
          customFieldFilters: customFieldFilters.length > 0 ? customFieldFilters : undefined
        }
        
        // Buscar leads filtrados do backend (usando função otimizada)
        const { data: allLeads, reachedLimit, total, countsByStage } = await getLeadsByPipelineForKanban(selectedPipeline, filters)
        
        setLeadsLimitReached(!!reachedLimit)
        setTotalLeads(total || 0)
        setTotalCountsByStage(countsByStage || {})
        
        // Agrupar leads por stage no frontend (apenas distribuição)
        const leadsMap: { [key: string]: Lead[] } = {}
        
        // Inicializar todos os stages com array vazio
        stages.forEach(stage => {
          leadsMap[stage.id] = []
        })
        
        // Distribuir leads nos stages correspondentes
        if (allLeads) {
          allLeads.forEach(lead => {
            // O backend já filtrou os dados, apenas distribuímos
            if (lead.stage_id && leadsMap[lead.stage_id]) {
              leadsMap[lead.stage_id].push(lead)
            }
          })
        }
        
        // Log dos resultados por stage
        SecureLogger.log('📈 Distribuição de leads por stage (Backend Filtered):')
        Object.entries(leadsMap).forEach(([stageId, stageLeads]) => {
          const stageName = stages.find(s => s.id === stageId)?.name || 'Desconhecido'
          SecureLogger.log(`  - ${stageName}: ${stageLeads.length} leads`)
        })
        
        // Atualizar estado dos leads IMEDIATAMENTE (não esperar custom values)
        setLeadsByStage(leadsMap)
        
        // AGORA carregar custom values em background (não bloqueia renderização)
        const allLeadIds = allLeads?.map(l => l.id) || []
        if (allLeadIds.length > 0) {
          getCustomValuesByLeads(allLeadIds).then(({ data: customValuesData }) => {
            if (customValuesData) {
              const valuesByLead: { [leadId: string]: { [fieldId: string]: LeadCustomValue } } = {}
              customValuesData.forEach(value => {
                if (!valuesByLead[value.lead_id]) {
                  valuesByLead[value.lead_id] = {}
                }
                valuesByLead[value.lead_id][value.field_id] = value
              })
              setCustomValuesByLead(valuesByLead)
              SecureLogger.log(`✅ Custom values carregados: ${customValuesData.length} valores`)
            }
          }).catch(error => {
            SecureLogger.error('❌ Erro ao carregar custom values:', error)
          })
        } else {
          setCustomValuesByLead({})
        }
        
        // Marcar este estado como carregado
        lastLoadedStateRef.current = currentStateId
        
      } catch (error) {
        SecureLogger.error('❌ Erro ao carregar leads do pipeline:', error)
        // Limpar em caso de erro para permitir retry
        lastLoadedStateRef.current = ''
        
        // Fallback removido pois a filtragem complexa agora é no backend
        // e getLeadsByStage não suporta todos esses filtros facilmente
        setLeadsByStage({})
      } finally {
        const endTime = performance.now()
        SecureLogger.log(`⏱️ CONCLUÍDO - Tempo total de carregamento: ${(endTime - startTime).toFixed(2)}ms`)
        setLeadsLoading(false)
        setIsLoadingLeads(false)
      }
    }

    loadPipelineLeads()
  }, [currentStateId]) // Reagir quando o estado único mudar (pipeline + stages)

  // Cleanup: Limpar cache ao trocar de pipeline
  useEffect(() => {
    return () => {
      // Ao desmontar ou trocar pipeline, limpar cache
      if (selectedPipeline) {
        lastLoadedStateRef.current = ''
        SecureLogger.log('🔄 Pipeline mudou - cache limpo')
      }
    }
  }, [selectedPipeline])

  // Função para recarregar leads manualmente
  const reloadLeads = useCallback(async () => {
    if (!stages.length || !selectedPipeline) {
      return
    }

    SecureLogger.log('🔄 Recarregando leads manualmente...')
    // Limpar cache para forçar reload
    lastLoadedStateRef.current = ''
    const startTime = performance.now()

    try {
      setLeadsLoading(true)
      setIsLoadingLeads(true)
      
      // Preparar filtros para o backend
      const filters = {
        status: statusFilter,
        showLostLeads,
        showSoldLeads,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
        search: searchTextFilter,
        responsible_uuid: responsibleFilter,
        tags: tagsFilter.length > 0 ? tagsFilter : undefined
      }
      
      // OTIMIZAÇÃO: Buscar todos os leads do pipeline de uma vez (com filtros, usando função otimizada)
      const { data: allLeads, reachedLimit, total, countsByStage } = await getLeadsByPipelineForKanban(selectedPipeline, filters)      
      setLeadsLimitReached(!!reachedLimit)
      setTotalLeads(total || 0)
      setTotalCountsByStage(countsByStage || {})
      
      // Agrupar leads por stage no frontend
      const leadsMap: { [key: string]: Lead[] } = {}
      
      // Inicializar todos os stages com array vazio
      stages.forEach(stage => {
        leadsMap[stage.id] = []
      })
      
      // Distribuir leads nos stages correspondentes
      if (allLeads) {
        allLeads.forEach(lead => {
          if (leadsMap[lead.stage_id]) {
            leadsMap[lead.stage_id].push(lead)
          }
        })
      }

      // Atualizar estado dos leads IMEDIATAMENTE (não esperar custom values)
      setLeadsByStage(leadsMap)
      
      // Log da distribuição
      SecureLogger.log('📈 Distribuição de leads por stage (Reloaded):')
      stages.forEach(stage => {
        SecureLogger.log(`  - ${stage.name}: ${leadsMap[stage.id]?.length || 0} leads`)
      })
      
      // AGORA carregar custom values em background (não bloqueia renderização)
      const allLeadIds = allLeads?.map(l => l.id) || []
      if (allLeadIds.length > 0) {
        getCustomValuesByLeads(allLeadIds).then(({ data: customValuesData }) => {
          if (customValuesData) {
            const valuesByLead: { [leadId: string]: { [fieldId: string]: LeadCustomValue } } = {}
            customValuesData.forEach(value => {
              if (!valuesByLead[value.lead_id]) {
                valuesByLead[value.lead_id] = {}
              }
              valuesByLead[value.lead_id][value.field_id] = value
            })
            setCustomValuesByLead(valuesByLead)
            SecureLogger.log(`✅ Custom values recarregados: ${customValuesData.length} valores`)
          }
        }).catch(error => {
          SecureLogger.error('❌ Erro ao carregar custom values no reload:', error)
        })
      } else {
        setCustomValuesByLead({})
      }
      
      const endTime = performance.now()
      SecureLogger.log(`⏱️ RECARREGAMENTO CONCLUÍDO - Tempo: ${(endTime - startTime).toFixed(2)}ms`)
      
      // Atualizar cache com o estado atual
      if (currentStateId) {
        lastLoadedStateRef.current = currentStateId
      }
    } catch (error) {
      SecureLogger.error('❌ Erro ao recarregar leads:', error)
      lastLoadedStateRef.current = ''
    } finally {
      setLeadsLoading(false)
      setIsLoadingLeads(false)
    }
  }, [stages, selectedPipeline, currentStateId])

  // Função para invalidar cache manualmente
  const invalidateCache = useCallback(() => {
    lastLoadedStateRef.current = ''
    SecureLogger.log('🔄 Cache invalidado - próximo acesso recarregará dados')
  }, [])

  const handleCreateLead = async () => {
    if (!user) return
    
    try {
      const { data } = await createLead({
        ...newLeadData,
        stage_id: newLeadStageId,
        pipeline_id: selectedPipeline,
        responsible_uuid: user.id
      })
      
      if (data) {
        setLeadsByStage(prev => ({
          ...prev,
          [newLeadStageId]: [...(prev[newLeadStageId] || []), data]
        }))
        
        // Reset form
        setNewLeadData({
          name: '',
          company: '',
          value: 0,
          phone: '',
          email: '',
          origin: '',
          status: undefined,
          notes: '',
          pipeline_id: '',
          stage_id: '',
          responsible_uuid: user.id
        })
        setShowNewLeadForm(false)
      }
    } catch (error) {
      SecureLogger.error('Erro ao criar lead:', error)
      showError('Erro ao criar lead', 'Tente novamente.')
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    const result = await executeDelete(
      () => deleteLead(leadId),
      'Tem certeza que deseja excluir este lead?',
      'ao excluir lead'
    )
    
    if (result !== null) {
      // Remover do estado local
      setLeadsByStage(prev => {
        const newState = { ...prev }
        
        Object.keys(newState).forEach(stageId => {
          newState[stageId] = newState[stageId].filter(lead => lead.id !== leadId)
        })
        
        return newState
      })
      
      // Invalidar cache para próximo carregamento
      invalidateCache()
    }
  }

  const openNewLeadForm = (stageId: string) => {
    setNewLeadStageId(stageId)
    setShowNewLeadForm(true)
  }

  const closeNewLeadForm = () => {
    setShowNewLeadForm(false)
    setNewLeadStageId('')
  }

  // Cleanup global ao desmontar componente
  useEffect(() => {
    return () => {
      SecureLogger.log('🧹 useKanbanLogic desmontando - limpando estados')
      setLeadsByStage({})
      setCustomValuesByLead({})
      lastLoadedStateRef.current = ''
    }
  }, [])

  return {
    // Estados
    leadsByStage,
    setLeadsByStage,
    leadsLimitReached,
    totalLeads,
    leadsLoading,
    newLeadStageId,
    customValuesByLead,
    totalCountsByStage,
    
    // Filtros
    showLostLeads,
    setShowLostLeads,
    showSoldLeads,
    setShowSoldLeads,
    statusFilter,
    setStatusFilter,
    dateFromFilter,
    setDateFromFilter,
    dateToFilter,
    setDateToFilter,
    searchTextFilter,
    setSearchTextFilter,
    responsibleFilter,
    setResponsibleFilter,
    tagsFilter,
    setTagsFilter,
    originFilter,
    setOriginFilter,
    customFieldFilters,
    setCustomFieldFilters,
    
    // Modal de criação
    showNewLeadForm,
    newLeadData,
    setNewLeadData,
    
    // Funções
    handleCreateLead,
    handleDeleteLead,
    openNewLeadForm,
    closeNewLeadForm,
    invalidateCache,
    reloadLeads
  }
} 