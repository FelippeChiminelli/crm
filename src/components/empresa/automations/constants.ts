import type { AutomationRule, WhatsAppAutomationRecipient } from '../../../types'

export type WhatsAppMessageType = 'text' | 'image' | 'video' | 'audio'

const TASK_EVENT_TYPES = new Set<AutomationRule['event_type']>(['task_created', 'task_due_date_reached'])

export function isTaskEventType(eventType: AutomationRule['event_type']): boolean {
  return TASK_EVENT_TYPES.has(eventType)
}

export function sanitizeWhatsAppRecipient(
  actions: Record<string, any>[],
  eventType: AutomationRule['event_type']
): Record<string, any>[] {
  if (isTaskEventType(eventType)) return actions
  return actions.map(action => {
    if (action?.type !== 'send_whatsapp' || action.wa_recipient !== 'task_assignee') return action
    return { ...action, wa_recipient: 'lead' }
  })
}

export function getWhatsAppRecipientHelpText(recipient: WhatsAppAutomationRecipient | string): string {
  switch (recipient) {
    case 'responsible':
      return 'A mensagem será enviada para o telefone cadastrado no perfil do responsável pelo lead (conversa separada). Se o responsável não tiver telefone, o envio é ignorado.'
    case 'task_assignee':
      return 'A mensagem será enviada para o telefone do usuário atribuído à tarefa (conversa separada). Funciona mesmo sem lead vinculado. Se não houver responsável ou telefone, o envio é ignorado.'
    default:
      return 'A mensagem será enviada para o telefone do lead.'
  }
}

export function getWhatsAppRecipientLabel(recipient: WhatsAppAutomationRecipient | string): string {
  switch (recipient) {
    case 'responsible':
      return 'Responsável do lead'
    case 'task_assignee':
      return 'Responsável da tarefa'
    default:
      return 'Lead'
  }
}

export const LEAD_STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'quente', label: 'Quente' },
  { value: 'morno', label: 'Morno' },
  { value: 'frio', label: 'Frio' },
]

export const TASK_PRIORITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

export const TASK_STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'atrasada', label: 'Atrasada' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]

export const BOOKING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
]

export const DEFAULT_CREATE_LEAD_ACTION: Record<string, any> = {
  type: 'create_lead',
  target_pipeline_id: '',
  target_stage_id: '',
  assign_to_booking_owner: true,
  responsible_uuid: '',
  origin: 'Agendamento',
  status: '',
  prevent_duplicate: false,
  duplicate_match_fields: ['phone'],
  duplicate_scope: 'empresa',
}
