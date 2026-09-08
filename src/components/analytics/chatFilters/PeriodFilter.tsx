import type { ChatAnalyticsFilters } from '../../../types'
import { getLocalDateString } from '../../../utils/dateHelpers'

interface PeriodFilterProps {
  filters: ChatAnalyticsFilters
  onFiltersChange: (filters: ChatAnalyticsFilters) => void
}

type PresetKey = 'today' | 'week' | 'month' | 'quarter' | 'year'

const PRESETS: { key: PresetKey; label: string; daysBack: number }[] = [
  { key: 'today', label: 'Hoje', daysBack: 0 },
  { key: 'week', label: 'Últimos 7 dias', daysBack: 6 },
  { key: 'month', label: 'Último mês', daysBack: 29 },
  { key: 'quarter', label: 'Últimos 3 meses', daysBack: 89 },
  { key: 'year', label: 'Último ano', daysBack: 364 }
]

export function PeriodFilter({ filters, onFiltersChange }: PeriodFilterProps) {
  const handlePeriodChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      period: { ...filters.period, [field]: value }
    })
  }

  const applyPreset = (daysBack: number) => {
    const end = new Date()
    const start = new Date()

    if (daysBack === 0) {
      start.setHours(0, 0, 0, 0)
    } else {
      start.setDate(end.getDate() - daysBack)
    }

    onFiltersChange({
      ...filters,
      period: {
        start: getLocalDateString(start),
        end: getLocalDateString(end)
      }
    })
  }

  const handleComparePeriodToggle = () => {
    if (filters.comparePeriod) {
      onFiltersChange({ ...filters, comparePeriod: undefined })
      return
    }

    // Cria um período anterior com a mesma duração
    const start = new Date(filters.period.start)
    const end = new Date(filters.period.end)
    const diff = end.getTime() - start.getTime()

    onFiltersChange({
      ...filters,
      comparePeriod: {
        start: getLocalDateString(new Date(start.getTime() - diff)),
        end: getLocalDateString(new Date(start.getTime() - 1))
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map(preset => (
          <button
            key={preset.key}
            onClick={() => applyPreset(preset.daysBack)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Data Início</label>
          <input
            type="date"
            value={filters.period.start}
            onChange={e => handlePeriodChange('start', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Data Fim</label>
          <input
            type="date"
            value={filters.period.end}
            onChange={e => handlePeriodChange('end', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 mt-3">
        <input
          type="checkbox"
          checked={!!filters.comparePeriod}
          onChange={handleComparePeriodToggle}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">Comparar com período anterior</span>
      </label>
    </>
  )
}
