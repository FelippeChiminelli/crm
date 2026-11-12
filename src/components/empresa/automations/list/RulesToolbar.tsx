import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { TRIGGER_GROUPS } from '../triggers'
import type { TriggerGroup } from '../triggers'

export type StatusFilter = 'all' | 'active' | 'inactive'

export interface RulesFilters {
  search: string
  group: TriggerGroup | 'all'
  status: StatusFilter
}

interface RulesToolbarProps {
  filters: RulesFilters
  onChange: (next: RulesFilters) => void
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'inactive', label: 'Inativas' },
]

const chipClass = (selected: boolean) =>
  `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
    selected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }`

export function RulesToolbar({ filters, onChange }: RulesToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="Buscar automação pelo nome"
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {STATUS_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...filters, status: option.value })}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filters.status === option.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chipClass(filters.group === 'all')} onClick={() => onChange({ ...filters, group: 'all' })}>
          Todos os gatilhos
        </button>
        {TRIGGER_GROUPS.map(group => (
          <button
            key={group.value}
            type="button"
            className={chipClass(filters.group === group.value)}
            onClick={() => onChange({ ...filters, group: group.value })}
          >
            {group.label}
          </button>
        ))}
      </div>
    </div>
  )
}
