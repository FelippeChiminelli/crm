import type { Product } from '../../types'
import { FiEdit2, FiTrash2, FiEye, FiTag, FiTool, FiPackage } from 'react-icons/fi'
import { formatCurrency } from '../../utils/validation'

interface ProductCardProps {
  product: Product
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

const statusColors: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-600',
  esgotado: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  esgotado: 'Esgotado',
}

export function ProductCard({ product, onView, onEdit, onDelete }: ProductCardProps) {
  const firstImage = product.images && product.images.length > 0
    ? product.images[0].url
    : null

  const hasPromotion = product.preco_promocional != null && product.preco_promocional > 0
  const displayPrice = hasPromotion ? product.preco_promocional : product.preco
  const isService = (product.tipo || 'produto') === 'servico'

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div
        className="relative h-40 lg:h-48 bg-gray-200 overflow-hidden group cursor-pointer"
        onClick={() => onView(product)}
      >
        {firstImage ? (
          <img
            src={firstImage}
            alt={product.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="16"%3ESem imagem%3C/text%3E%3C/svg%3E'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-sm">Sem imagem</span>
          </div>
        )}
        {hasPromotion && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md flex items-center gap-1 text-xs lg:text-sm font-semibold">
            <FiTag size={12} className="lg:hidden" />
            <FiTag size={14} className="hidden lg:block" />
            <span className="hidden sm:inline">Promoção</span>
          </div>
        )}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs">
            +{product.images.length - 1}
          </div>
        )}
      </div>

      <div className="p-3 lg:p-4">
        <h3 className="font-semibold text-sm lg:text-lg text-gray-900 mb-1 line-clamp-1">
          {product.nome}
        </h3>

        <p className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3 truncate">
          {product.marca || ''} {product.category?.nome ? `· ${product.category.nome}` : ''}
        </p>

        <div className="flex flex-wrap gap-1 lg:gap-2 mb-2 lg:mb-3">
          <span className={`px-1.5 lg:px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs rounded-md inline-flex items-center gap-1 ${
            isService ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {isService ? <FiTool size={10} /> : <FiPackage size={10} />}
            {isService ? 'Serviço' : 'Produto'}
          </span>
          <span className={`px-1.5 lg:px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs rounded-md ${statusColors[product.status] || statusColors.ativo}`}>
            {statusLabels[product.status] || 'Ativo'}
          </span>
          {!isService && product.sku && (
            <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-blue-100 text-blue-700 text-[10px] lg:text-xs rounded-md">
              {product.sku}
            </span>
          )}
          {isService ? (
            <>
              {product.duracao_estimada && (
                <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 text-gray-700 text-[10px] lg:text-xs rounded-md">
                  {product.duracao_estimada}
                </span>
              )}
              {product.recorrencia && product.recorrencia !== 'unico' && (
                <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-orange-100 text-orange-700 text-[10px] lg:text-xs rounded-md">
                  {product.recorrencia}
                </span>
              )}
            </>
          ) : (
            <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 text-gray-700 text-[10px] lg:text-xs rounded-md">
              {product.quantidade_estoque ?? 0} {product.unidade_medida || 'un'}
            </span>
          )}
        </div>

        <div className="mb-3 lg:mb-4">
          {hasPromotion && product.preco != null && (
            <p className="text-xs lg:text-sm text-gray-500 line-through">
              {formatCurrency(product.preco)}
            </p>
          )}
          <p className={`font-bold text-base lg:text-xl ${hasPromotion ? 'text-red-600' : 'text-gray-900'}`}>
            {displayPrice != null ? formatCurrency(displayPrice) : 'Preço não informado'}
          </p>
        </div>

        <div className="flex gap-1.5 lg:gap-2">
          <button
            onClick={() => onView(product)}
            className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 lg:py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-xs lg:text-sm"
          >
            <FiEye size={14} className="lg:hidden" />
            <FiEye size={16} className="hidden lg:block" />
            Ver
          </button>
          <button
            onClick={() => onEdit(product)}
            className="flex items-center justify-center px-2 lg:px-3 py-1.5 lg:py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <FiEdit2 size={14} className="lg:hidden" />
            <FiEdit2 size={16} className="hidden lg:block" />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="flex items-center justify-center px-2 lg:px-3 py-1.5 lg:py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
          >
            <FiTrash2 size={14} className="lg:hidden" />
            <FiTrash2 size={16} className="hidden lg:block" />
          </button>
        </div>
      </div>
    </div>
  )
}
