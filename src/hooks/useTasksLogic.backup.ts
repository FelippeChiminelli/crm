import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { 
  getTasks,
  getUserTasks,
  getLeadTasks,

  createTask,
  updateTask,
  deleteTask,
  getTaskTypes,
  getUserTaskStats,
  markTaskAsComplete,
  markTaskAsInProgress,
  isTaskOverdue
} from '../services/taskService'
import type {
  Task,
  TaskType,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
  TaskStats,
  TaskStatus,
  TaskPriority
} from '../types'

interface UseTasksReturn {
  // Estado
  tasks: Task[]
  taskTypes: TaskType[]
  stats: TaskStats | null
  loading: boolean
  error: string | null
  
  // Filtros
  filters: TaskFilters
  setFilters: (filters: TaskFilters) => void
  clearFilters: () => void
  
  // Operações CRUD
  loadTasks: () => Promise<void>
  loadUserTasks: (userId?: string) => Promise<void>
  loadLeadTasks: (leadId: string) => Promise<void>
  createNewTask: (data: CreateTaskData) => Promise<Task | null>
  updateTaskData: (id: string, data: UpdateTaskData) => Promise<Task | null>
  removeTask: (id: string) => Promise<boolean>
  
  // Operações específicas
  completeTask: (id: string) => Promise<boolean>
  startTask: (id: string) => Promise<boolean>
  refreshStats: () => Promise<void>
  checkAndUpdateOverdueTasks: () => Promise<void>
  
  // Utilitários
  getTaskById: (id: string) => Task | undefined
  getOverdueTasks: () => Task[]
  getTasksByStatus: (status: TaskStatus) => Task[]
  getTasksByPriority: (priority: TaskPriority) => Task[]
}

export const useTasksLogic = (): UseTasksReturn => {
  const { user } = useAuthContext()
  
  // Estado principal - GARANTIR que tasks seja sempre um array
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [filters, setFilters] = useState<TaskFilters>({})
  
  // Função helper para garantir que setTasks sempre receba um array
  const setSafeTasksState = (data: Task[] | any) => {
    if (Array.isArray(data)) {
      setTasks(data)
    } else {
      console.warn('⚠️ setSafeTasksState: Dados não são array, definindo como array vazio')
      setTasks([])
    }
  }
  
  // Limpar filtros
  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])
  
  // Carregar tipos de tarefas
  const loadTaskTypes = useCallback(async () => {
    try {
      console.log('🔄 Carregando tipos de tarefa...')
      const types = await getTaskTypes()
      console.log('📋 Tipos carregados:', types.length, types)
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
      const result = await getTasks(filters)
      setSafeTasksState(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar tarefas'
      setError(errorMessage)
      console.error('❌ Erro ao carregar tarefas:', err)
    } finally {
      setLoading(false)
    }
  }, [user, filters])
  
  // Carregar tarefas de um usuário específico
  const loadUserTasks = useCallback(async (userId?: string) => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      const targetUserId = userId || user.id
      const result = await getUserTasks(targetUserId, filters)
      setSafeTasksState(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar tarefas do usuário'
      setError(errorMessage)
      console.error('Erro ao carregar tarefas do usuário:', err)
    } finally {
      setLoading(false)
    }
  }, [user, filters])
  
  // Carregar tarefas de um lead específico
  const loadLeadTasks = useCallback(async (leadId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await getLeadTasks(leadId)
      setSafeTasksState(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar tarefas do lead'
      setError(errorMessage)
      console.error('Erro ao carregar tarefas do lead:', err)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Criar nova tarefa
  const createNewTask = useCallback(async (data: CreateTaskData): Promise<Task | null> => {
    if (!user) return null
    
    setLoading(true)
    setError(null)
    
    try {
      const newTask = await createTask(data)
      
      // Adicionar à lista local
      setSafeTasksState([newTask, ...tasks])
      
      // Refresh das estatísticas
      await refreshStats()
      
      return newTask
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar tarefa'
      setError(errorMessage)
      console.error('Erro ao criar tarefa:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [user, tasks])
  
  // Atualizar tarefa
  const updateTaskData = useCallback(async (id: string, data: UpdateTaskData): Promise<Task | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedTask = await updateTask(id, data)
      
      // Atualizar na lista local
      setSafeTasksState(tasks.map(task => 
        task.id === id ? updatedTask : task
      ))
      
      // Refresh das estatísticas se mudou status
      if (data.status) {
        await refreshStats()
      }
      
      return updatedTask
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar tarefa'
      setError(errorMessage)
      console.error('Erro ao atualizar tarefa:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [tasks])
  
  // Remover tarefa
  const removeTask = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      await deleteTask(id)
      
      // Remover da lista local
      setSafeTasksState(tasks.filter(task => task.id !== id))
      
      // Refresh das estatísticas
      await refreshStats()
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar tarefa'
      setError(errorMessage)
      console.error('Erro ao deletar tarefa:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [tasks])
  
  // Marcar tarefa como concluída
  const completeTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updatedTask = await markTaskAsComplete(id)
      
      // Atualizar na lista local
      setSafeTasksState(tasks.map(task => 
        task.id === id ? updatedTask : task
      ))
      
      // Refresh das estatísticas
      await refreshStats()
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao completar tarefa'
      setError(errorMessage)
      console.error('Erro ao completar tarefa:', err)
      return false
    }
  }, [tasks])
  
  // Marcar tarefa como em andamento
  const startTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updatedTask = await markTaskAsInProgress(id)
      
      // Atualizar na lista local
      setSafeTasksState(tasks.map(task => 
        task.id === id ? updatedTask : task
      ))
      
      // Refresh das estatísticas
      await refreshStats()
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao iniciar tarefa'
      setError(errorMessage)
      console.error('Erro ao iniciar tarefa:', err)
      return false
    }
  }, [tasks])
  
  // Atualizar estatísticas
  const refreshStats = useCallback(async () => {
    if (!user) return
    
    try {
      const userStats = await getUserTaskStats()
      setStats(userStats)
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    }
  }, [user])
  
  // Utilitários
  const getTaskByIdLocal = useCallback((id: string): Task | undefined => {
    if (!Array.isArray(tasks)) {
      console.warn('⚠️ tasks não é um array:', tasks)
      return undefined
    }
    return tasks.find(task => task.id === id)
  }, [tasks])
  
  const getOverdueTasks = useCallback((): Task[] => {
    if (!Array.isArray(tasks)) {
      console.warn('⚠️ tasks não é um array:', tasks)
      return []
    }
    return tasks.filter(task => isTaskOverdue(task))
  }, [tasks])
  
  const getTasksByStatus = useCallback((status: TaskStatus): Task[] => {
    if (!Array.isArray(tasks)) {
      console.warn('⚠️ tasks não é um array:', tasks)
      return []
    }
    return tasks.filter(task => task.status === status)
  }, [tasks])
  
  const getTasksByPriority = useCallback((priority: TaskPriority): Task[] => {
    if (!Array.isArray(tasks)) {
      console.warn('⚠️ tasks não é um array:', tasks)
      return []
    }
    return tasks.filter(task => task.priority === priority)
  }, [tasks])

  // Função para verificar e atualizar tarefas em atraso
  const checkAndUpdateOverdueTasks = useCallback(async () => {
    if (!Array.isArray(tasks)) return

    try {
      console.log('🔍 Verificando status das tarefas...')

      const now = new Date()

      // Tarefas que precisam ser atualizadas para "atrasada"
      const overdueTasks = tasks.filter(task => {
        if (task.status === 'atrasada' || task.status === 'concluida' || task.status === 'cancelada') return false
        if (!task.due_date) return false
        return new Date(task.due_date) < now
      })

      // Tarefas que precisam ser atualizadas para "pendente"
      const pendingTasks = tasks.filter(task => {
        if (task.status === 'pendente' || task.status === 'concluida' || task.status === 'cancelada' || task.status === 'em_andamento') return false
        // Se não tem data de vencimento OU data de vencimento futura
        if (!task.due_date || new Date(task.due_date) >= now) return true
        return false
      })

      // Atualizar status para "atrasada"
      const overdueUpdates = overdueTasks.map(task =>
        updateTask(task.id, { status: 'atrasada' }).then(updatedTask => {
          setSafeTasksState(tasks.map(t => t.id === task.id ? updatedTask : t))
          return updatedTask
        }).catch(error => {
          console.error(`❌ Erro ao atualizar tarefa ${task.id} para atrasada:`, error)
          return null
        })
      )

      // Atualizar status para "pendente"
      const pendingUpdates = pendingTasks.map(task =>
        updateTask(task.id, { status: 'pendente' }).then(updatedTask => {
          setSafeTasksState(tasks.map(t => t.id === task.id ? updatedTask : t))
          return updatedTask
        }).catch(error => {
          console.error(`❌ Erro ao atualizar tarefa ${task.id} para pendente:`, error)
          return null
        })
      )

      const results = await Promise.all([...overdueUpdates, ...pendingUpdates])
      const successCount = results.filter(r => r !== null).length

      if (successCount > 0) {
        console.log(`✅ ${successCount} tarefas tiveram o status ajustado automaticamente`)
        await refreshStats()
      } else {
        console.log('✅ Nenhuma tarefa precisou de ajuste de status')
      }
    } catch (error) {
      console.error('❌ Erro ao verificar/atualizar status das tarefas:', error)
    }
  }, [tasks, refreshStats])

  // Verificar tarefas em atraso quando as tarefas são carregadas
  useEffect(() => {
    if (tasks.length > 0) {
      checkAndUpdateOverdueTasks()
    }
  }, [tasks, checkAndUpdateOverdueTasks])

  // Verificar tarefas em atraso periodicamente (a cada 5 minutos)
  useEffect(() => {
    if (!user) return
    
    const interval = setInterval(() => {
      console.log('⏰ Verificação periódica de tarefas em atraso...')
      checkAndUpdateOverdueTasks()
    }, 5 * 60 * 1000) // 5 minutos
    
    return () => clearInterval(interval)
  }, [user, checkAndUpdateOverdueTasks])
  
  // Carregar dados iniciais quando o usuário está disponível
  useEffect(() => {
    if (user) {
      loadTaskTypes()
      refreshStats()
      loadTasks() // Carregar tarefas mesmo sem filtros
    }
  }, [user, loadTaskTypes, refreshStats, loadTasks])
  
  // Recarregar tarefas quando filtros mudarem
  useEffect(() => {
    if (user && Object.keys(filters).length > 0) {
      loadTasks()
    }
  }, [filters, loadTasks, user])
  
  return {
    // Estado
    tasks,
    taskTypes,
    stats,
    loading,
    error,
    
    // Filtros
    filters,
    setFilters,
    clearFilters,
    
    // Operações CRUD
    loadTasks,
    loadUserTasks,
    loadLeadTasks,
    createNewTask,
    updateTaskData,
    removeTask,
    
    // Operações específicas
    completeTask,
    startTask,
    refreshStats,
    checkAndUpdateOverdueTasks, // Adicionar à interface
    
    // Utilitários
    getTaskById: getTaskByIdLocal,
    getOverdueTasks,
    getTasksByStatus,
    getTasksByPriority
  }
} 