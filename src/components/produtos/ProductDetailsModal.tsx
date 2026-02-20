import type { Product } from '../../types'
import { FiX, FiEdit2, FiTrash2, FiTag, FiDollarSign, FiPackage, FiTool, FiClock, FiRepeat } from 'react-icons/fi'
import { formatCurrency } from '../../utils/validation'

interface ProductDetailsModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

const statusLabels: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  esgotado: 'Esgotado',
}

const statusColors: Record<string, string> = {
  ativo: 'bg-green-100 text-green-800',
  inativo: 'bg-gray-100 text-gray-600',
  esgotado: 'bg-red-100 text-red-800',
}

export function ProductDetailsModal({ product, isOpen, onClose, onEdit, onDelete }: ProductDetailsModalProps) {
  if (!isOpen) return null

  const hasPromotion = product.preco_promocional != null && product.preco_promocional > 0
  const images = product.images || []
  const isService = (product.tipo || 'produto') === 'servico'
  const itemLabel = isService ? 'Serviço' : 'Produto'

  const recurrenceLabels: Record<string, string> = {
    unico: 'Único (avulso)',
    semanal: 'Semanal',
    quinzenal: 'Quinzenal',
    mensal: 'Mensal',
    bimestral: 'Bimestral',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 lg:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-5xl my-2 lg:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl lg:rounded-2xl max-h-[95vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 lg:px-6 py-3 lg:py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-lg lg:text-2xl font-bold text-gray-900 truncate pr-2">{product.nome}</h2>
            <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
              <button onClick={() => onEdit(product)} className="p-1.5 lg:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                <FiEdit2 size={18} className="lg:hidden" />
                <FiEdit2 size={20} className="hidden lg:block" />
              </button>
              <button onClick={() => onDelete(product)} className="p-1.5 lg:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                <FiTrash2 size={18} className="lg:hidden" />
                <FiTrash2 size={20} className="hidden lg:block" />
              </button>
              <button onClick={onClose} className="p-1.5 lg:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <FiX size={20} className="lg:hidden" />
                <FiX size={24} className="hidden lg:block" />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="px-3 lg:px-6 py-4 lg:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
              {/* Coluna esquerda - Imagens */}
              <div>
                {hasPromotion && (
                  <div className="flex items-center gap-2 bg-red-500 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg mb-3 lg:mb-4 text-sm lg:text-base">
                    <FiTag size={16} className="lg:hidden" />
                    <FiTag size={20} className="hidden lg:block" />
                    <span className="font-semibold">{isService ? 'SERVIÇO' : 'PRODUTO'} EM PROMOÇÃO</span>
                  </div>
                )}

                {images.length > 0 ? (
                  <div className="space-y-2">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img src={images[0].url} alt={product.nome} className="w-full h-full object-cover" />
                    </div>
                    {images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {images.slice(1, 5).map((img, i) => (
                          <div key={img.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img src={img.url} alt={`${product.nome} ${i + 2}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <FiPackage size={48} className="text-gray-300" />
                  </div>
                )}
              </div>

              {/* Coluna direita - Informações */}
              <div className="space-y-4 lg:space-y-6">
                {/* Preço */}
                <div className="bg-gray-50 rounded-lg p-4 lg:p-6">
                  {hasPromotion && product.preco != null && (
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <span className="text-sm lg:text-lg line-through">{formatCurrency(product.preco)}</span>
                      <span className="bg-red-500 text-white px-2 py-0.5 lg:py-1 rounded text-xs lg:text-sm font-semibold">
                        -{Math.round(((product.preco - product.preco_promocional!) / product.preco) * 100)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1 lg:gap-2">
                    <FiDollarSign size={24} className={`lg:hidden ${hasPromotion ? 'text-red-600' : 'text-gray-900'}`} />
                    <FiDollarSign size={32} className={`hidden lg:block ${hasPromotion ? 'text-red-600' : 'text-gray-900'}`} />
                    <span className={`text-2xl lg:text-4xl font-bold ${hasPromotion ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(hasPromotion ? product.preco_promocional! : product.preco || 0)}
                    </span>
                  </div>
                </div>

                {/* Informações principais */}
                <div className="space-y-3 lg:space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900">Informações do {itemLabel}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      isService ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {isService ? <FiTool size={12} /> : <FiPackage size={12} />}
                      {itemLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                    {!isService && product.sku && (
                      <div><p className="text-xs lg:text-sm text-gray-500">SKU</p><p className="font-semibold text-gray-900 text-sm lg:text-base">{product.sku}</p></div>
                    )}
                    {product.category && (
                      <div><p className="text-xs lg:text-sm text-gray-500">Categoria</p><p className="font-semibold text-gray-900 text-sm lg:text-base">{product.category.nome}</p></div>
                    )}
                    {product.marca && (
                      <div><p className="text-xs lg:text-sm text-gray-500">Marca</p><p className="font-semibold text-gray-900 text-sm lg:text-base">{product.marca}</p></div>
                    )}
                    <div>
                      <p className="text-xs lg:text-sm text-gray-500">Status</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs lg:text-sm font-medium ${statusColors[product.status] || statusColors.ativo}`}>
                        {statusLabels[product.status] || 'Ativo'}
                      </span>
                    </div>
                    {!isService && (
                      <>
                        <div>
                          <p className="text-xs lg:text-sm text-gray-500">Estoque</p>
                          <p className="font-semibold text-gray-900 text-sm lg:text-base">
                            {product.quantidade_estoque ?? 0} {product.unidade_medida || 'un'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs lg:text-sm text-gray-500">Unidade</p>
                          <p className="font-semibold text-gray-900 text-sm lg:text-base">{product.unidade_medida || 'un'}</p>
                        </div>
                      </>
                    )}
                    {isService && product.duracao_estimada && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500 flex items-center gap-1"><FiClock size={12} /> Duração Estimada</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{product.duracao_estimada}</p>
                      </div>
                    )}
                    {isService && product.recorrencia && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500 flex items-center gap-1"><FiRepeat size={12} /> Recorrência</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{recurrenceLabels[product.recorrencia] || product.recorrencia}</p>
                      </div>
                    )}
                  </div>
                </div>

                {product.descricao && (
                  <div className="space-y-2">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900">Descrição</h3>
                    <p className="text-gray-700 whitespace-pre-line text-sm lg:text-base">{product.descricao}</p>
                  </div>
                )}

                <div className="pt-3 lg:pt-4 border-t border-gray-200">
                  <p className="text-xs lg:text-sm text-gray-500">
                    Cadastrado em {new Date(product.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 lg:gap-3 px-3 lg:px-6 py-3 lg:py-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
            <button onClick={onClose} className="px-3 lg:px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base">
              Fechar
            </button>
            <button onClick={() => onEdit(product)} className="px-3 lg:px-6 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors text-sm lg:text-base">
              <span className="hidden sm:inline">Editar {itemLabel}</span>
              <span className="sm:hidden">Editar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
