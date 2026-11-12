import type { ComponentType, SVGProps } from 'react'
import {
  ArrowPathIcon,
  ArrowRightCircleIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  MegaphoneIcon,
  UserCircleIcon,
  UserPlusIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import type { AutomationRule, ContractTemplate, MetaCapiConfig, WhatsAppInstance } from '../../../types'
import { BOOKING_WEBHOOK_FIELDS } from '../../../services/automationService'
import { DEFAULT_CREATE_LEAD_ACTION } from './constants'

export type ActionType =
  | 'move_lead' | 'create_lead' | 'create_task' | 'assign_responsible' | 'assign_round_robin'
  | 'mark_as_sold' | 'mark_as_lost' | 'generate_contract' | 'call_webhook' | 'send_whatsapp' | 'send_meta_capi_event'

export interface ActionDefinition {
  value: ActionType
  /** Nome curto, usado nos cards da fila de ações. */
  label: string
  /** Descrição exibida na grade de "Adicionar ação". */
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const ACTIONS: ActionDefinition[] = [
  { value: 'move_lead', label: 'Mover lead', description: 'Leva o lead para outro pipeline ou etapa.', icon: ArrowRightCircleIcon },
  { value: 'create_lead', label: 'Criar lead', description: 'Cadastra um novo lead em um pipeline.', icon: UserPlusIcon },
  { value: 'create_task', label: 'Criar tarefa', description: 'Agenda uma ou mais tarefas para a equipe.', icon: ClipboardDocumentListIcon },
  { value: 'assign_responsible', label: 'Atribuir responsável', description: 'Define um usuário fixo como responsável.', icon: UserCircleIcon },
  { value: 'assign_round_robin', label: 'Rodízio de vendedores', description: 'Distribui o lead pelo rodízio configurado.', icon: ArrowPathIcon },
  { value: 'mark_as_sold', label: 'Marcar vendido', description: 'Registra a venda do lead.', icon: CheckCircleIcon },
  { value: 'mark_as_lost', label: 'Marcar perdido', description: 'Marca o lead como perdido.', icon: XCircleIcon },
  { value: 'generate_contract', label: 'Emitir contrato', description: 'Gera um contrato a partir de um modelo.', icon: DocumentTextIcon },
  { value: 'call_webhook', label: 'Acionar webhook', description: 'Envia os dados para outro sistema.', icon: GlobeAltIcon },
  { value: 'send_whatsapp', label: 'Enviar WhatsApp', description: 'Manda uma mensagem de texto ou mídia.', icon: ChatBubbleOvalLeftEllipsisIcon },
  { value: 'send_meta_capi_event', label: 'Meta CAPI', description: 'Envia um evento de conversão para a Meta.', icon: MegaphoneIcon },
]

const ACTION_BY_TYPE = new Map(ACTIONS.map(a => [a.value, a]))

export function getActionDefinition(type?: string): ActionDefinition | undefined {
  return ACTION_BY_TYPE.get(type as ActionType)
}

export function getActionTypeLabel(type?: string): string {
  return getActionDefinition(type)?.label || 'Ação'
}

// Gatilhos sem as ações de marcar lead: os de tarefa/conversa nem sempre têm lead
// associado, e lead_created é avaliado apenas server-side (essas ações abrem modal).
const EVENT_TYPES_WITHOUT_MARK_LEAD_ACTIONS = new Set<AutomationRule['event_type']>([
  'conversation_created',
  'task_created',
  'task_due_date_reached',
  'lead_created',
])

// Gatilhos sem a ação de rodízio: os de tarefa/conversa/agendamento nem sempre têm
// lead, e em lead_responsible_assigned a própria redistribuição dispararia o gatilho em loop.
const EVENT_TYPES_WITHOUT_ROUND_ROBIN_ACTION = new Set<AutomationRule['event_type']>([
  'conversation_created',
  'task_created',
  'task_moved',
  'task_due_date_reached',
  'booking_created',
  'lead_responsible_assigned',
])

/** Ações permitidas para o gatilho, na ordem de exibição. */
export function getAllowedActions(eventType: AutomationRule['event_type']): ActionDefinition[] {
  const allowsLeadOutcome = !EVENT_TYPES_WITHOUT_MARK_LEAD_ACTIONS.has(eventType)
  return ACTIONS.filter(action => {
    switch (action.value) {
      // Emitir contrato depende de um lead com dados da venda, então segue a mesma
      // restrição de gatilho das ações de marcar lead.
      case 'mark_as_sold':
      case 'mark_as_lost':
      case 'generate_contract':
        return allowsLeadOutcome
      // Criar lead a partir de "lead criado" encadearia o próprio gatilho.
      case 'create_lead':
        return eventType !== 'lead_created'
      case 'assign_round_robin':
        return !EVENT_TYPES_WITHOUT_ROUND_ROBIN_ACTION.has(eventType)
      default:
        return true
    }
  })
}

interface DefaultActionContext {
  eventType: AutomationRule['event_type']
  whatsappInstances: WhatsAppInstance[]
  contractTemplates: ContractTemplate[]
  metaCapiConfigs: MetaCapiConfig[]
}

/** Valores iniciais de uma ação recém-adicionada. */
export function createDefaultAction(type: ActionType, ctx: DefaultActionContext): Record<string, any> {
  const onlyId = <T extends { id: string }>(list: T[]) => (list.length === 1 ? list[0].id : '')
  switch (type) {
    case 'create_lead':
      return {
        ...DEFAULT_CREATE_LEAD_ACTION,
        origin: ctx.eventType === 'booking_created' ? 'Agendamento' : 'Automação',
        assign_to_booking_owner: ctx.eventType === 'booking_created',
      }
    case 'move_lead':
      return { type, target_pipeline_id: '', target_stage_id: '' }
    case 'create_task':
      return {
        type,
        title: '',
        title_mode: 'fixed',
        priority: 'media',
        task_type_id: '',
        assign_to_responsible: true,
        assignee_mode: 'auto',
        assigned_to: '',
        task_count: 1,
        due_date_mode: 'manual',
        due_in_days: undefined,
        due_time: undefined,
        task_interval_days: 0,
        task_interval_unit: 'days',
      }
    case 'assign_responsible':
      return { type, responsible_uuid: '' }
    case 'call_webhook':
      return {
        type,
        webhook_url: '',
        webhook_method: 'POST',
        webhook_headers: [],
        webhook_fields: ctx.eventType === 'booking_created'
          ? [...BOOKING_WEBHOOK_FIELDS]
          : ['id', 'name', 'email', 'phone', 'value', 'status', 'pipeline_id', 'stage_id'],
      }
    case 'send_whatsapp':
      return {
        type,
        instance_id: onlyId(ctx.whatsappInstances),
        message_template: '',
        wa_message_type: 'text',
        wa_recipient: 'lead',
      }
    case 'generate_contract':
      return {
        type,
        template_id: onlyId(ctx.contractTemplates),
        send_whatsapp: false,
        wa_instance_id: onlyId(ctx.whatsappInstances),
        wa_caption: '',
      }
    case 'send_meta_capi_event':
      return { type, config_id: onlyId(ctx.metaCapiConfigs.filter(c => c.ativo)), event_name: 'Lead' }
    default:
      return { type }
  }
}
