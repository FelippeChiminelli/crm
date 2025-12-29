import { useState, useMemo, useCallback } from 'react'
import { PlusIcon, ArrowUpTrayIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { MainLayout } from '../components/layout/MainLayout'
import { LeadsFiltersModal } from '../components/leads/LeadsFiltersModal'
import { LeadsList } from '../components/leads/LeadsList'
import { LeadDetailModal } from '../components/leads/LeadDetailModal'
import { NewLeadModal } from '../components/kanban/modals/NewLeadModal'
import { Pagination } from '../components/common/Pagination'
import { useLeadsLogic } from '../hooks/useLeadsLogic'
import { LeadsExportButton } from '../components/leads/LeadsExportButton'
import { LeadsImportModal } from '../components/leads/LeadsImportModal'
import type { Lead } from '../types'
import { ds, statusColors } from '../utils/designSystem'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'

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

  // Estados para filtros de visualização
  const [showLostLeads, setShowLostLeads] = useState(false)
  const [showSoldLeads, setShowSoldLeads] = useState(false)
  
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
    (selectedDate ? 1 : 0) + // selectedDate do hook ainda funciona como antes
    (showLostLeads ? 1 : 0) +
    (showSoldLeads ? 1 : 0) +
    (selectedResponsible ? 1 : 0)

  

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
  
  // ✅ OTIMIZAÇÃO: Memoizar filtros para evitar recálculo a cada render
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Se o filtro de status for "vendido", mostrar APENAS leads vendidos
      if (selectedStatus === 'venda_confirmada') {
        return !!lead.sold_at || lead.status === 'venda_confirmada'
      }
      
      // Se o filtro de status for "perdido", mostrar APENAS leads perdidos
      if (selectedStatus === 'perdido') {
        return !!lead.loss_reason_category || lead.status === 'perdido'
      }
      
      // Para outros status (quente, morno, frio), aplicar a lógica de visualização
      // Filtrar leads perdidos se showLostLeads for false
      if (!showLostLeads && (lead.loss_reason_category || lead.status === 'perdido')) {
        return false
      }
      
      // Filtrar leads vendidos se showSoldLeads for false
      if (!showSoldLeads && (lead.sold_at || lead.status === 'venda_confirmada')) {
        return false
      }
      
      return true
    })
  }, [leads, selectedStatus, showLostLeads, showSoldLeads])

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
      <div className="h-full flex flex-col p-1.5 sm:p-1.5 lg:p-1.5 space-y-3 overflow-hidden">
          {/* Cabeçalho */}
          <div className={ds.card()}>
            <div className={ds.header()}>
              <div>
                <h1 className={ds.headerTitle()}>Leads</h1>
                <p className={`${ds.headerSubtitle()} hidden md:block`}>Gerencie todos os seus leads</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

          {/* Grid/Lista de Leads */}
          <div className={`${ds.card()} flex-1 min-h-0 flex flex-col overflow-hidden p-0 sm:p-1`}>
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
              dateFrom: selectedDate, // Temporariamente mapeia selectedDate para dateFrom
              dateTo: undefined,
              showLostLeads,
              showSoldLeads,
              responsible_uuid: selectedResponsible
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
                responsible: filters.responsible_uuid || ''
              })
              setShowLostLeads(filters.showLostLeads)
              setShowSoldLeads(filters.showSoldLeads)
            }}
            pipelines={pipelines}
            stages={stages}
          />
        </div>
    </MainLayout>
  )
} 