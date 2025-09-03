import { useState } from 'react'
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
    const date = new Date(viewConfig.current_date)
    if (viewConfig.view === 'month') {
      date.setMonth(date.getMonth() + 1)
    } else if (viewConfig.view === 'week') {
      date.setDate(date.getDate() + 7)
    } else if (viewConfig.view === 'day') {
      date.setDate(date.getDate() + 1)
    }
    setCurrentDate(date.toISOString().slice(0, 10))
  }

  function goToPrev() {
    const date = new Date(viewConfig.current_date)
    if (viewConfig.view === 'month') {
      date.setMonth(date.getMonth() - 1)
    } else if (viewConfig.view === 'week') {
      date.setDate(date.getDate() - 7)
    } else if (viewConfig.view === 'day') {
      date.setDate(date.getDate() - 1)
    }
    setCurrentDate(date.toISOString().slice(0, 10))
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