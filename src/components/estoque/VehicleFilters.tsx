import { useState } from 'react'
import type { VehicleFilters as FilterType } from '../../types'
import { FiSearch, FiFilter, FiX } from 'react-icons/fi'

interface VehicleFiltersProps {
  filters: FilterType
  brands: string[]
  fuelTypes: string[]
  transmissions: string[]
  onFiltersChange: (filters: FilterType) => void
  onClear: () => void
}

export function VehicleFilters({
  filters,
  brands,
  fuelTypes,
  transmissions,
  onFiltersChange,
  onClear
}: VehicleFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleBrandChange = (brand: string) => {
    const currentBrands = filters.marca || []
    const newBrands = currentBrands.includes(brand)
      ? currentBrands.filter(b => b !== brand)
      : [...currentBrands, brand]
    onFiltersChange({ ...filters, marca: newBrands })
  }

  const handleFuelChange = (fuel: string) => {
    const currentFuels = filters.combustivel || []
    const newFuels = currentFuels.includes(fuel)
      ? currentFuels.filter(f => f !== fuel)
      : [...currentFuels, fuel]
    onFiltersChange({ ...filters, combustivel: newFuels })
  }

  const handleTransmissionChange = (transmission: string) => {
    const currentTransmissions = filters.cambio || []
    const newTransmissions = currentTransmissions.includes(transmission)
      ? currentTransmissions.filter(t => t !== transmission)
      : [...currentTransmissions, transmission]
    onFiltersChange({ ...filters, cambio: newTransmissions })
  }

  const handleSortChange = (sortBy: FilterType['sort_by']) => {
    onFiltersChange({ ...filters, sort_by: sortBy })
  }

  const hasActiveFilters = 
    filters.search ||
    (filters.marca && filters.marca.length > 0) ||
    (filters.combustivel && filters.combustivel.length > 0) ||
    (filters.cambio && filters.cambio.length > 0) ||
    filters.ano_min ||
    filters.ano_max ||
    filters.price_min ||
    filters.price_max ||
    filters.only_promotion

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      {/* Busca e ações principais */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Campo de busca */}
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por marca, modelo ou título..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Ordenação */}
        <select
          value={filters.sort_by || 'created_desc'}
          onChange={(e) => handleSortChange(e.target.value as FilterType['sort_by'])}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="created_desc">Mais recentes</option>
          <option value="created_asc">Mais antigos</option>
          <option value="price_desc">Maior preço</option>
          <option value="price_asc">Menor preço</option>
          <option value="year_desc">Ano (maior)</option>
          <option value="year_asc">Ano (menor)</option>
        </select>

        {/* Botão filtros avançados */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showAdvanced
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FiFilter size={18} />
          <span className="hidden sm:inline">Filtros</span>
        </button>

        {/* Botão limpar */}
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <FiX size={18} />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        )}
      </div>

      {/* Filtros avançados */}
      {showAdvanced && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Marcas */}
            {brands.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                  {brands.map((brand) => (
                    <label key={brand} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.marca?.includes(brand) || false}
                        onChange={() => handleBrandChange(brand)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{brand}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Combustível */}
            {fuelTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Combustível
                </label>
                <div className="space-y-2">
                  {fuelTypes.map((fuel) => (
                    <label key={fuel} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.combustivel?.includes(fuel) || false}
                        onChange={() => handleFuelChange(fuel)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{fuel}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Câmbio */}
            {transmissions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Câmbio
                </label>
                <div className="space-y-2">
                  {transmissions.map((transmission) => (
                    <label key={transmission} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.cambio?.includes(transmission) || false}
                        onChange={() => handleTransmissionChange(transmission)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{transmission}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Faixa de preço */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faixa de Preço
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Preço mínimo"
                  value={filters.price_min || ''}
                  onChange={(e) => onFiltersChange({ ...filters, price_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Preço máximo"
                  value={filters.price_max || ''}
                  onChange={(e) => onFiltersChange({ ...filters, price_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Filtros adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ano */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ano
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="De"
                  value={filters.ano_min || ''}
                  onChange={(e) => onFiltersChange({ ...filters, ano_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Até"
                  value={filters.ano_max || ''}
                  onChange={(e) => onFiltersChange({ ...filters, ano_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Quilometragem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quilometragem máxima
              </label>
              <input
                type="number"
                placeholder="Ex: 50000"
                value={filters.quilometragem_max || ''}
                onChange={(e) => onFiltersChange({ ...filters, quilometragem_max: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Apenas promoções */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outros
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.only_promotion || false}
                  onChange={(e) => onFiltersChange({ ...filters, only_promotion: e.target.checked })}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Apenas em promoção</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

