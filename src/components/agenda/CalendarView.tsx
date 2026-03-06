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
import type { Task, Booking } from '../../types'
import React, { useCallback, useEffect } from 'react'
import { getCalendarEventStyle, type CalendarEvent } from '../../utils/calendarHelpers'
import { parseDateOnlyToLocal } from '../../utils/date'

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
  onTaskEdit?: (task: Task) => void
  onBookingEdit?: (booking: Booking) => void
  refreshKey?: number
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onTaskEdit, onBookingEdit, refreshKey }) => {
  const { calendarEvents, loading, error, refetch } = useEvents()
  const {
    viewConfig,
    setView,
    setCurrentDate
  } = useCalendarLogic()

  // Handlers para seleção de slots e itens
  const handleSelectSlot = useCallback((slot: { start: Date; end: Date }) => {
    // Slot selecionado - por enquanto apenas log
    console.log('Slot selecionado:', slot)
  }, [])

  const handleSelectEvent = useCallback((calendarEvent: CalendarEvent) => {
    if (calendarEvent.isBooking || calendarEvent.resource?.type === 'booking') {
      // Se é um agendamento
      if (onBookingEdit) {
        onBookingEdit(calendarEvent.originalData as Booking)
      }
    } else if (calendarEvent.isTask) {
      // Se é uma tarefa
      if (onTaskEdit) {
        onTaskEdit(calendarEvent.originalData as Task)
      }
    }
  }, [onTaskEdit, onBookingEdit])

  // Função para customizar o estilo dos eventos
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const style = getCalendarEventStyle(event, viewConfig.view)
    // Forçar que o background ocupe todo o bloco do evento (sobrepondo estilo default)
    return {
      className: 'adv-event',
      style: {
        ...style,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'flex-start' as const,
        // Passar cor via CSS var para reforçar override com !important no CSS
        ['--adv-event-bg' as any]: (style.backgroundColor as string) || undefined
      }
    }
  }, [viewConfig.view])

  // Função para customizar componentes de eventos
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const getEventTitle = () => {
      if (event.isTask) {
        return event.title.replace(/^📋\s*/, '').replace(/^[📅🔥⚠️✅]\s*/, '')
      }
      return event.title
    }

    const getEventTime = () => {
      if (event.start && event.end) {
        return new Date(event.start).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
      return ''
    }

    const getEventTimeRange = () => {
      if (event.start && event.end) {
        const start = new Date(event.start).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })
        const end = new Date(event.end).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })
        return `${start} – ${end}`
      }
      return ''
    }

    const getBookingClientName = () => {
      if (event.isBooking || event.resource?.type === 'booking') {
        const booking = event.originalData as Booking
        return booking.lead?.name || booking.client_name || ''
      }
      return ''
    }

    const getTaskMeta = () => {
      if (event.isTask) {
        const task = event.originalData as Task
        const parts: string[] = []
        if (task.priority) parts.push(task.priority)
        if (task.status) parts.push(task.status)
        return parts.join(' · ')
      }
      return ''
    }

    const isTimeView = viewConfig.view === 'week' || viewConfig.view === 'day'
    const isDayView = viewConfig.view === 'day'
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

    if (isTimeView) {
      // Week e Day: mesmo padrão da visão mensal - ícone + horário + título em linha
      const timeLabel = isDayView ? getEventTimeRange() : getEventTime()
      const baseSize = isMobile ? 'text-[10px]' : 'text-xs'

      return (
        <div className="h-full w-full flex flex-col justify-center px-2 py-1 overflow-hidden min-w-0">
          <div className={`flex items-center gap-1.5 min-w-0 ${baseSize}`}>
            {event.isTask && (
              <span className="text-white/80 flex-shrink-0">✓</span>
            )}
            <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
              {timeLabel && (
                <span className="text-white/95 font-medium flex-shrink-0">
                  {timeLabel}
                </span>
              )}
              <span className="font-semibold truncate text-white leading-tight block">
                {getEventTitle()}
              </span>
            </div>
          </div>
          {isDayView && (getBookingClientName() || getTaskMeta()) && (
            <div className={`text-white/90 truncate ${baseSize} mt-0.5`}>
              {getBookingClientName() || getTaskMeta()}
            </div>
          )}
        </div>
      )
    }

    // Para month view - exibir com ícone e horário
    return (
      <div className="h-full w-full flex items-center gap-1 px-1.5 py-0.5">
        {event.isTask && (
          <span className="text-white/80 text-[10px] flex-shrink-0">✓</span>
        )}
        <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
          {getEventTime() && (
            <span className={`text-white/90 font-medium flex-shrink-0 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>
              {getEventTime()}
            </span>
          )}
          <span className={`font-semibold truncate text-white leading-tight ${isMobile ? 'text-[10px]' : 'text-[11px]'}`}>
            {getEventTitle()}
          </span>
        </div>
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
          const isMobile = window.innerWidth <= 1024
          const isSmallMobile = window.innerWidth <= 640
          
          // Calcular altura baseada no container pai real
          const calendarContainer = document.querySelector('.rbc-calendar')?.parentElement
          if (!calendarContainer) return
          
          const containerHeight = calendarContainer.clientHeight
          
          // Toolbar do calendário (mobile tem 3 linhas, desktop tem 1)
          const toolbarHeight = isMobile ? 140 : 60
          
          // Header dos dias da semana
          const headerHeight = isMobile ? 35 : 40
          
          const availableHeight = containerHeight - toolbarHeight - headerHeight - 20
          const rowHeight = Math.floor(availableHeight / numberOfWeeks)
          
          // Altura mínima por tipo de tela
          let minHeight = 80
          if (isSmallMobile) {
            minHeight = 70
          } else if (isMobile) {
            minHeight = 80
          }
          
          const finalHeight = Math.max(rowHeight, minHeight)
          
          // Aplicar altura calculada
          monthRows.forEach(row => {
            const htmlRow = row as HTMLElement
            htmlRow.style.setProperty('height', `${finalHeight}px`, 'important')
            htmlRow.style.setProperty('min-height', `${finalHeight}px`, 'important')
          })
          
          // Ajustar altura total do month-view
          if (monthView) {
            const totalHeight = finalHeight * numberOfWeeks + headerHeight + 10
            const htmlMonthView = monthView as HTMLElement
            htmlMonthView.style.setProperty('height', `${totalHeight}px`, 'important')
          }
        }
      }, 250)
    }
    
    adjustCalendarHeight()
    window.addEventListener('resize', adjustCalendarHeight)
    
    return () => {
      window.removeEventListener('resize', adjustCalendarHeight)
    }
  }, [viewConfig.current_date, viewConfig.view])

  // CRITICAL: Forçar layout de 7 colunas (LARGURA TOTAL ABSOLUTA)
  useEffect(() => {
    const forceFullWidth = () => {
      // 1. Forçar o container principal e view do mês
      const containers = document.querySelectorAll('.rbc-calendar, .rbc-month-view');
      containers.forEach(c => {
        const el = c as HTMLElement;
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('min-width', '100%', 'important');
        el.style.setProperty('display', 'flex', 'important');
        el.style.setProperty('flex-direction', 'column', 'important');
      });

      // 2. Forçar as linhas (weeks)
      const rows = document.querySelectorAll('.rbc-month-row');
      rows.forEach(r => {
        const el = r as HTMLElement;
        el.style.setProperty('display', 'flex', 'important');
        el.style.setProperty('flex-direction', 'column', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('flex', '1 0 0%', 'important');
      });

      // 3. Forçar os sub-containers horizontais
      const subContainers = document.querySelectorAll('.rbc-row, .rbc-row-bg, .rbc-row-content, .rbc-month-header');
      subContainers.forEach(c => {
        const el = c as HTMLElement;
        el.style.setProperty('display', 'flex', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('min-width', '100%', 'important');
        
        // rbc-row-content empilha o número do dia e os eventos verticalmente
        if (el.classList.contains('rbc-row-content')) {
          el.style.setProperty('flex-direction', 'column', 'important');
        } else {
          el.style.setProperty('flex-direction', 'row', 'important');
        }
      });

      // 4. Forçar as células individuais (1/7 exato)
      const cells = document.querySelectorAll('.rbc-header, .rbc-date-cell, .rbc-day-bg');
      cells.forEach(cell => {
        const el = cell as HTMLElement;
        el.style.setProperty('flex', '1 0 14.2857%', 'important');
        el.style.setProperty('width', '14.2857%', 'important');
        el.style.setProperty('max-width', '14.2857%', 'important');
        el.style.setProperty('min-width', '0', 'important');
        el.style.setProperty('box-sizing', 'border-box', 'important');
      });
    };

    forceFullWidth();
    const observer = new MutationObserver(forceFullWidth);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [viewConfig.current_date, viewConfig.view, calendarEvents])

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

  // Recarregar eventos quando refreshKey externo mudar
  useEffect(() => {
    if (typeof refreshKey !== 'number') return
    // disparar recarga apenas quando refreshKey realmente mudar
    refetch()
  }, [refreshKey, refetch])

  return (
    <div className="h-full w-full flex flex-col" style={{ height: '100%' }}>
      
      {/* Calendário */}
      <style>{`
        /* Forçar cor total do bloco na visão semanal/dia */
        .adv-event { background-color: var(--adv-event-bg) !important; border-color: var(--adv-event-bg) !important; }
        .adv-event .rbc-event-content { background: transparent !important; }
        .adv-event.rbc-selected { background-color: var(--adv-event-bg) !important; }
        .adv-event:before, .adv-event:after { background: var(--adv-event-bg) !important; border-color: var(--adv-event-bg) !important; }
        
        /* Garantir layout padrão desktop */
        @media (min-width: 1025px) {
          .rbc-toolbar {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 12px 16px !important;
          }
          
          .rbc-toolbar-label {
            flex-grow: 1 !important;
            text-align: center !important;
            font-size: 18px !important;
            font-weight: 600 !important;
          }
          
          .rbc-btn-group {
            display: flex !important;
            gap: 6px !important;
          }
          
          .rbc-btn-group button {
            padding: 8px 16px !important;
            font-size: 14px !important;
            min-height: 36px !important;
            border: 1px solid #d1d5db !important;
            border-radius: 8px !important;
            background: #fff !important;
            color: #374151 !important;
            font-weight: 500 !important;
            transition: all 0.2s !important;
            margin: 0 !important;
          }
          
          .rbc-btn-group button:hover {
            background: #f9fafb !important;
            border-color: #9ca3af !important;
          }
          
          .rbc-btn-group button.rbc-active {
            background: #ea580c !important;
            color: #fff !important;
            border-color: #ea580c !important;
          }
          
          .rbc-btn-group button.rbc-active:hover {
            background: #dc2626 !important;
            border-color: #dc2626 !important;
          }
          
          /* Month view desktop - CSS GRID + Estilo Google */
          .rbc-month-view .rbc-month-header {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            border-bottom: none !important;
          }
          
          .rbc-month-view .rbc-month-row {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            flex: 1 !important;
            min-height: 100px !important;
            position: relative !important;
          }
          
          .rbc-month-view .rbc-row-bg,
          .rbc-month-view .rbc-row-content,
          .rbc-month-view .rbc-row-content > .rbc-row {
            display: contents !important;
          }
          
          .rbc-month-view .rbc-day-bg,
          .rbc-month-view .rbc-date-cell {
            grid-column: span 1 !important;
            box-sizing: border-box !important;
          }
          
          .rbc-month-view .rbc-day-bg {
            border: 1px solid #dadce0 !important;
          }
          
          .rbc-month-view .rbc-date-cell {
            display: flex !important;
            flex-direction: column !important;
            padding: 4px 8px !important;
            z-index: 2 !important;
          }
          
          .rbc-month-view .rbc-date-cell button {
            align-self: flex-end !important;
            color: #3c4043 !important;
            min-width: 28px !important;
            height: 28px !important;
            padding: 4px !important;
            border-radius: 50% !important;
            font-size: 13px !important;
            font-weight: 500 !important;
          }
        }
          
          /* Week/Day view - Desktop - APENAS time views */
          .rbc-time-view .rbc-time-header {
            min-height: 60px !important;
            max-height: 60px !important;
          }
          
          .rbc-time-view .rbc-time-header-cell {
            min-height: 55px !important;
            max-height: 60px !important;
            padding: 0 !important;
          }
          
          .rbc-time-view .rbc-header {
            padding: 10px 8px !important;
            font-size: 11px !important;
          }
          
          .rbc-time-view .rbc-time-slot {
            min-height: 40px !important;
            font-size: 11px !important;
          }
          
          .rbc-time-view .rbc-timeslot-group {
            min-height: 80px !important;
          }
          
          .rbc-time-view .rbc-time-gutter {
            font-size: 11px !important;
            width: 60px !important;
          }
          
          .rbc-time-view .rbc-label {
            font-size: 11px !important;
            padding: 6px 8px !important;
          }
        }
          
          /* Gutter do header - Desktop com grid - APENAS time views */
          .rbc-time-view .rbc-time-header {
            grid-template-columns: 60px 1fr !important;
            min-height: 60px !important;
            max-height: 60px !important;
          }
          
          .rbc-time-view .rbc-time-content {
            grid-template-columns: 60px 1fr !important;
          }
          
          .rbc-time-view .rbc-time-header .rbc-row {
            display: grid !important;
            grid-auto-flow: column !important;
            grid-auto-columns: 1fr !important;
          }
          
          /* Garantir que não sobre espaço all-day no desktop - APENAS time views */
          .rbc-time-view .rbc-allday-cell {
            display: none !important;
            height: 0 !important;
          }
          
          .rbc-time-view .rbc-time-header-content .rbc-row-segment,
          .rbc-time-view .rbc-time-header-content .rbc-row-content {
            display: none !important;
            height: 0 !important;
          }
          
          /* Eventos na view de tempo - Desktop - APENAS time views */
          .rbc-time-view .rbc-time-slot .rbc-event {
            font-size: 12px !important;
            line-height: 1.4 !important;
            border-radius: 6px !important;
            margin: 0 4px !important;
            border-left-width: 4px !important;
          }
          
          /* Garantir alinhamento perfeito - Desktop - APENAS time views */
          .rbc-time-view .rbc-time-header-content {
            overflow: visible !important;
            display: flex !important;
          }
          
          .rbc-time-view .rbc-time-header-content > .rbc-row {
            display: flex !important;
            flex: 1 !important;
          }
          
          /* Melhorar espaçamento entre colunas */
          .rbc-time-content {
            border-top: none !important;
          }
        }
        
        /* Ajustes para mobile */
        @media (max-width: 1024px) {
          .rbc-calendar {
            font-size: 12px !important;
          }
          
          /* Month view Mobile - CSS GRID */
          .rbc-month-view {
            display: flex !important;
            flex-direction: column !important;
            visibility: visible !important;
          }
          
          .rbc-month-view .rbc-month-header {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            border-bottom: none !important;
          }
          
          .rbc-month-view .rbc-header {
            visibility: visible !important;
          }
          
          .rbc-month-view .rbc-month-row {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            flex: 1 !important;
            min-height: 70px !important;
            position: relative !important;
          }
          
          .rbc-month-view .rbc-row-bg,
          .rbc-month-view .rbc-row-content,
          .rbc-month-view .rbc-row-content > .rbc-row {
            display: contents !important;
          }
          
          .rbc-month-view .rbc-day-bg,
          .rbc-month-view .rbc-date-cell {
            grid-column: span 1 !important;
            box-sizing: border-box !important;
          }
          
          .rbc-month-view .rbc-day-bg {
            border: 1px solid #e5e7eb !important;
          }
          
          .rbc-month-view .rbc-date-cell {
            display: flex !important;
            flex-direction: column !important;
            padding: 3px !important;
            z-index: 2 !important;
          }
          
          /* Toolbar (cabeçalho do calendário) - Layout em Linha Única (Mobile) */
          .rbc-toolbar {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 8px 10px !important;
            gap: 6px !important;
            background: #fff !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          
          /* Esconder o título se o espaço for muito curto ou reduzir drasticamente */
          .rbc-toolbar-label {
            font-size: 14px !important;
            font-weight: 700 !important;
            text-align: left !important;
            color: #111827 !important;
            margin: 0 !important;
            padding: 0 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            flex: 1 !important;
            min-width: 0 !important;
          }
          
          /* Grupo de Navegação (Anterior, Hoje, Próximo) - Super compacto */
          .rbc-btn-group:first-child {
            display: flex !important;
            gap: 2px !important;
            margin: 0 !important;
            flex-shrink: 0 !important;
          }
          
          .rbc-btn-group:first-child button {
            font-size: 11px !important;
            font-weight: 600 !important;
            padding: 5px 8px !important;
            min-height: 32px !important;
            border: 1px solid #d1d5db !important;
            background: #fff !important;
            border-radius: 4px !important;
            color: #374151 !important;
            margin: 0 !important;
          }
          
          /* Grupo de Visualização (Mês, Semana, Dia) - Super compacto e no outro canto */
          .rbc-btn-group:last-child {
            display: flex !important;
            gap: 2px !important;
            background: #f3f4f6 !important;
            padding: 2px !important;
            border-radius: 6px !important;
            margin: 0 !important;
            flex-shrink: 0 !important;
          }
          
          .rbc-btn-group:last-child button {
            font-size: 10px !important;
            font-weight: 600 !important;
            padding: 5px 6px !important;
            min-height: 28px !important;
            border: none !important;
            background: transparent !important;
            border-radius: 4px !important;
            color: #6b7280 !important;
            text-transform: capitalize !important;
          }
          
          .rbc-btn-group:last-child button.rbc-active {
            background: #fff !important;
            color: #ea580c !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08) !important;
          }
          
          /* Header dos dias da semana */
          .rbc-header {
            padding: 8px 4px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            border-bottom: 2px solid #e5e7eb !important;
            background: #f9fafb !important;
            color: #6b7280 !important;
            text-transform: uppercase !important;
            text-align: center !important;
          }
          
          /* =====================================================
             MONTH VIEW - FLEXBOX LAYOUT (7 COLUNAS)
             ===================================================== */
          .rbc-month-view {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            width: 100% !important;
          }
          
          .rbc-month-header {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
          }
          
          .rbc-month-row {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 0 0% !important;
            width: 100% !important;
            min-height: 80px !important;
          }
          
          .rbc-row, .rbc-row-bg, .rbc-row-content {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            flex-wrap: nowrap !important;
          }

          .rbc-row-content {
            flex-direction: column !important;
            height: 100% !important;
          }

          .rbc-row-content > .rbc-row {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
          }
          
          .rbc-date-cell, .rbc-day-bg, .rbc-header {
            flex: 1 0 14.2857% !important;
            width: 14.2857% !important;
            max-width: 14.2857% !important;
            box-sizing: border-box !important;
          }
          
          .rbc-header {
            text-align: center !important;
            padding: 10px 0 !important;
          }
          
          .rbc-month-view .rbc-date-cell button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            align-self: flex-end !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #111827 !important;
            font-weight: 500 !important;
            transition: all 0.2s !important;
            border-radius: 50% !important;
          }
          
          .rbc-month-view .rbc-date-cell button:hover {
            background: #f3f4f6 !important;
          }
          
          /* =====================================================
             ESTILO GOOGLE CALENDAR - MONTH VIEW
             ===================================================== */
          
          /* Today - círculo colorido no número (estilo Google) */
          .rbc-month-view .rbc-today {
            background: transparent !important;
          }
          
          .rbc-month-view .rbc-date-cell.rbc-now button,
          .rbc-month-view .rbc-today .rbc-date-cell button {
            background: #1a73e8 !important;
            color: #fff !important;
            border-radius: 50% !important;
            width: 28px !important;
            height: 28px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          /* Date cell - número no topo direito, eventos abaixo */
          .rbc-month-view .rbc-date-cell {
            display: flex !important;
            flex-direction: column !important;
            padding: 2px 4px !important;
            min-height: 80px !important;
          }
          
          .rbc-month-view .rbc-date-cell button {
            align-self: flex-end !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            color: #3c4043 !important;
            padding: 4px !important;
            min-width: 24px !important;
            height: 24px !important;
            border-radius: 50% !important;
            transition: background 0.2s !important;
          }
          
          .rbc-month-view .rbc-date-cell button:hover {
            background: #f1f3f4 !important;
          }
          
          /* Dias fora do mês atual - cor mais clara */
          .rbc-month-view .rbc-off-range {
            background: #f8f9fa !important;
          }
          
          .rbc-month-view .rbc-off-range .rbc-date-cell button,
          .rbc-month-view .rbc-date-cell.rbc-off-range-bg button {
            color: #70757a !important;
          }
          
          /* Eventos - estilo Google Calendar (barras coloridas) */
          .rbc-month-view .rbc-row-segment {
            padding: 0 2px !important;
          }
          
          .rbc-month-view .rbc-event {
            font-size: 11px !important;
            padding: 1px 6px !important;
            border-radius: 4px !important;
            margin: 1px 0 !important;
            border: none !important;
            display: flex !important;
            align-items: center !important;
            min-height: 18px !important;
            line-height: 1.3 !important;
            font-weight: 500 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          
          .rbc-month-view .rbc-event:hover {
            filter: brightness(0.95) !important;
            cursor: pointer !important;
          }
          
          .rbc-month-view .rbc-event-content {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          
          /* "+N mais" link - estilo Google */
          .rbc-month-view .rbc-show-more {
            font-size: 11px !important;
            color: #1a73e8 !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            padding: 2px 4px !important;
            margin-top: 2px !important;
          }
          
          .rbc-month-view .rbc-show-more:hover {
            background: #e8f0fe !important;
            border-radius: 4px !important;
          }
          
          /* Bordas das células mais sutis */
          .rbc-month-view .rbc-day-bg {
            border: 1px solid #dadce0 !important;
          }
          
          /* Header dos dias da semana - estilo Google */
          .rbc-month-view .rbc-header {
            padding: 12px 0 8px !important;
            font-size: 11px !important;
            font-weight: 500 !important;
            color: #70757a !important;
            text-transform: uppercase !important;
            border-bottom: none !important;
            background: transparent !important;
            text-align: center !important;
          }
          
          
          /* Week/Day view */
          .rbc-time-view {
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            overflow: hidden !important;
            background: #fff !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          .rbc-time-header {
            min-height: 50px !important;
            border-bottom: 2px solid #e5e7eb !important;
            background: #fafafa !important;
            display: flex !important;
            flex-shrink: 0 !important;
          }
          
          /* Gutter do header com mesma largura do gutter de tempo */
          .rbc-time-header > .rbc-label {
            width: 50px !important;
            flex-shrink: 0 !important;
            border-right: 1px solid #e5e7eb !important;
          }
          
          /* Time view headers - não afetar month view */
          .rbc-time-view .rbc-time-header-content {
            display: flex !important;
            border-left: none !important;
            flex: 1 !important;
          }
          
          .rbc-time-view .rbc-time-header-content > .rbc-row {
            display: flex !important;
            width: 100% !important;
            flex: 1 !important;
            gap: 0 !important;
          }
          
          .rbc-time-view .rbc-time-header-cell {
            min-height: 45px !important;
            max-height: 50px !important;
            padding: 0 !important;
            flex: 1 !important;
            min-width: 0 !important;
            display: flex !important;
            align-items: stretch !important;
          }
          
          .rbc-time-view .rbc-header {
            padding: 8px 4px !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            color: #6b7280 !important;
            text-transform: uppercase !important;
            border-bottom: 1px solid #e5e7eb !important;
            flex: 1 !important;
            min-width: 0 !important;
            text-align: center !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
          }
          
          .rbc-time-view .rbc-header.rbc-today {
            background: #fef3c7 !important;
            color: #92400e !important;
            font-weight: 700 !important;
          }
          
          .rbc-time-view .rbc-time-slot {
            min-height: 35px !important;
            font-size: 10px !important;
            border-top: 1px solid #f3f4f6 !important;
          }
          
          .rbc-time-view .rbc-timeslot-group {
            min-height: 70px !important;
            border-left: 1px solid #e5e7eb !important;
            background: #fff !important;
          }
          
          .rbc-time-view .rbc-time-gutter {
            font-size: 10px !important;
            width: 50px !important;
            color: #9ca3af !important;
            font-weight: 500 !important;
            background: #fafafa !important;
          }
          
          .rbc-time-view .rbc-time-gutter .rbc-timeslot-group {
            border-left: none !important;
            background: #fafafa !important;
          }
          
          .rbc-time-view .rbc-time-slot.rbc-time-slot {
            border-top: 1px dashed #f3f4f6 !important;
          }
          
          .rbc-time-view .rbc-day-slot .rbc-time-slot:first-child {
            border-top: none !important;
          }
          
          .rbc-time-view .rbc-time-column {
            min-width: 0 !important;
          }
          
          .rbc-time-view .rbc-day-slot {
            background: #fff !important;
            min-width: 0 !important;
          }
          
          .rbc-current-time-indicator {
            height: 2px !important;
            background-color: #ea580c !important;
            box-shadow: 0 0 4px rgba(234, 88, 12, 0.5) !important;
          }
          
          /* Marcador do horário atual */
          .rbc-current-time-indicator::before {
            content: '' !important;
            position: absolute !important;
            left: -6px !important;
            top: -3px !important;
            width: 8px !important;
            height: 8px !important;
            border-radius: 50% !important;
            background-color: #ea580c !important;
            box-shadow: 0 0 4px rgba(234, 88, 12, 0.6) !important;
          }
          
          /* Eventos na view de tempo - APENAS time views */
          .rbc-time-view .rbc-time-slot .rbc-event {
            padding: 0 !important;
            font-size: 10px !important;
            line-height: 1.3 !important;
            border-radius: 4px !important;
            border-left: 3px solid rgba(255, 255, 255, 0.4) !important;
            margin: 0 2px !important;
          }
          
          .rbc-time-view .rbc-time-slot .rbc-event-content {
            white-space: normal !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          
          .rbc-time-view .rbc-time-slot .rbc-event:hover {
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
            z-index: 100 !important;
          }
          
          /* Labels dos slots de tempo - APENAS time views */
          .rbc-time-view .rbc-label {
            padding: 4px 6px !important;
            font-size: 10px !important;
          }
          
          /* Remover completamente área all-day - APENAS time views */
          .rbc-time-view .rbc-allday-cell,
          .rbc-time-view .rbc-time-header-content .rbc-allday-cell,
          .rbc-time-view .rbc-row.rbc-allday-cell {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            overflow: hidden !important;
          }
          
          /* Garantir que o header-content não reserve espaço para all-day - APENAS time views */
          .rbc-time-view .rbc-time-header-content {
            display: flex !important;
            flex-direction: column !important;
            min-height: 0 !important;
          }
          
          /* Ocultar qualquer label ou indicação de all-day - APENAS time views */
          .rbc-time-view .rbc-time-header-content .rbc-row:first-child {
            display: flex !important;
            min-height: 0 !important;
          }
          
          /* Garantir alinhamento perfeito das colunas - APENAS time views */
          .rbc-time-view .rbc-time-header {
            display: grid !important;
            grid-template-columns: 50px 1fr !important;
            min-height: 50px !important;
            max-height: 50px !important;
            align-items: stretch !important;
          }
          
          .rbc-time-view .rbc-time-header > .rbc-label {
            grid-column: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          .rbc-time-view .rbc-time-header-content {
            grid-column: 2 !important;
            display: flex !important;
            overflow: hidden !important;
            min-height: 0 !important;
          }
          
          .rbc-time-view .rbc-time-header .rbc-row {
            display: grid !important;
            grid-auto-flow: column !important;
            grid-auto-columns: 1fr !important;
            flex: 1 !important;
            min-height: 0 !important;
            width: 100% !important;
          }
          
          .rbc-time-view .rbc-time-header .rbc-header {
            min-width: 0 !important;
          }
          
          /* Evitar que o header-content crie linhas vazias - APENAS time views */
          .rbc-time-view .rbc-time-header-content > * {
            min-height: 0 !important;
          }
          
          /* Container de conteúdo de tempo com grid - APENAS time views */
          .rbc-time-view .rbc-time-content {
            display: grid !important;
            grid-template-columns: 50px 1fr !important;
            flex: 1 !important;
            align-items: stretch !important;
          }
          
          .rbc-time-view .rbc-time-content > .rbc-time-gutter {
            grid-column: 1 !important;
          }
          
          /* Área dos dias com grid interno - APENAS time views */
          .rbc-time-view .rbc-time-content > .rbc-time-column,
          .rbc-time-view .rbc-time-content > * + * {
            grid-column: 2 !important;
            display: grid !important;
            grid-auto-flow: column !important;
            grid-auto-columns: 1fr !important;
          }
          
          .rbc-time-view .rbc-day-slot {
            min-width: 0 !important;
          }
          
          /* Remover eventos all-day da área superior - APENAS time views */
          .rbc-time-view .rbc-allday-cell .rbc-row-segment {
            display: none !important;
          }
          
          .rbc-time-view .rbc-time-header-content .rbc-row-content {
            display: none !important;
          }
          
          /* Garantir que não sobre espaço */
          .rbc-time-header-content > div:empty,
          .rbc-time-header-content .rbc-row:empty {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
          }
          
          .rbc-month-view .rbc-row-bg {
            background: #fff !important;
          }
          
          /* Grade de horários mais sutil */
          .rbc-day-slot .rbc-events-container {
            margin-right: 0 !important;
          }
          
          /* Separadores de colunas - alinhado com headers */
          .rbc-time-content .rbc-day-slot {
            border-left: 1px solid #e5e7eb !important;
          }
          
          .rbc-time-content .rbc-day-slot:first-of-type {
            border-left: none !important;
          }
          
          /* Bordas verticais entre colunas do header */
          .rbc-header + .rbc-header {
            border-left: 1px solid #e5e7eb !important;
          }
          
          /* Hoje destacado na grade */
          .rbc-today .rbc-timeslot-group {
            background: #fffbeb !important;
          }
          
          /* Melhorar contraste dos horários - APENAS time views */
          .rbc-time-view .rbc-time-gutter .rbc-timeslot-group {
            padding-top: 2px !important;
          }
          
          /* Line clamp para eventos */
          .line-clamp-2 {
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
          }
          
          /* Forçar remoção completa de área all-day em qualquer estrutura - APENAS time views */
          .rbc-time-view div[class*="allday"],
          .rbc-time-view div[class*="all-day"],
          .rbc-time-view .rbc-time-header-content > div:has(.rbc-allday-cell) {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* FORÇAR VISIBILIDADE E ESTRUTURA DA MONTH VIEW */
          .rbc-month-view,
          .rbc-month-view *:not(.rbc-allday-cell):not(.rbc-allday-cell *) {
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .rbc-month-view .rbc-row-content {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
          }
          
          /* CRITICAL: Row que contém as date cells dentro do row-content */
          .rbc-month-view .rbc-row-content > .rbc-row {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            width: 100% !important;
          }
          
          .rbc-month-view .rbc-date-cell {
            display: flex !important;
            flex-direction: column !important;
            flex: 0 0 14.2857% !important;
            width: 14.2857% !important;
            max-width: 14.2857% !important;
            box-sizing: border-box !important;
          }
          
          .rbc-month-view .rbc-date-cell button {
            display: inline-flex !important;
          }
          
          .rbc-month-view .rbc-row-segment {
            display: block !important;
          }
          
          .rbc-month-view .rbc-row {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
          }
          
          .rbc-month-view .rbc-row-bg {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
          }
          
          .rbc-month-view .rbc-day-bg {
            flex: 0 0 14.2857% !important;
            width: 14.2857% !important;
            max-width: 14.2857% !important;
            box-sizing: border-box !important;
          }
        }
        
        /* Ajustes para telas muito pequenas (< 640px) */
        @media (max-width: 640px) {
          .rbc-toolbar {
            padding: 10px 8px !important;
            gap: 8px !important;
          }
          
          .rbc-toolbar-label {
            font-size: 15px !important;
          }
          
          .rbc-btn-group:first-child button {
            font-size: 12px !important;
            padding: 7px 10px !important;
            min-height: 38px !important;
          }
          
          .rbc-btn-group:last-child button {
            font-size: 12px !important;
            padding: 7px 10px !important;
            min-height: 36px !important;
          }
          
          /* Headers */
          .rbc-header {
            padding: 6px 2px !important;
            font-size: 10px !important;
          }
          
          /* Células de dias */
          .rbc-month-view .rbc-date-cell {
            padding: 4px !important;
          }
          
          .rbc-month-view .rbc-date-cell button {
            font-size: 12px !important;
            padding: 5px !important;
            min-width: 28px !important;
            min-height: 28px !important;
          }
          
          /* CSS GRID para telas muito pequenas */
          .rbc-month-view .rbc-month-row {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            min-height: 70px !important;
          }
          
          .rbc-month-view .rbc-row-bg,
          .rbc-month-view .rbc-row-content,
          .rbc-month-view .rbc-row-content > .rbc-row {
            display: contents !important;
          }
          
          .rbc-month-view .rbc-date-cell,
          .rbc-month-view .rbc-day-bg {
            grid-column: span 1 !important;
          }
          
          /* CRITICAL: Row que contém as date cells dentro do row-content */
          .rbc-month-view .rbc-row-content > .rbc-row {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            width: 100% !important;
          }
          
          /* CRITICAL: Date cells que são filhas do row dentro do row-content */
          .rbc-month-view .rbc-row-content > .rbc-row > .rbc-date-cell {
            flex: 0 0 14.2857% !important;
            width: 14.2857% !important;
            max-width: 14.2857% !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
          }
          
          /* Eventos */
          .rbc-event {
            padding: 0 !important;
            min-height: 20px !important;
            font-size: 10px !important;
            margin: 1px !important;
            border-radius: 4px !important;
          }
          
          .rbc-show-more {
            font-size: 9px !important;
            padding: 3px 6px !important;
          }
          
          /* Week/Day view - Mobile pequeno - APENAS time views */
          .rbc-time-view .rbc-time-header {
            min-height: 45px !important;
          }
          
          .rbc-time-view .rbc-time-header-cell {
            min-height: 40px !important;
            max-height: 45px !important;
            padding: 0 !important;
          }
          
          .rbc-time-view .rbc-header {
            padding: 6px 2px !important;
            font-size: 9px !important;
          }
          
          .rbc-time-view .rbc-time-gutter {
            width: 45px !important;
            font-size: 9px !important;
          }
          
          /* Gutter do header - Mobile pequeno com grid - APENAS time views */
          .rbc-time-view .rbc-time-header {
            grid-template-columns: 45px 1fr !important;
            min-height: 45px !important;
            max-height: 45px !important;
          }
          
          .rbc-time-view .rbc-time-content {
            grid-template-columns: 45px 1fr !important;
          }
          
          .rbc-time-view .rbc-time-header .rbc-row {
            display: grid !important;
            grid-auto-flow: column !important;
            grid-auto-columns: 1fr !important;
          }
          
          /* Garantir que não sobre espaço all-day no mobile pequeno - APENAS time views */
          .rbc-time-view .rbc-allday-cell {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
          }
          
          .rbc-time-view .rbc-time-header-content .rbc-row-segment,
          .rbc-time-view .rbc-time-header-content .rbc-row-content {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
          }
          
          .rbc-time-view .rbc-timeslot-group {
            min-height: 60px !important;
          }
          
          .rbc-time-view .rbc-time-slot {
            min-height: 30px !important;
            font-size: 9px !important;
          }
          
          .rbc-time-view .rbc-label {
            padding: 3px 4px !important;
            font-size: 9px !important;
          }
          
          /* Eventos - Mobile pequeno - APENAS time views */
          .rbc-time-view .rbc-time-slot .rbc-event {
            font-size: 9px !important;
            line-height: 1.2 !important;
            border-radius: 3px !important;
            margin: 0 1px !important;
          }
        }
        
        /* Ajustes gerais do calendário mobile */
        @media (max-width: 1024px) {
          .rbc-calendar {
            background: #fff !important;
          }
          
          .rbc-month-view {
            background: #fff !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            overflow: hidden !important;
          }
          
          .rbc-month-header {
            background: #f9fafb !important;
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
          }
          
          /* Month view - garantir que headers funcionem */
          .rbc-month-view .rbc-header {
            padding: 8px 4px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #6b7280 !important;
            text-transform: uppercase !important;
            border-bottom: 2px solid #e5e7eb !important;
            background: #f9fafb !important;
            text-align: center !important;
          }
          
          /* Month view - CSS GRID */
          .rbc-month-view .rbc-month-row {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
          }
          
          .rbc-month-view .rbc-row-bg,
          .rbc-month-view .rbc-row-content,
          .rbc-month-view .rbc-row-content > .rbc-row {
            display: contents !important;
          }
          
          .rbc-month-view .rbc-date-cell,
          .rbc-month-view .rbc-day-bg {
            grid-column: span 1 !important;
          }
          
          .rbc-month-view .rbc-date-cell {
            padding: 6px !important;
            font-size: 13px !important;
            text-align: right !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          .rbc-month-view .rbc-date-cell button {
            font-size: 13px !important;
            padding: 6px !important;
            min-width: 32px !important;
            min-height: 32px !important;
            font-weight: 500 !important;
            align-self: flex-end !important;
          }
          
          .rbc-off-range {
            color: #d1d5db !important;
          }
          
          .rbc-off-range-bg {
            background: #fafafa !important;
          }
        }
        
        /* =====================================================
           FORÇAR LARGURA TOTAL ABSOLUTA (FIX ESPREMIDO)
           ===================================================== */
        .rbc-calendar, 
        .rbc-month-view, 
        .rbc-month-row, 
        .rbc-row, 
        .rbc-row-bg, 
        .rbc-row-content,
        .rbc-month-header {
          width: 100% !important;
          min-width: 100% !important;
          display: flex !important;
          overflow: visible !important;
        }

        .rbc-month-view {
          flex: 1 0 0% !important;
          flex-direction: column !important;
        }

        .rbc-month-row {
          flex: 1 0 0% !important;
          flex-direction: column !important;
          border-bottom: 1px solid #dadce0 !important;
          min-height: 120px !important;
        }

        .rbc-row-content {
          flex-direction: column !important;
          flex: 1 0 0% !important;
          z-index: 4 !important;
          position: relative !important;
        }

        .rbc-row, .rbc-row-bg, .rbc-month-header {
          flex-direction: row !important;
          flex-wrap: nowrap !important;
        }

        /* Cada célula deve ocupar exatamente 1/7 */
        .rbc-header, .rbc-date-cell, .rbc-day-bg {
          flex: 1 0 14.2857% !important;
          width: 14.2857% !important;
          max-width: 14.2857% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          border-right: 1px solid #dadce0 !important;
        }

        .rbc-day-bg:last-child, .rbc-date-cell:last-child, .rbc-header:last-child {
          border-right: none !important;
        }

        /* Garantir visibilidade das tarefas e eventos */
        .rbc-row-segment {
          padding: 1px 4px !important;
          min-height: 24px !important;
          display: block !important;
        }

        .rbc-event {
          border-radius: 4px !important;
          font-size: 11px !important;
          padding: 2px 6px !important;
          margin-bottom: 2px !important;
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          visibility: visible !important;
          opacity: 1 !important;
          min-height: 20px !important;
        }

        .rbc-show-more {
          z-index: 5 !important;
          position: relative !important;
          color: #1a73e8 !important;
          font-weight: 500 !important;
        }

        /* =====================================================
           TOOLBAR MOBILE - LINHA ÚNICA (PRIORIDADE MÁXIMA)
           ===================================================== */
        @media (max-width: 1024px) {
          .rbc-toolbar {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 8px 10px !important;
            gap: 4px !important;
            background: #fff !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          
          .rbc-toolbar-label {
            font-size: 13px !important;
            font-weight: 700 !important;
            text-align: center !important;
            color: #111827 !important;
            margin: 0 !important;
            padding: 0 4px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            flex: 1 !important;
            min-width: 0 !important;
            order: 2 !important;
          }
          
          .rbc-btn-group:first-child {
            display: flex !important;
            gap: 2px !important;
            margin: 0 !important;
            flex-shrink: 0 !important;
            order: 1 !important;
          }
          
          .rbc-btn-group:first-child button {
            font-size: 10px !important;
            font-weight: 600 !important;
            padding: 4px 6px !important;
            min-height: 28px !important;
            border: 1px solid #d1d5db !important;
            background: #fff !important;
            border-radius: 4px !important;
            color: #374151 !important;
            margin: 0 !important;
          }
          
          .rbc-btn-group:last-child {
            display: flex !important;
            gap: 1px !important;
            background: #f3f4f6 !important;
            padding: 2px !important;
            border-radius: 6px !important;
            margin: 0 !important;
            flex-shrink: 0 !important;
            order: 3 !important;
          }
          
          .rbc-btn-group:last-child button {
            font-size: 9px !important;
            font-weight: 600 !important;
            padding: 4px 6px !important;
            min-height: 26px !important;
            border: none !important;
            background: transparent !important;
            border-radius: 4px !important;
            color: #6b7280 !important;
          }
          
          .rbc-btn-group:last-child button.rbc-active {
            background: #fff !important;
            color: #ea580c !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
          }
        }

        /* =====================================================
           FIX: nunca deixar eventos vazarem do quadrado do dia
           ===================================================== */
        .rbc-month-view .rbc-month-row {
          overflow: hidden !important;
          position: relative !important;
        }

        .rbc-month-view .rbc-row-content {
          overflow: hidden !important;
          height: 100% !important;
        }

        .rbc-month-view .rbc-row-content > .rbc-row {
          overflow: hidden !important;
          min-height: 0 !important;
        }

        .rbc-month-view .rbc-row-segment {
          max-width: 100% !important;
          overflow: hidden !important;
        }

        .rbc-month-view .rbc-event,
        .rbc-month-view .rbc-event-content {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        /* =====================================================
           FIX: semana/dia sem vazamento fora da coluna/slot
           ===================================================== */
        .rbc-time-view .rbc-time-content {
          overflow: auto !important;
          min-width: 0 !important;
          -webkit-overflow-scrolling: touch;
        }
        .rbc-time-view .rbc-day-slot,
        .rbc-time-view .rbc-day-slot .rbc-events-container {
          overflow: hidden !important;
          min-width: 0 !important;
        }

        .rbc-time-view .rbc-day-slot .rbc-event,
        .rbc-time-view .rbc-day-slot .rbc-event .rbc-event-content {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          word-break: break-word !important;
          white-space: normal !important;
          box-sizing: border-box !important;
        }

        /* Evita crescimento visual no hover que causava "estouro" */
        .rbc-time-view .rbc-day-slot .rbc-event:hover {
          transform: none !important;
        }

        /* =====================================================
           PADRÃO GOOGLE: cartões limpos na semana/dia
           ===================================================== */
        .rbc-time-view .rbc-day-slot .rbc-event {
          border-left: none !important;
          border-radius: 8px !important;
          padding: 0 !important;
          margin: 1px 3px !important;
          box-shadow: none !important;
        }

        .rbc-time-view .rbc-day-slot .rbc-event .rbc-event-content {
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          height: 100% !important;
          padding: 0 !important;
          line-height: 1.2 !important;
        }

        .rbc-time-view .rbc-day-slot .rbc-event:hover {
          box-shadow: none !important;
          filter: brightness(0.98);
        }
      `}</style>
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
            date={parseDateOnlyToLocal(viewConfig.current_date)}
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
              monthHeaderFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, 'MMMM yyyy', culture),
              
              // Week view
              dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) =>
                `${localizer.format(start, 'dd MMM', culture)} – ${localizer.format(end, 'dd MMM yyyy', culture)}`,
              weekdayFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, 'EEE', culture),
              dayFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, 'dd', culture),

              // Day view
              dayHeaderFormat: (date: Date, culture?: string, localizer?: any) =>
                localizer.format(date, "EEEE, dd 'de' MMMM", culture),
              
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
            step={viewConfig.view === 'day' ? 15 : 30}
            timeslots={viewConfig.view === 'day' ? 4 : 2}
            scrollToTime={viewConfig.view === 'day' ? new Date() : undefined}
          />
        )}
      </div>
    </div>
  )
} 