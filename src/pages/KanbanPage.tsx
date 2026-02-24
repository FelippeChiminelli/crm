import { useState, useEffect, useMemo, useRef } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { usePipelineContext } from '../contexts/PipelineContext'
import { useKanbanLogic } from '../hooks/useKanbanLogic'
import { useDragAndDrop, type PendingStageMove } from '../hooks/useDragAndDrop'
import { useKanbanDragScroll } from '../hooks/useKanbanDragScroll'
import { usePipelineManagement } from '../hooks/usePipelineManagement'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import { createLead } from '../services/leadService'
import { getStagesByPipeline } from '../services/stageService'
import { getCustomFieldsByPipeline } from '../services/leadCustomFieldService'
import { 
  PipelineSelector,
  StageColumn,
  CreatePipelineModal,
  ManagePipelinesModal,
  NewLeadModal,
  LeadCard,
  MainLayout
} from '../components'
import { LeadDetailModal } from '../components/leads/LeadDetailModal'
import { StageChangeModal } from '../components/kanban/modals/StageChangeModal'
import { 
  PlusIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import type { Lead, LeadCustomField } from '../types'
import { ds, statusColors } from '../utils/designSystem'
import { 
  registerAutomationCreateTaskPrompt,
  registerAutomationSalePrompt,
  registerAutomationLossPrompt,
  registerAutomationCompleteHandler
} from '../utils/automationUiBridge'
import { AutomationTaskPromptModal } from '../components/tasks/AutomationTaskPromptModal'
import { SaleModal } from '../components/leads/SaleModal'
import { LossReasonModal } from '../components/leads/LossReasonModal'
import { KanbanFiltersModal, type KanbanFilters } from '../components/kanban/KanbanFiltersModal'
import SecureLogger from '../utils/logger'
import { getLeadTagsByPipeline, getLeadOriginsByPipeline } from '../services/leadService'

export default function KanbanPage() {
  const { state: { pipelines, loading, error }, dispatch } = usePipelineContext()
  const { user, isAdmin } = useAuthContext()
  const { showError, showSuccess } = useToastContext()
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [stages, setStages] = useState<any[]>([])
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [showCreatePipelineModal, setShowCreatePipelineModal] = useState(false)
  const [showManagePipelinesModal, setShowManagePipelinesModal] = useState(false)
  const [showFiltersModal, setShowFiltersModal] = useState(false)

  // Estados para o modal de detalhes do lead
  const [showLeadDetailModal, setShowLeadDetailModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Novo: loading de stages
  const [stagesLoading, setStagesLoading] = useState(true)
  const [autoTaskModalOpen, setAutoTaskModalOpen] = useState(false)
  const [autoTaskContext, setAutoTaskContext] = useState<{
    ruleId: string
    leadId: string
    pipelineId?: string
    defaultTitle?: string
    defaultPriority?: string
    defaultAssignedTo?: string
    defaultDueDate?: string
    defaultDueTime?: string
    resolve?: (result: { assigned_to?: string; due_date?: string; due_time?: string } | null) => void
  } | null>(null)

  // Estados para automação de venda
  const [autoSaleModalOpen, setAutoSaleModalOpen] = useState(false)
  const [autoSaleContext, setAutoSaleContext] = useState<{
    ruleId: string
    leadId: string
    leadName: string
    estimatedValue?: number
    resolve?: (result: { soldValue: number; saleNotes?: string } | null) => void
  } | null>(null)

  // Estados para automação de perda
  const [autoLossModalOpen, setAutoLossModalOpen] = useState(false)
  const [autoLossContext, setAutoLossContext] = useState<{
    ruleId: string
    leadId: string
    leadName: string
    pipelineId?: string
    resolve?: (result: { lossReasonCategory: string; lossReasonNotes?: string } | null) => void
  } | null>(null)

  // Estados para modal de mudança de estágio (formulário obrigatório)
  const [stageChangeModalOpen, setStageChangeModalOpen] = useState(false)
  const [pendingStageMove, setPendingStageMove] = useState<PendingStageMove | null>(null)
  const [stageChangeLoading, setStageChangeLoading] = useState(false)

  // Hooks customizados
  const {
    leadsByStage,
    setLeadsByStage,
    showNewLeadForm,
    newLeadStageId,
    // newLeadData, // Não usado mais - modal gerencia próprio estado
    // setNewLeadData, // Não usado mais
    // handleCreateLead, // Não usado mais - lógica movida para modal
    handleDeleteLead,
    openNewLeadForm,
    closeNewLeadForm,
    leadsLoading,
    reloadLeads,
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
    lossReasonsFilter,
    setLossReasonsFilter,
    customValuesByLead,
    invalidateCache,
    totalCountsByStage
  } = useKanbanLogic({ 
    selectedPipeline, 
    stages,
    pipelineConfig: pipelines.find(p => p.id === selectedPipeline)
  })

  // Obter objeto do pipeline selecionado (movido para antes do useDragAndDrop)
  const selectedPipelineObj = useMemo(() => {
    return pipelines.find(p => p.id === selectedPipeline)
  }, [pipelines, selectedPipeline])

  const {
    activeId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    executeStageMove,
  } = useDragAndDrop({
    leadsByStage,
    setLeadsByStage,
    requireStageChangeNotes: selectedPipelineObj?.require_stage_change_notes ?? false,
    onStageChangePending: (pending) => {
      setPendingStageMove(pending)
      setStageChangeModalOpen(true)
    },
  })

  // Hook para drag do scroll horizontal
  const dragScroll = useKanbanDragScroll({ enabled: true })

  const {
    handleCreatePipeline,
    handleUpdatePipeline,
    handleDeletePipeline
  } = usePipelineManagement(dispatch)

  // Criar array achatado de todos os leads para navegação
  const allLeadsFlat = useMemo(() => {
    if (!leadsByStage) return []
    return Object.values(leadsByStage).flat()
  }, [leadsByStage])

  // Tags e origens disponíveis para filtro (carregadas do backend - específicas da pipeline)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([])
  
  // Carregar tags e origens únicas da pipeline selecionada
  useEffect(() => {
    const loadFiltersData = async () => {
      if (!selectedPipeline) {
        setAvailableTags([])
        setAvailableOrigins([])
        return
      }
      const [tags, origins] = await Promise.all([
        getLeadTagsByPipeline(selectedPipeline),
        getLeadOriginsByPipeline(selectedPipeline)
      ])
      setAvailableTags(tags)
      setAvailableOrigins(origins)
    }
    loadFiltersData()
  }, [selectedPipeline])

  // Nota: filtro de tags agora é feito no backend via useKanbanLogic
  const filteredLeadsByStage = leadsByStage

  // Função para abrir modal de detalhes do lead
  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowLeadDetailModal(true)
  }

  // Função para abrir modal de detalhes para edição
  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowLeadDetailModal(true)
  }

  // Função para fechar modal de detalhes do lead
  const handleCloseLeadDetailModal = () => {
    setShowLeadDetailModal(false)
    setSelectedLead(null)
  }

  // Callback para navegação entre leads no modal
  const handleNavigateLead = (leadId: string) => {
    const lead = allLeadsFlat.find(l => l.id === leadId)
    if (lead) {
      setSelectedLead(lead)
    }
  }

  // Função para mover lead entre stages (mobile)
  const handleMoveStage = async (leadId: string, direction: 'prev' | 'next') => {
    try {
      // Encontrar o lead e sua stage atual
      const currentStageIndex = stages.findIndex(stage => 
        leadsByStage[stage.id]?.some(lead => lead.id === leadId)
      )
      
      if (currentStageIndex === -1) {
        showError('Lead não encontrado')
        return
      }

      // Determinar a nova stage baseado na direção
      const newStageIndex = direction === 'next' ? currentStageIndex + 1 : currentStageIndex - 1
      
      if (newStageIndex < 0 || newStageIndex >= stages.length) {
        showError('Não há etapa ' + (direction === 'next' ? 'seguinte' : 'anterior'))
        return
      }

      const currentStageId = stages[currentStageIndex].id
      const newStageId = stages[newStageIndex].id
      const leadToMove = leadsByStage[currentStageId].find(lead => lead.id === leadId)

      if (!leadToMove) {
        showError('Lead não encontrado')
        return
      }

      // Se pipeline exige notas na mudança de estágio, abrir modal
      if (selectedPipelineObj?.require_stage_change_notes) {
        setPendingStageMove({
          leadId,
          leadName: leadToMove.name,
          fromStageId: currentStageId,
          toStageId: newStageId,
        })
        setStageChangeModalOpen(true)
        return
      }

      // Caso contrário, mover normalmente
      await executeStageMove(leadId, currentStageId, newStageId)
      showSuccess('Lead movido para ' + stages[newStageIndex].name)
    } catch (error) {
      console.error('Erro ao mover lead:', error)
      showError('Erro ao mover lead')
      await reloadLeads()
    }
  }

  // Callback para confirmar mudança de estágio com notas
  const handleStageChangeConfirm = async (formattedNotes: string) => {
    if (!pendingStageMove) return

    setStageChangeLoading(true)
    try {
      await executeStageMove(
        pendingStageMove.leadId,
        pendingStageMove.fromStageId,
        pendingStageMove.toStageId,
        formattedNotes
      )
      const toStage = stages.find(s => s.id === pendingStageMove.toStageId)
      showSuccess('Lead movido para ' + (toStage?.name || 'nova etapa'))
      setStageChangeModalOpen(false)
      setPendingStageMove(null)
    } catch (error) {
      console.error('Erro ao mover lead com notas:', error)
      showError('Erro ao mover lead')
      await reloadLeads()
    } finally {
      setStageChangeLoading(false)
    }
  }

  // Callback para cancelar mudança de estágio
  const handleStageChangeCancel = () => {
    setStageChangeModalOpen(false)
    setPendingStageMove(null)
  }

  // Função para aplicar filtros
  const handleApplyFilters = (filters: KanbanFilters) => {
    setShowLostLeads(filters.showLostLeads)
    setShowSoldLeads(filters.showSoldLeads)
    setStatusFilter(filters.status)
    setDateFromFilter(filters.dateFrom)
    setDateToFilter(filters.dateTo)
    setSearchTextFilter(filters.searchText)
    setResponsibleFilter(filters.responsible_uuid)
    setTagsFilter(filters.selectedTags || [])
    setOriginFilter(filters.selectedOrigin)
    setCustomFieldFilters(filters.customFieldFilters || [])
    setLossReasonsFilter(filters.selectedLossReasons || [])
  }

  // Obter filtros atuais
  const currentFilters: KanbanFilters = {
    showLostLeads,
    showSoldLeads,
    status: statusFilter,
    dateFrom: dateFromFilter,
    dateTo: dateToFilter,
    searchText: searchTextFilter,
    responsible_uuid: responsibleFilter,
    selectedTags: tagsFilter,
    selectedOrigin: originFilter,
    customFieldFilters: customFieldFilters,
    selectedLossReasons: lossReasonsFilter,
  }

  // Contar filtros ativos
  const activeFiltersCount =
    (showLostLeads ? 1 : 0) +
    (showSoldLeads ? 1 : 0) + // Conta se ligado (padrão é desligado)
    statusFilter.length +
    (dateFromFilter || dateToFilter ? 1 : 0) +
    (searchTextFilter.trim() ? 1 : 0) +
    (responsibleFilter ? 1 : 0) +
    (tagsFilter.length > 0 ? 1 : 0) +
    (originFilter ? 1 : 0) +
    (customFieldFilters.length > 0 ? 1 : 0)

  // Função para atualizar lead após edição no modal de detalhes
  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeadsByStage(prev => {
      const newState = { ...prev }
      
      // Encontrar o lead em qualquer stage e atualizá-lo
      Object.keys(newState).forEach(stageId => {
        const leadIndex = newState[stageId].findIndex(lead => lead.id === updatedLead.id)
        if (leadIndex !== -1) {
          newState[stageId][leadIndex] = updatedLead
        }
      })
      
      return newState
    })
  }

  // Ref para controlar se já estamos carregando stages (evita duplicação)
  const isLoadingStagesRef = useRef(false)
  // Ref para armazenar o último pipeline carregado (evita reload desnecessário)
  const lastLoadedPipelineRef = useRef<string>('')

  // Função para recarregar stages quando necessário
  const reloadStages = async () => {
    if (!selectedPipeline) {
      setStages([])
      setStagesLoading(false)
      return
    }

    // Se mudou de pipeline, limpar cache de stages
    if (lastLoadedPipelineRef.current !== selectedPipeline && lastLoadedPipelineRef.current !== '') {
      SecureLogger.log('🔄 Pipeline mudou - limpando cache de stages')
      lastLoadedPipelineRef.current = ''
    }

    // Evitar reload se já estamos carregando ou se é o mesmo pipeline
    if (isLoadingStagesRef.current) {
      SecureLogger.log('⏸️ Já existe um carregamento de stages em andamento')
      return
    }

    if (lastLoadedPipelineRef.current === selectedPipeline) {
      SecureLogger.log('⏸️ Stages já carregados para este pipeline')
      return
    }

    try {
      isLoadingStagesRef.current = true
      setStagesLoading(true)
      SecureLogger.log('🔄 Carregando stages e custom fields para pipeline:', selectedPipeline)
      
      // Carregar stages e custom fields em paralelo
      const [stagesResponse, customFieldsResponse] = await Promise.all([
        getStagesByPipeline(selectedPipeline),
        getCustomFieldsByPipeline(selectedPipeline)
      ])
      
      if (stagesResponse.data) {
        setStages(stagesResponse.data)
        lastLoadedPipelineRef.current = selectedPipeline
        SecureLogger.log('✅ Stages carregados:', stagesResponse.data.length)
      }
      
      if (customFieldsResponse.data) {
        setCustomFields(customFieldsResponse.data)
        SecureLogger.log('✅ Custom fields carregados:', customFieldsResponse.data.length)
      } else {
        setCustomFields([])
      }
    } catch (error) {
      SecureLogger.error('❌ Erro ao carregar stages/custom fields:', error)
      setStages([])
      setCustomFields([])
    } finally {
      setStagesLoading(false)
      isLoadingStagesRef.current = false
    }
  }

  // Efeito para carregar stages quando pipeline é selecionado
  useEffect(() => {
    // OTIMIZAÇÃO: Não limpar stages imediatamente para permitir carregamento paralelo
    // Apenas marcar como loading
    if (selectedPipeline) {
      setStagesLoading(true)
      // Não resetar lastLoadedPipelineRef aqui para permitir que useKanbanLogic
      // inicie o carregamento dos leads em paralelo
    }
    reloadStages()
  }, [selectedPipeline])

  // Registrar prompt handler para automação criar tarefa
  useEffect(() => {
    registerAutomationCreateTaskPrompt(async (input) => {
      return new Promise((resolve) => {
        setAutoTaskContext({ ...input, resolve })
        setAutoTaskModalOpen(true)
      })
    })
  }, [])

  // Registrar prompt handler para automação marcar como vendido
  useEffect(() => {
    registerAutomationSalePrompt(async (input) => {
      return new Promise((resolve) => {
        setAutoSaleContext({ ...input, resolve })
        setAutoSaleModalOpen(true)
      })
    })
  }, [])

  // Registrar prompt handler para automação marcar como perdido
  useEffect(() => {
    registerAutomationLossPrompt(async (input) => {
      return new Promise((resolve) => {
        setAutoLossContext({ ...input, resolve })
        setAutoLossModalOpen(true)
      })
    })
  }, [])

  // Registrar handler para quando automação é completada (recarregar leads)
  useEffect(() => {
    registerAutomationCompleteHandler(() => {
      invalidateCache()
      reloadLeads()
    })
  }, [invalidateCache, reloadLeads])

  // Efeito para selecionar primeiro pipeline quando carregar
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipeline) {
      setSelectedPipeline(pipelines[0].id)
    }
  }, [pipelines]) // Removido selectedPipeline das dependências para evitar loops

  // Encontrar o lead ativo para o DragOverlay
  const activeLead = useMemo(() => {
    if (!activeId) return null
    
    for (const stageLeads of Object.values(leadsByStage)) {
      const lead = stageLeads.find(lead => lead.id === activeId)
      if (lead) return lead
    }
    return null
  }, [activeId, leadsByStage])

  // Mudar cursor para "grabbing" quando um card está sendo arrastado
  useEffect(() => {
    if (activeId) {
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [activeId])

  if (loading || stagesLoading) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className={ds.pageContent()}>
            {/* Cabeçalho Skeleton */}
            <div className={ds.card()}>
              <div className="animate-pulse">
                <div className="h-6 sm:h-8 bg-gray-200 rounded w-32 sm:w-48 mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-48 sm:w-64"></div>
              </div>
            </div>
            {/* Cards de Kanban Skeleton */}
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex-1 min-w-[240px] sm:min-w-[280px] bg-gray-200 rounded-lg animate-pulse h-full"></div>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className={ds.pageContent()}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-4">
                <div className={`${statusColors.error.bg} ${statusColors.error.border} border rounded-lg p-6`}>
                  <p className={`${statusColors.error.text} mb-4 font-medium`}>Erro: {error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className={ds.button('primary')}
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className={ds.page()}>
        <div className={`${ds.pageContent()} flex flex-col h-full`}>
          {/* Cabeçalho */}
          <div className={`${ds.card()} flex-shrink-0`}>
            {/* Layout Desktop (≥1024px) */}
            <div className="hidden lg:block">
              <div className="flex items-center justify-between gap-3 p-3">
                <div>
                  <h1 className={ds.headerTitle()}>Kanban</h1>
                  <p className={ds.headerSubtitle()}>Gerencie seus leads por funis de vendas</p>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  {/* Seletor de Pipeline */}
                  <div className="w-[18vw] min-w-[175px] max-w-[240px] flex-shrink-0">
                    <PipelineSelector
                      pipelines={pipelines}
                      selectedPipeline={selectedPipeline}
                      onPipelineChange={setSelectedPipeline}
                    />
                  </div>
                  
                  {/* Botão de Refresh */}
                  <button
                    onClick={async () => {
                      invalidateCache()
                      await Promise.all([
                        reloadLeads(),
                        reloadStages()
                      ])
                    }}
                    disabled={leadsLoading || stagesLoading}
                    className="inline-flex items-center justify-center px-5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px]"
                    title="Atualizar dados"
                    aria-label="Atualizar dados"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${leadsLoading || stagesLoading ? 'animate-spin' : ''}`} />
                  </button>
                  
                  {/* Botão de Filtros */}
                  {selectedPipeline && (
                    <button
                      onClick={() => setShowFiltersModal(true)}
                      className="relative inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700"
                      aria-label="Filtros"
                    >
                      <FunnelIcon className="w-4 h-4" />
                      <span>Filtros</span>
                      {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>
                  )}
                  
                  {/* Botões Admin */}
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowManagePipelinesModal(true)}
                        className={ds.button('secondary')}
                      >
                        <WrenchScrewdriverIcon className="w-5 h-5" />
                        <span>Gerenciar</span>
                      </button>
                      <button
                        onClick={() => setShowCreatePipelineModal(true)}
                        className={ds.headerAction()}
                      >
                        <PlusIcon className="w-5 h-5" />
                        <span>Nova Pipeline</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Layout Mobile/Tablet (<1024px) */}
            <div className="block lg:hidden">
              <div className="p-3 space-y-3">
                {/* Linha 1: Título */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Kanban</h1>
                    <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gerencie seus leads</p>
                  </div>
                </div>
                
                {/* Linha 2: Seletor de Pipeline */}
                <div>
                  <PipelineSelector
                    pipelines={pipelines}
                    selectedPipeline={selectedPipeline}
                    onPipelineChange={setSelectedPipeline}
                  />
                </div>
                
                {/* Linha 3: Ações */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {/* Botão de Refresh */}
                  <button
                    onClick={async () => {
                      invalidateCache()
                      await Promise.all([
                        reloadLeads(),
                        reloadStages()
                      ])
                    }}
                    disabled={leadsLoading || stagesLoading}
                    className="flex-shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Atualizar"
                    aria-label="Atualizar dados"
                  >
                    <ArrowPathIcon className={`w-5 h-5 ${leadsLoading || stagesLoading ? 'animate-spin' : ''}`} />
                  </button>
                  
                  {/* Botão de Gerenciar (Admin) */}
                  {isAdmin && (
                    <button
                      onClick={() => setShowManagePipelinesModal(true)}
                      className="flex-shrink-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <WrenchScrewdriverIcon className="w-5 h-5" />
                      <span className="hidden sm:inline">Gerenciar</span>
                    </button>
                  )}
                  
                  {/* Botão de Filtros */}
                  {selectedPipeline && (
                    <button
                      onClick={() => setShowFiltersModal(true)}
                      className="flex-shrink-0 relative inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                      aria-label="Filtros"
                    >
                      <FunnelIcon className="w-5 h-5" />
                      <span className="hidden sm:inline">Filtros</span>
                      {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>
                  )}
                  
                  {/* Botão Nova Pipeline (Admin) */}
                  {isAdmin && (
                    <button
                      onClick={() => setShowCreatePipelineModal(true)}
                      className="flex-shrink-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      <PlusIcon className="w-5 h-5" />
                      <span className="hidden md:inline">Nova</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Area do Kanban */}
          {selectedPipeline && stages.length > 0 ? (
            <div className={`${ds.card()} flex-1 min-h-0 overflow-hidden flex flex-col`}>
              <DndContext
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                autoScroll={{
                  threshold: {
                    x: 0.2,
                    y: 0.2,
                  },
                  acceleration: 10,
                  interval: 5,
                }}
              >
                <div 
                  ref={dragScroll.containerRef}
                  {...dragScroll.handlers}
                  className="
                    flex gap-1.5 overflow-x-auto pb-4
                    flex-1 min-h-0
                    select-none
                    snap-x snap-mandatory lg:snap-none
                    scroll-smooth
                    scrollbar-auto-hide
                  "
                  style={{
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {stages.map((stage, index) => (
                    <StageColumn
                      key={stage.id}
                      stage={stage}
                      leads={leadsLoading ? [] : (filteredLeadsByStage[stage.id] || [])}
                      totalCount={totalCountsByStage[stage.id] || 0}
                      activeId={activeId}
                      onAddLead={openNewLeadForm}
                      onViewLead={handleViewLead}
                      onEditLead={handleEditLead}
                      onDeleteLead={isAdmin ? handleDeleteLead : undefined}
                      visibleFields={selectedPipelineObj?.card_visible_fields}
                      customFields={customFields}
                      customValuesByLead={customValuesByLead}
                      onMoveStage={handleMoveStage}
                      hasPrevStage={index > 0}
                      hasNextStage={index < stages.length - 1}
                    />
                  ))}
                </div>

                <DragOverlay>
                  {activeLead ? (
                    <LeadCard 
                      lead={activeLead} 
                      onView={handleViewLead}
                      onEdit={handleEditLead}
                      onDelete={isAdmin ? handleDeleteLead : undefined}
                      isDragging={true}
                      visibleFields={selectedPipelineObj?.card_visible_fields}
                      customFields={customFields}
                      customValuesByLead={customValuesByLead[activeLead.id]}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          ) : selectedPipeline && stages.length === 0 ? (
            <div className={ds.card()}>
              <div className="text-center py-12">
                <div className={`${statusColors.warning.bg} rounded-lg p-6 inline-block`}>
                  <p className={`${statusColors.warning.text} text-sm font-medium mb-2`}>Pipeline sem etapas</p>
                  <p className={`${statusColors.warning.text} text-xs`}>
                    Esta pipeline não possui etapas configuradas.
                  </p>
                </div>
              </div>
            </div>
          ) : pipelines.length === 0 ? (
            <div className={ds.card()}>
              <div className="text-center py-12">
                <div className={`${statusColors.secondary.bg} rounded-lg p-6 inline-block`}>
                  <p className="text-gray-700 text-sm font-medium mb-2">Nenhuma pipeline criada</p>
                  <p className="text-gray-600 text-xs mb-4">
                    Crie sua primeira pipeline para começar a gerenciar seus leads.
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowCreatePipelineModal(true)}
                      className={ds.button('primary')}
                    >
                      <PlusIcon className="w-5 h-5" />
                      Criar primeira pipeline
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Modals */}
          {isAdmin && (
            <CreatePipelineModal
              isOpen={showCreatePipelineModal}
              onClose={() => setShowCreatePipelineModal(false)}
              onCreatePipeline={handleCreatePipeline}
            />
          )}

          {isAdmin && (
            <ManagePipelinesModal
              isOpen={showManagePipelinesModal}
              onClose={() => {
                setShowManagePipelinesModal(false)
                // Limpar cache e recarregar stages após fechar o modal para capturar mudanças
                lastLoadedPipelineRef.current = ''
                reloadStages()
              }}
              pipelines={pipelines}
              onUpdatePipeline={handleUpdatePipeline}
              onDeletePipeline={handleDeletePipeline}
            />
          )}

          <NewLeadModal
            isOpen={showNewLeadForm}
            onClose={closeNewLeadForm}
            onSubmit={async (leadData, customFieldValues) => {
              if (!user) {
                throw new Error('Usuário não autenticado')
              }
              
              // Usar os dados do modal ao invés do useKanbanLogic
              const leadDataToCreate = {
                ...leadData,
                pipeline_id: selectedPipeline || leadData.pipeline_id,
                stage_id: newLeadStageId || leadData.stage_id,
                responsible_uuid: user.id
              }
              
              const { data } = await createLead(leadDataToCreate)
              
              // Se há campos personalizados, criar suas values
              if (customFieldValues && Object.keys(customFieldValues).length > 0) {
                const leadCustomValueService = await import('../services/leadCustomValueService')
                for (const [fieldId, value] of Object.entries(customFieldValues)) {
                  if (value !== null && value !== undefined && value !== '') {
                    await leadCustomValueService.createCustomValue({
                      lead_id: data.id,
                      field_id: fieldId,
                      value: String(value)
                    })
                  }
                }
              }
              
              return data
            }}
            pipelines={pipelines}
            defaultPipelineId={selectedPipeline}
            defaultStageId={newLeadStageId}
            onLeadCreated={async (lead) => {
              SecureLogger.log('✅ Lead criado no kanban:', lead)
              // Invalidar cache antes de recarregar para garantir dados frescos
              invalidateCache()
              await reloadLeads()
            }}
          />

          {/* Modal de tarefa para automação: reaproveita NewTaskModal mas com fluxo de retorno */}
          {autoTaskModalOpen && autoTaskContext && (
            <AutomationTaskPromptModal
              isOpen={autoTaskModalOpen}
              onClose={() => {
                setAutoTaskModalOpen(false)
                if (autoTaskContext?.resolve) autoTaskContext.resolve(null)
                setAutoTaskContext(null)
              }}
              defaultAssignedTo={autoTaskContext.defaultAssignedTo}
              defaultDueDate={autoTaskContext.defaultDueDate}
              defaultDueTime={autoTaskContext.defaultDueTime}
              onConfirm={(values) => {
                if (autoTaskContext?.resolve) autoTaskContext.resolve(values)
                setAutoTaskModalOpen(false)
                setAutoTaskContext(null)
              }}
            />
          )}

          {/* Modal de venda para automação */}
          {autoSaleModalOpen && autoSaleContext && (
            <SaleModal
              isOpen={autoSaleModalOpen}
              onClose={() => {
                setAutoSaleModalOpen(false)
                if (autoSaleContext?.resolve) autoSaleContext.resolve(null)
                setAutoSaleContext(null)
              }}
              leadName={autoSaleContext.leadName}
              estimatedValue={autoSaleContext.estimatedValue}
              onConfirm={async (soldValue, saleNotes) => {
                if (autoSaleContext?.resolve) {
                  autoSaleContext.resolve({ soldValue, saleNotes })
                }
                setAutoSaleModalOpen(false)
                setAutoSaleContext(null)
                // O reload será feito pelo handler de automação completa
                // após markLeadAsSold ser executado
              }}
            />
          )}

          {/* Modal de perda para automação */}
          {autoLossModalOpen && autoLossContext && (
            <LossReasonModal
              isOpen={autoLossModalOpen}
              onClose={() => {
                setAutoLossModalOpen(false)
                if (autoLossContext?.resolve) autoLossContext.resolve(null)
                setAutoLossContext(null)
              }}
              leadName={autoLossContext.leadName}
              pipelineId={autoLossContext.pipelineId}
              onConfirm={(lossReasonCategory, lossReasonNotes) => {
                if (autoLossContext?.resolve) {
                  autoLossContext.resolve({ lossReasonCategory, lossReasonNotes })
                }
                setAutoLossModalOpen(false)
                setAutoLossContext(null)
                // O reload será feito pelo handler de automação completa
                // após markLeadAsLost ser executado
              }}
            />
          )}
          {/* Modal de mudança de estágio com formulário obrigatório */}
          {stageChangeModalOpen && pendingStageMove && (
            <StageChangeModal
              isOpen={stageChangeModalOpen}
              onClose={handleStageChangeCancel}
              onConfirm={handleStageChangeConfirm}
              fromStageName={stages.find(s => s.id === pendingStageMove.fromStageId)?.name || ''}
              toStageName={stages.find(s => s.id === pendingStageMove.toStageId)?.name || ''}
              leadName={pendingStageMove.leadName}
              fields={selectedPipelineObj?.stage_change_form_fields || ['observations']}
              isLoading={stageChangeLoading}
            />
          )}

          <LeadDetailModal
            lead={selectedLead}
            isOpen={showLeadDetailModal}
            onClose={handleCloseLeadDetailModal}
            onLeadUpdate={handleLeadUpdate}
            onInvalidateCache={invalidateCache}
            allLeads={allLeadsFlat}
            onNavigateLead={handleNavigateLead}
          />

          {/* Modal de Filtros */}
          <KanbanFiltersModal
            isOpen={showFiltersModal}
            onClose={() => setShowFiltersModal(false)}
            filters={currentFilters}
            onApplyFilters={handleApplyFilters}
            availableTags={availableTags}
            availableOrigins={availableOrigins}
            selectedPipelineId={selectedPipeline}
          />
        </div>
      </div>
    </MainLayout>
  )
} 