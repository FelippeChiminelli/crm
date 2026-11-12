import type { AutomationScheduleWindow } from '../../../../types'

export const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
]

export const DEFAULT_SCHEDULE_WINDOW: AutomationScheduleWindow = {
  start: '08:00',
  end: '20:00',
  days: [1, 2, 3, 4, 5],
  timezone: 'America/Sao_Paulo',
}

/** Sem janela é válido (roda a qualquer hora); com janela exige início < fim e ao menos um dia. */
export function isScheduleWindowValid(schedule?: AutomationScheduleWindow): boolean {
  if (!schedule) return true
  return !!schedule.start && !!schedule.end && schedule.start < schedule.end && schedule.days.length > 0
}

/** Resumo para a lista de regras, ex.: "Seg–Sex, 08:00–20:00". */
export function formatScheduleWindow(schedule?: AutomationScheduleWindow): string | null {
  if (!schedule) return null
  const days = [...schedule.days].sort((a, b) => a - b)
  const isRange = days.length > 2 && days.every((day, i) => i === 0 || day === days[i - 1] + 1)
  const label = (day: number) => WEEKDAYS[day]?.label || String(day)
  const daysText = days.length === 7
    ? 'Todos os dias'
    : isRange
      ? `${label(days[0])}–${label(days[days.length - 1])}`
      : days.map(label).join(', ')
  return `${daysText}, ${schedule.start}–${schedule.end}`
}
