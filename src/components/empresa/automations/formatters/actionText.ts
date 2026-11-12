import { META_CAPI_AUTOMATION_EVENT_OPTIONS } from '../../../../services/metaCapiService'
import { getWhatsAppRecipientLabel } from '../constants'
import type { AutomationLookups } from '../useAutomationLookups'

export function createActionFormatter(lookups: AutomationLookups) {
  const { pipelines, stageIndex, profiles, whatsappInstances, metaCapiConfigs, contractTemplates } = lookups

  function getPipelineName(id?: string) {
    if (!id) return undefined
    return pipelines.find(p => p.id === id)?.name || id
  }


  function formatSingleAction(action: any): string {
    const type = action.type as string
    if (type === 'move_lead') {
      const pName = getPipelineName(action.target_pipeline_id)
      const sName = stageIndex[action.target_stage_id]?.name || action.target_stage_id || ''
      const path = [pName, sName].filter(Boolean).join(' > ')
      return path ? `Mover lead para ${path}` : 'Mover lead'
    }
    if (type === 'create_task') {
      const title = action.title ? `: "${action.title}"` : ''
      const intervalUnit = action.task_interval_unit === 'months' ? 'mensal' : ''
      const count = action.task_count > 1
        ? ` (${action.task_count} tarefas${intervalUnit ? `, ${intervalUnit}` : ''})`
        : ''
      const mode = action.due_date_mode === 'fixed' ? ' [Data fixa]' : ' [Data manual]'
      const rawAssigneeMode = action.assignee_mode as 'auto' | 'fixed' | 'manual' | undefined
      const assigneeMode = rawAssigneeMode || ((action.assigned_to || '').trim() ? 'fixed' : 'auto')
      const assigneeLabel = assigneeMode === 'manual' ? ' [Resp. manual]' : ''
      const titleMode = (action.title_mode as 'fixed' | 'manual' | undefined) || 'fixed'
      const titleLabel = titleMode === 'manual' ? ' [Título manual]' : ''
      return `Criar tarefa${title}${count}${mode}${assigneeLabel}${titleLabel}`
    }
    if (type === 'assign_responsible') {
      const responsibleId = (action.responsible_uuid as string) || ''
      const responsibleName = profiles.find(p => p.uuid === responsibleId)?.full_name || responsibleId
      return responsibleName ? `Atribuir responsável: ${responsibleName}` : 'Atribuir responsável'
    }
    if (type === 'assign_round_robin') {
      return 'Distribuir pelo rodízio de vendedores (move para a pipeline do vendedor)'
    }
    if (type === 'create_lead') {
      const pName = getPipelineName(action.target_pipeline_id)
      const sName = stageIndex[action.target_stage_id]?.name || action.target_stage_id || ''
      const path = [pName, sName].filter(Boolean).join(' > ')
      const origin = action.origin ? ` • origem: ${action.origin}` : ''
      let antiDuplicate = ''
      if (action.prevent_duplicate) {
        const fields = Array.isArray(action.duplicate_match_fields) ? action.duplicate_match_fields : []
        const fieldLabels = fields
          .map((field: string) => (field === 'phone' ? 'telefone' : field === 'email' ? 'e-mail' : field))
          .filter(Boolean)
          .join(', ')
        const scopeLabel = action.duplicate_scope === 'target_pipeline' ? 'pipeline destino' : 'empresa'
        antiDuplicate = fieldLabels ? ` • anti-duplicata: ${fieldLabels} (${scopeLabel})` : ' • anti-duplicata ativa'
      }
      return path ? `Criar lead em ${path}${origin}${antiDuplicate}` : `Criar lead${antiDuplicate}`
    }
    if (type === 'mark_as_sold') {
      return 'Marcar lead como vendido (abre modal)'
    }
    if (type === 'mark_as_lost') {
      return 'Marcar lead como perdido (abre modal)'
    }
    if (type === 'call_webhook') {
      const url = action.webhook_url as string
      const method = action.webhook_method || 'POST'
      const truncatedUrl = url && url.length > 40 ? url.substring(0, 40) + '...' : url
      return truncatedUrl ? `Webhook ${method}: ${truncatedUrl}` : 'Acionar webhook'
    }
    if (type === 'send_whatsapp') {
      const waType = (action.wa_message_type as string) || 'text'
      const template = (action.message_template as string) || ''
      const preview = template.length > 50 ? template.substring(0, 50) + '...' : template
      const instanceId = action.instance_id as string
      const instanceName = whatsappInstances.find(i => i.id === instanceId)?.display_name 
        || whatsappInstances.find(i => i.id === instanceId)?.name 
        || ''
      const instanceLabel = instanceName ? ` (${instanceName})` : ''
      const recipientLabel = getWhatsAppRecipientLabel((action.wa_recipient as string) || 'lead')
      const typeLabels: Record<string, string> = { text: '', image: ' [Imagem]', video: ' [Vídeo]', audio: ' [Áudio]' }
      const typeLabel = typeLabels[waType] || ''
      if (waType !== 'text') {
        const filename = action.media_filename as string
        return `WhatsApp → ${recipientLabel}${instanceLabel}${typeLabel}${filename ? `: ${filename}` : ''}${preview ? ` — "${preview}"` : ''}`
      }
      return preview ? `WhatsApp → ${recipientLabel}${instanceLabel}: "${preview}"` : `Enviar WhatsApp → ${recipientLabel}`
    }
    if (type === 'send_meta_capi_event') {
      const configId = action.config_id as string
      const config = metaCapiConfigs.find(c => c.id === configId)
      const tokenLabel = config
        ? config.name
        : (configId ? 'Token configurado' : 'Token não selecionado')
      const eventName = (action.event_name as string) || 'Lead'
      const eventLabel = META_CAPI_AUTOMATION_EVENT_OPTIONS.find(o => o.value === eventName)?.label || eventName
      return `Meta CAPI: ${eventLabel} → ${tokenLabel}`
    }
    if (type === 'generate_contract') {
      const templateId = action.template_id as string
      const templateName = contractTemplates.find(t => t.id === templateId)?.name
        || (templateId ? 'Modelo selecionado' : 'Modelo não selecionado')
      const whatsapp = action.send_whatsapp ? ' • envia por WhatsApp' : ''
      return `Emitir contrato: ${templateName}${whatsapp}`
    }
    if (type === 'send_message') {
      return 'Enviar mensagem (template/configuração aplicada)'
    }
    if (type === 'send_notification') {
      return 'Enviar notificação interna'
    }
    return 'Ação personalizada'
  }

  return { formatSingleAction }
}
