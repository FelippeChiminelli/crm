import { supabase } from './supabaseClient'
import type { TaskAnalyticsFilters, TaskStatus, TaskPriority } from '../types'
import { parseISO, differenceInHours } from 'date-fns'

// =====================================================
// HELPERS
// =====================================================

/**
 * Obter empresa_id do usuário logado
 */
async function getUserEmpresaId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('uuid', user.id)
    .single()

  if (error || !profile?.empresa_id) {
    throw new Error('Empresa não encontrada para o usuário')
  }

  return profile.empresa_id
}

/**
 * Formatar tempo em formato legível
 */
function formatTime(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}min`
  }
  
  if (hours < 24) {
    const h = Math.floor(hours)
    const min = Math.round((hours - h) * 60)
    return min > 0 ? `${h}h ${min}min` : `${h}h`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = Math.floor(hours % 24)
  
  if (remainingHours === 0) {
    return `${days}d`
  }
  
  return `${days}d ${remainingHours}h`
}

/**
 * Calcular dias de atraso
 */
function getDaysOverdue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  
  const diffTime = today.getTime() - due.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// =====================================================
// FUNÇÕES DE ANALYTICS
// =====================================================

/**
 * 1. Obter estatísticas gerais de tarefas
 */
export async function getTasksStats(
  filters: TaskAnalyticsFilters
): Promise<{
  total_tasks: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  overdue: number
  completion_rate: number
}> {
  try {
    const empresaId = await getUserEmpresaId()
    
    // Buscar todas as tarefas do período
    let query = supabase
      .from('tasks')
      .select('id, status, due_date, completed_at', { count: 'exact' })
      .eq('empresa_id', empresaId)
    
    // Filtro de período (data de criação)
    if (filters.period) {
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }
    
    // Aplicar filtros
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }
    
    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority)
    }
    
    if (filters.assigned_to && filters.assigned_to.length > 0) {
      query = query.in('assigned_to', filters.assigned_to)
    }
    
    if (filters.pipeline_id && filters.pipeline_id.length > 0) {
      query = query.in('pipeline_id', filters.pipeline_id)
    }
    
    if (filters.lead_id && filters.lead_id.length > 0) {
      query = query.in('lead_id', filters.lead_id)
    }
    
    if (filters.task_type_id && filters.task_type_id.length > 0) {
      query = query.in('task_type_id', filters.task_type_id)
    }
    
    const { data: tasks, error, count } = await query
    
    if (error) {
      console.error('Erro ao buscar estatísticas de tarefas:', error)
      return {
        total_tasks: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
        completion_rate: 0
      }
    }
    
    if (!tasks || tasks.length === 0) {
      return {
        total_tasks: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
        completion_rate: 0
      }
    }
    
    // Contar por status
    const stats = {
      total_tasks: count || 0,
      pending: tasks.filter(t => t.status === 'pendente').length,
      in_progress: tasks.filter(t => t.status === 'em_andamento').length,
      completed: tasks.filter(t => t.status === 'concluida').length,
      cancelled: tasks.filter(t => t.status === 'cancelada').length,
      overdue: 0,
      completion_rate: 0
    }
    
    // Contar atrasadas
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    stats.overdue = tasks.filter(t => {
      if (!t.due_date) return false
      if (t.status === 'concluida' || t.status === 'cancelada') return false
      
      const dueDate = new Date(t.due_date)
      dueDate.setHours(0, 0, 0, 0)
      
      return dueDate < today
    }).length
    
    // Calcular taxa de conclusão
    const totalExecutable = stats.total_tasks - stats.cancelled
    stats.completion_rate = totalExecutable > 0 
      ? (stats.completed / totalExecutable) * 100 
      : 0
    
    console.log('\n📊 [Task Stats]:', stats)
    
    return stats
  } catch (err) {
    console.error('Erro ao calcular estatísticas de tarefas:', err)
    return {
      total_tasks: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
      completion_rate: 0
    }
  }
}

/**
 * 2. Obter tarefas agrupadas por prioridade
 */
export async function getTasksByPriority(
  filters: TaskAnalyticsFilters
): Promise<Array<{ priority: TaskPriority; count: number; percentage: number }>> {
  try {
    const empresaId = await getUserEmpresaId()
    
    let query = supabase
      .from('tasks')
      .select('priority', { count: 'exact' })
      .eq('empresa_id', empresaId)
    
    // Filtro de período
    if (filters.period) {
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }
    
    // Aplicar outros filtros
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }
    
    if (filters.assigned_to && filters.assigned_to.length > 0) {
      query = query.in('assigned_to', filters.assigned_to)
    }
    
    if (filters.pipeline_id && filters.pipeline_id.length > 0) {
      query = query.in('pipeline_id', filters.pipeline_id)
    }
    
    if (filters.lead_id && filters.lead_id.length > 0) {
      query = query.in('lead_id', filters.lead_id)
    }
    
    if (filters.task_type_id && filters.task_type_id.length > 0) {
      query = query.in('task_type_id', filters.task_type_id)
    }
    
    const { data: tasks, error } = await query
    
    if (error || !tasks) {
      console.error('Erro ao buscar tarefas por prioridade:', error)
      return []
    }
    
    // Agrupar por prioridade
    const priorityMap = new Map<TaskPriority, number>()
    const priorities: TaskPriority[] = ['baixa', 'media', 'alta', 'urgente']
    
    priorities.forEach(p => priorityMap.set(p, 0))
    
    tasks.forEach(task => {
      const count = priorityMap.get(task.priority) || 0
      priorityMap.set(task.priority, count + 1)
    })
    
    const total = tasks.length
    
    const results = priorities.map(priority => ({
      priority,
      count: priorityMap.get(priority) || 0,
      percentage: total > 0 ? ((priorityMap.get(priority) || 0) / total) * 100 : 0
    }))
    
    console.log('\n📊 [Tasks by Priority]:', results)
    
    return results
  } catch (err) {
    console.error('Erro ao agrupar tarefas por prioridade:', err)
    return []
  }
}

/**
 * 3. Obter tarefas agrupadas por status
 */
export async function getTasksByStatus(
  filters: TaskAnalyticsFilters
): Promise<Array<{ status: TaskStatus; count: number; percentage: number }>> {
  try {
    const empresaId = await getUserEmpresaId()
    
    let query = supabase
      .from('tasks')
      .select('status, due_date', { count: 'exact' })
      .eq('empresa_id', empresaId)
    
    // Filtro de período
    if (filters.period) {
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }
    
    // Aplicar filtros
    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority)
    }
    
    if (filters.assigned_to && filters.assigned_to.length > 0) {
      query = query.in('assigned_to', filters.assigned_to)
    }
    
    if (filters.pipeline_id && filters.pipeline_id.length > 0) {
      query = query.in('pipeline_id', filters.pipeline_id)
    }
    
    if (filters.lead_id && filters.lead_id.length > 0) {
      query = query.in('lead_id', filters.lead_id)
    }
    
    if (filters.task_type_id && filters.task_type_id.length > 0) {
      query = query.in('task_type_id', filters.task_type_id)
    }
    
    const { data: tasks, error } = await query
    
    if (error || !tasks) {
      console.error('Erro ao buscar tarefas por status:', error)
      return []
    }
    
    // Agrupar por status (incluindo atrasadas)
    const statusMap = new Map<TaskStatus, number>()
    const statuses: TaskStatus[] = ['pendente', 'em_andamento', 'concluida', 'cancelada', 'atrasada']
    
    statuses.forEach(s => statusMap.set(s, 0))
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    tasks.forEach(task => {
      // Verificar se está atrasada
      if (task.status !== 'concluida' && task.status !== 'cancelada' && task.due_date) {
        const dueDate = new Date(task.due_date)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate < today) {
          const count = statusMap.get('atrasada') || 0
          statusMap.set('atrasada', count + 1)
          return
        }
      }
      
      const count = statusMap.get(task.status) || 0
      statusMap.set(task.status, count + 1)
    })
    
    const total = tasks.length
    
    const results = statuses.map(status => ({
      status,
      count: statusMap.get(status) || 0,
      percentage: total > 0 ? ((statusMap.get(status) || 0) / total) * 100 : 0
    }))
    
    console.log('\n📊 [Tasks by Status]:', results)
    
    return results
  } catch (err) {
    console.error('Erro ao agrupar tarefas por status:', err)
    return []
  }
}

/**
 * 4. Obter produtividade por usuário
 */
export async function getProductivityByUser(
  filters: TaskAnalyticsFilters
): Promise<Array<{
  user_id: string
  user_name: string
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  overdue_tasks: number
  completion_rate: number
  avg_completion_time_hours: number
}>> {
  try {
    const empresaId = await getUserEmpresaId()
    
    // Buscar tarefas com informações do usuário
    let query = supabase
      .from('tasks')
      .select(`
        id,
        assigned_to,
        status,
        due_date,
        created_at,
        completed_at,
        assigned_user:profiles!tasks_assigned_to_fkey(uuid, full_name)
      `)
      .eq('empresa_id', empresaId)
      .not('assigned_to', 'is', null)
    
    // Filtro de período
    if (filters.period) {
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }
    
    // Aplicar filtros
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }
    
    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority)
    }
    
    if (filters.assigned_to && filters.assigned_to.length > 0) {
      query = query.in('assigned_to', filters.assigned_to)
    }
    
    if (filters.pipeline_id && filters.pipeline_id.length > 0) {
      query = query.in('pipeline_id', filters.pipeline_id)
    }
    
    if (filters.lead_id && filters.lead_id.length > 0) {
      query = query.in('lead_id', filters.lead_id)
    }
    
    if (filters.task_type_id && filters.task_type_id.length > 0) {
      query = query.in('task_type_id', filters.task_type_id)
    }
    
    const { data: tasks, error } = await query
    
    if (error || !tasks) {
      console.error('Erro ao buscar produtividade por usuário:', error)
      return []
    }
    
    // Agrupar por usuário
    const userMap = new Map<string, {
      user_id: string
      user_name: string
      total_tasks: number
      completed_tasks: number
      in_progress_tasks: number
      overdue_tasks: number
      completion_times: number[] // em horas
    }>()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    tasks.forEach(task => {
      const userId = task.assigned_to!
      const userName = (task.assigned_user as any)?.full_name || 'Sem nome'
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user_id: userId,
          user_name: userName,
          total_tasks: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
          overdue_tasks: 0,
          completion_times: []
        })
      }
      
      const userStats = userMap.get(userId)!
      userStats.total_tasks++
      
      if (task.status === 'concluida') {
        userStats.completed_tasks++
        
        // Calcular tempo de conclusão
        if (task.completed_at) {
          const created = parseISO(task.created_at)
          const completed = parseISO(task.completed_at)
          const hours = differenceInHours(completed, created)
          
          if (hours > 0) {
            userStats.completion_times.push(hours)
          }
        }
      }
      
      if (task.status === 'em_andamento') {
        userStats.in_progress_tasks++
      }
      
      // Verificar se está atrasada
      if (task.status !== 'concluida' && task.status !== 'cancelada' && task.due_date) {
        const dueDate = new Date(task.due_date)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate < today) {
          userStats.overdue_tasks++
        }
      }
    })
    
    // Calcular médias e taxas
    const results = Array.from(userMap.values()).map(user => {
      const executableTasks = user.total_tasks - user.completed_tasks // Excluir canceladas se houver
      const completion_rate = executableTasks > 0
        ? (user.completed_tasks / user.total_tasks) * 100
        : 0
      
      const avg_completion_time_hours = user.completion_times.length > 0
        ? user.completion_times.reduce((sum, t) => sum + t, 0) / user.completion_times.length
        : 0
      
      return {
        user_id: user.user_id,
        user_name: user.user_name,
        total_tasks: user.total_tasks,
        completed_tasks: user.completed_tasks,
        in_progress_tasks: user.in_progress_tasks,
        overdue_tasks: user.overdue_tasks,
        completion_rate,
        avg_completion_time_hours
      }
    })
    
    // Ordenar por taxa de conclusão (maior primeiro)
    results.sort((a, b) => b.completion_rate - a.completion_rate)
    
    console.log('\n📊 [Productivity by User]:', results)
    
    return results
  } catch (err) {
    console.error('Erro ao calcular produtividade por usuário:', err)
    return []
  }
}

/**
 * 5. Obter evolução de tarefas ao longo do tempo
 */
export async function getTasksOverTime(
  filters: TaskAnalyticsFilters
): Promise<Array<{
  date: string
  created: number
  completed: number
  overdue: number
}>> {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!filters.period) {
      return []
    }
    
    // Buscar tarefas criadas no período
    let createdQuery = supabase
      .from('tasks')
      .select('created_at')
      .eq('empresa_id', empresaId)
      .gte('created_at', `${filters.period.start}T00:00:00`)
      .lte('created_at', `${filters.period.end}T23:59:59`)
    
    // Aplicar filtros
    if (filters.status && filters.status.length > 0) {
      createdQuery = createdQuery.in('status', filters.status)
    }
    
    if (filters.priority && filters.priority.length > 0) {
      createdQuery = createdQuery.in('priority', filters.priority)
    }
    
    if (filters.assigned_to && filters.assigned_to.length > 0) {
      createdQuery = createdQuery.in('assigned_to', filters.assigned_to)
    }
    
    if (filters.pipeline_id && filters.pipeline_id.length > 0) {
      createdQuery = createdQuery.in('pipeline_id', filters.pipeline_id)
    }
    
    if (filters.lead_id && filters.lead_id.length > 0) {
      createdQuery = createdQuery.in('lead_id', filters.lead_id)
    }
    
    if (filters.task_type_id && filters.task_type_id.length > 0) {
      createdQuery = createdQuery.in('task_type_id', filters.task_type_id)
    }
    
    const { data: createdTasks, error: createdError } = await createdQuery
    
    // Buscar tarefas concluídas no período
    let completedQuery = supabase
      .from('tasks')
      .select('completed_at')
      .eq('empresa_id', empresaId)
      .eq('status', 'concluida')
      .not('completed_at', 'is', null)
      .gte('completed_at', `${filters.period.start}T00:00:00`)
      .lte('completed_at', `${filters.period.end}T23:59:59`)
    
    // Aplicar mesmos filtros
    if (filters.priority && filters.priority.length > 0) {
      completedQuery = completedQuery.in('priority', filters.priority)
    }
    
    if (filters.assigned_to && filters.assigned_to.length > 0) {
      completedQuery = completedQuery.in('assigned_to', filters.assigned_to)
    }
    
    if (filters.pipeline_id && filters.pipeline_id.length > 0) {
      completedQuery = completedQuery.in('pipeline_id', filters.pipeline_id)
    }
    
    if (filters.lead_id && filters.lead_id.length > 0) {
      completedQuery = completedQuery.in('lead_id', filters.lead_id)
    }
    
    if (filters.task_type_id && filters.task_type_id.length > 0) {
      completedQuery = completedQuery.in('task_type_id', filters.task_type_id)
    }
    
    const { data: completedTasks, error: completedError } = await completedQuery
    
    if (createdError || completedError) {
      console.error('Erro ao buscar tarefas ao longo do tempo:', createdError || completedError)
      return []
    }
    
    // Agrupar por data
    const dateMap = new Map<string, { created: number; completed: number; overdue: number }>()
    
    // Contar criadas
    createdTasks?.forEach(task => {
      const date = task.created_at.split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { created: 0, completed: 0, overdue: 0 })
      }
      dateMap.get(date)!.created++
    })
    
    // Contar concluídas
    completedTasks?.forEach(task => {
      if (!task.completed_at) return
      const date = task.completed_at.split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { created: 0, completed: 0, overdue: 0 })
      }
      dateMap.get(date)!.completed++
    })
    
    // Converter para array e ordenar por data
    const results = Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        created: stats.created,
        completed: stats.completed,
        overdue: stats.overdue
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    console.log('\n📊 [Tasks Over Time]:', results)
    
    return results
  } catch (err) {
    console.error('Erro ao calcular evolução de tarefas:', err)
    return []
  }
}

/**
 * 6. Obter detalhes de tarefas atrasadas
 */
export async function getOverdueTasks(
  filters: TaskAnalyticsFilters
): Promise<Array<{
  id: string
  title: string
  assigned_user_name: string
  due_date: string
  days_overdue: number
  priority: TaskPriority
  status: TaskStatus
}>> {
  try {
    const empresaId = await getUserEmpresaId()
    
    // Buscar tarefas com vencimento
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        priority,
        status,
        assigned_to,
        assigned_user:profiles!tasks_assigned_to_fkey(full_name)
      `)
      .eq('empresa_id', empresaId)
      .not('due_date', 'is', null)
      .not('status', 'in', '(concluida,cancelada)')
    
    // Filtro de período (criação)
    if (filters.period) {
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }
    
    // Aplicar filtros
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }
    
    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority)
    }
    
    if (filters.assigned_to && filters.assigned_to.length > 0) {
      query = query.in('assigned_to', filters.assigned_to)
    }
    
    if (filters.pipeline_id && filters.pipeline_id.length > 0) {
      query = query.in('pipeline_id', filters.pipeline_id)
    }
    
    if (filters.lead_id && filters.lead_id.length > 0) {
      query = query.in('lead_id', filters.lead_id)
    }
    
    if (filters.task_type_id && filters.task_type_id.length > 0) {
      query = query.in('task_type_id', filters.task_type_id)
    }
    
    const { data: tasks, error } = await query
    
    if (error || !tasks) {
      console.error('Erro ao buscar tarefas atrasadas:', error)
      return []
    }
    
    // Filtrar apenas atrasadas e calcular dias de atraso
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const overdueTasks = tasks
      .filter(task => {
        if (!task.due_date) return false
        const dueDate = new Date(task.due_date)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate < today
      })
      .map(task => ({
        id: task.id,
        title: task.title,
        assigned_user_name: (task.assigned_user as any)?.full_name || 'Não atribuído',
        due_date: task.due_date!,
        days_overdue: getDaysOverdue(task.due_date!),
        priority: task.priority,
        status: task.status
      }))
      .sort((a, b) => b.days_overdue - a.days_overdue) // Mais atrasadas primeiro
    
    console.log('\n📊 [Overdue Tasks]:', overdueTasks.length)
    
    return overdueTasks
  } catch (err) {
    console.error('Erro ao buscar tarefas atrasadas:', err)
    return []
  }
}

/**
 * 7. Obter tempo médio de conclusão de tarefas
 */
export async function getAverageCompletionTime(
  filters: TaskAnalyticsFilters
): Promise<{
  average_hours: number
  formatted: string
  total_completed: number
  details?: Array<{
    task_id: string
    task_title: string
    user_name: string
    completion_time_hours: number
    completion_time_formatted: string
  }>
}> {
  try {
    const empresaId = await getUserEmpresaId()
    
    // Buscar tarefas concluídas
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        created_at,
        completed_at,
        assigned_to,
        assigned_user:profiles!tasks_assigned_to_fkey(full_name)
      `)
      .eq('empresa_id', empresaId)
      .eq('status', 'concluida')
      .not('completed_at', 'is', null)
    
    // Filtro de período (conclusão)
    if (filters.period) {
      query = query
        .gte('completed_at', `${filters.period.start}T00:00:00`)
        .lte('completed_at', `${filters.period.end}T23:59:59`)
    }
    
    // Aplicar filtros
    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority)
    }
    
    if (filters.assigned_to && filters.assigned_to.length > 0) {
      query = query.in('assigned_to', filters.assigned_to)
    }
    
    if (filters.pipeline_id && filters.pipeline_id.length > 0) {
      query = query.in('pipeline_id', filters.pipeline_id)
    }
    
    if (filters.lead_id && filters.lead_id.length > 0) {
      query = query.in('lead_id', filters.lead_id)
    }
    
    if (filters.task_type_id && filters.task_type_id.length > 0) {
      query = query.in('task_type_id', filters.task_type_id)
    }
    
    const { data: tasks, error } = await query
    
    if (error || !tasks || tasks.length === 0) {
      console.error('Erro ao buscar tempo médio de conclusão:', error)
      return {
        average_hours: 0,
        formatted: '0h',
        total_completed: 0,
        details: []
      }
    }
    
    // Calcular tempo de conclusão para cada tarefa
    const completionTimes: number[] = []
    const details: Array<{
      task_id: string
      task_title: string
      user_name: string
      completion_time_hours: number
      completion_time_formatted: string
    }> = []
    
    tasks.forEach(task => {
      if (!task.completed_at) return
      
      const created = parseISO(task.created_at)
      const completed = parseISO(task.completed_at)
      const hours = differenceInHours(completed, created)
      
      if (hours > 0) {
        completionTimes.push(hours)
        
        details.push({
          task_id: task.id,
          task_title: task.title,
          user_name: (task.assigned_user as any)?.full_name || 'Não atribuído',
          completion_time_hours: hours,
          completion_time_formatted: formatTime(hours)
        })
      }
    })
    
    if (completionTimes.length === 0) {
      return {
        average_hours: 0,
        formatted: '0h',
        total_completed: 0,
        details: []
      }
    }
    
    const average_hours = completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
    const formatted = formatTime(average_hours)
    
    // Ordenar detalhes por tempo (maior primeiro)
    details.sort((a, b) => b.completion_time_hours - a.completion_time_hours)
    
    console.log('\n📊 [Average Completion Time]:', { average_hours, formatted, total: completionTimes.length })
    
    return {
      average_hours,
      formatted,
      total_completed: completionTimes.length,
      details
    }
  } catch (err) {
    console.error('Erro ao calcular tempo médio de conclusão:', err)
    return {
      average_hours: 0,
      formatted: '0h',
      total_completed: 0,
      details: []
    }
  }
}

// =====================================================
// CACHE E UTILITÁRIOS
// =====================================================

/**
 * Invalidar cache de analytics de tarefas
 */
export function invalidateTasksCache() {
  console.log('🗑️ Cache de analytics de tarefas invalidado')
  // Implementar cache se necessário (seguir padrão do analyticsService.ts)
}

