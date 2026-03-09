export type NotificationSource = 'tasks' | 'leads' | 'chat'

export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success'

export type NotificationOwnerScope = 'company' | 'user'

export interface NotificationDetailItem {
  id: string
  label: string
  sublabel?: string
  href: string
}

export interface DashboardNotificationItem {
  id: string
  source: NotificationSource
  severity: NotificationSeverity
  ownerScope: NotificationOwnerScope
  title: string
  message: string
  count?: number
  href: string
  details?: NotificationDetailItem[]
}

export interface DashboardCentralData {
  totalNotifications: number
  criticalNotifications: number
  pendingTasks: number
  overdueTasks: number
  tasksDueToday: number
  newTasksToday: number
  newLeadsToday: number
  staleLeads: number
  unreadConversations: number
}
