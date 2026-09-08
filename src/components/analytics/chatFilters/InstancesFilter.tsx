import { useEffect, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import type { ChatAnalyticsFilters } from '../../../types'

interface InstancesFilterProps {
  filters: ChatAnalyticsFilters
  onFiltersChange: (filters: ChatAnalyticsFilters) => void
}

interface InstanceOption {
  id: string
  name: string
  display_name?: string | null
}

export function InstancesFilter({ filters, onFiltersChange }: InstancesFilterProps) {
  const [instances, setInstances] = useState<InstanceOption[]>([])

  useEffect(() => {
    const loadInstances = async () => {
      try {
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .select('id, name, display_name')
          .order('name')

        if (error) throw error
        setInstances(data || [])
      } catch (error) {
        console.error('Erro ao carregar instâncias:', error)
      }
    }

    loadInstances()
  }, [])

  const handleToggle = (instanceId: string) => {
    const current = filters.instances || []
    const next = current.includes(instanceId)
      ? current.filter(id => id !== instanceId)
      : [...current, instanceId]

    onFiltersChange({
      ...filters,
      instances: next.length > 0 ? next : undefined
    })
  }

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!filters.instances || filters.instances.length === 0}
          onChange={() => onFiltersChange({ ...filters, instances: undefined })}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">Todas</span>
      </label>

      {instances.map(instance => (
        <label key={instance.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.instances?.includes(instance.id) || false}
            onChange={() => handleToggle(instance.id)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            {instance.display_name || instance.name}
          </span>
        </label>
      ))}
    </div>
  )
}
