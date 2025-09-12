import { PlusIcon } from '@heroicons/react/24/outline'
import { MainLayout } from '../components/layout/MainLayout'
import { LeadsFilters } from '../components/leads/LeadsFilters'
import { LeadsGrid } from '../components/leads/LeadsGrid'
import { LeadsList } from '../components/leads/LeadsList'
import { ViewModeSelector, type ViewMode } from '../components/leads/ViewModeSelector'
import { LeadsStats } from '../components/leads/LeadsStats'
import { LeadDetailModal } from '../components/leads/LeadDetailModal'
import { NewLeadModal } from '../components/kanban/modals/NewLeadModal'
import { Pagination } from '../components/common/Pagination'
import { useLeadsLogic } from '../hooks/useLeadsLogic'
import { useState } from 'react'
import type { Lead } from '../types'
import { ds, statusColors } from '../utils/designSystem'
import { useAuthContext } from '../contexts/AuthContext'

export default function LeadsPage() {
  const { isAdmin, hasPermission } = useAuthContext()
  const canDeleteLeads = isAdmin || hasPermission('canDeleteLeads')
  // Estados para o modal de detalhes do lead
  const [showLeadDetailModal, setShowLeadDetailModal] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string>('')
  
  // Estado para o modo de visualização
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('leads-view-mode')
    return (saved as ViewMode) || 'cards'
  })

  const {
    leads,
    pipelines,
    stages,
    loading,
    error,
    searchTerm,
    selectedPipeline,
    selectedStage,
    selectedStatus,
    selectedDate,
    pagination,
    setPage,
    setLimit,
    setLeads,
    applyFilters,
    handleCreateLead,
    handleDeleteLead,
    clearFilters,
    // Estados e funções do modal de criação
    showNewLeadModal,
    closeNewLeadModal,
    refreshLeads
  } = useLeadsLogic()

  // Função para abrir modal de detalhes do lead
  const handleViewLead = (lead: Lead) => {
    setSelectedLeadId(lead.id)
    setShowLeadDetailModal(true)
  }

  // Função para abrir modal de detalhes para edição
  const handleEditLead = (lead: Lead) => {
    setSelectedLeadId(lead.id)
    setShowLeadDetailModal(true)
  }

  // Função para fechar modal de detalhes do lead
  const handleCloseLeadDetailModal = () => {
    setShowLeadDetailModal(false)
    setSelectedLeadId('')
  }

  // Função para atualizar lead após edição no modal de detalhes
  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(prev => prev.map(lead => 
      lead.id === updatedLead.id ? updatedLead : lead
    ))
  }

  // Função para alterar o modo de visualização
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('leads-view-mode', mode)
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
      <div className="h-full flex flex-col p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 overflow-hidden">
          {/* Cabeçalho */}
          <div className={ds.card()}>
            <div className={ds.header()}>
              <div>
                <h1 className={ds.headerTitle()}>Leads</h1>
                <p className={ds.headerSubtitle()}>Gerencie todos os seus leads</p>
              </div>
              <div className="flex items-center space-x-4">
                <ViewModeSelector
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                />
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

          {/* Estatísticas */}
          <div className={ds.card()}>
            <LeadsStats 
              leads={leads}
            />
          </div>

          {/* Filtros */}
          <LeadsFilters
            searchTerm={searchTerm}
            selectedPipeline={selectedPipeline}
            selectedStage={selectedStage}
            selectedStatus={selectedStatus}
            selectedDate={selectedDate}
            pipelines={pipelines}
            stages={stages}
            onApplyFilters={applyFilters}
            onClearFilters={clearFilters}
          />

          {/* Grid/Lista de Leads */}
          <div className={`${ds.card()} flex-1 min-h-0 flex flex-col max-h-[calc(100vh-400px)]`}>
            <div 
              className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar"
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}
            >
              {viewMode === 'cards' ? (
                <LeadsGrid
                  leads={leads}
                  onViewLead={handleViewLead}
                  onEditLead={handleEditLead}
                  onDeleteLead={canDeleteLeads ? handleDeleteLead : async () => {}}
                />
              ) : (
                <LeadsList
                  leads={leads}
                  onViewLead={handleViewLead}
                  onDeleteLead={canDeleteLeads ? handleDeleteLead : async () => {}}
                />
              )}
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
            onLeadCreated={(lead) => {
              // Recarregar leads após criação
              refreshLeads()
              console.log('✅ Lead criado na página de leads:', lead)
            }}
          />
        </div>
    </MainLayout>
  )
} 