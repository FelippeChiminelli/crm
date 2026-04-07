import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import type { LeadAnalyticsFilters, Pipeline } from '../../types'
import { getPipelines } from '../../services/pipelineService'
import { getAllLeadOrigins } from '../../services/leadService'
import { getLocalDateString } from '../../utils/dateHelpers'

interface LeadFilterSelectorProps {
  filters: LeadAnalyticsFilters
  onFiltersChange: (filters: LeadAnalyticsFilters) => void
}

export function LeadFilterSelector({ filters, onFiltersChange }: LeadFilterSelectorProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [origins, setOrigins] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    try {
      const [pipelinesResult, originsResult] = await Promise.all([
        getPipelines(),
        getAllLeadOrigins()
      ])
      setPipelines(pipelinesResult.data || [])
      setOrigins(originsResult || [])
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

  const handleArrayFilterChange = (key: keyof LeadAnalyticsFilters, value: string) => {
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
        {isExpanded && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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

      {/* Filtros Básicos */}
      <div>
        {/* Pipelines */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pipelines
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!filters.pipelines || filters.pipelines.length === 0}
                onChange={() => onFiltersChange({ ...filters, pipelines: undefined })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Todos</span>
            </label>
            {pipelines.map(pipeline => (
              <label key={pipeline.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.pipelines?.includes(pipeline.id) || false}
                  onChange={() => handleArrayFilterChange('pipelines', pipeline.id)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{pipeline.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros Avançados */}
      {showAdvanced && (
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="space-y-2">
                {['quente', 'morno', 'frio'].map(status => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(status) || false}
                      onChange={() => handleArrayFilterChange('status', status)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Origem */}
            {origins.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Origem
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {origins.map((origin) => (
                    <label
                      key={origin}
                      className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.origins?.includes(origin) || false}
                        onChange={() => handleArrayFilterChange('origins', origin)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{origin}</span>
                    </label>
                  ))}
                </div>
                {filters.origins && filters.origins.length > 0 && (
                  <button
                    onClick={() => onFiltersChange({ ...filters, origins: undefined })}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Limpar seleção ({filters.origins.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão Limpar Filtros */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={() => onFiltersChange({
            period: filters.period,
            comparePeriod: undefined
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

