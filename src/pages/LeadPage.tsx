import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { useLeadPageData } from '../hooks/useLeadPageData'
import { useToastContext } from '../contexts/ToastContext'
import { LeadPageHeader } from '../components/leads/page/LeadPageHeader'
import { LeadBasicInfoSection } from '../components/leads/page/LeadBasicInfoSection'
import { LeadPipelineSection } from '../components/leads/page/LeadPipelineSection'
import { LeadCustomFieldsSection } from '../components/leads/page/LeadCustomFieldsSection'
import { LeadStatusSection } from '../components/leads/page/LeadStatusSection'
import { LeadHistorySection } from '../components/leads/page/LeadHistorySection'
import { LeadTasksSection } from '../components/leads/page/LeadTasksSection'
import { LeadConversationsSection } from '../components/leads/page/LeadConversationsSection'
import { updateLead, markLeadAsLost, reactivateLead, markLeadAsSold, unmarkSale } from '../services/leadService'
import { createCustomValue, updateCustomValue } from '../services/leadCustomValueService'
import { SaleModal } from '../components/leads/SaleModal'
import { LossReasonModal } from '../components/leads/LossReasonModal'
import type { Lead } from '../types'

export default function LeadPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const { showError, showSuccess } = useToastContext()
  const data = useLeadPageData(leadId)

  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<Partial<Lead>>({})
  const [editedCustomValues, setEditedCustomValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showLossModal, setShowLossModal] = useState(false)

  if (data.loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Carregando lead...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (data.error || !data.lead) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-2">Lead não encontrado</p>
            <p className="text-gray-500 text-sm">{data.error || 'O lead solicitado não existe ou você não tem permissão.'}</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  const lead = data.lead

  // Iniciar edição
  const startEditing = () => {
    setEditedFields({
      name: lead.name,
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      value: lead.value || 0,
      status: lead.status || 'novo',
      origin: lead.origin || '',
      notes: lead.notes || '',
      responsible_uuid: lead.responsible_uuid || '',
      pipeline_id: lead.pipeline_id,
      stage_id: lead.stage_id,
    })
    // Preparar custom values
    const cvMap: Record<string, string> = {}
    data.customValues.forEach(cv => {
      cvMap[cv.field_id] = cv.value
    })
    setEditedCustomValues(cvMap)
    setIsEditing(true)
  }

  // Cancelar edição
  const cancelEditing = () => {
    setIsEditing(false)
    setEditedFields({})
    setEditedCustomValues({})
  }

  // Salvar edição
  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: updatedLead } = await updateLead(lead.id, editedFields)

      // Salvar custom values
      for (const [fieldId, value] of Object.entries(editedCustomValues)) {
        const existing = data.customValues.find(cv => cv.field_id === fieldId)
        if (existing) {
          await updateCustomValue(existing.id, { value: String(value) })
        } else if (value) {
          await createCustomValue({ lead_id: lead.id, field_id: fieldId, value: String(value) })
        }
      }

      if (updatedLead) {
        data.updateLeadLocal(updatedLead as Lead)
      }
      await data.reloadCustomValues()
      setIsEditing(false)
      showSuccess('Lead atualizado com sucesso!')
    } catch (err) {
      showError('Erro ao salvar', err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  // Marcar como vendido
  const handleMarkAsSold = async (soldValue: number, saleNotes: string, soldAt: string) => {
    try {
      await markLeadAsSold(lead.id, soldValue, saleNotes, false, soldAt)
      showSuccess('Lead marcado como venda concluída!')
      setShowSaleModal(false)
      await data.reload()
    } catch (err) {
      showError('Erro ao marcar como vendido', err instanceof Error ? err.message : '')
    }
  }

  // Marcar como perdido
  const handleMarkAsLost = async (reasonCategory: string, reasonNotes?: string) => {
    try {
      await markLeadAsLost(lead.id, reasonCategory, reasonNotes)
      showSuccess('Lead marcado como perdido')
      setShowLossModal(false)
      await data.reload()
    } catch (err) {
      showError('Erro ao marcar como perdido', err instanceof Error ? err.message : '')
    }
  }

  // Reativar lead
  const handleReactivate = async () => {
    try {
      await reactivateLead(lead.id)
      showSuccess('Lead reativado com sucesso!')
      await data.reload()
    } catch (err) {
      showError('Erro ao reativar', err instanceof Error ? err.message : '')
    }
  }

  // Desmarcar venda
  const handleUnmarkSale = async () => {
    try {
      await unmarkSale(lead.id)
      showSuccess('Venda desmarcada com sucesso!')
      await data.reload()
    } catch (err) {
      showError('Erro ao desmarcar venda', err instanceof Error ? err.message : '')
    }
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <LeadPageHeader
          lead={lead}
          isEditing={isEditing}
          saving={saving}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          onSave={handleSave}
          onMarkAsSold={() => setShowSaleModal(true)}
          onMarkAsLost={() => setShowLossModal(true)}
          onReactivate={handleReactivate}
          onUnmarkSale={handleUnmarkSale}
          stages={data.stages}
          pipelines={data.pipelines}
        />

        {/* Conteúdo principal - duas colunas */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
              {/* Coluna Esquerda - Info */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <LeadBasicInfoSection
                  lead={lead}
                  isEditing={isEditing}
                  editedFields={editedFields}
                  onFieldChange={(field, value) => setEditedFields(prev => ({ ...prev, [field]: value }))}
                  users={data.users}
                />

                <LeadPipelineSection
                  lead={lead}
                  isEditing={isEditing}
                  editedFields={editedFields}
                  onFieldChange={(field, value) => setEditedFields(prev => ({ ...prev, [field]: value }))}
                  pipelines={data.pipelines}
                  stages={data.stages}
                  onPipelineChange={async (pipelineId) => {
                    setEditedFields(prev => ({ ...prev, pipeline_id: pipelineId, stage_id: '' }))
                    await data.reloadStages(pipelineId)
                  }}
                />

                <LeadCustomFieldsSection
                  customFields={data.customFields}
                  customValues={data.customValues}
                  isEditing={isEditing}
                  editedCustomValues={editedCustomValues}
                  onCustomValueChange={(fieldId, value) => setEditedCustomValues(prev => ({ ...prev, [fieldId]: value }))}
                />

                <LeadStatusSection
                  lead={lead}
                  lossReasons={data.lossReasons}
                />
              </div>

              {/* Coluna Direita - Histórico/Tarefas/Conversas */}
              <div className="lg:col-span-3 space-y-4 sm:space-y-6">
                <LeadHistorySection
                  history={data.history}
                />

                <LeadTasksSection
                  tasks={data.tasks}
                  leadId={lead.id}
                  pipelineId={lead.pipeline_id}
                  onReload={data.reloadTasks}
                />

                <LeadConversationsSection
                  conversations={data.conversations}
                  lead={lead}
                  onReload={data.reloadConversations}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      <SaleModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        onConfirm={handleMarkAsSold}
        leadName={lead.name}
        estimatedValue={lead.value}
      />

      <LossReasonModal
        isOpen={showLossModal}
        onClose={() => setShowLossModal(false)}
        onConfirm={handleMarkAsLost}
        leadName={lead.name}
        pipelineId={lead.pipeline_id}
      />
    </MainLayout>
  )
}
