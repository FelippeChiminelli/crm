import { useState, useEffect, useMemo } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { usePipelineContext } from '../contexts/PipelineContext'
import { useKanbanLogic } from '../hooks/useKanbanLogic'
import { useDragAndDrop } from '../hooks/useDragAndDrop'
import { usePipelineManagement } from '../hooks/usePipelineManagement'
import { useAuthContext } from '../contexts/AuthContext'
import { createLead } from '../services/leadService'
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
import { 
  PlusIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'
import type { Lead } from '../types'
import { ds, statusColors } from '../utils/designSystem'
import { registerAutomationCreateTaskPrompt } from '../utils/automationUiBridge'
import { AutomationTaskPromptModal } from '../components/tasks/AutomationTaskPromptModal'

export default function KanbanPage() {
  const { state: { pipelines, loading, error }, dispatch } = usePipelineContext()
  const { user, isAdmin } = useAuthContext()
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [stages, setStages] = useState<any[]>([])
  const [showCreatePipelineModal, setShowCreatePipelineModal] = useState(false)
  const [showManagePipelinesModal, setShowManagePipelinesModal] = useState(false)

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
    leadsLimitReached,
    totalLeads,
    leadsLoading,
    reloadLeads
  } = useKanbanLogic({ selectedPipeline, stages })

  const {
    activeId,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  } = useDragAndDrop({ leadsByStage, setLeadsByStage })

  const {
    handleCreatePipeline,
    handleUpdatePipeline,
    handleDeletePipeline
  } = usePipelineManagement(dispatch)

  // Obter objeto do pipeline selecionado
  const selectedPipelineObj = useMemo(() => {
    return pipelines.find(p => p.id === selectedPipeline)
  }, [pipelines, selectedPipeline])

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

  // Função para recarregar stages quando necessário
  const reloadStages = async () => {
    if (selectedPipeline) {
      setStagesLoading(true)
      console.log('🔄 Carregando stages para pipeline:', selectedPipeline)
      const { getStagesByPipeline } = await import('../services/stageService')
      const { data: stagesData } = await getStagesByPipeline(selectedPipeline)
      if (stagesData) {
        setStages(stagesData)
      }
      setStagesLoading(false)
    } else {
      setStages([])
      setStagesLoading(false)
    }
  }

  // Efeito para carregar stages quando pipeline é selecionado
  useEffect(() => {
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
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] min-h-[600px]">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex-1 min-w-[280px] bg-gray-200 rounded-lg animate-pulse h-full"></div>
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
        <div className={ds.pageContent()}>
          {/* Cabeçalho */}
          <div className={ds.card()}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 sm:p-3">
              <div>
                <h1 className={ds.headerTitle()}>Kanban</h1>
                <p className={ds.headerSubtitle()}>Gerencie seus leads por funis de vendas</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Seletor de Pipeline */}
                <div className="min-w-0 flex-shrink-0">
                  <PipelineSelector
                    pipelines={pipelines}
                    selectedPipeline={selectedPipeline}
                    onPipelineChange={setSelectedPipeline}
                  />
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowManagePipelinesModal(true)}
                      className={ds.button('secondary')}
                    >
                      <WrenchScrewdriverIcon className="w-5 h-5" />
                      <span className="hidden sm:inline">Gerenciar</span>
                    </button>
                    <button
                      onClick={() => setShowCreatePipelineModal(true)}
                      className={ds.headerAction()}
                    >
                      <PlusIcon className="w-5 h-5" />
                      <span className="hidden sm:inline">Nova Pipeline</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Area do Kanban */}
          {leadsLimitReached && (
            <div className="mb-4">
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                <span className="font-semibold">Atenção:</span>
                Apenas os primeiros 200 leads deste pipeline estão sendo exibidos ({totalLeads} no total). Refine os filtros ou mova leads para outros pipelines para visualizar todos.
              </div>
            </div>
          )}
          {selectedPipeline && stages.length > 0 ? (
            <div className={ds.card()}>
              <DndContext
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] min-h-[600px]">
                  {stages.map((stage) => (
                    <StageColumn
                      key={stage.id}
                      stage={stage}
                      leads={leadsLoading ? [] : (leadsByStage[stage.id] || [])}
                      activeId={activeId}
                      onAddLead={openNewLeadForm}
                      onViewLead={handleViewLead}
                      onEditLead={handleEditLead}
                      onDeleteLead={isAdmin ? handleDeleteLead : undefined}
                      visibleFields={selectedPipelineObj?.card_visible_fields}
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
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          ) : selectedPipeline && stages.length === 0 ? (
            <div className={ds.card()}>
              <div className="text-center py-12">
                <div className={`${statusColors.warning.bg} rounded-lg p-6 inline-block`}>
                  <p className={`${statusColors.warning.text} font-medium mb-2`}>Pipeline sem etapas</p>
                  <p className={`${statusColors.warning.text} text-sm`}>
                    Esta pipeline não possui etapas configuradas.
                  </p>
                </div>
              </div>
            </div>
          ) : pipelines.length === 0 ? (
            <div className={ds.card()}>
              <div className="text-center py-12">
                <div className={`${statusColors.secondary.bg} rounded-lg p-6 inline-block`}>
                  <p className="text-gray-700 font-medium mb-2">Nenhuma pipeline criada</p>
                  <p className="text-gray-600 text-sm mb-4">
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
                // Recarregar stages após fechar o modal para capturar mudanças
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
              console.log('✅ Lead criado no kanban:', lead)
              // Recarregar leads para mostrar o novo lead imediatamente
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
          <LeadDetailModal
            lead={selectedLead}
            isOpen={showLeadDetailModal}
            onClose={handleCloseLeadDetailModal}
            onLeadUpdate={handleLeadUpdate}
          />
        </div>
      </div>
    </MainLayout>
  )
} 