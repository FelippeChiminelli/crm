import { useState, useMemo, useCallback, useEffect } from 'react'
import { PlusIcon, ArrowUpTrayIcon, FunnelIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { MainLayout } from '../components/layout/MainLayout'
import { LeadsFiltersModal } from '../components/leads/LeadsFiltersModal'
import { LeadsList } from '../components/leads/LeadsList'
import { LeadDetailModal } from '../components/leads/LeadDetailModal'
import { NewLeadModal } from '../components/kanban/modals/NewLeadModal'
import { Pagination } from '../components/common/Pagination'
import { BulkActionsBar } from '../components/leads/BulkActionsBar'
import { useLeadsLogic } from '../hooks/useLeadsLogic'
import { useBulkLeadActions } from '../hooks/useBulkLeadActions'
import { LeadsExportButton } from '../components/leads/LeadsExportButton'
import { LeadsImportModal } from '../components/leads/LeadsImportModal'
import type { Lead } from '../types'
import { ds, statusColors } from '../utils/designSystem'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import { getAllLeadTags, getAllLeadOrigins } from '../services/leadService'

export default function LeadsPage() {
  const { isAdmin } = useAuthContext()
  const { showSuccess, showError } = useToastContext()
  // Estados para o modal de detalhes do lead
  const [showLeadDetailModal, setShowLeadDetailModal] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string>('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showFiltersModal, setShowFiltersModal] = useState(false)

  const {
    leads,
    pipelines,
    allPipelinesForTransfer,
    stages,
    loading,
    error,
    searchTerm,
    selectedPipeline,
    selectedStage,
    selectedStatus,
    selectedDate,
    selectedResponsible,
    selectedTags,
    selectedOrigin,
    customFieldFilters,
    pagination,
    setPage,
    setLimit,
    setLeads,
    applyFilters,
    handleCreateLead,
    handleDeleteLead,
    // Estados e funções do modal de criação
    showNewLeadModal,
    closeNewLeadModal,
    refreshLeads
  } = useLeadsLogic()

  // Modo de seleção em massa
  const [selectionMode, setSelectionMode] = useState(false)

  // Hook de ações em massa
  const bulk = useBulkLeadActions()

  const handleCancelSelection = useCallback(() => {
    bulk.clearSelection()
    setSelectionMode(false)
  }, [bulk])

  // Filtros atuais para "selecionar todos do filtro"
  const currentBulkFilters = useMemo(() => ({
    search: searchTerm || undefined,
    pipeline_id: selectedPipeline || undefined,
    stage_id: selectedStage || undefined,
    status: selectedStatus || undefined,
    created_at: selectedDate || undefined,
    responsible_uuid: selectedResponsible || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    origin: selectedOrigin || undefined,
    customFieldFilters: customFieldFilters.length > 0 ? customFieldFilters : undefined
  }), [searchTerm, selectedPipeline, selectedStage, selectedStatus, selectedDate, selectedResponsible, selectedTags, selectedOrigin, customFieldFilters])

  const handleBulkMove = useCallback(async (pipelineId: string, stageId: string) => {
    const result = await bulk.executeBulkMove(pipelineId, stageId)
    if (result.success > 0) {
      showSuccess('Movimentação concluída', `${result.success} lead${result.success !== 1 ? 's' : ''} movido${result.success !== 1 ? 's' : ''} com sucesso`)
    }
    if (result.failed > 0) {
      showError('Erros na movimentação', `${result.failed} lead${result.failed !== 1 ? 's' : ''} falharam`)
    }
    setSelectionMode(false)
    await refreshLeads()
  }, [bulk, showSuccess, showError, refreshLeads])

  const handleBulkAddTags = useCallback(async (tags: string[]) => {
    const result = await bulk.executeBulkAddTags(tags)
    if (result.success > 0) {
      showSuccess('Tags adicionadas', `Tags aplicadas em ${result.success} lead${result.success !== 1 ? 's' : ''} com sucesso`)
    }
    if (result.failed > 0) {
      showError('Erros ao adicionar tags', `${result.failed} lead${result.failed !== 1 ? 's' : ''} falharam`)
    }
    setSelectionMode(false)
    await refreshLeads()
  }, [bulk, showSuccess, showError, refreshLeads])

  // Estados para filtros de visualização
  const [showLostLeads, setShowLostLeads] = useState(false)
  const [showSoldLeads, setShowSoldLeads] = useState(false)
  const [selectedLossReasons, setSelectedLossReasons] = useState<string[]>([])
  
  // Tags e origens disponíveis para filtro (carregadas do backend)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([])
  
  // Carregar todas as tags e origens únicas da empresa
  useEffect(() => {
    const loadFiltersData = async () => {
      const [tags, origins] = await Promise.all([
        getAllLeadTags(),
        getAllLeadOrigins()
      ])
      setAvailableTags(tags)
      setAvailableOrigins(origins)
    }
    loadFiltersData()
  }, [])
  
  // Função para converter status do filtro para status do banco de dados
  const convertFilterStatusToDbStatus = (filterStatus: string): string => {
    if (filterStatus === 'vendido') return 'venda_confirmada'
    return filterStatus
  }
  
  // Contar filtros ativos
  const activeFiltersCount = 
    (searchTerm ? 1 : 0) +
    (selectedPipeline ? 1 : 0) +
    (selectedStage ? 1 : 0) +
    (selectedStatus ? 1 : 0) +
    (selectedDate ? 1 : 0) +
    (showLostLeads ? 1 : 0) +
    (showSoldLeads ? 1 : 0) +
    (selectedResponsible ? 1 : 0) +
    (selectedTags.length > 0 ? 1 : 0) +
    (selectedOrigin ? 1 : 0) +
    (customFieldFilters.length > 0 ? 1 : 0) +
    (selectedLossReasons.length > 0 ? 1 : 0)

  

  // ✅ OTIMIZAÇÃO: Memoizar callbacks para evitar recriação a cada render
  const handleViewLead = useCallback((lead: Lead) => {
    setSelectedLeadId(lead.id)
    setShowLeadDetailModal(true)
  }, [])

  const handleCloseLeadDetailModal = useCallback(() => {
    setShowLeadDetailModal(false)
    setSelectedLeadId('')
  }, [])

  const handleLeadUpdate = useCallback((updatedLead: Lead) => {
    setLeads(prev => prev.map(lead => 
      lead.id === updatedLead.id ? updatedLead : lead
    ))
  }, [setLeads])

  // Callback para navegação entre leads no modal
  const handleNavigateLead = useCallback((leadId: string) => {
    setSelectedLeadId(leadId)
  }, [])
  
  // ✅ OTIMIZAÇÃO: Memoizar filtros para evitar recálculo a cada render
  // Nota: filtro por tags já é feito no backend
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Se o filtro de status for "vendido", mostrar APENAS leads vendidos
      if (selectedStatus === 'venda_confirmada') {
        return !!lead.sold_at || lead.status === 'venda_confirmada'
      }
      
      // Se o filtro de status for "perdido", mostrar APENAS leads perdidos
      if (selectedStatus === 'perdido') {
        const isLost = !!lead.loss_reason_category || lead.status === 'perdido'
        if (!isLost) return false
        // Filtrar por motivos de perda selecionados
        if (selectedLossReasons.length > 0 && lead.loss_reason_category) {
          return selectedLossReasons.includes(lead.loss_reason_category)
        }
        return isLost
      }
      
      // Para outros status (quente, morno, frio), aplicar a lógica de visualização
      // Filtrar leads perdidos se showLostLeads for false
      if (!showLostLeads && (lead.loss_reason_category || lead.status === 'perdido')) {
        return false
      }
      
      // Se showLostLeads está ativo, filtrar por motivos de perda selecionados
      if (showLostLeads && selectedLossReasons.length > 0 && (lead.loss_reason_category || lead.status === 'perdido')) {
        if (!lead.loss_reason_category) return false
        return selectedLossReasons.includes(lead.loss_reason_category)
      }
      
      // Filtrar leads vendidos se showSoldLeads for false
      if (!showSoldLeads && (lead.sold_at || lead.status === 'venda_confirmada')) {
        return false
      }
      
      return true
    })
  }, [leads, selectedStatus, showLostLeads, showSoldLeads, selectedLossReasons])

  const handleSelectAllPage = useCallback((selected: boolean) => {
    const visibleIds = filteredLeads.map(l => l.id)
    if (selected) {
      bulk.selectAllVisible(visibleIds)
    } else {
      bulk.deselectAllVisible(visibleIds)
    }
  }, [filteredLeads, bulk])

  // Função para atualizar pipeline do lead inline
  const handlePipelineChange = async (leadId: string, pipelineId: string) => {
    try {
      const { updateLead } = await import('../services/leadService')
      
      // Buscar o primeiro estágio do novo pipeline
      const newPipelineStages = stages.filter(s => s.pipeline_id === pipelineId)
      const firstStage = newPipelineStages.sort((a, b) => (a.position || 0) - (b.position || 0))[0]
      
      // Buscar o pipeline na lista completa (para transferência)
      const newPipeline = allPipelinesForTransfer.find(p => p.id === pipelineId)
      
      // Atualizar localmente primeiro (atualização otimista)
      setLeads(prev => prev.map(lead => {
        if (lead.id === leadId) {
          return {
            ...lead,
            pipeline_id: pipelineId,
            pipeline: newPipeline,
            stage_id: firstStage?.id || lead.stage_id,
            stage: firstStage || lead.stage
          } as Lead
        }
        return lead
      }))
      
      // Atualizar no backend
      await updateLead(leadId, {
        pipeline_id: pipelineId,
        stage_id: firstStage?.id || undefined
      })
      
      showSuccess('Pipeline atualizado', `Lead movido para o pipeline "${newPipeline?.name || 'desconhecido'}"`)
      
      // Recarregar leads após a transferência para refletir filtros de permissão
      await refreshLeads()
    } catch (error) {
      console.error('Erro ao atualizar pipeline:', error)
      showError('Erro ao atualizar pipeline', 'Não foi possível atualizar o pipeline do lead')
      // Reverter mudança local em caso de erro
      refreshLeads()
      throw error
    }
  }

  // Função para atualizar estágio do lead inline
  const handleStageChange = async (leadId: string, stageId: string) => {
    try {
      const { updateLead } = await import('../services/leadService')
      
      const newStage = stages.find(s => s.id === stageId)
      
      // Atualizar localmente primeiro (atualização otimista)
      setLeads(prev => prev.map(lead => {
        if (lead.id === leadId) {
          return {
            ...lead,
            stage_id: stageId,
            stage: newStage || lead.stage
          } as Lead
        }
        return lead
      }))
      
      // Atualizar no backend
      await updateLead(leadId, {
        stage_id: stageId
      })
      
      showSuccess('Estágio atualizado', `Lead movido para o estágio "${newStage?.name || 'desconhecido'}"`)
    } catch (error) {
      console.error('Erro ao atualizar estágio:', error)
      showError('Erro ao atualizar estágio', 'Não foi possível atualizar o estágio do lead')
      // Reverter mudança local em caso de erro
      refreshLeads()
      throw error
    }
  }


  if (loading) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className={ds.pageContent()}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando leads...</p>
              </div>
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
                  <p className={`${statusColors.error.text} mb-4 font-medium`}>Erro ao carregar leads: {error}</p>
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
      <div className="h-full flex flex-col p-3 lg:p-1.5 space-y-3 overflow-hidden">
          {/* Cabeçalho */}
          <div className={ds.card()}>
            {/* Desktop Header */}
            <div className="hidden lg:block">
              <div className={ds.header()}>
                <div>
                  <h1 className={ds.headerTitle()}>Leads</h1>
                  <p className={ds.headerSubtitle()}>Gerencie todos os seus leads</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => selectionMode ? handleCancelSelection() : setSelectionMode(true)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2 ${
                      selectionMode
                        ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                        : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {selectionMode ? <XMarkIcon className="w-5 h-5" /> : <CheckIcon className="w-5 h-5" />}
                    {selectionMode ? 'Cancelar' : 'Selecionar'}
                  </button>
                  <button
                    onClick={() => setShowFiltersModal(true)}
                    className="relative px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors flex items-center gap-2"
                  >
                    <FunnelIcon className="w-5 h-5" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                  {isAdmin && (
                    <>
                      <LeadsExportButton
                        filters={{
                          search: searchTerm || undefined,
                          pipeline_id: selectedPipeline || undefined,
                          stage_id: selectedStage || undefined,
                          status: selectedStatus || undefined,
                          created_at: selectedDate || undefined,
                          limit: 1000
                        }}
                      />
                      <button 
                        onClick={() => setShowImportModal(true)}
                        className={ds.headerAction()}
                      >
                        <ArrowUpTrayIcon className="w-5 h-5" />
                        Importar CSV
                      </button>
                    </>
                  )}
                  <button 
                    onClick={handleCreateLead}
                    className={ds.headerAction()}
                  >
                    <PlusIcon className="w-5 h-5" />
                    Novo Lead
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Header */}
            <div className="block lg:hidden p-3 space-y-3">
              {/* Linha 1: Título */}
              <div>
                <h1 className="text-lg font-bold text-gray-900">Leads</h1>
              </div>
              
              {/* Linha 2: Botões de Ação */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectionMode ? handleCancelSelection() : setSelectionMode(true)}
                  className={`flex-shrink-0 px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 min-h-[44px] ${
                    selectionMode
                      ? 'bg-orange-100 text-orange-700 border-orange-300'
                      : 'text-gray-700 bg-white border-gray-300'
                  }`}
                >
                  {selectionMode ? <XMarkIcon className="w-5 h-5" /> : <CheckIcon className="w-5 h-5" />}
                  <span className="hidden sm:inline">{selectionMode ? 'Cancelar' : 'Selecionar'}</span>
                </button>

                <button
                  onClick={() => setShowFiltersModal(true)}
                  className="relative flex-1 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <FunnelIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 min-w-[20px] h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                
                <button 
                  onClick={handleCreateLead}
                  className="flex-1 px-3 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Novo Lead</span>
                </button>
              </div>
            </div>
          </div>

          {/* Barra de ações em massa */}
          {selectionMode && bulk.selectedCount > 0 && (
            <BulkActionsBar
              selectedCount={bulk.selectedCount}
              isProcessing={bulk.isProcessing}
              progress={bulk.progress}
              isSelectAllFiltered={bulk.isSelectAllFiltered}
              allFilteredCount={bulk.allFilteredCount}
              totalFiltered={pagination.total}
              pipelines={allPipelinesForTransfer}
              stages={stages}
              availableTags={availableTags}
              onMove={handleBulkMove}
              onAddTags={handleBulkAddTags}
              onClearSelection={handleCancelSelection}
              onSelectAllFiltered={bulk.selectAllFiltered}
              currentFilters={currentBulkFilters}
            />
          )}

          {/* Grid/Lista de Leads */}
          <div className={`${ds.card()} flex-1 min-h-0 flex flex-col overflow-hidden p-3 lg:p-1`}>
            <div 
              className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar"
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}
            >
              <LeadsList
                leads={filteredLeads}
                pipelines={allPipelinesForTransfer}
                stages={stages}
                onViewLead={handleViewLead}
                onDeleteLead={isAdmin ? handleDeleteLead : undefined}
                onPipelineChange={handlePipelineChange}
                onStageChange={handleStageChange}
                selectedIds={selectionMode ? bulk.selectedIds : undefined}
                onToggleSelect={selectionMode ? bulk.toggleSelect : undefined}
                onSelectAllPage={selectionMode ? handleSelectAllPage : undefined}
              />
            </div>
          </div>

          {/* Paginação */}
          {pagination.total > 0 && (
            <div className={ds.card()}>
              <Pagination
                pagination={pagination}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </div>
          )}

          {/* Modal de Detalhes do Lead */}
          <LeadDetailModal
            lead={leads.find(lead => lead.id === selectedLeadId) || null}
            isOpen={showLeadDetailModal}
            onClose={handleCloseLeadDetailModal}
            onLeadUpdate={handleLeadUpdate}
            allLeads={filteredLeads}
            onNavigateLead={handleNavigateLead}
          />

          {/* Modal de Novo Lead */}
          <NewLeadModal
            isOpen={showNewLeadModal}
            onClose={closeNewLeadModal}
            onSubmit={async (leadData, customFieldValues) => {
              // Usar a mesma lógica do KanbanPage
              const { createLead } = await import('../services/leadService')
              
              const { data } = await createLead(leadData)
              
              // Se há campos personalizados, criar suas values
              if (customFieldValues && Object.keys(customFieldValues).length > 0) {
                const leadCustomValueService = await import('../services/leadCustomValueService')
                for (const [fieldId, value] of Object.entries(customFieldValues)) {
                  if (value !== null && value !== undefined && value !== '') {
                    await leadCustomValueService.createCustomValue({
                      lead_id: data.id,
                      field_id: fieldId,
                      value: Array.isArray(value) ? value.join(',') : String(value)
                    })
                  }
                }
              }
              
              return data
            }}
            pipelines={pipelines}
            onLeadCreated={() => {
              // Recarregar leads após criação
              refreshLeads()
            }}
          />
          {/* Modal de Importação */}
          <LeadsImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImported={() => {
              refreshLeads()
            }}
            pipelines={pipelines}
            stages={stages}
          />

          {/* Modal de Filtros */}
          <LeadsFiltersModal
            isOpen={showFiltersModal}
            onClose={() => setShowFiltersModal(false)}
            filters={{
              searchTerm,
              selectedPipeline,
              selectedStage,
              selectedStatus,
              dateFrom: selectedDate,
              dateTo: undefined,
              showLostLeads,
              showSoldLeads,
              responsible_uuid: selectedResponsible,
              selectedTags,
              selectedOrigin,
              customFieldFilters,
              selectedLossReasons
            }}
            onApplyFilters={(filters) => {
              // Por enquanto, usa apenas dateFrom como date (compatibilidade)
              const date = filters.dateFrom || ''
              applyFilters({
                search: filters.searchTerm,
                pipeline: filters.selectedPipeline,
                stage: filters.selectedStage,
                status: convertFilterStatusToDbStatus(filters.selectedStatus),
                date: date,
                responsible: filters.responsible_uuid || '',
                tags: filters.selectedTags || [],
                origin: filters.selectedOrigin || '',
                customFieldFilters: filters.customFieldFilters || []
              })
              setShowLostLeads(filters.showLostLeads)
              setShowSoldLeads(filters.showSoldLeads)
              setSelectedLossReasons(filters.selectedLossReasons || [])
            }}
            pipelines={pipelines}
            stages={stages}
            availableTags={availableTags}
            availableOrigins={availableOrigins}
          />
        </div>
    </MainLayout>
  )
} 