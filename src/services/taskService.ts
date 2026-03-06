import { supabase } from './supabaseClient'
import type { 
  Task,
  TaskType,
  TaskComment,
  TaskReminder,
  CreateTaskData,
  UpdateTaskData,
  CreateTaskCommentData,
  CreateTaskReminderData,
  TaskFilters,
  TaskStats,
  TaskPriority,
  TaskStatus
} from '../types'
import SecureLogger from '../utils/logger'

/**
 * Serviço para gerenciamento de tarefas e atividades
 * Inclui CRUD completo, filtros, estatísticas e relacionamentos
 */

// ========================================
// TASK TYPES (Tipos de Tarefas)
// ========================================

const isNetworkFetchError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || '')
  return message.toLowerCase().includes('failed to fetch')
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const getTaskTypes = async (): Promise<TaskType[]> => {
  try {
    // Obter empresa_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('uuid', user.id)
      .single()

    if (profileError || !profile?.empresa_id) {
      SecureLogger.error('Erro ao obter empresa do usuário:', profileError)
      throw new Error('Falha ao identificar empresa do usuário')
    }

    const fetchTaskTypesByEmpresa = async () => {
      return await supabase
        .from('task_types')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('active', true)
        .order('name')
    }

    let { data, error } = await fetchTaskTypesByEmpresa()

    if (error && isNetworkFetchError(error)) {
      SecureLogger.warn('Falha de rede ao buscar tipos de tarefa, tentando novamente...', {
        message: error.message
      })
      await delay(600)
      const retryResult = await fetchTaskTypesByEmpresa()
      data = retryResult.data
      error = retryResult.error
    }

    if (error) {
      SecureLogger.error('Erro ao buscar tipos de tarefa:', error)
      if (isNetworkFetchError(error)) {
        throw new Error('Falha de conexão ao carregar tipos de tarefa. Verifique sua internet e tente novamente.')
      }
      throw new Error('Falha ao carregar tipos de tarefa')
    }

    // Se não há tipos, tentar inicializar os padrões
    if (!data || data.length === 0) {
      SecureLogger.log('📋 Nenhum tipo de tarefa encontrado, inicializando padrões...')
      await initializeDefaultTaskTypes()
      
      // Tentar buscar novamente após inicialização
      const { data: newData, error: newError } = await supabase
        .from('task_types')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('active', true)
        .order('name')

      if (newError) {
        SecureLogger.error('Erro ao buscar tipos após inicialização:', newError)
        throw new Error('Falha ao carregar tipos de tarefa')
      }

      SecureLogger.log('📋 Tipos de tarefa carregados após inicialização:', newData?.length || 0)
      return newData || []
    }

    SecureLogger.log('📋 Tipos de tarefa carregados:', data?.length || 0)
    return data || []
  } catch (error) {
    SecureLogger.error('Erro completo em getTaskTypes:', error)
    throw error
  }
}

export const createTaskType = async (data: Omit<TaskType, 'id' | 'created_at'>): Promise<TaskType> => {
  const { data: result, error } = await supabase
    .from('task_types')
    .insert(data)
    .select('*')
    .single()

  if (error) {
    SecureLogger.error('Erro ao criar tipo de tarefa:', error)
    throw new Error('Falha ao criar tipo de tarefa')
  }

  return result
}

// ========================================
// TASKS (Tarefas)
// ========================================

export interface GetTasksParams extends TaskFilters {
  page?: number
  limit?: number
}

export const getTasks = async (params: GetTasksParams = {}): Promise<{ data: Task[], total: number }> => {
  // Verificar se o usuário está autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    SecureLogger.error('❌ [getTasks] Usuário não autenticado')
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  const { page = 1, limit = 25, ...filters } = params

  // Obter perfil do usuário para saber se é admin
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('uuid', user.id)
    .single()

  if (profileErr) {
    SecureLogger.error('Erro ao obter perfil do usuário:', profileErr)
  }

  let query = supabase
    .from('tasks')
    .select(`
      *,
      task_type:task_types(*),
      assigned_user:profiles!tasks_assigned_to_fkey(*),
      created_user:profiles!tasks_created_by_fkey(*),
      lead:leads(*),
      pipeline:pipelines(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Visibilidade: se não for admin, restringir às tarefas do próprio usuário
  if (!profile?.is_admin) {
    query = query.eq('assigned_to', user.id)
  }

  // Aplicar filtros se fornecidos
  if (filters.status?.length) {
    query = query.in('status', filters.status)
  }
  
  if (filters.priority?.length) {
    query = query.in('priority', filters.priority)
  }
  
  if (filters.assigned_to?.length) {
    query = query.in('assigned_to', filters.assigned_to)
  }
  
  if (filters.created_by?.length) {
    query = query.in('created_by', filters.created_by)
  }
  
  if (filters.task_type_id?.length) {
    query = query.in('task_type_id', filters.task_type_id)
  }
  
  if (filters.lead_id?.length) {
    query = query.in('lead_id', filters.lead_id)
  }
  
  if (filters.pipeline_id?.length) {
    query = query.in('pipeline_id', filters.pipeline_id)
  }
  
  if (filters.due_date_from) {
    query = query.gte('due_date', filters.due_date_from)
  }
  
  if (filters.due_date_to) {
    query = query.lte('due_date', filters.due_date_to)
  }
  
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }
  
  if (filters.tags?.length) {
    query = query.overlaps('tags', filters.tags)
  }

  // Aplicar paginação
  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    SecureLogger.error('Erro ao buscar tarefas:', error)
    throw new Error('Falha ao carregar tarefas')
  }

  return {
    data: data || [],
    total: count || 0
  }
}

export const getTaskById = async (id: string): Promise<Task | null> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_type:task_types(*),
      assigned_user:profiles!tasks_assigned_to_fkey(*),
      created_user:profiles!tasks_created_by_fkey(*),
      lead:leads(*),
      pipeline:pipelines(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    SecureLogger.error('Erro ao buscar tarefa:', error)
    throw new Error('Falha ao carregar tarefa')
  }

  return data
}

export const getUserTasks = async (userId: string, filters?: TaskFilters): Promise<Task[]> => {
  const combinedFilters: TaskFilters = {
    ...filters,
    assigned_to: [userId]
  }
  
  const result = await getTasks(combinedFilters)
  return result.data
}

export const getLeadTasks = async (leadId: string): Promise<Task[]> => {
  const filters: TaskFilters = {
    lead_id: [leadId]
  }
  
  const result = await getTasks(filters)
  return result.data
}

// Função para buscar tarefas com data/hora para integração com agenda
export const getTasksWithDates = async (filters?: TaskFilters): Promise<Task[]> => {
  SecureLogger.log('📅 Buscando tarefas com datas para agenda...')
  
  try {
    // Obter empresa_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      SecureLogger.error('❌ Usuário não autenticado')
      return []
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('empresa_id, is_admin')
      .eq('uuid', user.id)
      .single()

    if (profileError || !profile?.empresa_id) {
      SecureLogger.error('❌ Erro ao obter empresa do usuário:', profileError)
      return []
    }

    SecureLogger.log('🏢 Empresa ID:', profile.empresa_id)
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_type:task_types(*),
        assigned_user:profiles!tasks_assigned_to_fkey(*),
        created_user:profiles!tasks_created_by_fkey(*),
        lead:leads(*),
        pipeline:pipelines(*)
      `)
      .eq('empresa_id', profile.empresa_id)
      .not('due_date', 'is', null) // Apenas tarefas com data de vencimento
      .order('due_date', { ascending: true })

    // Visibilidade: se não for admin, restringir às tarefas atribuídas ao usuário
    if (!profile.is_admin) {
      query = query.eq('assigned_to', user.id)
    }

    // Aplicar filtros adicionais se fornecidos
    if (filters) {
      if (filters.status?.length) {
        query = query.in('status', filters.status)
      }
      
      if (filters.priority?.length) {
        query = query.in('priority', filters.priority)
      }
      
      if (filters.assigned_to?.length) {
        query = query.in('assigned_to', filters.assigned_to)
      }
      
      if (filters.due_date_from) {
        query = query.gte('due_date', filters.due_date_from)
      }
      
      if (filters.due_date_to) {
        query = query.lte('due_date', filters.due_date_to)
      }
    }

    const { data, error } = await query

    if (error) {
      SecureLogger.error('❌ Erro ao buscar tarefas com datas:', error)
      return []
    }

    SecureLogger.log(`✅ ${data?.length || 0} tarefas com datas encontradas`)
    // SecureLogger.log('📋 Tarefas encontradas:', data?.map(t => ({ id: t.id, title: t.title, due_date: t.due_date })))
    
    return data || []
  } catch (error) {
    SecureLogger.error('❌ Erro inesperado ao buscar tarefas:', error)
    return []
  }
}

// Versão sem paginação para compatibilidade (DEPRECATED - usar getTasks)
export const getAllTasks = async (filters?: TaskFilters): Promise<Task[]> => {
  const result = await getTasks({ ...filters, limit: 1000 })
  return result.data
}

export const createTask = async (data: CreateTaskData): Promise<Task> => {
  SecureLogger.log('📝 Criando nova tarefa:', data)

  // Obter empresa_id do usuário logado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('uuid', user.id)
    .single()

  if (profileError || !profile?.empresa_id) {
    SecureLogger.error('Erro ao obter empresa do usuário:', profileError)
    throw new Error('Falha ao identificar empresa do usuário')
  }

  const taskData = {
    ...data,
    empresa_id: profile.empresa_id,
    created_by: user.id,
    status: data.status || 'pendente',
    priority: data.priority || 'media'
  }

  // SecureLogger.log('📤 Dados finais para inserção:', taskData)

  const { data: result, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select(`
      *,
      task_type:task_types(*),
      assigned_user:profiles!tasks_assigned_to_fkey(*),
      created_user:profiles!tasks_created_by_fkey(*),
      lead:leads(*),
      pipeline:pipelines(*)
    `)
    .single()

  if (error) {
    SecureLogger.error('Erro ao criar tarefa:', error)
    SecureLogger.error('Detalhes do erro:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    throw new Error(`Falha ao criar tarefa: ${error.message}`)
  }

  SecureLogger.log('✅ Tarefa criada com sucesso:', result.id)
  return result
}

export const updateTask = async (id: string, data: UpdateTaskData): Promise<Task> => {
  SecureLogger.log('📝 Atualizando tarefa', { id, data })

  const { data: result, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      task_type:task_types(*),
      assigned_user:profiles!tasks_assigned_to_fkey(*),
      created_user:profiles!tasks_created_by_fkey(*),
      lead:leads(*),
      pipeline:pipelines(*)
    `)
    .single()

  if (error) {
    SecureLogger.error('Erro ao atualizar tarefa:', error)
    throw new Error('Falha ao atualizar tarefa')
  }

  SecureLogger.log('✅ Tarefa atualizada com sucesso')
  return result
}

export const deleteTask = async (id: string): Promise<void> => {
  SecureLogger.log('🗑️ Deletando tarefa:', id)

  // Deletar a tarefa diretamente
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    SecureLogger.error('Erro ao deletar tarefa:', error)
    
    // Mensagens de erro mais amigáveis
    if (error.message?.includes('violates foreign key')) {
      throw new Error('Não foi possível excluir a tarefa. Ela possui dados vinculados.')
    }
    if (error.message?.includes('permission denied') || error.code === '42501') {
      throw new Error('Você não tem permissão para excluir esta tarefa.')
    }
    if (error.code === 'PGRST116') {
      throw new Error('Tarefa não encontrada.')
    }
    
    throw new Error('Falha ao excluir tarefa. Tente novamente.')
  }

  SecureLogger.log('✅ Tarefa deletada com sucesso')
}

// ========================================
// TASK COMMENTS (Comentários)
// ========================================

export const getTaskComments = async (taskId: string): Promise<TaskComment[]> => {
  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      user:profiles(*)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    SecureLogger.error('Erro ao buscar comentários:', error)
    throw new Error('Falha ao carregar comentários')
  }

  return data || []
}

export const createTaskComment = async (
  taskId: string, 
  data: CreateTaskCommentData
): Promise<TaskComment> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const commentData = {
    ...data,
    task_id: taskId,
    user_id: user.id
  }

  const { data: result, error } = await supabase
    .from('task_comments')
    .insert(commentData)
    .select(`
      *,
      user:profiles(*)
    `)
    .single()

  if (error) {
    SecureLogger.error('Erro ao criar comentário:', error)
    throw new Error('Falha ao criar comentário')
  }

  return result
}

// ========================================
// TASK REMINDERS (Lembretes)
// ========================================

export const getTaskReminders = async (taskId: string): Promise<TaskReminder[]> => {
  const { data, error } = await supabase
    .from('task_reminders')
    .select('*')
    .eq('task_id', taskId)
    .order('remind_at')

  if (error) {
    SecureLogger.error('Erro ao buscar lembretes:', error)
    throw new Error('Falha ao carregar lembretes')
  }

  return data || []
}

export const createTaskReminder = async (
  taskId: string, 
  data: CreateTaskReminderData
): Promise<TaskReminder> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const reminderData = {
    ...data,
    task_id: taskId,
    user_id: user.id
  }

  const { data: result, error } = await supabase
    .from('task_reminders')
    .insert(reminderData)
    .select('*')
    .single()

  if (error) {
    SecureLogger.error('Erro ao criar lembrete:', error)
    throw new Error('Falha ao criar lembrete')
  }

  return result
}

// ========================================
// ESTATÍSTICAS
// ========================================

export const getUserTaskStats = async (userId?: string): Promise<TaskStats> => {
  const { data: { user } } = await supabase.auth.getUser()
  const targetUserId = userId || user?.id
  
  if (!targetUserId) {
    throw new Error('Usuário não identificado')
  }

  const { data, error } = await supabase
    .rpc('get_user_task_stats', { user_uuid: targetUserId })

  if (error) {
    SecureLogger.error('Erro ao obter estatísticas:', error)
    throw new Error('Falha ao carregar estatísticas')
  }

  return data[0] || {
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    overdue_tasks: 0,
    today_tasks: 0,
    this_week_tasks: 0
  }
}

// ========================================
// UTILITÁRIOS
// ========================================

export const markTaskAsComplete = async (id: string): Promise<Task> => {
  return updateTask(id, { status: 'concluida' })
}

export const markTaskAsInProgress = async (id: string): Promise<Task> => {
  return updateTask(id, { status: 'em_andamento' })
}

export const assignTaskToUser = async (taskId: string, userId: string): Promise<Task> => {
  return updateTask(taskId, { assigned_to: userId })
}

export const setTaskPriority = async (taskId: string, priority: TaskPriority): Promise<Task> => {
  return updateTask(taskId, { priority })
}

export const addTaskToLead = async (taskId: string, leadId: string): Promise<Task> => {
  return updateTask(taskId, { lead_id: leadId })
}

// Helper para verificar se tarefa está atrasada
export const isTaskOverdue = (task: Task): boolean => {
  if (!task.due_date || task.status === 'concluida' || task.status === 'cancelada') {
    return false
  }
  
  const dueDate = new Date(task.due_date)
  const now = new Date()
  
  return dueDate < now
}

// Helper para formatar prioridade
export const getPriorityLabel = (priority: TaskPriority): string => {
  const labels = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    urgente: 'Urgente'
  }
  return labels[priority]
}

// Helper para formatar status
export const getStatusLabel = (status: TaskStatus): string => {
  const labels = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
    atrasada: 'Atrasada'
  }
  return labels[status]
}

// Helper para cores de prioridade
export const getPriorityColor = (priority: TaskPriority): string => {
  const colors = {
    baixa: 'text-green-600 bg-green-100',
    media: 'text-yellow-600 bg-yellow-100',
    alta: 'text-orange-600 bg-orange-100',
    urgente: 'text-red-600 bg-red-100'
  }
  return colors[priority]
}

// Helper para cores de status
export const getStatusColor = (status: TaskStatus): string => {
  const colors = {
    pendente: 'text-gray-600 bg-gray-100',
    em_andamento: 'text-blue-600 bg-blue-100',
    concluida: 'text-green-600 bg-green-100',
    cancelada: 'text-red-600 bg-red-100',
    atrasada: 'text-red-600 bg-red-100'
  }
  return colors[status]
} 

// Função para inicializar tipos de tarefa padrão
export const initializeDefaultTaskTypes = async (): Promise<void> => {
  try {
    // Obter empresa_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('empresa_id, is_admin')
      .eq('uuid', user.id)
      .single()

    if (profileError || !profile?.empresa_id) {
      SecureLogger.error('Erro ao obter empresa do usuário:', profileError)
      throw new Error('Falha ao identificar empresa do usuário')
    }

    // Verificar se o usuário é admin
    if (!profile.is_admin) {
      SecureLogger.log('⚠️ Usuário não é admin, não pode criar tipos de tarefa')
      return
    }

    // Verificar se já existem tipos de tarefa
    const { data: existingTypes, error: checkError } = await supabase
      .from('task_types')
      .select('id')
      .eq('empresa_id', profile.empresa_id)
      .limit(1)

    if (checkError) {
      SecureLogger.error('Erro ao verificar tipos existentes:', checkError)
      return
    }

    // Se já existem tipos, não criar novamente
    if (existingTypes && existingTypes.length > 0) {
      SecureLogger.log(' Tipos de tarefa já existem, pulando inicialização')
      return
    }

    // Tipos padrão para criar
    const defaultTypes = [
      { name: 'Ligação', icon: '', color: '#3B82F6', empresa_id: profile.empresa_id, active: true },
      { name: 'Email', icon: '', color: '#10B981', empresa_id: profile.empresa_id, active: true },
      { name: 'Reunião', icon: '', color: '#F59E0B', empresa_id: profile.empresa_id, active: true },
      { name: 'Proposta', icon: '', color: '#8B5CF6', empresa_id: profile.empresa_id, active: true },
      { name: 'Follow-up', icon: '', color: '#EF4444', empresa_id: profile.empresa_id, active: true },
      { name: 'Pesquisa', icon: '', color: '#06B6D4', empresa_id: profile.empresa_id, active: true },
      { name: 'Documentação', icon: '', color: '#84CC16', empresa_id: profile.empresa_id, active: true },
      { name: 'Visita Cliente', icon: '', color: '#14B8A6', empresa_id: profile.empresa_id, active: true },
      { name: 'Outro', icon: '', color: '#6B7280', empresa_id: profile.empresa_id, active: true }
    ]

    // Inserir tipos padrão
    const { error: insertError } = await supabase
      .from('task_types')
      .insert(defaultTypes)

    if (insertError) {
      SecureLogger.error('Erro ao criar tipos padrão:', insertError)
      throw new Error('Falha ao criar tipos padrão de tarefa')
    }

    SecureLogger.log('✅ Tipos de tarefa padrão criados com sucesso')
  } catch (error) {
    SecureLogger.error('Erro ao inicializar tipos padrão:', error)
    throw error
  }
}

// Função para remover duplicatas de tipos de tarefa
export const removeDuplicateTaskTypes = async (): Promise<void> => {
  try {
    // Obter empresa_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('empresa_id, is_admin')
      .eq('uuid', user.id)
      .single()

    if (profileError || !profile?.empresa_id || !profile.is_admin) {
      return
    }

    // Buscar todos os tipos "Visita Cliente" (case insensitive)
    const { data: duplicates, error: searchError } = await supabase
      .from('task_types')
      .select('id, name, created_at')
      .eq('empresa_id', profile.empresa_id)
      .ilike('name', 'Visita Cliente')
      .order('created_at', { ascending: true })

    if (searchError || !duplicates || duplicates.length <= 1) {
      return // Nenhuma duplicata encontrada
    }

    // Manter o primeiro (mais antigo) e remover os demais
    const idsToDelete = duplicates.slice(1).map(d => d.id)
    
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('task_types')
        .delete()
        .in('id', idsToDelete)

      if (!deleteError) {
        SecureLogger.log(`✅ ${idsToDelete.length} duplicata(s) de "Visita Cliente" removida(s)`)
      }
    }
  } catch (error) {
    SecureLogger.error('Erro ao remover duplicatas:', error)
  }
}

// Função para adicionar o tipo "Visita Cliente" se não existir
export const addVisitaClienteTaskType = async (): Promise<void> => {
  try {
    // Obter empresa_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('empresa_id, is_admin')
      .eq('uuid', user.id)
      .single()

    if (profileError || !profile?.empresa_id) {
      SecureLogger.error('Erro ao obter empresa do usuário:', profileError)
      throw new Error('Falha ao identificar empresa do usuário')
    }

    // Verificar se o usuário é admin
    if (!profile.is_admin) {
      SecureLogger.log('⚠️ Usuário não é admin, não pode criar tipos de tarefa')
      return
    }

    // Primeiro, remover duplicatas se existirem
    await removeDuplicateTaskTypes()

    // Verificar se o tipo "Visita Cliente" já existe (case insensitive)
    const { data: existingTypes, error: checkError } = await supabase
      .from('task_types')
      .select('id, name')
      .eq('empresa_id', profile.empresa_id)
      .ilike('name', 'Visita Cliente')

    if (checkError) {
      SecureLogger.error('Erro ao verificar tipo existente:', checkError)
      return
    }

    // Se já existe, não criar novamente
    if (existingTypes && existingTypes.length > 0) {
      SecureLogger.log('ℹ️ Tipo "Visita Cliente" já existe')
      return
    }

    // Criar o novo tipo
    const { error: insertError } = await supabase
      .from('task_types')
      .insert({
        name: 'Visita Cliente',
        icon: '',
        color: '#14B8A6',
        empresa_id: profile.empresa_id,
        active: true
      })

    if (insertError) {
      SecureLogger.error('Erro ao criar tipo "Visita Cliente":', insertError)
      throw new Error('Falha ao criar tipo "Visita Cliente"')
    }

    SecureLogger.log('✅ Tipo "Visita Cliente" criado com sucesso')
  } catch (error) {
    SecureLogger.error('Erro ao adicionar tipo "Visita Cliente":', error)
    throw error
  }
}

// Função para marcar tarefas em atraso
export const markOverdueTasks = async (): Promise<{ updated: number; errors: number }> => {
  try {
    SecureLogger.log('🔍 Verificando tarefas em atraso no servidor...')
    
    // Buscar tarefas que estão em atraso mas não têm status 'atrasada'
    const { data: overdueTasks, error } = await supabase
      .from('tasks')
      .select('id, due_date, status')
      .neq('status', 'atrasada')
      .neq('status', 'concluida')
      .neq('status', 'cancelada')
      .not('due_date', 'is', null)
      .lt('due_date', new Date().toISOString())
    
    if (error) {
      SecureLogger.error('Erro ao buscar tarefas em atraso:', error)
      throw new Error('Falha ao buscar tarefas em atraso')
    }
    
    if (!overdueTasks || overdueTasks.length === 0) {
      SecureLogger.log('✅ Nenhuma tarefa em atraso encontrada')
      return { updated: 0, errors: 0 }
    }
    
    SecureLogger.log(`⚠️ Encontradas ${overdueTasks.length} tarefas em atraso`)
    
    // Atualizar todas as tarefas em atraso
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'atrasada' })
      .in('id', overdueTasks.map(task => task.id))
    
    if (updateError) {
      SecureLogger.error('Erro ao atualizar tarefas em atraso:', updateError)
      throw new Error('Falha ao atualizar tarefas em atraso')
    }
    
    SecureLogger.log(`✅ ${overdueTasks.length} tarefas marcadas como atrasadas`)
    return { updated: overdueTasks.length, errors: 0 }
    
  } catch (error) {
    SecureLogger.error('Erro completo em markOverdueTasks:', error)
    throw error
  }
} 