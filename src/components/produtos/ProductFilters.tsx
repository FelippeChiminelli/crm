import { useState } from 'react'
import type { ProductFilters as FilterType, ProductCategory, ProductStatus } from '../../types'
import { FiSearch, FiFilter, FiX } from 'react-icons/fi'

interface ProductFiltersProps {
  filters: FilterType
  brands: string[]
  categories: ProductCategory[]
  onFiltersChange: (filters: FilterType) => void
  onClear: () => void
}

const statusOptions: { value: ProductStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'esgotado', label: 'Esgotado' },
]

export function ProductFilters({
  filters,
  brands,
  categories,
  onFiltersChange,
  onClear,
}: ProductFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleBrandChange = (brand: string) => {
    const current = filters.marca || []
    const next = current.includes(brand) ? current.filter(b => b !== brand) : [...current, brand]
    onFiltersChange({ ...filters, marca: next })
  }

  const handleStatusChange = (status: ProductStatus) => {
    const current = filters.status || []
    const next = current.includes(status) ? current.filter(s => s !== status) : [...current, status]
    onFiltersChange({ ...filters, status: next })
  }

  const handleSortChange = (sortBy: FilterType['sort_by']) => {
    onFiltersChange({ ...filters, sort_by: sortBy })
  }

  const hasActiveFilters =
    filters.search ||
    filters.tipo ||
    (filters.marca && filters.marca.length > 0) ||
    (filters.status && filters.status.length > 0) ||
    filters.categoria_id ||
    filters.preco_min != null ||
    filters.preco_max != null ||
    filters.only_promotion

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, SKU, marca..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <select
          value={filters.tipo || ''}
          onChange={(e) => onFiltersChange({ ...filters, tipo: (e.target.value || undefined) as FilterType['tipo'] })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Todos os tipos</option>
          <option value="produto">Produtos</option>
          <option value="servico">Serviços</option>
        </select>

        <select
          value={filters.sort_by || 'created_desc'}
          onChange={(e) => handleSortChange(e.target.value as FilterType['sort_by'])}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="created_desc">Mais recentes</option>
          <option value="created_asc">Mais antigos</option>
          <option value="preco_desc">Maior preço</option>
          <option value="preco_asc">Menor preço</option>
          <option value="nome_asc">Nome A-Z</option>
          <option value="nome_desc">Nome Z-A</option>
          <option value="estoque_asc">Menor estoque</option>
          <option value="estoque_desc">Maior estoque</option>
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showAdvanced ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FiFilter size={18} />
          <span className="hidden sm:inline">Filtros</span>
        </button>

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

      {showAdvanced && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select
                  value={filters.categoria_id || ''}
                  onChange={(e) => onFiltersChange({ ...filters, categoria_id: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {brands.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="space-y-2">
                {statusOptions.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(value) || false}
                      onChange={() => handleStatusChange(value)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Faixa de Preço</label>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Preço mínimo"
                  value={filters.preco_min ?? ''}
                  onChange={(e) => onFiltersChange({ ...filters, preco_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Preço máximo"
                  value={filters.preco_max ?? ''}
                  onChange={(e) => onFiltersChange({ ...filters, preco_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
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
      )}
    </div>
  )
}
