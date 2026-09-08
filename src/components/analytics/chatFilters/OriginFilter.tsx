import { useEffect, useMemo, useState } from 'react'
import { getAllLeadOrigins } from '../../../services/leadService'
import { groupOrigins, isGroupSelected, toggleGroup } from './originGrouping'
import type { ChatAnalyticsFilters } from '../../../types'

interface OriginFilterProps {
  filters: ChatAnalyticsFilters
  onFiltersChange: (filters: ChatAnalyticsFilters) => void
}

export function OriginFilter({ filters, onFiltersChange }: OriginFilterProps) {
  const [origins, setOrigins] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrigins = async () => {
      try {
        setOrigins(await getAllLeadOrigins())
      } catch (error) {
        console.error('Erro ao carregar origens:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrigins()
  }, [])

  const groups = useMemo(() => groupOrigins(origins), [origins])

  const handleToggle = (groupKey: string) => {
    const group = groups.find(item => item.key === groupKey)
    if (!group) return

    const next = toggleGroup(group, filters.origins)
    onFiltersChange({ ...filters, origins: next.length > 0 ? next : undefined })
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Carregando origens...</p>
  }

  if (groups.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma origem cadastrada nos leads.</p>
  }

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!filters.origins || filters.origins.length === 0}
          onChange={() => onFiltersChange({ ...filters, origins: undefined })}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">Todas</span>
      </label>

      {groups.map(group => (
        <label
          key={group.key}
          className="flex items-center gap-2"
          title={
            group.variants.length > 1
              ? `Inclui as grafias: ${group.variants.join(', ')}`
              : undefined
          }
        >
          <input
            type="checkbox"
            checked={isGroupSelected(group, filters.origins)}
            onChange={() => handleToggle(group.key)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            {group.label}
            {group.variants.length > 1 && (
              <span className="text-xs text-gray-400 ml-1">
                ({group.variants.length} grafias)
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  )
}
