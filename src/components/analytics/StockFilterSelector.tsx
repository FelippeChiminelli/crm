import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import type { StockAnalyticsFilters, ProductCategory } from '../../types'
import { getUniqueBrands } from '../../services/productService'
import { getCategories } from '../../services/productCategoryService'
import { getLocalDateString } from '../../utils/dateHelpers'
import { supabase } from '../../services/supabaseClient'

interface StockFilterSelectorProps {
  filters: StockAnalyticsFilters
  onFiltersChange: (filters: StockAnalyticsFilters) => void
}

export function StockFilterSelector({ filters, onFiltersChange }: StockFilterSelectorProps) {
  const [brands, setBrands] = useState<string[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('uuid', user.id)
        .single()

      if (!profile?.empresa_id) return

      const [brandsData, categoriesData] = await Promise.all([
        getUniqueBrands(profile.empresa_id),
        getCategories(profile.empresa_id),
      ])
      setBrands(brandsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Erro ao carregar opções de filtros de estoque:', error)
    }
  }

  const handlePeriodChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      period: { ...filters.period, [field]: value },
    })
  }

  const toggleArrayFilter = (
    key: 'categoria_ids' | 'marcas' | 'tipos',
    value: string
  ) => {
    const currentArray = (filters[key] as string[]) || []
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value]

    onFiltersChange({
      ...filters,
      [key]: newArray.length > 0 ? newArray : undefined,
    })
  }

  const applyPreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const end = new Date()
    const start = new Date()

    switch (preset) {
      case 'today': start.setHours(0, 0, 0, 0); break
      case 'week': start.setDate(end.getDate() - 6); break
      case 'month': start.setDate(end.getDate() - 29); break
      case 'quarter': start.setDate(end.getDate() - 89); break
      case 'year': start.setDate(end.getDate() - 364); break
    }

    onFiltersChange({
      ...filters,
      period: { start: getLocalDateString(start), end: getLocalDateString(end) },
    })
  }

  const activeFiltersCount = [
    filters.categoria_ids?.length || 0,
    filters.marcas?.length || 0,
    filters.tipos?.length || 0,
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          {isExpanded ? (
            <><ChevronUpIcon className="w-4 h-4" />Recolher filtros</>
          ) : (
            <><ChevronDownIcon className="w-4 h-4" />Expandir filtros</>
          )}
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
        {isExpanded && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            {showAdvanced ? '▲ Ocultar' : '▼ Mostrar'} filtros avançados
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>

            <div className="mb-3 flex flex-wrap gap-2">
              <button onClick={() => applyPreset('today')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors">Hoje</button>
              <button onClick={() => applyPreset('week')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors">Últimos 7 dias</button>
              <button onClick={() => applyPreset('month')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors">Últimos 30 dias</button>
              <button onClick={() => applyPreset('quarter')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors">Últimos 90 dias</button>
              <button onClick={() => applyPreset('year')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors">Último ano</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data inicial</label>
                <input
                  type="date"
                  value={filters.period.start}
                  onChange={(e) => handlePeriodChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data final</label>
                <input
                  type="date"
                  value={filters.period.end}
                  onChange={(e) => handlePeriodChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Filtros avançados */}
          {showAdvanced && (
            <>
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <div className="flex gap-2">
                  {(['produto', 'servico'] as const).map(tipo => {
                    const checked = filters.tipos?.includes(tipo) || false
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => toggleArrayFilter('tipos', tipo)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          checked
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {tipo === 'produto' ? 'Produtos' : 'Serviços'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Categorias */}
              {categories.length > 0 && (
                <FilterCheckboxList
                  label="Categorias"
                  values={categories.map(c => ({ id: c.id, name: c.nome }))}
                  selected={filters.categoria_ids || []}
                  onToggle={(id) => toggleArrayFilter('categoria_ids', id)}
                  onClear={() => onFiltersChange({ ...filters, categoria_ids: undefined })}
                />
              )}

              {/* Marcas */}
              {brands.length > 0 && (
                <FilterCheckboxList
                  label="Marcas"
                  values={brands.map(b => ({ id: b, name: b }))}
                  selected={filters.marcas || []}
                  onToggle={(id) => toggleArrayFilter('marcas', id)}
                  onClear={() => onFiltersChange({ ...filters, marcas: undefined })}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface FilterCheckboxListProps {
  label: string
  values: { id: string; name: string }[]
  selected: string[]
  onToggle: (id: string) => void
  onClear: () => void
}

function FilterCheckboxList({ label, values, selected, onToggle, onClear }: FilterCheckboxListProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
        {values.map(v => (
          <label key={v.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(v.id)}
              onChange={() => onToggle(v.id)}
              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">{v.name}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <button
          onClick={onClear}
          className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium"
        >
          Limpar seleção ({selected.length})
        </button>
      )}
    </div>
  )
}
