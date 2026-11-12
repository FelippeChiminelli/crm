import type { CreateAutomationRuleData } from '../../../types'
import { isScheduleWindowValid } from './conditions/scheduleWindow'

type Action = Record<string, any>

const hasText = (value: unknown) => typeof value === 'string' ? value.trim().length > 0 : value != null && String(value).trim().length > 0

/**
 * Prazos em "dias" aceitam horas na parte decimal: 1 casa (0.1) = 1h, 2 casas (0.12) = 12h.
 * A parte de horas não pode passar de 23.
 */
function exceedsHourLimit(value: number): boolean {
  const decimalPart = value % 1
  if (decimalPart <= 0) return false
  const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
  const hours = isSingleDecimal ? Math.round(decimalPart * 10) : Math.round(decimalPart * 100)
  return hours > 23
}

function isInvalidDays(value: unknown): boolean {
  return typeof value !== 'number' || isNaN(value) || value < 0 || exceedsHourLimit(value)
}

function getTaskIssues(action: Action): string[] {
  const issues: string[] = []
  const titleMode = action.title_mode || 'fixed'
  if (titleMode !== 'manual' && !hasText(action.title)) issues.push('informe o título da tarefa')
  if (action.due_date_mode === 'fixed') {
    if (isInvalidDays(action.due_in_days)) issues.push('prazo da tarefa inválido (até 23 horas na parte decimal)')
    if (action.task_count > 1) {
      const interval = action.task_interval_days
      const intervalInvalid = action.task_interval_unit === 'months'
        ? !(typeof interval === 'number' && interval >= 1 && interval % 1 === 0)
        : isInvalidDays(interval)
      if (intervalInvalid) issues.push('intervalo entre as tarefas inválido')
    }
  }
  return issues
}

function getWhatsAppIssues(action: Action): string[] {
  const issues: string[] = []
  const messageType = action.wa_message_type || 'text'
  if (!hasText(action.instance_id)) issues.push('escolha a instância do WhatsApp')
  if (messageType === 'text' && !hasText(action.message_template)) issues.push('escreva a mensagem')
  if (messageType !== 'text' && !hasText(action.media_url)) issues.push('envie o arquivo de mídia')
  return issues
}

function getCreateLeadIssues(action: Action): string[] {
  const issues: string[] = []
  if (!hasText(action.target_pipeline_id) || !hasText(action.target_stage_id)) issues.push('escolha pipeline e etapa de destino')
  if (action.prevent_duplicate) {
    const fields = Array.isArray(action.duplicate_match_fields) ? action.duplicate_match_fields : []
    if (!fields.includes('phone') && !fields.includes('email')) issues.push('escolha telefone ou e-mail como critério de duplicata')
  }
  return issues
}

/** Pendências de uma ação, sem o prefixo "Ação N". */
export function getActionIssues(action: Action | undefined): string[] {
  if (!action?.type) return ['escolha o tipo de ação']
  switch (action.type) {
    case 'create_task':
      return getTaskIssues(action)
    case 'assign_responsible':
      return hasText(action.responsible_uuid) ? [] : ['escolha o responsável']
    case 'call_webhook':
      return [
        ...(/^https?:\/\/.+/.test(String(action.webhook_url || '').trim()) ? [] : ['informe uma URL válida (http ou https)']),
        ...(Array.isArray(action.webhook_fields) && action.webhook_fields.length > 0 ? [] : ['selecione ao menos um campo']),
      ]
    case 'send_whatsapp':
      return getWhatsAppIssues(action)
    case 'send_meta_capi_event':
      return [
        ...(hasText(action.config_id) ? [] : ['escolha o pixel']),
        ...(hasText(action.event_name) ? [] : ['escolha o evento']),
      ]
    case 'generate_contract':
      return [
        ...(hasText(action.template_id) ? [] : ['escolha o modelo de contrato']),
        ...(action.send_whatsapp === true && !hasText(action.wa_instance_id) ? ['escolha a instância do WhatsApp para envio'] : []),
      ]
    case 'create_lead':
      return getCreateLeadIssues(action)
    default:
      return []
  }
}

export function getConditionIssues(form: CreateAutomationRuleData): string[] {
  if (form.event_type === 'lead_idle_in_stage' && !isScheduleWindowValid(form.condition?.schedule_window)) {
    return ['Ajuste a janela de horário de execução']
  }
  return []
}

export function getActionsIssues(actions: Action[]): string[] {
  if (actions.length === 0) return ['Adicione pelo menos uma ação']
  return actions.flatMap((action, index) => getActionIssues(action).map(issue => `Ação ${index + 1}: ${issue}`))
}

export function getReviewIssues(form: CreateAutomationRuleData): string[] {
  return form.name.trim() ? [] : ['Dê um nome para a automação']
}
