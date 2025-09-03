import { supabase } from './supabaseClient'
import type {
  CreateEventData, UpdateEventData,
  CreateEventParticipantData, UpdateEventParticipantData,
  CreateEventLeadRelationData, CreateEventReminderData,
  EventFilters, EventStats
} from '../types'
import { getUserEmpresaId } from './authService'

// ===================== EVENTOS PRINCIPAIS =====================

export interface GetEventsParams extends EventFilters {
  page?: number
  limit?: number
}

export async function getEvents(params: GetEventsParams = {}) {
  const empresaId = await getUserEmpresaId()
  const { page = 1, limit = 25, ...filters } = params

  let query = supabase
    .from('events')
    .select('*', { count: 'exact' })
    .eq('empresa_id', empresaId)

  if (filters.status) query = query.in('status', filters.status)
  if (filters.event_type_id) query = query.in('event_type_id', filters.event_type_id)
  if (filters.created_by) query = query.in('created_by', filters.created_by)
  if (filters.lead_id) query = query.in('lead_id', filters.lead_id)
  if (filters.pipeline_id) query = query.in('pipeline_id', filters.pipeline_id)
  if (filters.start_date_from) query = query.gte('start_date', filters.start_date_from)
  if (filters.start_date_to) query = query.lte('start_date', filters.start_date_to)
  if (filters.all_day !== undefined) query = query.eq('all_day', filters.all_day)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  // Aplicar paginação
  const offset = (page - 1) * limit
  query = query
    .order('start_date', { ascending: true })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  return {
    data: data || [],
    error,
    total: count || 0
  }
}

export async function getEventById(id: string) {
  const empresaId = await getUserEmpresaId()
  return supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
}

export async function createEvent(data: CreateEventData) {
  const empresaId = await getUserEmpresaId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  // Validação básica
  if (!data.title?.trim()) throw new Error('Título do evento é obrigatório')
  if (!data.start_date || !data.end_date) throw new Error('Datas obrigatórias')

  const eventData = {
    ...data,
    empresa_id: empresaId,
    created_by: user.id,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    location: data.location?.trim() || null,
    meeting_url: data.meeting_url?.trim() || null,
    notes: data.notes?.trim() || null,
    tags: data.tags || [],
    all_day: !!data.all_day,
    timezone: data.timezone || 'America/Sao_Paulo',
    status: data.status || 'confirmed',
  }

  // Criação do evento
  const { data: created, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single()
  if (error) throw error
  return created
}

export async function updateEvent(id: string, data: UpdateEventData) {
  const empresaId = await getUserEmpresaId()
  if (!id?.trim()) throw new Error('ID do evento é obrigatório')

  // Sanitização
  const sanitized: any = {}
  if (data.title !== undefined) sanitized.title = data.title?.trim()
  if (data.description !== undefined) sanitized.description = data.description?.trim() || null
  if (data.location !== undefined) sanitized.location = data.location?.trim() || null
  if (data.meeting_url !== undefined) sanitized.meeting_url = data.meeting_url?.trim() || null
  if (data.notes !== undefined) sanitized.notes = data.notes?.trim() || null
  if (data.tags !== undefined) sanitized.tags = data.tags
  if (data.all_day !== undefined) sanitized.all_day = !!data.all_day
  if (data.timezone !== undefined) sanitized.timezone = data.timezone
  if (data.status !== undefined) sanitized.status = data.status
  if (data.start_date !== undefined) sanitized.start_date = data.start_date
  if (data.end_date !== undefined) sanitized.end_date = data.end_date
  if (data.lead_id !== undefined) sanitized.lead_id = data.lead_id
  if (data.pipeline_id !== undefined) sanitized.pipeline_id = data.pipeline_id
  if (data.event_type_id !== undefined) sanitized.event_type_id = data.event_type_id
  if (data.task_id !== undefined) sanitized.task_id = data.task_id

  const { data: updated, error } = await supabase
    .from('events')
    .update(sanitized)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()
  if (error) throw error
  return updated
}

export async function deleteEvent(id: string) {
  const empresaId = await getUserEmpresaId()
  if (!id?.trim()) throw new Error('ID do evento é obrigatório')
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)
  if (error) throw error
  return true
}

// ===================== PARTICIPANTES =====================

export async function getEventParticipants(event_id: string) {
  return supabase
    .from('event_participants')
    .select('*')
    .eq('event_id', event_id)
    .order('created_at', { ascending: true })
}

export async function addEventParticipant(event_id: string, data: CreateEventParticipantData) {
  const participant = {
    event_id,
    user_id: data.user_id,
    role: data.role || 'attendee',
    notes: data.notes?.trim() || null
  }
  const { data: created, error } = await supabase
    .from('event_participants')
    .insert([participant])
    .select()
    .single()
  if (error) throw error
  return created
}

export async function updateEventParticipant(id: string, data: UpdateEventParticipantData) {
  const sanitized: any = {}
  if (data.status !== undefined) sanitized.status = data.status
  if (data.role !== undefined) sanitized.role = data.role
  if (data.notes !== undefined) sanitized.notes = data.notes?.trim() || null
  const { data: updated, error } = await supabase
    .from('event_participants')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return updated
}

export async function removeEventParticipant(id: string) {
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// ===================== RELACIONAMENTO COM LEADS =====================

export async function getEventLeadRelations(event_id: string) {
  return supabase
    .from('event_lead_relations')
    .select('*')
    .eq('event_id', event_id)
    .order('created_at', { ascending: true })
}

export async function addEventLeadRelation(event_id: string, data: CreateEventLeadRelationData) {
  const relation = {
    event_id,
    lead_id: data.lead_id,
    role: data.role || 'participant'
  }
  const { data: created, error } = await supabase
    .from('event_lead_relations')
    .insert([relation])
    .select()
    .single()
  if (error) throw error
  return created
}

export async function removeEventLeadRelation(id: string) {
  const { error } = await supabase
    .from('event_lead_relations')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// ===================== LEMBRETES =====================

export async function getEventReminders(event_id: string) {
  return supabase
    .from('event_reminders')
    .select('*')
    .eq('event_id', event_id)
    .order('created_at', { ascending: true })
}

export async function addEventReminder(event_id: string, data: CreateEventReminderData, user_id: string) {
  const reminder = {
    event_id,
    user_id,
    remind_before_minutes: data.remind_before_minutes,
    type: data.type || 'notification',
    sent: false
  }
  const { data: created, error } = await supabase
    .from('event_reminders')
    .insert([reminder])
    .select()
    .single()
  if (error) throw error
  return created
}

export async function removeEventReminder(id: string) {
  const { error } = await supabase
    .from('event_reminders')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// ===================== TIPOS DE EVENTO =====================

export async function getEventTypes() {
  const empresaId = await getUserEmpresaId()
  return supabase
    .from('event_types')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('name', { ascending: true })
}

// ===================== ESTATÍSTICAS =====================

export async function getUserEventStats(user_id: string) {
  const { data, error } = await supabase
    .rpc('get_user_event_stats', { user_uuid: user_id })
  if (error) throw error
  return data?.[0] as EventStats
}

// ===================== INTEGRAÇÃO COM TAREFAS =====================

export async function getTaskEvents(task_id: string) {
  // Busca todos os eventos relacionados a uma tarefa
  return supabase
    .from('events')
    .select('*')
    .eq('task_id', task_id)
} 