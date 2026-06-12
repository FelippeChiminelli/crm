import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  PencilIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  UserIcon,
  RectangleStackIcon,
  CheckCircleIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline'
import type { Lead } from '../../types'
import { useLeadDetailModal } from '../../hooks/useLeadDetailModal'
import { NewTaskModal } from '../tasks/NewTaskModal'
import EditTaskModal from '../tasks/EditTaskModal'
import { SelectInstanceModal } from '../chat/SelectInstanceModal'
import { ConversationViewModal } from '../chat/ConversationViewModal'
import { LossReasonModal } from './LossReasonModal'
import { SaleModal } from './SaleModal'
import { LeadDetailHeader } from './detail-modal/LeadDetailHeader'
import { LeadDetailFooter } from './detail-modal/LeadDetailFooter'
import { SectionNav, type SectionNavItem } from './detail-modal/SectionNav'
import { LeadBasicInfoCard } from './detail-modal/LeadBasicInfoCard'
import { LeadPipelineCard } from './detail-modal/LeadPipelineCard'
import { LeadCustomFieldsCard } from './detail-modal/LeadCustomFieldsCard'
import { LeadOutcomeCard } from './detail-modal/LeadOutcomeCard'
import { LeadTasksCard } from './detail-modal/LeadTasksCard'
import { LeadAttachmentsCard } from './detail-modal/LeadAttachmentsCard'
import { LeadSystemHistoryCard } from './detail-modal/LeadSystemHistoryCard'
import { ReactivateLeadModal } from './detail-modal/ReactivateLeadModal'
import { UnmarkSaleModal } from './detail-modal/UnmarkSaleModal'

interface LeadDetailModalProps {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  onLeadUpdate?: (updatedLead: Lead) => void
  onInvalidateCache?: () => void
  allLeads?: Lead[]
  onNavigateLead?: (leadId: string) => void
}

export function LeadDetailModal(props: LeadDetailModalProps) {
  const { isOpen, onClose } = props
  const m = useLeadDetailModal(props)
  const { currentLead } = m
  const [activeSection, setActiveSection] = useState('info')

  if (!isOpen || !currentLead) return null

  // Monta a lista de áreas/balões conforme o que se aplica ao lead
  const sections: SectionNavItem[] = [
    { id: 'info', label: 'Informações', icon: UserIcon, theme: 'orange' },
  ]
  if (currentLead.sold_at) {
    sections.push({ id: 'outcome', label: 'Venda', icon: CheckCircleIcon, theme: 'green' })
  } else if (currentLead.loss_reason_category) {
    sections.push({ id: 'outcome', label: 'Perdido', icon: ExclamationTriangleIcon, theme: 'red' })
  }
  sections.push({ id: 'pipeline', label: 'Pipeline', icon: RectangleStackIcon, theme: 'indigo' })
  sections.push({ id: 'tasks', label: 'Tarefas', icon: CheckBadgeIcon, theme: 'amber' })
  if (currentLead.phone) {
    sections.push({
      id: 'chat',
      label: m.hasExistingConversations ? 'Chat' : 'Conversa',
      icon: ChatBubbleLeftEllipsisIcon,
      theme: 'emerald',
    })
  }
  sections.push({ id: 'system', label: 'Histórico', icon: ClockIcon, theme: 'slate' })
  sections.push({ id: 'attachments', label: 'Anexos', icon: PaperClipIcon, theme: 'purple' })

  const activeId = sections.some(s => s.id === activeSection) ? activeSection : 'info'

  // O balão de chat dispara a conversa em vez de trocar a seção exibida
  const handleSelectSection = (id: string) => {
    if (id === 'chat') {
      m.handleConversation()
      return
    }
    setActiveSection(id)
  }

  const renderSection = () => {
    switch (activeId) {
      case 'outcome':
        return <LeadOutcomeCard lead={currentLead} lossReasons={m.lossReasons} />
      case 'pipeline':
        return (
          <LeadPipelineCard
            lead={currentLead}
            isEditing={m.isEditing}
            editedFields={m.editedFields}
            updateField={m.updateField}
            pipelines={m.pipelines}
            allPipelinesForTransfer={m.allPipelinesForTransfer}
            availableStages={m.availableStages}
            currentLeadStages={m.currentLeadStages}
            currentStage={m.currentStage}
            loadingStages={m.loadingStages}
            isReadOnly={m.isReadOnly}
            changingStageId={m.changingStageId}
            onQuickStageChange={m.handleQuickStageChange}
          />
        )
      case 'tasks':
        return (
          <LeadTasksCard
            tasks={m.leadTasks}
            loadingTasks={m.loadingTasks}
            onNewTask={() => m.setShowNewTaskModal(true)}
            onOpenTask={m.openEditTask}
          />
        )
      case 'attachments':
        return (
          <LeadAttachmentsCard
            attachments={m.leadAttachments}
            loading={m.loadingAttachments}
            uploading={m.uploadingAttachment}
            currentUserId={m.user?.id}
            isAdmin={m.isAdmin}
            onUpload={m.handleUploadAttachment}
            onDelete={m.handleDeleteAttachment}
          />
        )
      case 'system':
        return (
          <LeadSystemHistoryCard
            createdAt={currentLead.created_at}
            history={m.leadHistory}
            loadingHistory={m.loadingHistory}
          />
        )
      case 'info':
      default:
        return (
          <div className="space-y-3">
            <LeadBasicInfoCard
              lead={currentLead}
              isEditing={m.isEditing}
              editedFields={m.editedFields}
              updateField={m.updateField}
              users={m.users}
              loadingUsers={m.loadingUsers}
              allowedOrigins={m.allowedOrigins}
              phoneError={m.phoneError}
              formatStatusDisplay={m.formatStatusDisplay}
              tagInput={m.tagInput}
              setTagInput={m.setTagInput}
              handleAddTag={m.handleAddTag}
              handleRemoveTag={m.handleRemoveTag}
              handleTagKeyDown={m.handleTagKeyDown}
            />
            <LeadCustomFieldsCard
              customFields={m.customFields}
              customValues={m.customValues}
              customFieldInputs={m.customFieldInputs}
              customFieldErrors={m.customFieldErrors}
              isEditing={m.isEditing}
              updateCustomField={m.updateCustomField}
              empresaId={m.profile?.empresa_id}
            />
          </div>
        )
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-[9999]" style={{ margin: 0, padding: 0 }}>
      {/* Balões flutuantes (desktop) - navegação fora do modal */}
      {!m.isInitialLoading && (
        <div className="hidden md:flex h-screen items-start pt-4 lg:pt-6 pr-3 lg:pr-4">
          <SectionNav items={sections} activeId={activeId} onSelect={handleSelectSection} orientation="vertical" />
        </div>
      )}

      <div
        className={`bg-gray-50 h-screen flex flex-col max-w-full transition-all duration-300 ${
          m.showConversationView
            ? 'w-full sm:w-full md:w-[600px] lg:w-[700px] mr-0 sm:mr-[50%] lg:mr-[40%] xl:mr-[33.333%]'
            : 'w-full sm:w-full md:w-[600px] lg:w-[700px]'
        }`}
      >
        <LeadDetailHeader
          lead={currentLead}
          isInitialLoading={m.isInitialLoading}
          isEditing={m.isEditing}
          isReadOnly={m.isReadOnly}
          showEdit={activeId === 'info'}
          canNavigatePrevious={m.canNavigatePrevious}
          canNavigateNext={m.canNavigateNext}
          onNavigatePrevious={m.handleNavigatePrevious}
          onNavigateNext={m.handleNavigateNext}
          onOpenPage={() => window.open(`/leads/${currentLead.id}`, '_blank')}
          onEdit={() => m.setIsEditing(true)}
          onMarkAsSold={() => m.setShowSaleModal(true)}
          onMarkAsLost={() => m.setShowLossReasonModal(true)}
          onReactivate={() => m.setShowReactivateModal(true)}
          onUnmarkSale={() => m.setShowUnmarkSaleModal(true)}
          onClose={onClose}
        />

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 min-h-0">
          {m.isInitialLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-8 h-8 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
              <p className="text-sm text-gray-500">Carregando dados do lead...</p>
            </div>
          ) : (
            <>
              {/* Abas de navegação (mobile) */}
              <div className="md:hidden mb-3">
                <SectionNav items={sections} activeId={activeId} onSelect={handleSelectSection} orientation="horizontal" />
              </div>

              {m.isReadOnly && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3 mb-3 flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-amber-800">
                    Somente leitura — você não é o responsável por este lead.
                  </p>
                </div>
              )}

              {m.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-4 mb-3">
                  <p className="text-xs sm:text-sm text-red-600">{m.error}</p>
                </div>
              )}

              {m.isEditing && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 sm:p-3 mb-3 flex items-center gap-2">
                  <PencilIcon className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600 flex-shrink-0" />
                  <h4 className="font-medium text-orange-900 text-xs sm:text-sm lg:text-base truncate">
                    Editando: {currentLead.name}
                  </h4>
                </div>
              )}

              {renderSection()}
            </>
          )}
        </div>

        {m.isEditing && !m.isInitialLoading && (
          <LeadDetailFooter isSaving={m.isSaving} onCancel={m.handleCancel} onSave={m.handleSave} />
        )}

        {/* Sub-modais */}
        <NewTaskModal
          isOpen={m.showNewTaskModal}
          onClose={() => m.setShowNewTaskModal(false)}
          leadId={currentLead?.id}
          onTaskCreated={() => m.loadLeadTasksData()}
        />

        <EditTaskModal
          isOpen={m.showEditTaskModal}
          task={m.selectedTaskForEdit}
          onClose={() => {
            m.setShowEditTaskModal(false)
            m.setSelectedTaskForEdit(null)
          }}
          onSubmit={m.handleEditTaskSubmit}
          onDelete={m.isAdmin ? m.handleDeleteTask : undefined}
        />

        <SelectInstanceModal
          isOpen={m.showSelectInstance}
          onClose={() => m.setShowSelectInstance(false)}
          allowedInstanceIds={m.allowedInstanceIds || undefined}
          onSelect={m.handleSelectInstance}
        />

        <LossReasonModal
          isOpen={m.showLossReasonModal}
          onClose={() => m.setShowLossReasonModal(false)}
          onConfirm={m.handleMarkAsLost}
          leadName={currentLead.name}
          pipelineId={currentLead.pipeline_id}
          isLoading={m.markingAsLost}
        />

        <ReactivateLeadModal
          isOpen={m.showReactivateModal}
          lead={currentLead}
          lossReasons={m.lossReasons}
          notes={m.reactivationNotes}
          setNotes={m.setReactivationNotes}
          isLoading={m.reactivating}
          onClose={() => {
            m.setShowReactivateModal(false)
            m.setReactivationNotes('')
          }}
          onConfirm={m.handleReactivate}
        />

        <SaleModal
          isOpen={m.showSaleModal}
          onClose={() => m.setShowSaleModal(false)}
          onConfirm={m.handleMarkAsSold}
          leadName={currentLead.name}
          estimatedValue={currentLead.value}
          isLoading={m.markingAsSold}
          users={m.users}
          defaultResponsibleUuid={currentLead.responsible_uuid}
        />

        <UnmarkSaleModal
          isOpen={m.showUnmarkSaleModal}
          lead={currentLead}
          notes={m.unmarkSaleNotes}
          setNotes={m.setUnmarkSaleNotes}
          isLoading={m.unmarkingSale}
          onClose={() => {
            m.setShowUnmarkSaleModal(false)
            m.setUnmarkSaleNotes('')
          }}
          onConfirm={m.handleUnmarkSale}
        />

        <ConversationViewModal
          isOpen={m.showConversationView}
          onClose={() => m.setShowConversationView(false)}
          conversations={m.availableConversations}
        />
      </div>
    </div>,
    document.body,
  )
}
