import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import type { ChatAnalyticsFilters } from '../../types'
import { supabase } from '../../services/supabaseClient'
import { getLocalDateString } from '../../utils/dateHelpers'

interface ChatFilterSelectorProps {
  filters: ChatAnalyticsFilters
  onFiltersChange: (filters: ChatAnalyticsFilters) => void
}

interface WhatsAppInstance {
  id: string
  name: string
}

export function ChatFilterSelector({ filters, onFiltersChange }: ChatFilterSelectorProps) {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    loadInstances()
  }, [])

  const loadInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('id, name')
        .order('name')

      if (error) throw error
      setInstances(data || [])
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error)
    }
  }

  const handlePeriodChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      period: {
        ...filters.period,
        [field]: value
      }
    })
  }

  const handleComparePeriodToggle = () => {
    if (filters.comparePeriod) {
      onFiltersChange({
        ...filters,
        comparePeriod: undefined
      })
    } else {
      // Criar período anterior com mesmo tamanho
      const start = new Date(filters.period.start)
      const end = new Date(filters.period.end)
      const diff = end.getTime() - start.getTime()
      
      const compareStart = new Date(start.getTime() - diff)
      const compareEnd = new Date(start.getTime() - 1)

      onFiltersChange({
        ...filters,
        comparePeriod: {
          start: getLocalDateString(compareStart),
          end: getLocalDateString(compareEnd)
        }
      })
    }
  }

  const handleInstanceToggle = (instanceId: string) => {
    const currentInstances = filters.instances || []
    const newInstances = currentInstances.includes(instanceId)
      ? currentInstances.filter(id => id !== instanceId)
      : [...currentInstances, instanceId]
    
    onFiltersChange({
      ...filters,
      instances: newInstances.length > 0 ? newInstances : undefined
    })
  }

  // Presets de período
  const applyPreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const end = new Date()
    const start = new Date()

    switch (preset) {
      case 'today':
        // Apenas hoje (0 dias atrás)
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        // Últimos 7 dias = hoje + 6 dias anteriores
        start.setDate(end.getDate() - 6)
        break
      case 'month':
        // Últimos 30 dias = hoje + 29 dias anteriores
        start.setDate(end.getDate() - 29)
        break
      case 'quarter':
        // Últimos 90 dias = hoje + 89 dias anteriores
        start.setDate(end.getDate() - 89)
        break
      case 'year':
        // Últimos 365 dias = hoje + 364 dias anteriores
        start.setDate(end.getDate() - 364)
        break
    }

    onFiltersChange({
      ...filters,
      period: {
        start: getLocalDateString(start),
        end: getLocalDateString(end)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon className="w-4 h-4" />
              Recolher filtros
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-4 h-4" />
              Expandir filtros
            </>
          )}
        </button>
      </div>

      {/* Conteúdo dos filtros */}
      {isExpanded && (
        <div className="space-y-6">

      {/* Período */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Período
        </label>
        
        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { key: 'today', label: 'Hoje' },
            { key: 'week', label: 'Últimos 7 dias' },
            { key: 'month', label: 'Último mês' },
            { key: 'quarter', label: 'Últimos 3 meses' },
            { key: 'year', label: 'Último ano' }
          ].map(preset => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset.key as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Datas customizadas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Início</label>
            <input
              type="date"
              value={filters.period.start}
              onChange={(e) => handlePeriodChange('start', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Fim</label>
            <input
              type="date"
              value={filters.period.end}
              onChange={(e) => handlePeriodChange('end', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Comparar período */}
        <div className="mt-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!filters.comparePeriod}
              onChange={handleComparePeriodToggle}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Comparar com período anterior
            </span>
          </label>
        </div>
      </div>

      {/* Instâncias WhatsApp */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instâncias WhatsApp
        </label>
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
                onChange={() => handleInstanceToggle(instance.id)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{instance.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Botão Limpar Filtros */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={() => onFiltersChange({
            period: filters.period,
            comparePeriod: undefined,
            instances: undefined
          })}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          🔄 Limpar todos os filtros
        </button>
      </div>
        </div>
      )}
    </div>
  )
}

