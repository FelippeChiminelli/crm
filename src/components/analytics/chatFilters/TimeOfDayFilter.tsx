import type { ChatAnalyticsFilters } from '../../../types'

interface TimeOfDayFilterProps {
  filters: ChatAnalyticsFilters
  onFiltersChange: (filters: ChatAnalyticsFilters) => void
}

const PRESETS = [
  { label: 'Manhã (8h-12h)', start: '08:00', end: '12:00' },
  { label: 'Tarde (12h-18h)', start: '12:00', end: '18:00' },
  { label: 'Noite (18h-00h)', start: '18:00', end: '23:59' },
  { label: 'Comercial (8h-18h)', start: '08:00', end: '18:00' },
  { label: 'Dia todo', start: '00:00', end: '23:59' }
]

export function TimeOfDayFilter({ filters, onFiltersChange }: TimeOfDayFilterProps) {
  const handleChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      timeRange: {
        start: field === 'start' ? value : filters.timeRange?.start || '00:00',
        end: field === 'end' ? value : filters.timeRange?.end || '23:59'
      }
    })
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">A partir de</label>
          <input
            type="time"
            value={filters.timeRange?.start || ''}
            onChange={e => handleChange('start', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Até</label>
          <input
            type="time"
            value={filters.timeRange?.end || ''}
            onChange={e => handleChange('end', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {PRESETS.map(preset => (
          <button
            key={preset.label}
            onClick={() =>
              onFiltersChange({
                ...filters,
                timeRange: { start: preset.start, end: preset.end }
              })
            }
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {filters.timeRange && (
        <button
          onClick={() => onFiltersChange({ ...filters, timeRange: undefined })}
          className="mt-3 text-xs text-red-600 hover:text-red-700"
        >
          Limpar recorte de horário
        </button>
      )}
    </>
  )
}
