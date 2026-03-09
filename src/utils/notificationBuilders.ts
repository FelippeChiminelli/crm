import type { DashboardNotificationItem } from '../types/dashboard'
import {
  MAX_DETAILS,
  getStartOfToday,
  take,
  isLeadActive,
  taskDetail,
  leadDetail,
  conversationDetail
} from './notificationHelpers'
import type { NotificationContext } from './notificationHelpers'
import { buildStageStaleNotifications } from './stageStaleBuilder'

export type { NotificationContext, PipelineWithStages } from './notificationHelpers'
export { MAX_DETAILS, isLeadActive, leadDetail, take } from './notificationHelpers'

function buildTaskNotifications(ctx: NotificationContext): DashboardNotificationItem[] {
  const items: DashboardNotificationItem[] = []
  const scope = ctx.isAdmin ? 'company' : 'user'
  const today = getStartOfToday()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const overdueTasks = ctx.tasks.filter(t => t.status === 'atrasada')
  if (overdueTasks.length > 0) {
    items.push({
      id: 'tasks-overdue',
      source: 'tasks',
      severity: 'critical',
      ownerScope: scope,
      title: 'Tarefas atrasadas',
      message: `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? 's' : ''} em atraso precisam de ação imediata.`,
      count: overdueTasks.length,
      href: '/tasks',
      details: take(overdueTasks, MAX_DETAILS).map(taskDetail)
    })
  }

  const dueTodayTasks = ctx.tasks.filter(t => {
    if (!t.due_date || t.status === 'concluida' || t.status === 'cancelada') return false
    const due = new Date(t.due_date)
    due.setHours(0, 0, 0, 0)
    return due.getTime() === today.getTime()
  })
  if (dueTodayTasks.length > 0) {
    items.push({
      id: 'tasks-due-today',
      source: 'tasks',
      severity: 'warning',
      ownerScope: scope,
      title: 'Tarefas vencendo hoje',
      message: `${dueTodayTasks.length} tarefa${dueTodayTasks.length > 1 ? 's' : ''} vencem hoje — priorize antes do fim do dia.`,
      count: dueTodayTasks.length,
      href: '/tasks',
      details: take(dueTodayTasks, MAX_DETAILS).map(taskDetail)
    })
  }

  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const upcomingTasks = ctx.tasks.filter(t => {
    if (!t.due_date) return false
    const due = new Date(t.due_date)
    return due >= tomorrow && due <= nextWeek
  })
  if (upcomingTasks.length > 0) {
    items.push({
      id: 'tasks-upcoming',
      source: 'tasks',
      severity: 'info',
      ownerScope: scope,
      title: 'Tarefas vencendo nesta semana',
      message: `${upcomingTasks.length} tarefa${upcomingTasks.length > 1 ? 's' : ''} vencem nos próximos 7 dias.`,
      count: upcomingTasks.length,
      href: '/tasks',
      details: take(upcomingTasks, MAX_DETAILS).map(taskDetail)
    })
  }

  const createdTodayTasks = ctx.tasks.filter(t => {
    const created = new Date(t.created_at)
    created.setHours(0, 0, 0, 0)
    return created.getTime() === today.getTime()
  })
  if (createdTodayTasks.length > 0) {
    items.push({
      id: 'tasks-created-today',
      source: 'tasks',
      severity: 'success',
      ownerScope: scope,
      title: 'Novas tarefas criadas hoje',
      message: `${createdTodayTasks.length} tarefa${createdTodayTasks.length > 1 ? 's' : ''} ${createdTodayTasks.length > 1 ? 'foram criadas' : 'foi criada'} hoje.`,
      count: createdTodayTasks.length,
      href: '/tasks',
      details: take(createdTodayTasks, MAX_DETAILS).map(taskDetail)
    })
  }

  return items
}

function buildLeadNotifications(ctx: NotificationContext): DashboardNotificationItem[] {
  const items: DashboardNotificationItem[] = []
  const scope = ctx.isAdmin ? 'company' : 'user'
  const now = Date.now()
  const today = getStartOfToday()
  const oneDayInMs = 24 * 60 * 60 * 1000
  const sevenDaysInMs = 7 * oneDayInMs

  const activeLeads = ctx.visibleLeads.filter(isLeadActive)

  const createdTodayLeads = ctx.visibleLeads.filter(lead => {
    const created = new Date(lead.created_at)
    created.setHours(0, 0, 0, 0)
    return created.getTime() === today.getTime()
  })
  if (createdTodayLeads.length > 0) {
    items.push({
      id: 'leads-created-today',
      source: 'leads',
      severity: 'success',
      ownerScope: scope,
      title: 'Novos leads hoje',
      message: `${createdTodayLeads.length} lead${createdTodayLeads.length > 1 ? 's' : ''} ${createdTodayLeads.length > 1 ? 'foram criados' : 'foi criado'} hoje.`,
      count: createdTodayLeads.length,
      href: '/leads',
      details: take(createdTodayLeads, MAX_DETAILS).map(leadDetail)
    })
  }

  if (!ctx.isAdmin && ctx.userId) {
    const assignedTodayLeads = ctx.visibleLeads.filter(lead => {
      if (lead.responsible_uuid !== ctx.userId) return false
      const created = new Date(lead.created_at)
      created.setHours(0, 0, 0, 0)
      return created.getTime() === today.getTime()
    })
    if (assignedTodayLeads.length > 0) {
      items.push({
        id: 'leads-assigned-today',
        source: 'leads',
        severity: 'info',
        ownerScope: 'user',
        title: 'Novos leads atribuídos a você',
        message: `${assignedTodayLeads.length} lead${assignedTodayLeads.length > 1 ? 's' : ''} ${assignedTodayLeads.length > 1 ? 'foram atribuídos' : 'foi atribuído'} a você hoje.`,
        count: assignedTodayLeads.length,
        href: assignedTodayLeads[0]?.id ? `/leads/${assignedTodayLeads[0].id}` : '/leads',
        details: take(assignedTodayLeads, MAX_DETAILS).map(leadDetail)
      })
    }
  }

  const hotWithoutContact = activeLeads.filter(lead => {
    if (lead.status !== 'quente') return false
    const ref = lead.last_contact_at || lead.created_at
    if (!ref) return true
    const date = new Date(ref).getTime()
    if (Number.isNaN(date)) return false
    return now - date > oneDayInMs
  })
  if (hotWithoutContact.length > 0) {
    items.push({
      id: 'leads-hot-without-recent-contact',
      source: 'leads',
      severity: 'warning',
      ownerScope: scope,
      title: 'Leads quentes sem contato recente',
      message: `${hotWithoutContact.length} lead${hotWithoutContact.length > 1 ? 's' : ''} quente${hotWithoutContact.length > 1 ? 's' : ''} sem contato há mais de 24h.`,
      count: hotWithoutContact.length,
      href: hotWithoutContact[0]?.id ? `/leads/${hotWithoutContact[0].id}` : '/leads',
      details: take(hotWithoutContact, MAX_DETAILS).map(leadDetail)
    })
  }

  const staleLeads = activeLeads.filter(lead => {
    const ref = lead.last_contact_at || lead.created_at
    if (!ref) return false
    const date = new Date(ref).getTime()
    if (Number.isNaN(date)) return false
    return now - date > sevenDaysInMs
  })
  if (staleLeads.length > 0) {
    items.push({
      id: 'leads-stale',
      source: 'leads',
      severity: 'info',
      ownerScope: scope,
      title: 'Leads estagnados',
      message: `${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} sem atualização há mais de 7 dias.`,
      count: staleLeads.length,
      href: staleLeads[0]?.id ? `/leads/${staleLeads[0].id}` : '/leads',
      details: take(staleLeads, MAX_DETAILS).map(leadDetail)
    })
  }

  return items
}

function buildChatNotifications(ctx: NotificationContext): DashboardNotificationItem[] {
  const items: DashboardNotificationItem[] = []
  const scope = ctx.isAdmin ? 'company' : 'user'
  const now = Date.now()
  const oneDayInMs = 24 * 60 * 60 * 1000

  const withUnread = ctx.conversations.filter(c => (c.unread_count || 0) > 0)
  const unreadCount = withUnread.reduce((t, c) => t + (c.unread_count || 0), 0)
  if (unreadCount > 0) {
    items.push({
      id: 'chat-unread',
      source: 'chat',
      severity: 'critical',
      ownerScope: scope,
      title: 'Mensagens não lidas no chat',
      message: `${unreadCount} mensagem${unreadCount > 1 ? 'ns' : ''} aguardando resposta.`,
      count: unreadCount,
      href: '/chat',
      details: take(withUnread, MAX_DETAILS).map(conversationDetail)
    })
  }

  const staleConversations = ctx.conversations.filter(c => {
    const date = new Date(c.updated_at).getTime()
    if (Number.isNaN(date)) return false
    return now - date > oneDayInMs
  })
  if (staleConversations.length > 0) {
    items.push({
      id: 'chat-stale-conversations',
      source: 'chat',
      severity: 'warning',
      ownerScope: scope,
      title: 'Conversas sem resposta recente',
      message: `${staleConversations.length} conversa${staleConversations.length > 1 ? 's' : ''} sem atividade há mais de 24h.`,
      count: staleConversations.length,
      href: '/chat',
      details: take(staleConversations, MAX_DETAILS).map(conversationDetail)
    })
  }

  return items
}

const SEVERITY_WEIGHT: Record<DashboardNotificationItem['severity'], number> = {
  critical: 3,
  warning: 2,
  info: 1,
  success: 0
}

export function buildAllNotifications(ctx: NotificationContext): DashboardNotificationItem[] {
  const items = [
    ...buildTaskNotifications(ctx),
    ...buildLeadNotifications(ctx),
    ...buildChatNotifications(ctx),
    ...buildStageStaleNotifications(ctx)
  ]

  return items.sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity])
}
