import { useState, useEffect } from 'react'
import { FiPackage, FiTool } from 'react-icons/fi'
import { getProducts } from '../../../services/productService'
import type { Product } from '../../../types'
import { formatCurrency } from '../../../utils/validation'

interface ProductFieldDisplayProps {
  productIds: string
  empresaId: string
}

export function ProductFieldDisplay({ productIds, empresaId }: ProductFieldDisplayProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      if (!productIds || !empresaId) {
        setProducts([])
        setLoading(false)
        return
      }

      try {
        const ids = productIds.split(',').filter(id => id.trim())
        if (ids.length === 0) {
          setProducts([])
          setLoading(false)
          return
        }

        const { products: allProducts } = await getProducts(empresaId, undefined, 1000, 0)
        const selected = allProducts.filter(p => ids.includes(p.id))
        setProducts(selected)
      } catch (err) {
        console.error('Erro ao carregar produtos:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [productIds, empresaId])

  if (loading) return <span className="text-gray-400 text-sm">Carregando...</span>
  if (products.length === 0) return <span className="text-gray-500">Nenhum item vinculado</span>

  return (
    <div className="flex flex-wrap gap-2">
      {products.map(product => {
        const image = product.images && product.images.length > 0
          ? [...product.images].sort((a, b) => a.position - b.position)[0].url
          : null
        const isService = (product.tipo || 'produto') === 'servico'

        return (
          <div
            key={product.id}
            className={`flex items-center gap-2 rounded-lg p-1.5 pr-2 ${
              isService ? 'bg-purple-50 border border-purple-200' : 'bg-orange-50 border border-orange-200'
            }`}
          >
            <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {image ? (
                <img src={image} alt={product.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {isService ? <FiTool size={14} className="text-gray-400" /> : <FiPackage size={14} className="text-gray-400" />}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{product.nome}</p>
              <p className={`text-xs font-semibold ${isService ? 'text-purple-600' : 'text-orange-600'}`}>
                {product.preco ? formatCurrency(product.preco) : '-'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
