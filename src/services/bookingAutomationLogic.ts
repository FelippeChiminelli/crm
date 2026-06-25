import type { AutomationRule, Booking, CreateLeadAutomationAction } from '../types'

export interface BookingAutomationContext {
  bookingTypeName?: string
  calendarName?: string
  isFirstInSeries?: boolean
}

export interface BookingAutomationSkipReason {
  skip: true
  reason: string
}

/** Pula o gatilho inteiro (ex.: ocorrências recorrentes subsequentes). */
export function shouldSkipBookingTrigger(
  booking: Booking,
  context: BookingAutomationContext = {}
): BookingAutomationSkipReason | { skip: false } {
  if (booking.is_recurring && context.isFirstInSeries === false) {
    return { skip: true, reason: 'ocorrência recorrente subsequente' }
  }

  return { skip: false }
}

/** Pula apenas a ação create_lead quando o agendamento já tem lead. */
export function shouldSkipCreateLeadOnBooking(
  booking: Booking
): BookingAutomationSkipReason | { skip: false } {
  if (booking.lead_id) {
    return { skip: true, reason: 'agendamento já possui lead vinculado' }
  }

  return { skip: false }
}

export function evaluateBookingCreatedConditions(
  condition: Record<string, unknown>,
  booking: Booking
): { ok: boolean; reason?: string } {
  const calendarIds = condition.calendar_ids as string[] | undefined
  if (calendarIds?.length && !calendarIds.includes(booking.calendar_id)) {
    return { ok: false, reason: 'agenda não corresponde' }
  }

  const bookingTypeIds = condition.booking_type_ids as string[] | undefined
  if (bookingTypeIds?.length && !bookingTypeIds.includes(booking.booking_type_id)) {
    return { ok: false, reason: 'tipo de atendimento não corresponde' }
  }

  const assignedToIds = condition.assigned_to_ids as string[] | undefined
  if (assignedToIds?.length && !assignedToIds.includes(booking.assigned_to)) {
    return { ok: false, reason: 'responsável do agendamento não corresponde' }
  }

  const statuses = condition.statuses as string[] | undefined
  if (statuses?.length && !statuses.includes(booking.status)) {
    return { ok: false, reason: 'status do agendamento não corresponde' }
  }

  return { ok: true }
}

export function getRuleActions(rule: AutomationRule): Record<string, unknown>[] {
  const actions = (rule.actions || []).filter(
    (item): item is Record<string, unknown> => !!item && typeof item === 'object'
  )
  if (actions.length > 0) return actions
  if (rule.action && typeof rule.action === 'object') return [rule.action]
  return []
}

export function resolveLeadNameFromBooking(booking: Booking): string {
  const name = booking.client_name?.trim()
  if (name) return name
  const phone = booking.client_phone?.trim()
  if (phone) return phone
  return 'Cliente agendamento'
}

export function interpolateNotesTemplate(
  template: string,
  context: BookingAutomationContext,
  booking: Booking
): string {
  const scheduledDate = booking.start_datetime
    ? new Date(booking.start_datetime).toLocaleString('pt-BR')
    : ''

  return template
    .split('{tipo_atendimento}').join(context.bookingTypeName || '')
    .split('{agenda}').join(context.calendarName || '')
    .split('{data}').join(scheduledDate)
}

export function buildCreateLeadPayloadFromBooking(
  booking: Booking,
  action: CreateLeadAutomationAction,
  context: BookingAutomationContext = {}
) {
  const assignToOwner = action.assign_to_booking_owner !== false
  const responsibleUuid = action.responsible_uuid?.trim()
    || (assignToOwner ? booking.assigned_to : undefined)

  const notes = action.notes_template?.trim()
    ? interpolateNotesTemplate(action.notes_template, context, booking)
    : booking.notes?.trim() || undefined

  return {
    pipeline_id: action.target_pipeline_id,
    stage_id: action.target_stage_id,
    name: resolveLeadNameFromBooking(booking),
    phone: booking.client_phone?.trim() || undefined,
    email: booking.client_email?.trim() || undefined,
    origin: action.origin?.trim() || 'Agendamento',
    status: action.status?.trim() || undefined,
    notes,
    responsible_uuid: responsibleUuid,
  }
}

export const BOOKING_WEBHOOK_FIELDS = [
  'id',
  'calendar_id',
  'booking_type_id',
  'assigned_to',
  'client_name',
  'client_phone',
  'client_email',
  'start_datetime',
  'end_datetime',
  'status',
  'notes',
  'lead_id',
] as const

export function buildBookingWebhookPayload(
  booking: Booking,
  fields: string[],
  rule: Pick<AutomationRule, 'event_type' | 'name'>,
  context: BookingAutomationContext = {}
): Record<string, unknown> {
  const bookingPayload: Record<string, unknown> = {}
  for (const field of fields) {
    const key = field as keyof Booking
    if (key in booking) {
      bookingPayload[field] = booking[key]
    }
  }

  return {
    event_type: rule.event_type,
    automation_name: rule.name,
    timestamp: new Date().toISOString(),
    booking: bookingPayload,
    context: {
      booking_type_name: context.bookingTypeName ?? null,
      calendar_name: context.calendarName ?? null,
    },
  }
}
