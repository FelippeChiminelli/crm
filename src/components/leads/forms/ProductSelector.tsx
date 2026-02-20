import { useState, useEffect, useCallback } from 'react'
import { FiSearch, FiX, FiCheck, FiPackage } from 'react-icons/fi'
import { getProducts } from '../../../services/productService'
import type { Product } from '../../../types'
import { formatCurrency } from '../../../utils/validation'

interface ProductSelectorProps {
  value: string
  onChange: (value: string) => void
  empresaId: string
  disabled?: boolean
  error?: boolean
}

export function ProductSelector({
  value,
  onChange,
  empresaId,
  disabled = false,
  error = false,
}: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const selectedIds = value ? value.split(',').filter(id => id.trim()) : []

  const searchProducts = useCallback(async (term: string) => {
    if (!empresaId) return
    try {
      setLoading(true)
      const { products: data } = await getProducts(
        empresaId,
        term ? { search: term } : undefined,
        50,
        0
      )
      setProducts(data)
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  const loadSelectedProducts = useCallback(async () => {
    if (!empresaId || selectedIds.length === 0) {
      setSelectedProducts([])
      return
    }
    try {
      const { products: allProducts } = await getProducts(empresaId, undefined, 1000, 0)
      const selected = allProducts.filter(p => selectedIds.includes(p.id))
      setSelectedProducts(selected)
    } catch (err) {
      console.error('Erro ao carregar produtos selecionados:', err)
    }
  }, [empresaId, value])

  useEffect(() => { loadSelectedProducts() }, [loadSelectedProducts])

  useEffect(() => {
    if (isOpen) searchProducts(searchTerm)
  }, [isOpen, searchTerm, searchProducts])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => searchProducts(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm, isOpen, searchProducts])

  const toggleProduct = (product: Product) => {
    const isSelected = selectedIds.includes(product.id)
    const newIds = isSelected
      ? selectedIds.filter(id => id !== product.id)
      : [...selectedIds, product.id]
    onChange(newIds.join(','))
  }

  const removeProduct = (productId: string) => {
    onChange(selectedIds.filter(id => id !== productId).join(','))
  }

  const getProductImage = (product: Product): string | null => {
    if (product.images && product.images.length > 0) {
      const sorted = [...product.images].sort((a, b) => a.position - b.position)
      return sorted[0].url
    }
    return null
  }

  return (
    <div className="relative">
      {/* Produtos selecionados */}
      <div
        className={`min-h-[42px] p-2 border rounded-lg cursor-pointer transition-colors ${
          error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {selectedProducts.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
            <FiPackage size={16} />
            <span>Selecionar produtos/serviços do catálogo...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map(product => (
              <div key={product.id} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-1.5 pr-2">
                <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {getProductImage(product) ? (
                    <img src={getProductImage(product)!} alt={product.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiPackage size={16} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{product.nome}</p>
                  <p className="text-xs text-orange-600 font-semibold">
                    {product.preco ? formatCurrency(product.preco) : 'Sem preço'}
                  </p>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeProduct(product.id) }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de seleção */}
      {isOpen && !disabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Selecionar Produtos/Serviços</h3>
              <button type="button" onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nome, SKU ou marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FiPackage size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    {searchTerm ? 'Nenhum item encontrado' : 'Nenhum item no catálogo'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {products.map(product => {
                    const isSelected = selectedIds.includes(product.id)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product)}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-orange-50' : ''}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                          {isSelected && <FiCheck size={12} className="text-white" />}
                        </div>

                        <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {getProductImage(product) ? (
                            <img src={getProductImage(product)!} alt={product.nome} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiPackage size={24} className="text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.nome}</p>
                            {(product.tipo || 'produto') === 'servico' && (
                              <span className="flex-shrink-0 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded font-medium">Serviço</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {product.marca && <span>{product.marca}</span>}
                            {product.sku && <span>SKU: {product.sku}</span>}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-orange-600">
                            {product.preco ? formatCurrency(product.preco) : '-'}
                          </p>
                          {product.preco_promocional && product.preco_promocional > 0 && (
                            <p className="text-xs text-gray-400 line-through">
                              {formatCurrency(product.preco || 0)}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-600">{selectedIds.length} item(ns) selecionado(s)</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
