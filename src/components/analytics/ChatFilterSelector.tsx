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

  const handleTimeRangeChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      timeRange: {
        start: field === 'start' ? value : (filters.timeRange?.start || '00:00'),
        end: field === 'end' ? value : (filters.timeRange?.end || '23:59')
      }
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

      {/* Filtro de Horário */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Filtrar por Horário
        </label>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-700 mb-1 font-medium">
                  Horário Início
                </label>
                <input
                  type="time"
                  value={filters.timeRange?.start || ''}
                  onChange={(e) => handleTimeRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="00:00"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1 font-medium">
                  Horário Fim
                </label>
                <input
                  type="time"
                  value={filters.timeRange?.end || ''}
                  onChange={(e) => handleTimeRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="23:59"
                />
              </div>
            </div>
            
            {/* Presets de horário */}
            <div className="mt-3 pt-3 border-t border-green-200">
              <label className="block text-xs text-gray-600 mb-2">Períodos comuns:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      timeRange: { start: '08:00', end: '12:00' }
                    })
                  }}
                  className="px-2 py-1 text-xs bg-white border border-green-300 rounded hover:bg-green-50"
                >
                  Manhã (8h-12h)
                </button>
                <button
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      timeRange: { start: '12:00', end: '18:00' }
                    })
                  }}
                  className="px-2 py-1 text-xs bg-white border border-green-300 rounded hover:bg-green-50"
                >
                  Tarde (12h-18h)
                </button>
                <button
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      timeRange: { start: '18:00', end: '23:59' }
                    })
                  }}
                  className="px-2 py-1 text-xs bg-white border border-green-300 rounded hover:bg-green-50"
                >
                  Noite (18h-00h)
                </button>
                <button
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      timeRange: { start: '08:00', end: '18:00' }
                    })
                  }}
                  className="px-2 py-1 text-xs bg-white border border-green-300 rounded hover:bg-green-50"
                >
                  Comercial (8h-18h)
                </button>
                <button
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      timeRange: { start: '00:00', end: '23:59' }
                    })
                  }}
                  className="px-2 py-1 text-xs bg-white border border-green-300 rounded hover:bg-green-50 font-medium"
                >
                  24h (Dia Todo)
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-green-700 bg-green-100 p-2 rounded">
              <span className="font-medium">💡 Dica:</span> {filters.timeRange ? 'O filtro está ativo e considera apenas mensagens/conversas dentro deste intervalo de horário.' : 'Preencha os horários para ativar o filtro.'}
            </div>

            {/* Critério de Filtro */}
            <div className="mt-4 pt-4 border-t border-green-200">
              <label className="block text-xs text-gray-700 mb-2 font-medium">
                📊 Aplicar filtro de horário em:
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="filterBy"
                    value="messages"
                    checked={!filters.filterBy || filters.filterBy === 'messages'}
                    onChange={() => onFiltersChange({ ...filters, filterBy: 'messages' })}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <div className="text-sm text-gray-900 font-medium">Horário das mensagens</div>
                    <div className="text-xs text-gray-600">Considera quando as mensagens foram enviadas/recebidas</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="filterBy"
                    value="lead_transfer"
                    checked={filters.filterBy === 'lead_transfer'}
                    onChange={() => onFiltersChange({ ...filters, filterBy: 'lead_transfer' })}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <div className="text-sm text-gray-900 font-medium">Horário da transferência do lead</div>
                    <div className="text-xs text-gray-600">Considera quando o lead foi transferido de pipeline</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Botão para limpar filtro de horário */}
            <div className="mt-3 pt-3 border-t border-green-200">
              <button
                onClick={() => onFiltersChange({ ...filters, timeRange: undefined })}
                className="w-full px-3 py-2 text-sm bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
              >
                🗑️ Limpar Filtro de Horário
              </button>
            </div>
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
            instances: undefined,
            timeRange: undefined
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

