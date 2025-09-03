import type { Task, Event } from '../types'
import { format } from 'date-fns'

// Interface para eventos híbridos (eventos + tarefas) no calendário
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  isTask?: boolean
  priority?: string
  status?: string
  originalData: Event | Task
  resource?: {
    type: 'event' | 'task'
    priority?: string
    status?: string
  }
}

/**
 * Função helper para converter string em data de forma segura
 */
function parseDate(dateString: string): Date {
  if (!dateString) {
    throw new Error('Data string vazia ou undefined')
  }
  
  console.log('🔍 parseDate: tentando converter:', dateString)
  
  // Tentar múltiplos formatos
  const formats = [
    () => new Date(dateString), // ISO ou formato nativo
    () => new Date(dateString.replace('Z', '')), // Remover Z se presente
    () => new Date(dateString + 'T00:00:00'), // Adicionar horário se for só data
    () => new Date(dateString.replace(' ', 'T')), // Substituir espaço por T
    () => {
      // Tentar formato brasileiro DD/MM/YYYY
      const parts = dateString.split('/')
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
      }
      throw new Error('Formato não suportado')
    }
  ]
  
  for (let i = 0; i < formats.length; i++) {
    try {
      const date = formats[i]()
      if (!isNaN(date.getTime())) {
        console.log(`✅ parseDate: sucesso com formato ${i}:`, date.toISOString())
        return date
      }
    } catch (error) {
      console.warn(`⚠️ parseDate: formato ${i} falhou:`, error)
    }
  }
  
  throw new Error(`Não foi possível converter a data: ${dateString}`)
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
      let baseDate: Date
      try {
        // Tentar parseDate
        baseDate = parseDate(task.due_date)
      } catch (error) {
        console.error('❌ Erro ao converter data da tarefa:', task.due_date, error)
        throw error
      }
      
      if (task.due_time) {
        // Se tem horário específico, usar esse horário
        const [hours, minutes] = task.due_time.split(':').map(Number)
        startDate = new Date(baseDate)
        startDate.setHours(hours, minutes, 0, 0)
        
        // Duração padrão de 1 hora para tarefas com horário
        endDate = new Date(startDate)
        endDate.setHours(startDate.getHours() + 1)
      } else {
        // Se não tem horário, considerar como evento de dia inteiro
        startDate = new Date(baseDate)
        startDate.setHours(9, 0, 0, 0) // 9h da manhã como padrão
        
        endDate = new Date(startDate)
        endDate.setHours(10, 0, 0, 0) // 1 hora de duração
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
 * Converte um evento em evento do calendário
 */
export function eventToCalendarEvent(event: Event): CalendarEvent {
  console.log('🔄 [eventToCalendarEvent] Iniciando conversão do evento:', event.id, event.title)
  console.log('🔄 Convertendo evento:', event.title, 'Start:', event.start_date)
  
  try {
    const calendarEvent = {
      id: `event-${event.id}`,
      title: event.title,
      start: parseDate(event.start_date),
      end: parseDate(event.end_date),
      isTask: false,
      originalData: event,
      resource: {
        type: 'event' as const
      }
    }
    
    console.log('✅ Evento convertido:', calendarEvent.title, 'Start:', calendarEvent.start.toLocaleString())
    return calendarEvent
    
  } catch (error) {
    console.error('❌ Erro ao converter evento:', event.title, error)
    
    // Fallback
    const fallbackEvent = {
      id: `event-error-${event.id}`,
      title: `❌ ${event.title} (ERRO)`,
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000),
      isTask: false,
      originalData: event,
      resource: {
        type: 'event' as const
      }
    }
    
    return fallbackEvent
  }
}

/**
 * Obtém a cor baseada no tipo e prioridade/status (consistente com as legendas)
 */
export function getCalendarEventColor(calendarEvent: CalendarEvent): string {
  if (calendarEvent.isTask) {
    // Priorizar status para cor
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
  } else {
    // Cor para eventos (consistente com legenda)
    return '#9333EA' // purple-600 - Evento (igual à legenda)
  }
}

/**
 * Obtém o estilo CSS para o evento no calendário (estilo Google Calendar)
 * Agora com suporte aprimorado para week/day views
 */
export function getCalendarEventStyle(calendarEvent: CalendarEvent, view?: string): React.CSSProperties {
  const backgroundColor = getCalendarEventColor(calendarEvent)
  const isTimeView = view === 'week' || view === 'day'
  
  // Base style common to both tasks and events
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
  
  if (calendarEvent.isTask) {
    // Estilo para tarefas (com borda tracejada)
    return {
      ...baseStyle,
      border: '1px dashed',
      borderLeft: `4px dashed ${backgroundColor}`,
      opacity: calendarEvent.status === 'concluida' ? 0.7 : 1,
      textDecoration: calendarEvent.status === 'concluida' ? 'line-through' : 'none',
      // Animação para tarefas atrasadas
      animation: calendarEvent.status === 'atrasada' ? 'pulse 2s infinite' : 'none'
    }
  } else {
    // Estilo para eventos (com borda sólida)
    return {
      ...baseStyle,
      border: '1px solid',
      borderLeft: `4px solid ${backgroundColor}`
    }
  }
}

/**
 * Formata tooltip/título para exibição
 */
export function formatCalendarEventTooltip(calendarEvent: CalendarEvent): string {
  if (calendarEvent.isTask) {
    const task = calendarEvent.originalData as Task
    return `📋 TAREFA: ${task.title}
💡 Prioridade: ${task.priority}
📊 Status: ${task.status}
📅 Vencimento: ${format(calendarEvent.start, 'dd/MM/yyyy HH:mm')}`
  } else {
    const event = calendarEvent.originalData as Event
    return `📅 EVENTO: ${event.title}
📍 Local: ${event.location || 'Não informado'}
📅 ${format(calendarEvent.start, 'dd/MM/yyyy HH:mm')} - ${format(calendarEvent.end, 'HH:mm')}`
  }
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