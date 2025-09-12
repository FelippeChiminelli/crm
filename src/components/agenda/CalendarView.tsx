import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { ptBR } from 'date-fns/locale'
import {
  format,
  parse,
  startOfWeek,
  getDay,
} from 'date-fns'
import { useEvents } from '../../hooks/useEvents'
import { useCalendarLogic } from '../../hooks/useCalendarLogic'
import type { Event, Task } from '../../types'
import React, { useCallback, useEffect } from 'react'
import { getCalendarEventStyle, type CalendarEvent } from '../../utils/calendarHelpers'

const locales = {
  'pt-BR': ptBR
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0, locale: ptBR }),
  getDay,
  locales
})

interface CalendarViewProps {
  onEventEdit?: (event: Event) => void
  onTaskEdit?: (task: Task) => void
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onEventEdit, onTaskEdit }) => {
  const { calendarEvents, loading, error } = useEvents()
  const {
    viewConfig,
    setView,
    setCurrentDate
  } = useCalendarLogic()



  // Handlers para seleção de slots e eventos
  const handleSelectSlot = useCallback((slot: { start: Date; end: Date }) => {
    // Para criar novos eventos, podemos expandir isso futuramente
    // Por enquanto, a criação é feita via botão na AgendaPage
    console.log('Slot selecionado:', slot)
  }, [])

  const handleSelectEvent = useCallback((calendarEvent: CalendarEvent) => {
    if (calendarEvent.isTask) {
      // Se é uma tarefa, usar callback específico para tarefas
      if (onTaskEdit) {
        onTaskEdit(calendarEvent.originalData as Task)
      }
    } else {
      // Se é um evento, usar o callback de eventos
      if (onEventEdit) {
        onEventEdit(calendarEvent.originalData as Event)
      }
    }
  }, [onEventEdit, onTaskEdit])

  // Função para customizar o estilo dos eventos
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    return {
      style: getCalendarEventStyle(event, viewConfig.view)
    }
  }, [viewConfig.view])

  // Função para customizar componentes de eventos
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const getEventTitle = () => {
      if (event.isTask) {
        // Remove qualquer emoji do título se já existe
        return event.title.replace(/^📋\s*/, '').replace(/^[📅🔥⚠️✅]\s*/, '')
      }
      return event.title
    }

    const getEventTime = () => {
      if (event.start && event.end) {
        const startTime = new Date(event.start).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
        const endTime = new Date(event.end).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
        return `${startTime} - ${endTime}`
      }
      return ''
    }

    // Determinar se estamos na visualização de tempo (week/day)
    const isTimeView = viewConfig.view === 'week' || viewConfig.view === 'day'
    
    if (isTimeView) {
      return (
        <div className="h-full w-full flex flex-col justify-start p-1">
          <div className="text-xs font-medium text-white leading-tight truncate">
            {getEventTitle()}
          </div>
          {event.start && event.end && (
            <div className="text-xs text-white/80 leading-tight mt-0.5 truncate">
              {getEventTime()}
            </div>
          )}
        </div>
      )
    }

    // Para month view, manter simples
    return (
      <div className="h-full w-full flex items-center px-1">
        <span className="text-xs font-medium truncate text-white leading-tight w-full">
          {getEventTitle()}
        </span>
      </div>
    )
  }

  // Ajustar altura do calendário para ocupar toda a tela
  useEffect(() => {
    const adjustCalendarHeight = () => {
      setTimeout(() => {
        const monthView = document.querySelector('.rbc-month-view')
        const monthRows = document.querySelectorAll('.rbc-month-row')
        
        if (monthView && monthRows.length > 0) {
          const numberOfWeeks = monthRows.length
          const isMobile = window.innerWidth <= 768
          
          // Calcular altura baseada no container pai real
          const calendarContainer = document.querySelector('.rbc-calendar')?.parentElement
          if (!calendarContainer) return
          
          const containerHeight = calendarContainer.clientHeight
          const calendarToolbar = 60 // Toolbar do próprio calendário
          const availableHeight = containerHeight - calendarToolbar
          const rowHeight = Math.floor(availableHeight / numberOfWeeks)
          
          // Garantir altura mínima mas usar toda a altura disponível
          const finalHeight = Math.max(rowHeight, isMobile ? 70 : 80)
          
          // Aplicar altura calculada
          monthRows.forEach(row => {
            const htmlRow = row as HTMLElement
            htmlRow.style.setProperty('height', `${finalHeight}px`, 'important')
            htmlRow.style.setProperty('min-height', `${finalHeight}px`, 'important')
          })
          
          // Ajustar altura total do month-view
          if (monthView) {
            const totalHeight = finalHeight * numberOfWeeks + 50 // +50 para header
            const htmlMonthView = monthView as HTMLElement
            htmlMonthView.style.setProperty('height', `${totalHeight}px`, 'important')
          }
        }
      }, 200)
    }
    
    adjustCalendarHeight()
    window.addEventListener('resize', adjustCalendarHeight)
    
    return () => {
      window.removeEventListener('resize', adjustCalendarHeight)
    }
  }, [viewConfig.current_date, viewConfig.view])

  // Destacar dia atual manualmente e aplicar estilos off-range (execução pontual)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const today = new Date()
        const todayDay = today.getDate()
        const todayMonth = today.getMonth()
        const todayYear = today.getFullYear()
        
        // Data atual do calendário (visualizada)
        const currentCalendarDate = new Date(viewConfig.current_date)
        const currentMonth = currentCalendarDate.getMonth()
        const currentYear = currentCalendarDate.getFullYear()
        
        // Investigar e aplicar estilos off-range
        // console.debug('🔍 Investigando estrutura HTML do calendário...')
        
        // Estratégia mais robusta: aplicar forçadamente em todas as possíveis estruturas
        const applyOffRangeStyles = (element: HTMLElement) => {
          element.style.setProperty('background', '#f8f9fa', 'important')
          element.style.setProperty('background-color', '#f8f9fa', 'important')
          
          // Aplicar também aos filhos
          const children = element.querySelectorAll('*')
          children.forEach(child => {
            const htmlChild = child as HTMLElement
            htmlChild.style.setProperty('background', '#f8f9fa', 'important')
            htmlChild.style.setProperty('background-color', '#f8f9fa', 'important')
          })
        }
        
        // Lista abrangente de seletores para off-range
        const offRangeSelectors = [
          '.rbc-off-range',
          '.rbc-off-range-bg', 
          'td.rbc-off-range',
          'td.rbc-off-range-bg',
          '.rbc-month-view .rbc-off-range',
          '.rbc-month-view .rbc-off-range-bg',
          '[class*="off-range"]',
          '.rbc-date-cell.rbc-off-range',
          '.rbc-day-bg.rbc-off-range',
          '.rbc-date-cell.rbc-off-range-bg',
          '.rbc-day-bg.rbc-off-range-bg'
        ]
        
        let foundOffRangeCells = false
        let totalOffRangeCells = 0
        
        // Tentar todos os seletores possíveis
        offRangeSelectors.forEach(selector => {
          const cells = document.querySelectorAll(selector)
          if (cells.length > 0) {
            // console.debug(`✅ Encontrado ${cells.length} células com seletor: ${selector}`)
            foundOffRangeCells = true
            totalOffRangeCells += cells.length
            
            cells.forEach(cell => {
              const htmlCell = cell as HTMLElement
              // console.debug('📍 Aplicando estilos off-range em:', htmlCell.className, htmlCell.tagName)
              applyOffRangeStyles(htmlCell)
            })
          }
        })
        
        // Se não encontramos células off-range com os seletores padrão,
        // vamos procurar de forma mais agressiva
        if (!foundOffRangeCells || totalOffRangeCells === 0) {
          // console.debug('🔍 Busca agressiva: analisando todas as células...')
          
          // Estratégia: encontrar células que contêm dias de outros meses
          const allTableCells = document.querySelectorAll('.rbc-month-view td')
          // console.debug(`📊 Analisando ${allTableCells.length} células da tabela...`)
          
          allTableCells.forEach((cell, index) => {
            const htmlCell = cell as HTMLElement
            const button = cell.querySelector('button')
            
            if (button) {
              const buttonText = button.textContent?.trim()
              const dayNumber = buttonText ? parseInt(buttonText) : null
              
              // Lógica para detectar dias de outros meses:
              // Se é início do mês mas o número é alto (>15), é do mês anterior
              // Se é final do mês mas o número é baixo (<15), é do próximo mês
              const rowIndex = Math.floor(index / 7) // linha (0-5)
              
              let isOffRange = false
              
              if (dayNumber) {
                // Primeira linha e número alto = mês anterior
                if (rowIndex === 0 && dayNumber > 15) {
                  isOffRange = true
                }
                // Última linha e número baixo = próximo mês
                else if (rowIndex >= 4 && dayNumber <= 15) {
                  isOffRange = true
                }
              }
              
              if (isOffRange) {
                // console.debug(`🎯 Detectado dia off-range: ${dayNumber} (célula ${index})`)
                
                // Adicionar classes se não existirem
                htmlCell.classList.add('rbc-off-range')
                
                // Aplicar estilos
                applyOffRangeStyles(htmlCell)
                
                foundOffRangeCells = true
              }
            }
            
            // Log para debug
            // console.debug(`Célula ${index}: ${htmlCell.className} - botão: ${button?.textContent}`)
          })
        }
        
        // console.debug(`📋 Resumo: ${foundOffRangeCells ? 'Encontradas' : 'NÃO encontradas'} células off-range`)
        
        // Primeiro, remover destaque de todos os botões
        const allDateButtons = document.querySelectorAll('.rbc-date-cell button')
        allDateButtons.forEach(btn => {
          btn.classList.remove('today-highlighted')
          const htmlBtn = btn as HTMLElement
          htmlBtn.style.removeProperty('background')
          htmlBtn.style.removeProperty('background-color')
          htmlBtn.style.removeProperty('color')
          htmlBtn.style.removeProperty('font-weight')
          htmlBtn.style.removeProperty('border-radius')
          htmlBtn.style.removeProperty('width')
          htmlBtn.style.removeProperty('height')
          htmlBtn.style.removeProperty('display')
          htmlBtn.style.removeProperty('align-items')
          htmlBtn.style.removeProperty('justify-content')
          htmlBtn.style.removeProperty('font-size')
          htmlBtn.style.removeProperty('border')
          htmlBtn.style.removeProperty('box-shadow')
          htmlBtn.style.removeProperty('transition')
        })
        
        // Só destacar se estivermos visualizando o mês atual
        if (currentMonth === todayMonth && currentYear === todayYear) {
          // Encontrar todos os botões de data
          const dateButtons = document.querySelectorAll('.rbc-date-cell button')
          
          dateButtons.forEach(button => {
            const buttonText = button.textContent?.trim()
            if (buttonText === String(todayDay)) {
              // Verificar se este botão está no mês atual (não off-range)
              const cell = button.closest('.rbc-date-cell')
              const isOffRange = cell?.closest('.rbc-off-range')
              
              if (!isOffRange) {
                // Aplicar estilos do dia atual com !important via CSS
                const htmlButton = button as HTMLElement
                htmlButton.style.setProperty('background', '#1a73e8', 'important')
                htmlButton.style.setProperty('background-color', '#1a73e8', 'important')
                htmlButton.style.setProperty('color', 'white', 'important')
                htmlButton.style.setProperty('font-weight', '500', 'important')
                htmlButton.style.setProperty('border-radius', '50%', 'important')
                htmlButton.style.setProperty('width', '36px', 'important')
                htmlButton.style.setProperty('height', '36px', 'important')
                htmlButton.style.setProperty('display', 'flex', 'important')
                htmlButton.style.setProperty('align-items', 'center', 'important')
                htmlButton.style.setProperty('justify-content', 'center', 'important')
                htmlButton.style.setProperty('font-size', '14px', 'important')
                htmlButton.style.setProperty('border', 'none', 'important')
                htmlButton.style.setProperty('box-shadow', '0 1px 3px rgba(60, 64, 67, 0.3)', 'important')
                htmlButton.style.setProperty('transition', 'all 0.15s ease', 'important')
                
                // Adicionar classe para identificação
                button.classList.add('today-highlighted')
                
                // Remover qualquer classe que possa estar interferindo
                button.classList.remove('rbc-button-link')
              }
            }
          })
        }
      } catch {}
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [calendarEvents, viewConfig])

  return (
    <div className="h-full w-full flex flex-col" style={{ height: '100%' }}>
      
      {/* Calendário */}
      <div className="flex-1 w-full" style={{ height: '100%' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              Carregando eventos...
            </div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-4">
            <p>Erro ao carregar calendário:</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            style={{ 
              height: '100%', 
              width: '100%', 
              maxWidth: '100%',
              margin: 0,
              padding: 0,
              boxSizing: 'border-box'
            }}
            view={viewConfig.view as any}
            date={new Date(viewConfig.current_date)}
            onView={setView as any}
            onNavigate={(date: Date) => setCurrentDate(format(date, 'yyyy-MM-dd'))}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            popup
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent
            }}
            messages={{
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              today: 'Hoje',
              previous: 'Anterior',
              next: 'Próximo',
              agenda: 'Agenda',
              showMore: (total: number) => `+${total} mais`
            }}
            formats={{
              // Month view
              dayHeaderFormat: (date: Date, culture?: string, localizer?: any) => 
                localizer.format(date, 'EEEE', culture),
              monthHeaderFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, 'MMMM yyyy', culture),
              
              // Week view
              dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) =>
                `${localizer.format(start, 'dd MMM', culture)} – ${localizer.format(end, 'dd MMM yyyy', culture)}`,
              weekdayFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, 'EEE', culture),
              dayFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, 'dd', culture),
              
              // Time formats
              timeGutterFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, 'HH:mm', culture),
              eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) =>
                `${localizer.format(start, 'HH:mm', culture)} – ${localizer.format(end, 'HH:mm', culture)}`,
              
              // Agenda view
              agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) =>
                `${localizer.format(start, 'dd MMM', culture)} – ${localizer.format(end, 'dd MMM yyyy', culture)}`,
              agendaDateFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, 'EEE dd/MM', culture),
              agendaTimeFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, 'HH:mm', culture),
              agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) =>
                `${localizer.format(start, 'HH:mm', culture)} – ${localizer.format(end, 'HH:mm', culture)}`
            }}
            culture="pt-BR"
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            min={new Date(1970, 0, 1, 6, 0)}
            max={new Date(1970, 0, 1, 22, 0)}
          />
        )}
      </div>
    </div>
  )
} 