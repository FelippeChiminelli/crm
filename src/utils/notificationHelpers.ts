import type { Lead, ChatConversation, Task, Pipeline, Stage } from '../types'
import type { NotificationDetailItem } from '../types/dashboard'

export const MAX_DETAILS = 5

export type PipelineWithStages = Pipeline & { stages?: Stage[] }

export interface NotificationContext {
  visibleLeads: Lead[]
  tasks: Task[]
  conversations: ChatConversation[]
  isAdmin: boolean
  userId?: string
  stageAgeMap?: Map<string, string>
  pipelines?: PipelineWithStages[]
}

export function getStartOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function take<T>(arr: T[], max: number): T[] {
  return arr.slice(0, max)
}

export function isLeadActive(lead: Lead): boolean {
  return !lead.sold_at && !lead.lost_at
}

export function taskDetail(t: Task): NotificationDetailItem {
  const due = t.due_date ? ` — vence ${formatShortDate(t.due_date)}` : ''
  return {
    id: t.id,
    label: t.title,
    sublabel: `${t.priority === 'urgente' ? 'Urgente' : t.priority === 'alta' ? 'Alta' : ''}${due}`.trim() || undefined,
    href: '/tasks'
  }
}

export function leadDetail(lead: Lead): NotificationDetailItem {
  const parts: string[] = []
  if (lead.company) parts.push(lead.company)
  if (lead.value) parts.push(formatCurrency(lead.value))
  return {
    id: lead.id,
    label: lead.name,
    sublabel: parts.join(' · ') || undefined,
    href: `/leads/${lead.id}`
  }
}

export function conversationDetail(c: ChatConversation): NotificationDetailItem {
  const label = c.lead_name && c.lead_name !== 'Lead não cadastrado'
    ? c.lead_name
    : c.Nome_Whatsapp || c.lead_phone || 'Conversa'
  return {
    id: c.id,
    label,
    sublabel: c.nome_instancia ? `via ${c.nome_instancia}` : undefined,
    href: '/chat'
  }
}
