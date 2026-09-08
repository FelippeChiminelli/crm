import { useEffect } from 'react'
import {
  DEFAULT_INACTIVE_HOURS,
  INACTIVE_WINDOW_OPTIONS,
  isWindowValidForPeriod
} from '../../../services/chatEngagementService'
import type { ChatAnalyticsFilters } from '../../../types'

interface InactivityFilterProps {
  filters: ChatAnalyticsFilters
  onFiltersChange: (filters: ChatAnalyticsFilters) => void
}

export function InactivityFilter({ filters, onFiltersChange }: InactivityFilterProps) {
  const selected = filters.inactiveHours ?? DEFAULT_INACTIVE_HOURS

  const options = INACTIVE_WINDOW_OPTIONS.map(option => ({
    ...option,
    enabled: isWindowValidForPeriod(option.hours, filters.period)
  }))

  // Encolher o período pode invalidar a janela escolhida. Em vez de deixar um
  // valor impossível ativo, cai para a maior janela que ainda cabe.
  useEffect(() => {
    const valid = INACTIVE_WINDOW_OPTIONS.filter(option =>
      isWindowValidForPeriod(option.hours, filters.period)
    )

    if (valid.some(option => option.hours === selected)) return

    const fallback = valid[valid.length - 1]
    if (fallback) {
      onFiltersChange({ ...filters, inactiveHours: fallback.hours })
    }
  }, [selected, filters, onFiltersChange])

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => (
        <button
          key={option.hours}
          onClick={() => onFiltersChange({ ...filters, inactiveHours: option.hours })}
          disabled={!option.enabled}
          title={
            option.enabled
              ? undefined
              : 'Esta janela exige um período de análise maior. Conversas criadas dentro do período não conseguem ficar tanto tempo em silêncio.'
          }
          className={`px-3 py-1 text-sm border rounded-lg transition-colors ${
            selected === option.hours && option.enabled
              ? 'bg-primary-50 border-primary-400 text-primary-700 font-medium'
              : 'border-gray-300 hover:bg-gray-50'
          } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
