import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import type { SalesAnalyticsFilters, Pipeline } from '../../types'
import { getPipelines } from '../../services/pipelineService'
import { getLocalDateString } from '../../utils/dateHelpers'
import { supabase } from '../../services/supabaseClient'

interface SalesFilterSelectorProps {
  filters: SalesAnalyticsFilters
  onFiltersChange: (filters: SalesAnalyticsFilters) => void
}

export function SalesFilterSelector({ filters, onFiltersChange }: SalesFilterSelectorProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [responsibles, setResponsibles] = useState<any[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    try {
      // Carregar pipelines
      const { data: pipelinesData } = await getPipelines()
      setPipelines(pipelinesData || [])

      // Carregar responsáveis (usuários da empresa)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('empresa_id')
          .eq('uuid', user.id)
          .single()

        if (profile?.empresa_id) {
          const { data: users } = await supabase
            .from('profiles')
            .select('uuid, name')
            .eq('empresa_id', profile.empresa_id)
            .order('name')

          setResponsibles(users || [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar opções:', error)
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

  const handleArrayFilterChange = (key: keyof SalesAnalyticsFilters, value: string) => {
    const currentArray = (filters[key] as string[]) || []
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value]
    
    onFiltersChange({
      ...filters,
      [key]: newArray.length > 0 ? newArray : undefined
    })
  }

  // Presets de período
  const applyPreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const end = new Date()
    const start = new Date()

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(end.getDate() - 6)
        break
      case 'month':
        start.setDate(end.getDate() - 29)
        break
      case 'quarter':
        start.setDate(end.getDate() - 89)
        break
      case 'year':
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

  // Contadores de filtros ativos
  const activeFiltersCount = [
    filters.pipelines?.length || 0,
    filters.origins?.length || 0,
    filters.responsibles?.length || 0
  ].reduce((sum, count) => sum + count, 0)

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
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
        {isExpanded && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {showAdvanced ? '▲ Ocultar' : '▼ Mostrar'} filtros avançados
          </button>
        )}
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
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => applyPreset('today')}
            className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => applyPreset('week')}
            className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => applyPreset('month')}
            className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => applyPreset('quarter')}
            className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            Últimos 90 dias
          </button>
          <button
            onClick={() => applyPreset('year')}
            className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            Último ano
          </button>
        </div>

        {/* Date inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Data inicial</label>
            <input
              type="date"
              value={filters.period.start}
              onChange={(e) => handlePeriodChange('start', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Data final</label>
            <input
              type="date"
              value={filters.period.end}
              onChange={(e) => handlePeriodChange('end', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Filtros Avançados */}
      {showAdvanced && (
        <>
          {/* Vendedores/Responsáveis */}
          {responsibles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendedores / Responsáveis
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {responsibles.map((user) => (
                  <label
                    key={user.uuid}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.responsibles?.includes(user.uuid) || false}
                      onChange={() => handleArrayFilterChange('responsibles', user.uuid)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </label>
                ))}
              </div>
              {filters.responsibles && filters.responsibles.length > 0 && (
                <button
                  onClick={() => onFiltersChange({ ...filters, responsibles: undefined })}
                  className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Limpar seleção ({filters.responsibles.length})
                </button>
              )}
            </div>
          )}

          {/* Pipelines */}
          {pipelines.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pipelines
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {pipelines.map((pipeline) => (
                  <label
                    key={pipeline.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.pipelines?.includes(pipeline.id) || false}
                      onChange={() => handleArrayFilterChange('pipelines', pipeline.id)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">{pipeline.name}</span>
                  </label>
                ))}
              </div>
              {filters.pipelines && filters.pipelines.length > 0 && (
                <button
                  onClick={() => onFiltersChange({ ...filters, pipelines: undefined })}
                  className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Limpar seleção ({filters.pipelines.length})
                </button>
              )}
            </div>
          )}

          {/* Origens (texto livre) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origem
            </label>
            <input
              type="text"
              placeholder="Digite uma origem (ex: WhatsApp, Site, Indicação)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = e.currentTarget.value.trim()
                  if (value) {
                    handleArrayFilterChange('origins', value)
                    e.currentTarget.value = ''
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Pressione Enter para adicionar
            </p>
            {filters.origins && filters.origins.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {filters.origins.map((origin) => (
                  <span
                    key={origin}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded"
                  >
                    {origin}
                    <button
                      onClick={() => handleArrayFilterChange('origins', origin)}
                      className="hover:text-emerald-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
        </div>
      )}
    </div>
  )
}

