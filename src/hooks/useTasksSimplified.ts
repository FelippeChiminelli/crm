import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { 
  getTasks,
  getUserTasks,
  getLeadTasks,
  getTaskTypes
} from '../services/taskService'
import type { Task, TaskType, TaskFilters } from '../types'
import { useTaskOperations } from './useTaskOperations'
import { useTaskFilters } from './useTaskFilters'
import { useTaskStats } from './useTaskStats'

/**
 * Hook principal para gerenciar tarefas - versão simplificada
 * Usa composition de hooks menores para melhor organização
 */

interface UseTasksReturn {
  // Estado
  tasks: Task[]
  taskTypes: TaskType[]
  loading: boolean
  error: string | null
  
  // Filtros (do useTaskFilters)
  filters: TaskFilters
  searchTerm: string
  filteredTasks: Task[]
  setFilters: (filters: TaskFilters) => void
  setSearchTerm: (term: string) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  
  // Operações CRUD (do useTaskOperations)
  createNewTask: (data: any) => Promise<Task | null>
  updateTaskData: (id: string, data: any) => Promise<Task | null>
  removeTask: (id: string) => Promise<boolean>
  completeTask: (id: string) => Promise<boolean>
  startTask: (id: string) => Promise<boolean>
  
  // Estatísticas (do useTaskStats)
  stats: any
  statsLoading: boolean
  refreshStats: () => Promise<void>
  hasOverdueTasks: () => boolean
  getProductivityStatus: () => string
  
  // Operações de carregamento
  loadTasks: () => Promise<void>
  loadUserTasks: (userId?: string) => Promise<void>
  loadLeadTasks: (leadId: string) => Promise<void>
  
  // Utilitários
  getTaskById: (id: string) => Task | undefined
  getOverdueTasks: () => Task[]
  getTasksByStatus: (status: any) => Task[]
  getTasksByPriority: (priority: any) => Task[]
}

export const useTasksSimplified = (): UseTasksReturn => {
  const { user } = useAuthContext()
  
  // Estado principal
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hooks especializados
  const taskFilters = useTaskFilters()
  const taskStats = useTaskStats()
  const taskOperations = useTaskOperations({
    onTaskCreated: (task) => {
      setTasks(prev => [task, ...prev])
      taskStats.refreshStats()
    },
    onTaskUpdated: (task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t))
      taskStats.refreshStats()
    },
    onTaskDeleted: (taskId) => {
      setTasks(prev => prev.filter(t => t.id !== taskId))
      taskStats.refreshStats()
    },
    onError: (error) => {
      setError(error.message || 'Erro na operação')
    }
  })

  // Função helper para garantir que setTasks sempre receba um array
  const setSafeTasksState = useCallback((data: Task[] | any) => {
    if (Array.isArray(data)) {
      setTasks(data)
    } else {
      console.warn('⚠️ setSafeTasksState: Dados não são array, definindo como array vazio')
      setTasks([])
    }
  }, [])

  // Carregar tipos de tarefas
  const loadTaskTypes = useCallback(async () => {
    try {
      const types = await getTaskTypes()
      setTaskTypes(types)
    } catch (err) {
      console.error('❌ Erro ao carregar tipos de tarefa:', err)
    }
  }, [])

  // Carregar todas as tarefas
  const loadTasks = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await getTasks(taskFilters.filters)
      setSafeTasksState(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar tarefas'
      setError(errorMessage)
      console.error('❌ Erro ao carregar tarefas:', err)
    } finally {
      setLoading(false)
    }
  }, [user, taskFilters.filters, setSafeTasksState])

  // Carregar tarefas de um usuário específico
  const loadUserTasks = useCallback(async (userId?: string) => {
    if (!user && !userId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const userIdToUse = userId || user?.id
      if (!userIdToUse) throw new Error('Usuário não identificado')

      const result = await getUserTasks(userIdToUse, taskFilters.filters)
      setSafeTasksState(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar tarefas do usuário'
      setError(errorMessage)
      console.error('❌ Erro ao carregar tarefas do usuário:', err)
    } finally {
      setLoading(false)
    }
  }, [user, taskFilters.filters, setSafeTasksState])

  // Carregar tarefas de um lead específico
  const loadLeadTasks = useCallback(async (leadId: string) => {
    if (!leadId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await getLeadTasks(leadId)
      setSafeTasksState(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar tarefas do lead'
      setError(errorMessage)
      console.error('❌ Erro ao carregar tarefas do lead:', err)
    } finally {
      setLoading(false)
    }
  }, [taskFilters.filters, setSafeTasksState])

  // Utilitários
  const getTaskById = useCallback((id: string): Task | undefined => {
    return tasks.find(task => task.id === id)
  }, [tasks])

  // Aplicar filtros às tarefas
  const filteredTasks = taskFilters.filterTasks(tasks)

  // Carregar dados iniciais quando o usuário está disponível
  useEffect(() => {
    if (user) {
      loadTaskTypes()
      loadTasks()
    }
  }, [user, loadTaskTypes, loadTasks])

  return {
    // Estado
    tasks,
    taskTypes,
    loading: loading || taskOperations.creating || taskOperations.updating || taskOperations.deleting,
    error,
    
    // Filtros
    filters: taskFilters.filters,
    searchTerm: taskFilters.searchTerm,
    filteredTasks,
    setFilters: taskFilters.setFilters,
    setSearchTerm: taskFilters.setSearchTerm,
    clearFilters: taskFilters.clearFilters,
    hasActiveFilters: taskFilters.hasActiveFilters,
    
    // Operações CRUD
    createNewTask: taskOperations.createNewTask,
    updateTaskData: taskOperations.updateTaskData,
    removeTask: taskOperations.removeTask,
    completeTask: taskOperations.completeTask,
    startTask: taskOperations.startTask,
    
    // Estatísticas
    stats: taskStats.stats,
    statsLoading: taskStats.loading,
    refreshStats: taskStats.refreshStats,
    hasOverdueTasks: taskStats.hasOverdueTasks,
    getProductivityStatus: taskStats.getProductivityStatus,
    
    // Operações de carregamento
    loadTasks,
    loadUserTasks,
    loadLeadTasks,
    
    // Utilitários
    getTaskById,
    getOverdueTasks: () => taskFilters.getOverdueTasks(tasks),
    getTasksByStatus: (status) => taskFilters.getTasksByStatus(tasks, status),
    getTasksByPriority: (priority) => taskFilters.getTasksByPriority(tasks, priority)
  }
}
