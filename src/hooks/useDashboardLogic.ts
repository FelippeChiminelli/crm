import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAllLeads } from './useAllLeads'
import { useTasksLogic } from './useTasksLogic'
import { getPipelines } from '../services/pipelineService'
import { getChatConversations } from '../services/chatService'
import { getLeadsStageAge } from '../services/leadService'
import { useAuthContext } from '../contexts/AuthContext'
import { buildAllNotifications } from '../utils/notificationBuilders'
import type { Pipeline, ChatConversation } from '../types'
import type { DashboardCentralData } from '../types/dashboard'

export function useDashboardLogic() {
  const { user, isAdmin } = useAuthContext()
  const { allLeads, loading: leadsLoading, error: leadsError, fetchAllLeads } = useAllLeads()
  const { tasks, loading: tasksLoading, error: tasksError, loadTasks } = useTasksLogic()

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [pipelinesLoading, setPipelinesLoading] = useState(true)
  const [pipelinesError, setPipelinesError] = useState<string | null>(null)

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [conversationsError, setConversationsError] = useState<string | null>(null)

  const [stageAgeMap, setStageAgeMap] = useState<Map<string, string>>(new Map())

  const loadPipelines = async () => {
    try {
      setPipelinesLoading(true)
      setPipelinesError(null)
      const result = await getPipelines(true)
      if (result.error) throw new Error(result.error.message)
      setPipelines(result.data || [])
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error)
      setPipelinesError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setPipelinesLoading(false)
    }
  }

  const loadConversations = async () => {
    try {
      setConversationsLoading(true)
      setConversationsError(null)
      const data = await getChatConversations({ status: 'active' })
      setConversations(data)
    } catch (error) {
      console.error('Erro ao carregar conversas da central:', error)
      setConversationsError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setConversationsLoading(false)
    }
  }

  const visibleLeads = useMemo(() => {
    if (isAdmin || !user) return allLeads
    return allLeads.filter((lead) => lead.responsible_uuid === user.id)
  }, [allLeads, isAdmin, user])

  const loadStageAge = useCallback(async () => {
    const activeIds = visibleLeads
      .filter(l => !l.sold_at && !l.lost_at)
      .map(l => l.id)
    if (activeIds.length === 0) return
    try {
      const map = await getLeadsStageAge(activeIds)
      setStageAgeMap(map)
    } catch (err) {
      console.error('Erro ao carregar stage age:', err)
    }
  }, [visibleLeads])

  useEffect(() => {
    if (visibleLeads.length > 0) {
      loadStageAge()
    }
  }, [visibleLeads, loadStageAge])

  const notifications = useMemo(() => {
    return buildAllNotifications({
      visibleLeads,
      tasks,
      conversations,
      isAdmin,
      userId: user?.id,
      stageAgeMap,
      pipelines
    })
  }, [visibleLeads, tasks, conversations, isAdmin, user, stageAgeMap, pipelines])

  const centralData = useMemo<DashboardCentralData>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdueTasks = tasks.filter(t => t.status === 'atrasada').length

    const tasksDueToday = tasks.filter(t => {
      if (!t.due_date || t.status === 'concluida' || t.status === 'cancelada') return false
      const due = new Date(t.due_date)
      due.setHours(0, 0, 0, 0)
      return due.getTime() === today.getTime()
    }).length

    const newTasksToday = tasks.filter(t => {
      const created = new Date(t.created_at)
      created.setHours(0, 0, 0, 0)
      return created.getTime() === today.getTime()
    }).length

    const newLeadsToday = visibleLeads.filter(lead => {
      const created = new Date(lead.created_at)
      created.setHours(0, 0, 0, 0)
      return created.getTime() === today.getTime()
    }).length

    const staleLeads = notifications.find(n => n.id === 'leads-stale')?.count || 0
    const unreadConversations = conversations.reduce((t, c) => t + (c.unread_count || 0), 0)

    return {
      totalNotifications: notifications.length,
      criticalNotifications: notifications.filter(n => n.severity === 'critical').length,
      pendingTasks: tasks.filter(t => t.status === 'pendente').length,
      overdueTasks,
      tasksDueToday,
      newTasksToday,
      newLeadsToday,
      staleLeads,
      unreadConversations
    }
  }, [notifications, tasks, visibleLeads, conversations])

  useEffect(() => {
    fetchAllLeads()
    loadTasks()
    loadPipelines()
    loadConversations()
  }, [fetchAllLeads, loadTasks])

  return {
    centralData,
    notifications,
    allLeads: visibleLeads,
    pipelines,
    loading: leadsLoading || tasksLoading || pipelinesLoading || conversationsLoading,
    error: leadsError || tasksError || pipelinesError || conversationsError
  }
}
