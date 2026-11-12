import type { ComponentType, SVGProps } from 'react'
import {
  ArrowsRightLeftIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  TrophyIcon,
  UserCircleIcon,
  UserPlusIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import type { AutomationRule } from '../../../types'

export type TriggerType = AutomationRule['event_type']
export type TriggerGroup = 'leads' | 'time' | 'tasks' | 'service'

export interface TriggerDefinition {
  value: TriggerType
  /** Nome curto, usado em selos e listas. */
  label: string
  /** Complemento de "Quando ..." na frase da regra. */
  sentence: string
  /** Explica, no card do assistente, quando a regra dispara. */
  description: string
  /** Texto exibido quando a regra não tem filtros. */
  defaultConditionText: string
  group: TriggerGroup
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Condição inicial ao escolher o gatilho. */
  defaultCondition: () => Record<string, any>
}

export const TRIGGER_GROUPS: { value: TriggerGroup; label: string }[] = [
  { value: 'leads', label: 'Leads' },
  { value: 'time', label: 'Tempo' },
  { value: 'tasks', label: 'Tarefas' },
  { value: 'service', label: 'Conversas e agenda' },
]

export const TRIGGERS: TriggerDefinition[] = [
  {
    value: 'lead_created',
    label: 'Lead criado',
    sentence: 'um lead for criado',
    description: 'Quando um novo lead entra no CRM, por qualquer origem.',
    defaultConditionText: 'Qualquer lead criado',
    group: 'leads',
    icon: UserPlusIcon,
    defaultCondition: () => ({}),
  },
  {
    value: 'lead_stage_changed',
    label: 'Mudança de etapa',
    sentence: 'um lead mudar de etapa',
    description: 'Quando um lead é movido de uma etapa para outra.',
    defaultConditionText: 'Qualquer mudança de etapa',
    group: 'leads',
    icon: ArrowsRightLeftIcon,
    defaultCondition: () => ({}),
  },
  {
    value: 'lead_marked_sold',
    label: 'Lead vendido',
    sentence: 'um lead for marcado como vendido',
    description: 'Quando a venda de um lead é registrada.',
    defaultConditionText: 'Qualquer pipeline',
    group: 'leads',
    icon: TrophyIcon,
    defaultCondition: () => ({}),
  },
  {
    value: 'lead_marked_lost',
    label: 'Lead perdido',
    sentence: 'um lead for marcado como perdido',
    description: 'Quando um lead é marcado como perdido.',
    defaultConditionText: 'Qualquer pipeline',
    group: 'leads',
    icon: XCircleIcon,
    defaultCondition: () => ({}),
  },
  {
    value: 'lead_responsible_assigned',
    label: 'Responsável atribuído',
    sentence: 'um responsável for atribuído ao lead',
    description: 'Quando um lead ganha ou troca de responsável.',
    defaultConditionText: 'Qualquer responsável',
    group: 'leads',
    icon: UserCircleIcon,
    defaultCondition: () => ({}),
  },
  {
    value: 'lead_idle_in_stage',
    label: 'Lead parado por tempo',
    sentence: 'um lead ficar parado na etapa',
    description: 'Quando um lead passa um tempo sem sair da mesma etapa.',
    defaultConditionText: 'Configuração de tempo pendente',
    group: 'time',
    icon: ClockIcon,
    defaultCondition: () => ({ idle_time_value: 24, idle_time_unit: 'hours', is_recurring: false }),
  },
  {
    value: 'task_due_date_reached',
    label: 'Data da tarefa atingida',
    sentence: 'a data de uma tarefa chegar',
    description: 'Antes, no dia ou depois do vencimento de uma tarefa.',
    defaultConditionText: 'No vencimento de qualquer tarefa',
    group: 'time',
    icon: BellAlertIcon,
    defaultCondition: () => ({
      offset_direction: 'on',
      offset_value: 0,
      offset_unit: 'days',
      fire_time: '09:00',
      timezone: 'America/Sao_Paulo',
      statuses: ['pendente', 'em_andamento', 'atrasada'],
    }),
  },
  {
    value: 'custom_field_date_reached',
    label: 'Data de campo personalizado',
    sentence: 'a data de um campo personalizado chegar',
    description: 'Usa uma data do lead, como aniversário ou vencimento de contrato.',
    defaultConditionText: 'Configure campos e offset',
    group: 'time',
    icon: CalendarIcon,
    defaultCondition: () => ({
      field_ids: [],
      offset_value: 0,
      offset_direction: 'on',
      fire_time: '09:00',
      timezone: 'America/Sao_Paulo',
    }),
  },
  {
    value: 'task_created',
    label: 'Tarefa criada',
    sentence: 'uma tarefa for criada',
    description: 'Quando uma nova tarefa é cadastrada.',
    defaultConditionText: 'Qualquer tarefa criada',
    group: 'tasks',
    icon: ClipboardDocumentListIcon,
    defaultCondition: () => ({}),
  },
  {
    value: 'conversation_created',
    label: 'Nova conversa',
    sentence: 'uma nova conversa for criada',
    description: 'Quando chega a primeira mensagem de um contato no WhatsApp.',
    defaultConditionText: 'Qualquer nova conversa',
    group: 'service',
    icon: ChatBubbleLeftRightIcon,
    defaultCondition: () => ({}),
  },
  {
    value: 'booking_created',
    label: 'Agendamento criado',
    sentence: 'um agendamento for criado',
    description: 'Quando um horário é marcado na agenda.',
    defaultConditionText: 'Qualquer agendamento criado',
    group: 'service',
    icon: CalendarDaysIcon,
    defaultCondition: () => ({}),
  },
]

const TRIGGER_BY_TYPE = new Map(TRIGGERS.map(t => [t.value, t]))

export function getTrigger(eventType: string): TriggerDefinition | undefined {
  return TRIGGER_BY_TYPE.get(eventType as TriggerType)
}

export function getTriggerLabel(eventType: string): string {
  return getTrigger(eventType)?.label || eventType
}

/** Gatilhos em que os filtros de status, origem e tags do lead se aplicam. */
export function supportsLeadAttributeFilters(eventType: string): boolean {
  return !['conversation_created', 'booking_created', 'task_created', 'task_due_date_reached'].includes(eventType)
}
