import { useEffect, useMemo, useState } from 'react'
import { useAllLeads } from './useAllLeads'
import { useTasksLogic } from './useTasksLogic'
import { getPipelines } from '../services/pipelineService'
import { getActiveConversations } from '../services/chatService'
import type { Pipeline } from '../types'

interface PipelineWithLeadsCount {
  id: string
  name: string
  description?: string
  leadsCount: number
  active: boolean
}

interface DashboardStats {
  // Leads essenciais
  totalLeads: number
  totalValue: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
  
  // Tarefas essenciais  
  pendingTasks: number
  inProgressTasks: number
  completedTasks: number
  overdueTasks: number
  upcomingTasks: number
  
  // Chat
  activeConversations: number
  
  // Resumo dos Kanbans
  pipelinesWithLeads: PipelineWithLeadsCount[]
}

export function useDashboardLogic() {
  const { allLeads, loading: leadsLoading, error: leadsError, fetchAllLeads } = useAllLeads()
  const { tasks, loading: tasksLoading, error: tasksError, loadTasks } = useTasksLogic()
  
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [pipelinesLoading, setPipelinesLoading] = useState(true)
  const [pipelinesError, setPipelinesError] = useState<string | null>(null)
  
  const [activeConversations, setActiveConversations] = useState<number>(0)
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [conversationsError, setConversationsError] = useState<string | null>(null)

  // Função para carregar pipelines
  const loadPipelines = async () => {
    try {
      setPipelinesLoading(true)
      setPipelinesError(null)
      const result = await getPipelines()
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      setPipelines(result.data || [])
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error)
      setPipelinesError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setPipelinesLoading(false)
    }
  }

  // Função para carregar conversas ativas
  const loadActiveConversations = async () => {
    try {
      setConversationsLoading(true)
      setConversationsError(null)
      const count = await getActiveConversations()
      setActiveConversations(count)
    } catch (error) {
      console.error('Erro ao carregar conversas ativas:', error)
      setConversationsError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setConversationsLoading(false)
    }
  }
  
  const stats = useMemo<DashboardStats>(() => {
    // Estatísticas dos leads
    const totalLeads = allLeads.length
    const totalValue = allLeads.reduce((sum, lead) => sum + (lead.value || 0), 0)
    const hotLeads = allLeads.filter(lead => lead.status === 'quente').length
    const warmLeads = allLeads.filter(lead => lead.status === 'morno').length
    const coldLeads = allLeads.filter(lead => lead.status === 'frio').length

    // Estatísticas das tarefas
    const pendingTasks = tasks.filter(t => t.status === 'pendente').length
    const inProgressTasks = tasks.filter(t => t.status === 'em_andamento').length
    const completedTasks = tasks.filter(t => t.status === 'concluida').length
    const overdueTasks = tasks.filter(t => t.status === 'atrasada').length
    
    // Tarefas que vencem nos próximos 7 dias
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcomingTasks = tasks.filter(task => {
      if (!task.due_date) return false
      const dueDate = new Date(task.due_date)
      const today = new Date()
      return dueDate >= today && dueDate <= nextWeek
    }).length

    // Resumo dos Kanbans - contar leads por pipeline
    const pipelinesWithLeads: PipelineWithLeadsCount[] = pipelines.map(pipeline => {
      const leadsCount = allLeads.filter(lead => lead.pipeline_id === pipeline.id).length
      return {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        leadsCount,
        active: pipeline.active
      }
    })

    return {
      totalLeads,
      totalValue,
      hotLeads,
      warmLeads,
      coldLeads,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      upcomingTasks,
      activeConversations,
      pipelinesWithLeads
    }
  }, [allLeads, tasks, pipelines, activeConversations])

  // Carregar dados iniciais
  useEffect(() => {
    fetchAllLeads()
    loadTasks()
    loadPipelines()
    loadActiveConversations()
  }, [fetchAllLeads, loadTasks])

  // Estados de loading e error simplificados
  
  return {
    stats,
    allLeads, // Adicionando leads reais
    loading: leadsLoading || tasksLoading || pipelinesLoading || conversationsLoading,
    error: leadsError || tasksError || pipelinesError || conversationsError
  }
} 