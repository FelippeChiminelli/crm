import { supabase } from './supabaseClient'
import type {
  BookingCalendar, BookingCalendarOwner, BookingAvailability, BookingType,
  BookingBlock, Booking, AvailableSlot,
  CreateBookingCalendarData, UpdateBookingCalendarData,
  CreateBookingCalendarOwnerData, UpdateBookingCalendarOwnerData,
  CreateBookingTypeData, UpdateBookingTypeData,
  CreateBookingBlockData, CreateBookingData, UpdateBookingData,
  BookingFilters, BookingCalendarFilters
} from '../types'
import { getUserEmpresaId } from './authService'

// ===================== CALENDÁRIOS =====================

export interface GetBookingCalendarsParams extends BookingCalendarFilters {
  page?: number
  limit?: number
}

export async function getBookingCalendars(params: GetBookingCalendarsParams = {}) {
  const empresaId = await getUserEmpresaId()
  const { page = 1, limit = 50, ...filters } = params

  let query = supabase
    .from('booking_calendars')
    .select(`
      *,
      owners:booking_calendar_owners(id, user_id),
      booking_types:booking_types(id)
    `, { count: 'exact' })
    .eq('empresa_id', empresaId)

  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  const offset = (page - 1) * limit
  query = query
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  return {
    data: data || [],
    error,
    total: count || 0
  }
}

export async function getBookingCalendarById(id: string) {
  const empresaId = await getUserEmpresaId()
  
  const { data, error } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()

  if (error) throw error
  return data as BookingCalendar
}

export async function getBookingCalendarWithDetails(id: string) {
  const empresaId = await getUserEmpresaId()
  
  // Buscar calendar
  const { data: calendar, error: calendarError } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()

  if (calendarError) throw calendarError

  // Buscar owners com perfil
  const { data: owners } = await supabase
    .from('booking_calendar_owners')
    .select(`
      *,
      user:profiles!booking_calendar_owners_user_id_fkey(uuid, full_name, email)
    `)
    .eq('calendar_id', id)

  // Buscar availability
  const { data: availability } = await supabase
    .from('booking_availability')
    .select('*')
    .eq('calendar_id', id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  // Buscar booking types
  const { data: booking_types } = await supabase
    .from('booking_types')
    .select('*')
    .eq('calendar_id', id)
    .order('position', { ascending: true })

  return {
    ...calendar,
    owners: owners || [],
    availability: availability || [],
    booking_types: booking_types || []
  } as BookingCalendar
}

export async function createBookingCalendar(data: CreateBookingCalendarData) {
  const empresaId = await getUserEmpresaId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  if (!data.name?.trim()) throw new Error('Nome da agenda é obrigatório')

  const calendarData = {
    empresa_id: empresaId,
    created_by: user.id,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    color: data.color || '#6366f1',
    timezone: data.timezone || 'America/Sao_Paulo',
    is_active: true
  }

  const { data: created, error } = await supabase
    .from('booking_calendars')
    .insert([calendarData])
    .select('*')
    .single()

  if (error) throw error

  // Inserir owners se fornecidos
  if (data.owners && data.owners.length > 0) {
    const ownersData = data.owners.map(o => ({
      calendar_id: created.id,
      user_id: o.user_id,
      role: o.role || 'member',
      can_receive_bookings: o.can_receive_bookings !== false,
      booking_weight: o.booking_weight || 1
    }))

    await supabase.from('booking_calendar_owners').insert(ownersData)
  }

  // Inserir availability se fornecida
  if (data.availability && data.availability.length > 0) {
    const availabilityData = data.availability.map(a => ({
      calendar_id: created.id,
      day_of_week: a.day_of_week,
      start_time: a.start_time,
      end_time: a.end_time,
      is_active: a.is_active !== false
    }))

    await supabase.from('booking_availability').insert(availabilityData)
  }

  return created as BookingCalendar
}

export async function updateBookingCalendar(id: string, data: UpdateBookingCalendarData) {
  const empresaId = await getUserEmpresaId()
  if (!id?.trim()) throw new Error('ID da agenda é obrigatório')

  const sanitized: Record<string, unknown> = {}
  if (data.name !== undefined) sanitized.name = data.name?.trim()
  if (data.description !== undefined) sanitized.description = data.description?.trim() || null
  if (data.color !== undefined) sanitized.color = data.color
  if (data.timezone !== undefined) sanitized.timezone = data.timezone
  if (data.is_active !== undefined) sanitized.is_active = data.is_active
  // Campos de link público
  if (data.public_slug !== undefined) sanitized.public_slug = data.public_slug?.trim() || null
  if (data.is_public !== undefined) sanitized.is_public = data.is_public
  if (data.create_lead_on_booking !== undefined) sanitized.create_lead_on_booking = data.create_lead_on_booking
  if (data.default_pipeline_id !== undefined) sanitized.default_pipeline_id = data.default_pipeline_id || null
  if (data.default_stage_id !== undefined) sanitized.default_stage_id = data.default_stage_id || null
  if (data.min_advance_hours !== undefined) sanitized.min_advance_hours = data.min_advance_hours
  if (data.max_advance_days !== undefined) sanitized.max_advance_days = data.max_advance_days

  // Se não tem campos para atualizar, retorna o calendário atual
  if (Object.keys(sanitized).length === 0) {
    return await getBookingCalendarById(id)
  }

  const { data: updated, error } = await supabase
    .from('booking_calendars')
    .update(sanitized)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()

  if (error) throw error
  return updated as BookingCalendar
}

export async function deleteBookingCalendar(id: string) {
  const empresaId = await getUserEmpresaId()
  if (!id?.trim()) throw new Error('ID da agenda é obrigatório')

  const { error } = await supabase
    .from('booking_calendars')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)

  if (error) throw error
  return true
}

// ===================== OWNERS =====================

export async function getCalendarOwners(calendar_id: string) {
  const { data, error } = await supabase
    .from('booking_calendar_owners')
    .select(`
      *,
      user:profiles(uuid, full_name, email, phone)
    `)
    .eq('calendar_id', calendar_id)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as BookingCalendarOwner[]
}

export async function addCalendarOwner(calendar_id: string, data: CreateBookingCalendarOwnerData) {
  const ownerData = {
    calendar_id,
    user_id: data.user_id,
    role: data.role || 'member',
    can_receive_bookings: data.can_receive_bookings !== false,
    booking_weight: data.booking_weight || 1
  }

  const { data: created, error } = await supabase
    .from('booking_calendar_owners')
    .insert([ownerData])
    .select(`
      *,
      user:profiles(uuid, full_name, email, phone)
    `)
    .single()

  if (error) throw error
  return created as BookingCalendarOwner
}

export async function updateCalendarOwner(id: string, data: UpdateBookingCalendarOwnerData) {
  const sanitized: Record<string, unknown> = {}
  if (data.role !== undefined) sanitized.role = data.role
  if (data.can_receive_bookings !== undefined) sanitized.can_receive_bookings = data.can_receive_bookings
  if (data.booking_weight !== undefined) sanitized.booking_weight = data.booking_weight

  const { data: updated, error } = await supabase
    .from('booking_calendar_owners')
    .update(sanitized)
    .eq('id', id)
    .select(`
      *,
      user:profiles(uuid, full_name, email, phone)
    `)
    .single()

  if (error) throw error
  return updated as BookingCalendarOwner
}

export async function removeCalendarOwner(id: string) {
  const { error } = await supabase
    .from('booking_calendar_owners')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

// ===================== DISPONIBILIDADE =====================

export async function getCalendarAvailability(calendar_id: string) {
  const { data, error } = await supabase
    .from('booking_availability')
    .select('*')
    .eq('calendar_id', calendar_id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw error
  return (data || []) as BookingAvailability[]
}

export async function setCalendarAvailability(calendar_id: string, availability: Omit<BookingAvailability, 'id' | 'calendar_id' | 'created_at'>[]) {
  // Remover availability existente
  await supabase
    .from('booking_availability')
    .delete()
    .eq('calendar_id', calendar_id)

  // Inserir nova availability
  if (availability.length > 0) {
    const availabilityData = availability.map(a => ({
      calendar_id,
      day_of_week: a.day_of_week,
      start_time: a.start_time,
      end_time: a.end_time,
      is_active: a.is_active !== false
    }))

    const { error } = await supabase
      .from('booking_availability')
      .insert(availabilityData)

    if (error) throw error
  }

  return getCalendarAvailability(calendar_id)
}

export async function updateAvailabilitySlot(id: string, data: Partial<BookingAvailability>) {
  const sanitized: Record<string, unknown> = {}
  if (data.start_time !== undefined) sanitized.start_time = data.start_time
  if (data.end_time !== undefined) sanitized.end_time = data.end_time
  if (data.is_active !== undefined) sanitized.is_active = data.is_active

  const { data: updated, error } = await supabase
    .from('booking_availability')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as BookingAvailability
}

// ===================== TIPOS DE ATENDIMENTO =====================

export async function getBookingTypes(calendar_id: string) {
  const { data, error } = await supabase
    .from('booking_types')
    .select('*')
    .eq('calendar_id', calendar_id)
    .order('position', { ascending: true })

  if (error) throw error
  return (data || []) as BookingType[]
}

/**
 * Busca todos os tipos de atendimento de todas as agendas da empresa
 * Útil para permitir importar/copiar tipos existentes
 */
export async function getAllBookingTypes() {
  const empresaId = await getUserEmpresaId()
  
  const { data, error } = await supabase
    .from('booking_types')
    .select(`
      *,
      calendar:booking_calendars(id, name)
    `)
    .eq('booking_calendars.empresa_id', empresaId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []) as (BookingType & { calendar?: { id: string; name: string } })[]
}

export async function createBookingType(data: CreateBookingTypeData) {
  if (!data.name?.trim()) throw new Error('Nome do tipo é obrigatório')
  if (!data.duration_minutes || data.duration_minutes < 5) {
    throw new Error('Duração deve ser de pelo menos 5 minutos')
  }

  // Buscar próxima posição
  const { data: existing } = await supabase
    .from('booking_types')
    .select('position')
    .eq('calendar_id', data.calendar_id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const typeData = {
    calendar_id: data.calendar_id,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    duration_minutes: data.duration_minutes,
    buffer_before_minutes: data.buffer_before_minutes || 0,
    buffer_after_minutes: data.buffer_after_minutes || 0,
    color: data.color || '#3b82f6',
    price: data.price || null,
    max_per_day: data.max_per_day || null,
    min_advance_hours: data.min_advance_hours || 1,
    is_active: true,
    position: nextPosition
  }

  const { data: created, error } = await supabase
    .from('booking_types')
    .insert([typeData])
    .select()
    .single()

  if (error) throw error
  return created as BookingType
}

export async function updateBookingType(id: string, data: UpdateBookingTypeData) {
  const sanitized: Record<string, unknown> = {}
  if (data.name !== undefined) sanitized.name = data.name?.trim()
  if (data.description !== undefined) sanitized.description = data.description?.trim() || null
  if (data.duration_minutes !== undefined) sanitized.duration_minutes = data.duration_minutes
  if (data.buffer_before_minutes !== undefined) sanitized.buffer_before_minutes = data.buffer_before_minutes
  if (data.buffer_after_minutes !== undefined) sanitized.buffer_after_minutes = data.buffer_after_minutes
  if (data.color !== undefined) sanitized.color = data.color
  if (data.price !== undefined) sanitized.price = data.price
  if (data.max_per_day !== undefined) sanitized.max_per_day = data.max_per_day
  if (data.min_advance_hours !== undefined) sanitized.min_advance_hours = data.min_advance_hours
  if (data.is_active !== undefined) sanitized.is_active = data.is_active
  if (data.position !== undefined) sanitized.position = data.position

  const { data: updated, error } = await supabase
    .from('booking_types')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as BookingType
}

export async function deleteBookingType(id: string) {
  const { error } = await supabase
    .from('booking_types')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

export async function reorderBookingTypes(calendar_id: string, order: string[]) {
  // Atualizar posição de cada tipo
  const updates = order.map((id, index) => 
    supabase
      .from('booking_types')
      .update({ position: index })
      .eq('id', id)
      .eq('calendar_id', calendar_id)
  )

  await Promise.all(updates)
  return getBookingTypes(calendar_id)
}

// ===================== BLOQUEIOS =====================

export async function getCalendarBlocks(calendar_id: string, date_from?: string, date_to?: string) {
  let query = supabase
    .from('booking_blocks')
    .select('*')
    .eq('calendar_id', calendar_id)
    .order('start_datetime', { ascending: true })

  if (date_from) query = query.gte('start_datetime', date_from)
  if (date_to) query = query.lte('end_datetime', date_to)

  const { data, error } = await query

  if (error) throw error
  return (data || []) as BookingBlock[]
}

export async function createBlock(data: CreateBookingBlockData) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const blockData = {
    calendar_id: data.calendar_id,
    start_datetime: data.start_datetime,
    end_datetime: data.end_datetime,
    reason: data.reason?.trim() || null,
    created_by: user.id
  }

  const { data: created, error } = await supabase
    .from('booking_blocks')
    .insert([blockData])
    .select()
    .single()

  if (error) throw error
  return created as BookingBlock
}

export async function deleteBlock(id: string) {
  const { error } = await supabase
    .from('booking_blocks')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

// ===================== AGENDAMENTOS =====================

export interface GetBookingsParams extends BookingFilters {
  page?: number
  limit?: number
}

export async function getBookings(params: GetBookingsParams = {}) {
  const empresaId = await getUserEmpresaId()
  const { page = 1, limit = 50, ...filters } = params

  let query = supabase
    .from('bookings')
    .select(`
      *,
      calendar:booking_calendars(id, name, color),
      booking_type:booking_types(id, name, duration_minutes, color),
      assigned_user:profiles!bookings_assigned_to_fkey(uuid, full_name, email),
      lead:leads(id, name, phone, email)
    `, { count: 'exact' })
    .eq('empresa_id', empresaId)

  if (filters.calendar_id) query = query.eq('calendar_id', filters.calendar_id)
  if (filters.status && filters.status.length > 0) query = query.in('status', filters.status)
  if (filters.assigned_to && filters.assigned_to.length > 0) query = query.in('assigned_to', filters.assigned_to)
  if (filters.lead_id) query = query.eq('lead_id', filters.lead_id)
  if (filters.date_from) query = query.gte('start_datetime', filters.date_from)
  if (filters.date_to) query = query.lte('start_datetime', filters.date_to)
  if (filters.search) {
    query = query.or(`client_name.ilike.%${filters.search}%,client_email.ilike.%${filters.search}%,client_phone.ilike.%${filters.search}%`)
  }

  const offset = (page - 1) * limit
  query = query
    .order('start_datetime', { ascending: true })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  return {
    data: (data || []) as Booking[],
    error,
    total: count || 0
  }
}

export async function getBookingById(id: string) {
  const empresaId = await getUserEmpresaId()

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      calendar:booking_calendars(id, name, color, timezone),
      booking_type:booking_types(id, name, duration_minutes, color),
      assigned_user:profiles!bookings_assigned_to_fkey(uuid, full_name, email, phone),
      lead:leads(id, name, phone, email, company)
    `)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()

  if (error) throw error
  return data as Booking
}

// Função auxiliar para determinar próximo owner (round-robin com peso)
async function getNextOwnerForBooking(calendar_id: string, date: string): Promise<string> {
  // Buscar owners ativos que podem receber bookings
  const { data: owners, error: ownersError } = await supabase
    .from('booking_calendar_owners')
    .select('user_id, booking_weight')
    .eq('calendar_id', calendar_id)
    .eq('can_receive_bookings', true)

  if (ownersError) throw ownersError
  if (!owners || owners.length === 0) {
    throw new Error('Configure pelo menos um responsável na agenda antes de criar agendamentos. Acesse a aba "Responsáveis" nas configurações da agenda.')
  }

  // Se só tem um owner, retorna ele
  if (owners.length === 1) {
    return owners[0].user_id
  }

  // Buscar contagem de agendamentos do dia por owner
  const startOfDay = `${date}T00:00:00`
  const endOfDay = `${date}T23:59:59`

  const { data: bookingCounts } = await supabase
    .from('bookings')
    .select('assigned_to')
    .eq('calendar_id', calendar_id)
    .gte('start_datetime', startOfDay)
    .lte('start_datetime', endOfDay)
    .in('status', ['pending', 'confirmed'])

  // Calcular utilização proporcional ao peso
  const ownerUtilization = owners.map(owner => {
    const count = bookingCounts?.filter(b => b.assigned_to === owner.user_id).length || 0
    const weight = owner.booking_weight || 1
    // Quanto menor a utilização relativa, maior a prioridade
    const relativeUtilization = count / weight
    return { user_id: owner.user_id, utilization: relativeUtilization }
  })

  // Ordenar por menor utilização
  ownerUtilization.sort((a, b) => a.utilization - b.utilization)

  return ownerUtilization[0].user_id
}

// Validar se slot está disponível
async function validateSlotAvailable(
  calendar_id: string, 
  start_datetime: string, 
  end_datetime: string,
  exclude_booking_id?: string
): Promise<boolean> {
  // Verificar conflito com outros bookings
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('calendar_id', calendar_id)
    .in('status', ['pending', 'confirmed'])
    .or(`and(start_datetime.lt.${end_datetime},end_datetime.gt.${start_datetime})`)

  if (exclude_booking_id) {
    query = query.neq('id', exclude_booking_id)
  }

  const { data: conflicts } = await query

  if (conflicts && conflicts.length > 0) {
    return false
  }

  // Verificar bloqueios
  const { data: blocks } = await supabase
    .from('booking_blocks')
    .select('id')
    .eq('calendar_id', calendar_id)
    .or(`and(start_datetime.lt.${end_datetime},end_datetime.gt.${start_datetime})`)

  if (blocks && blocks.length > 0) {
    return false
  }

  return true
}

export async function createBooking(data: CreateBookingData) {
  const empresaId = await getUserEmpresaId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  // Buscar tipo de booking para calcular end_datetime
  const { data: bookingType, error: typeError } = await supabase
    .from('booking_types')
    .select('*')
    .eq('id', data.booking_type_id)
    .single()

  if (typeError || !bookingType) {
    throw new Error('Tipo de atendimento não encontrado')
  }

  // Calcular end_datetime baseado na duração
  const startDate = new Date(data.start_datetime)
  const endDate = new Date(startDate.getTime() + bookingType.duration_minutes * 60 * 1000)
  const end_datetime = endDate.toISOString()

  // Validar disponibilidade do slot
  const isAvailable = await validateSlotAvailable(data.calendar_id, data.start_datetime, end_datetime)
  if (!isAvailable) {
    throw new Error('Este horário não está mais disponível')
  }

  // Determinar owner
  const dateStr = data.start_datetime.split('T')[0]
  const assigned_to = await getNextOwnerForBooking(data.calendar_id, dateStr)

  // Validar que tem pelo menos lead_id ou client_name
  if (!data.lead_id && !data.client_name?.trim()) {
    throw new Error('Informe um lead ou os dados do cliente')
  }

  // Criar booking
  const bookingData = {
    empresa_id: empresaId,
    calendar_id: data.calendar_id,
    booking_type_id: data.booking_type_id,
    assigned_to,
    lead_id: data.lead_id || null,
    client_name: data.client_name?.trim() || null,
    client_phone: data.client_phone?.trim() || null,
    client_email: data.client_email?.trim() || null,
    start_datetime: data.start_datetime,
    end_datetime,
    status: 'confirmed',
    notes: data.notes?.trim() || null,
    created_by: user.id
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert([bookingData])
    .select()
    .single()

  if (bookingError) throw bookingError

  return booking as Booking
}

export async function updateBooking(id: string, data: UpdateBookingData) {
  const empresaId = await getUserEmpresaId()
  if (!id?.trim()) throw new Error('ID do agendamento é obrigatório')

  // Se está alterando horário, validar disponibilidade
  if (data.start_datetime || data.end_datetime) {
    const { data: current } = await supabase
      .from('bookings')
      .select('calendar_id, start_datetime, end_datetime')
      .eq('id', id)
      .single()

    if (current) {
      const newStart = data.start_datetime || current.start_datetime
      const newEnd = data.end_datetime || current.end_datetime

      const isAvailable = await validateSlotAvailable(current.calendar_id, newStart, newEnd, id)
      if (!isAvailable) {
        throw new Error('Este horário não está disponível')
      }
    }
  }

  const sanitized: Record<string, unknown> = {}
  if (data.start_datetime !== undefined) sanitized.start_datetime = data.start_datetime
  if (data.end_datetime !== undefined) sanitized.end_datetime = data.end_datetime
  if (data.status !== undefined) sanitized.status = data.status
  if (data.notes !== undefined) sanitized.notes = data.notes?.trim() || null
  if (data.lead_id !== undefined) sanitized.lead_id = data.lead_id
  if (data.client_name !== undefined) sanitized.client_name = data.client_name?.trim() || null
  if (data.client_phone !== undefined) sanitized.client_phone = data.client_phone?.trim() || null
  if (data.client_email !== undefined) sanitized.client_email = data.client_email?.trim() || null

  const { data: updated, error } = await supabase
    .from('bookings')
    .update(sanitized)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()

  if (error) throw error
  return updated as Booking
}

export async function cancelBooking(id: string, reason?: string) {
  const empresaId = await getUserEmpresaId()

  const updateData: Record<string, unknown> = { status: 'cancelled' }
  if (reason) {
    updateData.notes = reason.trim()
  }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()

  if (error) throw error
  return updated as Booking
}

export async function completeBooking(id: string) {
  const empresaId = await getUserEmpresaId()

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()

  if (error) throw error
  return updated as Booking
}

export async function markNoShow(id: string) {
  const empresaId = await getUserEmpresaId()

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'no_show' })
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()

  if (error) throw error
  return updated as Booking
}

// ===================== SLOTS DISPONÍVEIS =====================

export async function getAvailableSlots(
  calendar_id: string, 
  booking_type_id: string, 
  date: string
): Promise<AvailableSlot[]> {
  // Buscar tipo para saber duração
  const { data: bookingType } = await supabase
    .from('booking_types')
    .select('duration_minutes, buffer_before_minutes, buffer_after_minutes, min_advance_hours')
    .eq('id', booking_type_id)
    .single()

  if (!bookingType) return []

  const totalDuration = bookingType.duration_minutes + 
    (bookingType.buffer_before_minutes || 0) + 
    (bookingType.buffer_after_minutes || 0)

  // Buscar dia da semana
  const targetDate = new Date(date)
  const dayOfWeek = targetDate.getDay()

  // Buscar disponibilidade para este dia
  const { data: availability } = await supabase
    .from('booking_availability')
    .select('*')
    .eq('calendar_id', calendar_id)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .order('start_time', { ascending: true })

  if (!availability || availability.length === 0) return []

  // Buscar bookings existentes para este dia
  const startOfDay = `${date}T00:00:00`
  const endOfDay = `${date}T23:59:59`

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_datetime, end_datetime')
    .eq('calendar_id', calendar_id)
    .gte('start_datetime', startOfDay)
    .lte('start_datetime', endOfDay)
    .in('status', ['pending', 'confirmed'])

  // Buscar bloqueios para este dia
  const { data: blocks } = await supabase
    .from('booking_blocks')
    .select('start_datetime, end_datetime')
    .eq('calendar_id', calendar_id)
    .gte('start_datetime', startOfDay)
    .lte('end_datetime', endOfDay)

  // Buscar owners para mostrar nome
  const { data: owners } = await supabase
    .from('booking_calendar_owners')
    .select('user_id, user:profiles(full_name)')
    .eq('calendar_id', calendar_id)
    .eq('can_receive_bookings', true)

  const defaultOwner = owners && owners.length > 0 
    ? { id: owners[0].user_id, name: (owners[0].user as any)?.full_name || 'Responsável' }
    : { id: '', name: 'Responsável' }

  // Calcular hora mínima (min_advance_hours)
  const now = new Date()
  const minAdvanceMs = (bookingType.min_advance_hours || 1) * 60 * 60 * 1000
  const minStartTime = new Date(now.getTime() + minAdvanceMs)

  const slots: AvailableSlot[] = []

  // Para cada período de disponibilidade, gerar slots
  for (const avail of availability) {
    const [startHour, startMin] = avail.start_time.split(':').map(Number)
    const [endHour, endMin] = avail.end_time.split(':').map(Number)

    let slotStart = new Date(date)
    slotStart.setHours(startHour, startMin, 0, 0)

    const periodEnd = new Date(date)
    periodEnd.setHours(endHour, endMin, 0, 0)

    while (slotStart.getTime() + totalDuration * 60 * 1000 <= periodEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + bookingType.duration_minutes * 60 * 1000)

      // Verificar se slot é no futuro com antecedência mínima
      if (slotStart.getTime() >= minStartTime.getTime()) {
        // Verificar conflito com bookings existentes
        const hasConflict = existingBookings?.some(b => {
          const bookingStart = new Date(b.start_datetime).getTime()
          const bookingEnd = new Date(b.end_datetime).getTime()
          const slotStartTime = slotStart.getTime()
          const slotEndTime = slotEnd.getTime()
          return slotStartTime < bookingEnd && slotEndTime > bookingStart
        })

        // Verificar conflito com bloqueios
        const hasBlock = blocks?.some(b => {
          const blockStart = new Date(b.start_datetime).getTime()
          const blockEnd = new Date(b.end_datetime).getTime()
          const slotStartTime = slotStart.getTime()
          const slotEndTime = slotEnd.getTime()
          return slotStartTime < blockEnd && slotEndTime > blockStart
        })

        if (!hasConflict && !hasBlock) {
          slots.push({
            start: new Date(slotStart),
            end: new Date(slotEnd),
            owner_id: defaultOwner.id,
            owner_name: defaultOwner.name
          })
        }
      }

      // Próximo slot (considerando buffers)
      slotStart = new Date(slotStart.getTime() + totalDuration * 60 * 1000)
    }
  }

  return slots
}
