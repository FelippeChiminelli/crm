import type { Task, Booking } from '../types'
import { format } from 'date-fns'
import { combineDateAndTimeToLocal, parseDateTimeToLocal } from './date'

// Interface para itens do calendário (tarefas + bookings)
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  isTask?: boolean
  isBooking?: boolean
  priority?: string
  status?: string
  originalData: Task | Booking
  color?: string
  resource?: {
    type: 'task' | 'booking'
    priority?: string
    status?: string
    color?: string
  }
}

/**
 * Converte uma tarefa em evento do calendário
 */
export function taskToCalendarEvent(task: Task): CalendarEvent {
  console.log('🔄 [taskToCalendarEvent] Iniciando conversão da tarefa:', task.id, task.title)
  console.log('🔄 Convertendo tarefa:', task.title, 'Due:', task.due_date, task.due_time)
  
  try {
    // Verificar se a tarefa tem dados mínimos necessários
    if (!task.id || !task.title) {
      console.warn('⚠️ Tarefa sem dados mínimos:', task)
      throw new Error('Tarefa sem dados mínimos')
    }

    // Calcular data/hora de início
    let startDate: Date
    let endDate: Date

    if (task.due_date) {
      try {
        if (task.due_time) {
          startDate = combineDateAndTimeToLocal(task.due_date, task.due_time)
          endDate = new Date(startDate)
          endDate.setHours(startDate.getHours() + 1)
        } else {
          // Evento sem hora: colocar às 09:00 locais
          startDate = combineDateAndTimeToLocal(task.due_date, '09:00')
          endDate = combineDateAndTimeToLocal(task.due_date, '10:00')
        }
      } catch (error) {
        console.error('❌ Erro ao converter data da tarefa:', task.due_date, error)
        throw error
      }
    } else {
      console.warn('⚠️ Tarefa sem due_date, usando fallback')
      // Fallback - não deveria acontecer pois filtramos apenas tarefas com data
      startDate = new Date()
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hora
    }

    const calendarEvent = {
      id: `task-${task.id}`,
      title: `📋 ${task.title}`,
      start: startDate,
      end: endDate,
      isTask: true,
      priority: task.priority,
      status: task.status,
      originalData: task,
      resource: {
        type: 'task' as const,
        priority: task.priority,
        status: task.status
      }
    }
    
    console.log('✅ Tarefa convertida:', calendarEvent.title, 'Start:', startDate.toLocaleString())
    return calendarEvent
    
  } catch (error) {
    console.error('❌ Erro ao converter tarefa:', task.title, error)
    
    // Retornar evento de fallback para não quebrar a aplicação
    const fallbackEvent = {
      id: `task-error-${task.id || 'unknown'}`,
      title: `❌ ${task.title || 'Tarefa sem título'} (ERRO)`,
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000),
      isTask: true,
      priority: task.priority || 'media',
      status: task.status || 'pendente',
      originalData: task,
      resource: {
        type: 'task' as const,
        priority: task.priority || 'media',
        status: task.status || 'pendente'
      }
    }
    
    return fallbackEvent
  }
}

/**
 * Converte um booking em evento do calendário
 */
export function bookingToCalendarEvent(booking: Booking): CalendarEvent {
  console.log('🔄 [bookingToCalendarEvent] Iniciando conversão do booking:', booking.id)
  
  try {
    // Determinar o nome do cliente
    const clientName = booking.lead?.name || booking.client_name || 'Cliente'
    const bookingTypeName = booking.booking_type?.name || 'Agendamento'
    const color = booking.booking_type?.color || booking.calendar?.color || '#6366f1'

    const calendarEvent: CalendarEvent = {
      id: `booking-${booking.id}`,
      title: `📆 ${bookingTypeName} - ${clientName}`,
      start: parseDateTimeToLocal(booking.start_datetime),
      end: parseDateTimeToLocal(booking.end_datetime),
      isTask: false,
      isBooking: true,
      status: booking.status,
      originalData: booking,
      color,
      resource: {
        type: 'booking' as const,
        status: booking.status,
        color
      }
    }
    
    console.log('✅ Booking convertido:', calendarEvent.title, 'Start:', calendarEvent.start.toLocaleString())
    return calendarEvent
    
  } catch (error) {
    console.error('❌ Erro ao converter booking:', booking.id, error)
    
    // Fallback
    return {
      id: `booking-error-${booking.id}`,
      title: `❌ Agendamento (ERRO)`,
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000),
      isTask: false,
      isBooking: true,
      originalData: booking,
      resource: {
        type: 'booking' as const
      }
    }
  }
}

/**
 * Obtém a cor baseada no tipo e prioridade/status (consistente com as legendas)
 */
export function getCalendarEventColor(calendarEvent: CalendarEvent): string {
  const isBooking = calendarEvent.isBooking || calendarEvent.resource?.type === 'booking'

  if (isBooking) {
    // Status-based colors têm prioridade para estados finais
    switch (calendarEvent.status) {
      case 'cancelled':
      case 'no_show':
        return '#9CA3AF' // gray-400 - Cancelado/Não compareceu
      case 'completed':
        return '#16A34A' // green-600 - Concluído
      case 'pending':
        return '#F59E0B' // yellow-500 - Pendente
      case 'confirmed':
        // Para confirmados, usar cor do booking type ou calendar
        if (calendarEvent.color) return calendarEvent.color
        if (calendarEvent.resource?.color) return calendarEvent.resource.color
        return '#6366f1' // indigo-500 - Confirmado (fallback)
      default:
        // Fallback para outros status
        if (calendarEvent.color) return calendarEvent.color
        if (calendarEvent.resource?.color) return calendarEvent.resource.color
        return '#6366f1' // indigo-500 - Default
    }
  }

  // Tarefa - Priorizar status para cor
  if (calendarEvent.status === 'atrasada') {
    return '#DC2626' // red-600 - Tarefa Atrasada
  }
  if (calendarEvent.status === 'concluida') {
    return '#16A34A' // green-600 - Tarefa Concluída
  }
  // Cores para tarefas baseadas na prioridade
  switch (calendarEvent.priority) {
    case 'urgente':
    case 'alta':
      return '#EA580C' // orange-600 - Tarefa Urgente/Alta
    case 'media':
    case 'baixa':
    default:
      return '#2563EB' // blue-600 - Tarefa normal
  }
}

/**
 * Obtém o estilo CSS para o item no calendário (estilo Google Calendar)
 * Suporte para week/day views
 */
export function getCalendarEventStyle(calendarEvent: CalendarEvent, view?: string): React.CSSProperties {
  const backgroundColor = getCalendarEventColor(calendarEvent)
  const isTimeView = view === 'week' || view === 'day'
  const isBooking = calendarEvent.isBooking || calendarEvent.resource?.type === 'booking'
  
  // Base style comum
  const baseStyle: React.CSSProperties = {
    backgroundColor,
    borderColor: backgroundColor,
    color: 'white',
    borderRadius: '4px',
    fontSize: isTimeView ? '13px' : '11px',
    fontWeight: '500',
    padding: isTimeView ? '4px 8px' : '2px 6px',
    margin: isTimeView ? '1px 2px' : '1px 2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: isTimeView ? '0 1px 3px rgba(60, 64, 67, 0.3)' : '0 1px 2px rgba(0,0,0,0.1)'
  }
  
  if (isBooking) {
    // Estilo para agendamentos (borda sólida)
    return {
      ...baseStyle,
      border: '1px solid',
      borderLeft: `4px solid ${backgroundColor}`
    }
  }
  
  // Estilo para tarefas (com borda tracejada)
  const urgentOrHigh = calendarEvent.priority === 'urgente' || calendarEvent.priority === 'alta'
  return {
    ...baseStyle,
    border: '1px dashed',
    borderLeft: `${urgentOrHigh ? 6 : 4}px dashed ${backgroundColor}`,
    opacity: calendarEvent.status === 'concluida' ? 0.7 : 1,
    textDecoration: calendarEvent.status === 'concluida' ? 'line-through' : 'none',
    animation: calendarEvent.status === 'atrasada' ? 'pulse 2s infinite' : 'none'
  }
}

/**
 * Formata tooltip/título para exibição
 */
export function formatCalendarEventTooltip(calendarEvent: CalendarEvent): string {
  if (calendarEvent.isBooking || calendarEvent.resource?.type === 'booking') {
    const booking = calendarEvent.originalData as Booking
    const clientName = booking.lead?.name || booking.client_name || 'Cliente'
    return `📆 AGENDAMENTO: ${booking.booking_type?.name || 'Atendimento'}
👤 Cliente: ${clientName}
📊 Status: ${booking.status}
📅 ${format(calendarEvent.start, 'dd/MM/yyyy HH:mm')} - ${format(calendarEvent.end, 'HH:mm')}`
  }
  
  // Tarefa
  const task = calendarEvent.originalData as Task
  return `📋 TAREFA: ${task.title}
💡 Prioridade: ${task.priority}
📊 Status: ${task.status}
📅 Vencimento: ${format(calendarEvent.start, 'dd/MM/yyyy HH:mm')}`
}

/**
 * Verifica se duas datas são do mesmo dia
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return format(date1, 'yyyy-MM-dd') === format(date2, 'yyyy-MM-dd')
}

/**
 * Filtra eventos/tarefas por período
 */
export function filterCalendarEventsByPeriod(
  events: CalendarEvent[], 
  startDate: Date, 
  endDate: Date
): CalendarEvent[] {
  return events.filter(event => {
    const eventStart = new Date(event.start)
    return eventStart >= startDate && eventStart <= endDate
  })
} 