import { useState } from 'react'
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns'
import type { CalendarViewConfig } from '../types'

const defaultConfig: CalendarViewConfig = {
  view: 'month',
  current_date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
  timezone: 'America/Sao_Paulo'
}

export function useCalendarLogic(initialConfig: Partial<CalendarViewConfig> = {}) {
  const [viewConfig, setViewConfig] = useState<CalendarViewConfig>({
    ...defaultConfig,
    ...initialConfig
  })

  function setView(view: CalendarViewConfig['view']) {
    setViewConfig((prev) => ({ ...prev, view }))
  }

  function setCurrentDate(date: string) {
    setViewConfig((prev) => ({ ...prev, current_date: date }))
  }

  function setTimezone(timezone: string) {
    setViewConfig((prev) => ({ ...prev, timezone }))
  }

  // Navegação simples (avançar/retroceder)
  function goToNext() {
    const date = new Date(viewConfig.current_date + 'T00:00:00')
    const next = viewConfig.view === 'month'
      ? addMonths(date, 1)
      : viewConfig.view === 'week'
        ? addWeeks(date, 1)
        : addDays(date, 1)
    setCurrentDate(format(next, 'yyyy-MM-dd'))
  }

  function goToPrev() {
    const date = new Date(viewConfig.current_date + 'T00:00:00')
    const prev = viewConfig.view === 'month'
      ? subMonths(date, 1)
      : viewConfig.view === 'week'
        ? subWeeks(date, 1)
        : subDays(date, 1)
    setCurrentDate(format(prev, 'yyyy-MM-dd'))
  }

  function goToToday() {
    setCurrentDate(new Date().toISOString().slice(0, 10))
  }

  return {
    viewConfig,
    setView,
    setCurrentDate,
    setTimezone,
    goToNext,
    goToPrev,
    goToToday
  }
} 