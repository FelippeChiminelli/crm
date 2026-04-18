import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { PlusIcon, ArrowUpTrayIcon, FunnelIcon, CheckIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
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
import { BrandLoader } from '../components/ui/BrandLoader'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import { getAllLeadTags, getAllLeadOrigins } from '../services/leadService'
import { getAllowedOrigins } from '../services/originOptionsService'
import { getEmpresaUsers } from '../services/empresaService'

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
    selectedDateFrom,
    selectedDateTo,
    selectedResponsible,
    selectedTags,
    selectedOrigin,
    customFieldFilters,
    showLostLeads,
    showSoldLeads,
    selectedLossReasons,
    pagination,
    setPage,
    setLimit,
    setLeads,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    applyFilters,
    handleCreateLead,
    handleDeleteLead,
    // Estados e funções do modal de criação
    showNewLeadModal,
    closeNewLeadModal,
    refreshLeads
  } = useLeadsLogic()

  // Estado local do input de busca (com debounce antes de chamar setSearchTerm)
  const [searchInput, setSearchInput] = useState(searchTerm)
  const hasLoadedOnce = useRef(false)

  // Sincronizar searchInput quando searchTerm mudar externamente (ex: applyFilters do modal)
  useEffect(() => {
    setSearchInput(searchTerm)
  }, [searchTerm])

  // Debounce: só chama setSearchTerm após 400ms de inatividade
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, setSearchTerm])

  // Marca que já temos dados carregados pelo menos uma vez
  useEffect(() => {
    if (!loading && leads.length > 0) {
      hasLoadedOnce.current = true
    }
  }, [loading, leads.length])

  // Função para alternar ordenação (ciclo: asc → desc → padrão)
  const handleSort = useCallback((field: 'name' | 'status' | 'origin' | 'created_at') => {
    if (sortBy !== field) {
      setSortBy(field)
      setSortOrder('asc')
    } else if (sortOrder === 'asc') {
      setSortOrder('desc')
    } else {
      setSortBy('created_at')
      setSortOrder('desc')
    }
  }, [sortBy, sortOrder, setSortBy, setSortOrder])

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
    dateFrom: selectedDateFrom || undefined,
    dateTo: selectedDateTo || undefined,
    responsible_uuid: selectedResponsible || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    origin: selectedOrigin || undefined,
    customFieldFilters: customFieldFilters.length > 0 ? customFieldFilters : undefined,
    showLostLeads,
    showSoldLeads,
    selectedLossReasons: selectedLossReasons.length > 0 ? selectedLossReasons : undefined
  }), [searchTerm, selectedPipeline, selectedStage, selectedStatus, selectedDateFrom, selectedDateTo, selectedResponsible, selectedTags, selectedOrigin, customFieldFilters, showLostLeads, showSoldLeads, selectedLossReasons])

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

  const handleBulkUpdateOrigin = useCallback(async (origin: string) => {
    const result = await bulk.executeBulkUpdateOrigin(origin)
    if (result.success > 0) {
      showSuccess('Origem alterada', `Origem atualizada em ${result.success} lead${result.success !== 1 ? 's' : ''} com sucesso`)
    }
    if (result.failed > 0) {
      showError('Erros ao alterar origem', `${result.failed} lead${result.failed !== 1 ? 's' : ''} falharam`)
    }
    setSelectionMode(false)
    await refreshLeads()
  }, [bulk, showSuccess, showError, refreshLeads])

  const handleBulkUpdateResponsible = useCallback(async (responsibleUuid: string | null) => {
    const result = await bulk.executeBulkUpdateResponsible(responsibleUuid)
    if (result.success > 0) {
      showSuccess(
        responsibleUuid === null ? 'Responsável removido' : 'Responsável atribuído',
        `Atualizado em ${result.success} lead${result.success !== 1 ? 's' : ''} com sucesso`
      )
    }
    if (result.failed > 0) {
      showError('Erros ao atualizar responsável', `${result.failed} lead${result.failed !== 1 ? 's' : ''} falharam`)
    }
    setSelectionMode(false)
    await refreshLeads()
  }, [bulk, showSuccess, showError, refreshLeads])

  const handleBulkDelete = useCallback(async () => {
    const result = await bulk.executeBulkDelete()
    if (result.success > 0) {
      showSuccess('Leads excluídos', `${result.success} lead${result.success !== 1 ? 's' : ''} excluído${result.success !== 1 ? 's' : ''} com sucesso`)
    }
    if (result.failed > 0) {
      showError('Erros ao excluir', `${result.failed} lead${result.failed !== 1 ? 's' : ''} falharam`)
    }
    setSelectionMode(false)
    await refreshLeads()
  }, [bulk, showSuccess, showError, refreshLeads])

  // Tags e origens disponíveis para filtro (carregadas do backend)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([])
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([])
  const [empresaUsers, setEmpresaUsers] = useState<{ uuid: string; full_name: string }[]>([])

  // Carregar todas as tags, origens e origens permitidas
  useEffect(() => {
    const loadFiltersData = async () => {
      const [tags, origins, allowed] = await Promise.all([
        getAllLeadTags(),
        getAllLeadOrigins(),
        getAllowedOrigins()
      ])
      setAvailableTags(tags)
      setAvailableOrigins(origins)
      setAllowedOrigins(allowed || [])
    }
    loadFiltersData()
  }, [])

  // Carregar usuários da empresa para o seletor de responsável em massa
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await getEmpresaUsers()
        const normalized = (users || [])
          .filter((u: { uuid?: string }) => !!u?.uuid)
          .map((u: { uuid: string; full_name?: string }) => ({
            uuid: u.uuid,
            full_name: u.full_name || ''
          }))
        setEmpresaUsers(normalized)
      } catch {
        setEmpresaUsers([])
      }
    }
    loadUsers()
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
    ((selectedDateFrom || selectedDateTo) ? 1 : 0) +
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
  
  // Filtros de visibilidade (perdidos/vendidos) são aplicados no backend para paginação correta
  const filteredLeads = leads

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


  if (loading && !hasLoadedOnce.current) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className={ds.pageContent()}>
            <div className="h-full flex items-center justify-center">
              <BrandLoader variant="inline" size="lg" text="Carregando leads..." />
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
                <div className="w-[28vw] min-w-[240px] max-w-[380px] relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Busca rápida: nome, telefone, origem..."
                    className={`${ds.input()} pl-9`}
                    aria-label="Busca rápida de leads"
                  />
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
                          dateFrom: selectedDateFrom || undefined,
                          dateTo: selectedDateTo || undefined,
                          showLostLeads,
                          showSoldLeads,
                          selectedLossReasons: selectedLossReasons.length > 0 ? selectedLossReasons : undefined,
                          limit: 1000
                        }}
                      />
                      <button 
                        onClick={() => setShowImportModal(true)}
                        className={ds.headerAction()}
                      >
                        <ArrowUpTrayIcon className="w-5 h-5" />
                        Importar
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

              {/* Linha 2: Busca rápida */}
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Busca rápida: nome, telefone, origem..."
                  className={`${ds.input()} pl-9`}
                  aria-label="Busca rápida de leads"
                />
              </div>

              {/* Linha 3: Ordenação */}
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(':') as ['name' | 'status' | 'origin' | 'created_at', 'asc' | 'desc']
                  setSortBy(field)
                  setSortOrder(order)
                }}
                className={ds.input()}
                aria-label="Ordenar por"
              >
                <option value="created_at:desc">Mais recentes</option>
                <option value="created_at:asc">Mais antigos</option>
                <option value="name:asc">Nome A→Z</option>
                <option value="name:desc">Nome Z→A</option>
                <option value="status:asc">Status</option>
                <option value="origin:asc">Origem</option>
              </select>
              
              {/* Linha 4: Botões de Ação */}
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
              availableOrigins={availableOrigins}
              allowedOrigins={allowedOrigins}
              users={empresaUsers}
              isAdmin={isAdmin}
              onMove={handleBulkMove}
              onAddTags={handleBulkAddTags}
              onUpdateOrigin={handleBulkUpdateOrigin}
              onUpdateResponsible={isAdmin ? handleBulkUpdateResponsible : undefined}
              onDelete={isAdmin ? handleBulkDelete : undefined}
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
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
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
            allowedOrigins={allowedOrigins}
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
              dateFrom: selectedDateFrom || undefined,
              dateTo: selectedDateTo || undefined,
              showLostLeads,
              showSoldLeads,
              responsible_uuid: selectedResponsible,
              selectedTags,
              selectedOrigin,
              customFieldFilters,
              selectedLossReasons
            }}
            onApplyFilters={(filters) => {
              applyFilters({
                search: filters.searchTerm,
                pipeline: filters.selectedPipeline,
                stage: filters.selectedStage,
                status: convertFilterStatusToDbStatus(filters.selectedStatus),
                dateFrom: filters.dateFrom || '',
                dateTo: filters.dateTo || '',
                responsible: filters.responsible_uuid || '',
                tags: filters.selectedTags || [],
                origin: filters.selectedOrigin || '',
                customFieldFilters: filters.customFieldFilters || [],
                showLostLeads: filters.showLostLeads,
                showSoldLeads: filters.showSoldLeads,
                selectedLossReasons: filters.selectedLossReasons || []
              })
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