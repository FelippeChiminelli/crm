import { supabase } from './supabaseClient'
import type {
  PublicBookingCalendar,
  BookingType,
  BookingAvailability,
  AvailableSlot,
  CreatePublicBookingData,
  Booking
} from '../types'

// =====================================================
// SERVIÇO DE AGENDAMENTO PÚBLICO (SEM AUTENTICAÇÃO)
// =====================================================

/**
 * Busca um calendário público pelo slug
 */
export async function getPublicCalendarBySlug(slug: string): Promise<PublicBookingCalendar | null> {
  // Buscar calendário pelo slug
  const { data: calendar, error } = await supabase
    .from('booking_calendars')
    .select('id, name, description, color, timezone, min_advance_hours, max_advance_days, empresa_id')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .eq('is_active', true)
    .single()

  if (error || !calendar) {
    console.error('Calendário não encontrado:', error)
    return null
  }

  // Buscar tipos de atendimento ativos
  const { data: bookingTypes, error: typesError } = await supabase
    .from('booking_types')
    .select('id, name, description, duration_minutes, color')
    .eq('calendar_id', calendar.id)
    .eq('is_active', true)
    .order('position', { ascending: true })

  if (typesError) {
    console.error('[PublicBooking] Erro ao buscar tipos de atendimento:', typesError)
  }

  // Buscar disponibilidade
  const { data: availability, error: availError } = await supabase
    .from('booking_availability')
    .select('id, day_of_week, start_time, end_time, is_active')
    .eq('calendar_id', calendar.id)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (availError) {
    console.error('[PublicBooking] Erro ao buscar disponibilidade:', availError)
  }

  console.log('[PublicBooking] Dados carregados:', {
    calendar_id: calendar.id,
    types: bookingTypes?.length ?? 0,
    availability: availability?.length ?? 0
  })

  return {
    id: calendar.id,
    name: calendar.name,
    description: calendar.description,
    color: calendar.color,
    timezone: calendar.timezone,
    min_advance_hours: calendar.min_advance_hours || 2,
    max_advance_days: calendar.max_advance_days || 30,
    booking_types: (bookingTypes || []) as BookingType[],
    availability: (availability || []) as BookingAvailability[]
  }
}

/**
 * Busca slots disponíveis para uma data específica (público)
 */
export async function getPublicAvailableSlots(
  calendar_id: string,
  booking_type_id: string,
  date: string,
  min_advance_hours: number = 2,
  max_advance_days: number = 30
): Promise<AvailableSlot[]> {
  // Parsear data em hora LOCAL (não UTC) para evitar bug de timezone
  const [year, month, day] = date.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Verificar máximo de dias
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + max_advance_days)
  
  if (targetDate > maxDate) {
    console.log('Data fora do limite máximo')
    return []
  }

  // Buscar tipo de atendimento
  const { data: bookingType } = await supabase
    .from('booking_types')
    .select('duration_minutes, buffer_before_minutes, buffer_after_minutes')
    .eq('id', booking_type_id)
    .single()

  if (!bookingType) return []

  const totalDuration = bookingType.duration_minutes + 
    (bookingType.buffer_before_minutes || 0) + 
    (bookingType.buffer_after_minutes || 0)

  // Buscar dia da semana (agora correto em hora local)
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

  // Buscar owners para round-robin
  const { data: owners } = await supabase
    .from('booking_calendar_owners')
    .select('user_id, user:profiles(full_name)')
    .eq('calendar_id', calendar_id)
    .eq('can_receive_bookings', true)

  const defaultOwner = owners && owners.length > 0 
    ? { id: owners[0].user_id, name: (owners[0].user as any)?.full_name || 'Responsável' }
    : { id: '', name: 'Responsável' }

  // Calcular hora mínima (min_advance_hours)
  const minAdvanceMs = min_advance_hours * 60 * 60 * 1000
  const minStartTime = new Date(now.getTime() + minAdvanceMs)

  const slots: AvailableSlot[] = []

  // Para cada período de disponibilidade, gerar slots
  for (const avail of availability) {
    const [startHour, startMin] = avail.start_time.split(':').map(Number)
    const [endHour, endMin] = avail.end_time.split(':').map(Number)

    let slotStart = new Date(year, month - 1, day, startHour, startMin, 0, 0)
    const periodEnd = new Date(year, month - 1, day, endHour, endMin, 0, 0)

    while (slotStart.getTime() + totalDuration * 60000 <= periodEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000)

      // Verificar se o slot é no futuro com antecedência mínima
      if (slotStart > minStartTime) {
        // Verificar conflito com bookings existentes
        const hasConflict = (existingBookings || []).some(booking => {
          const bookingStart = new Date(booking.start_datetime)
          const bookingEnd = new Date(booking.end_datetime)
          return slotStart < bookingEnd && slotEnd > bookingStart
        })

        // Verificar conflito com bloqueios
        const isBlocked = (blocks || []).some(block => {
          const blockStart = new Date(block.start_datetime)
          const blockEnd = new Date(block.end_datetime)
          return slotStart < blockEnd && slotEnd > blockStart
        })

        if (!hasConflict && !isBlocked) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            owner_id: defaultOwner.id,
            owner_name: defaultOwner.name
          })
        }
      }

      // Avançar para próximo slot (usando duração do tipo de atendimento)
      slotStart = new Date(slotStart.getTime() + bookingType.duration_minutes * 60000)
    }
  }

  return slots
}

/**
 * Busca o próximo owner disponível para round-robin (público)
 */
async function getNextOwnerForPublicBooking(calendar_id: string): Promise<string> {
  // Buscar owners que podem receber bookings
  const { data: owners, error } = await supabase
    .from('booking_calendar_owners')
    .select('user_id, booking_weight')
    .eq('calendar_id', calendar_id)
    .eq('can_receive_bookings', true)

  if (error || !owners || owners.length === 0) {
    throw new Error('Nenhum responsável disponível para este calendário')
  }

  if (owners.length === 1) {
    return owners[0].user_id
  }

  // Buscar contagem de bookings recentes por owner
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: bookingCounts } = await supabase
    .from('bookings')
    .select('assigned_to')
    .eq('calendar_id', calendar_id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .in('status', ['pending', 'confirmed', 'completed'])

  // Calcular score por owner (menos bookings = maior prioridade)
  const ownerScores = owners.map(owner => {
    const bookingCount = (bookingCounts || []).filter(b => b.assigned_to === owner.user_id).length
    const weight = owner.booking_weight || 1
    // Score = peso / (bookings + 1) - quanto maior o peso e menos bookings, maior o score
    const score = weight / (bookingCount + 1)
    return { user_id: owner.user_id, score }
  })

  // Ordenar por score (maior primeiro) e retornar o primeiro
  ownerScores.sort((a, b) => b.score - a.score)
  return ownerScores[0].user_id
}

/**
 * Cria um booking público (sem autenticação)
 */
export async function createPublicBooking(data: CreatePublicBookingData): Promise<Booking> {
  // Buscar informações do calendário
  const { data: calendar, error: calendarError } = await supabase
    .from('booking_calendars')
    .select('id, empresa_id, min_advance_hours')
    .eq('id', data.calendar_id)
    .eq('is_public', true)
    .eq('is_active', true)
    .single()

  if (calendarError || !calendar) {
    throw new Error('Calendário não encontrado ou não está disponível para agendamentos públicos')
  }

  // Validar horário mínimo de antecedência
  const startTime = new Date(data.start_datetime)
  const now = new Date()
  const minAdvanceMs = (calendar.min_advance_hours || 2) * 60 * 60 * 1000
  
  if (startTime.getTime() < now.getTime() + minAdvanceMs) {
    throw new Error(`O agendamento deve ser feito com pelo menos ${calendar.min_advance_hours} horas de antecedência`)
  }

  // Verificar se o slot ainda está disponível
  const { data: conflictingBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('calendar_id', data.calendar_id)
    .lt('start_datetime', data.end_datetime)
    .gt('end_datetime', data.start_datetime)
    .in('status', ['pending', 'confirmed'])
    .limit(1)

  if (conflictingBookings && conflictingBookings.length > 0) {
    throw new Error('Este horário não está mais disponível. Por favor, escolha outro horário.')
  }

  // Determinar owner via round-robin
  const assigned_to = await getNextOwnerForPublicBooking(data.calendar_id)

  // Criar o booking
  const bookingData = {
    empresa_id: calendar.empresa_id,
    calendar_id: data.calendar_id,
    booking_type_id: data.booking_type_id,
    assigned_to,
    client_name: data.client_name,
    client_phone: data.client_phone,
    client_email: data.client_email,
    start_datetime: data.start_datetime,
    end_datetime: data.end_datetime,
    status: 'pending',
    notes: data.notes,
    created_by: assigned_to // Usar o owner como created_by para bookings públicos
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao criar booking:', error)
    throw new Error('Erro ao criar agendamento. Por favor, tente novamente.')
  }

  return booking as Booking
}

/**
 * Valida se um slug está disponível
 */
export async function validateSlugAvailability(slug: string, excludeCalendarId?: string): Promise<boolean> {
  let query = supabase
    .from('booking_calendars')
    .select('id')
    .eq('public_slug', slug)

  if (excludeCalendarId) {
    query = query.neq('id', excludeCalendarId)
  }

  const { data } = await query.limit(1)
  return !data || data.length === 0
}

/**
 * Gera um slug a partir do nome
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim()
}

/**
 * Calcula datas disponíveis para um mês específico usando dados já carregados.
 * Não faz query ao banco - usa os dias de disponibilidade já presentes no calendário.
 */
export function getPublicAvailableDates(
  availabilityDaysOfWeek: number[],
  year: number,
  month: number, // 0-based
  min_advance_hours: number = 2,
  max_advance_days: number = 30
): number[] {
  const now = new Date()

  // Calcular limites usando "now" (hora atual real), não "today" (meia-noite)
  const minDate = new Date(now.getTime() + min_advance_hours * 60 * 60 * 1000)
  // Para comparação de dia, usar apenas a data (meia-noite) do minDate
  const minDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())

  const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  maxDate.setDate(maxDate.getDate() + max_advance_days)

  const availableDays = new Set(availabilityDaysOfWeek)
  if (availableDays.size === 0) return []

  // Gerar lista de dias disponíveis no mês
  const availableDates: number[] = []
  const lastDay = new Date(year, month + 1, 0)

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)

    // Verificar se está dentro dos limites (comparação por dia)
    if (date < minDay || date > maxDate) continue

    // Verificar se o dia da semana tem disponibilidade
    if (availableDays.has(date.getDay())) {
      availableDates.push(day)
    }
  }

  return availableDates
}
