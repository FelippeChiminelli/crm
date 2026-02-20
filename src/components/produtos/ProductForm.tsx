import { useEffect, useRef } from 'react'
import { FiX, FiUpload, FiTrash2, FiStar, FiPackage, FiTool } from 'react-icons/fi'
import { useProductForm } from '../../hooks/useProductForm'
import type { ProductCategory } from '../../types'

interface ProductFormProps {
  productId?: string
  categories: ProductCategory[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const unitOptions = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'cm', label: 'Centímetro (cm)' },
  { value: 'par', label: 'Par' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'pct', label: 'Pacote (pct)' },
]

const recurrenceOptions = [
  { value: '', label: 'Sem recorrência' },
  { value: 'unico', label: 'Único (avulso)' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]

export function ProductForm({ productId, categories, isOpen, onClose, onSuccess }: ProductFormProps) {
  const {
    formData, images, loading, uploading, errors,
    handleInputChange, resetForm, addImages,
    removeImage, setMainImage, submitCreate, submitUpdate, loadProduct,
  } = useProductForm()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditMode = !!productId

  useEffect(() => {
    if (isOpen && productId) {
      loadProduct(productId)
    } else if (isOpen && !productId) {
      resetForm()
    }
  }, [isOpen, productId, loadProduct, resetForm])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = isEditMode ? await submitUpdate(productId) : await submitCreate()
    if (result) {
      onSuccess()
      onClose()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) addImages(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 lg:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-4xl my-2 lg:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl lg:rounded-2xl max-h-[95vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between px-3 lg:px-6 py-3 lg:py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg lg:text-2xl font-bold text-gray-900">
                {isEditMode
                  ? `Editar ${formData.tipo === 'servico' ? 'Serviço' : 'Produto'}`
                  : `Novo ${formData.tipo === 'servico' ? 'Serviço' : 'Produto'}`}
              </h2>
              <button type="button" onClick={handleClose} className="p-1.5 lg:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <FiX size={20} className="lg:hidden" />
                <FiX size={24} className="hidden lg:block" />
              </button>
            </div>

            <div className="px-3 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6">
              {/* Seletor de Tipo */}
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('tipo', 'produto')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-colors text-sm lg:text-base font-medium ${
                      formData.tipo === 'produto'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <FiPackage size={18} />
                    Produto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('tipo', 'servico')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-colors text-sm lg:text-base font-medium ${
                      formData.tipo === 'servico'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <FiTool size={18} />
                    Serviço
                  </button>
                </div>
              </div>

              {/* Imagens */}
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                  Imagens {formData.tipo === 'servico' ? 'do Serviço' : 'do Produto'}
                </label>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2 lg:gap-4 mb-3 lg:mb-4">
                    {images.map((image, index) => (
                      <div key={image.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img src={image.url} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-40 lg:bg-opacity-0 lg:group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-1 lg:gap-2">
                          <button
                            type="button"
                            onClick={() => setMainImage(image.id)}
                            className={`lg:opacity-0 lg:group-hover:opacity-100 p-1.5 lg:p-2 rounded-full transition-all ${index === 0 ? 'bg-orange-500 text-white cursor-default' : 'bg-white text-orange-500 hover:bg-orange-500 hover:text-white'}`}
                            disabled={index === 0}
                          >
                            <FiStar size={14} className="lg:hidden" fill={index === 0 ? 'currentColor' : 'none'} />
                            <FiStar size={18} className="hidden lg:block" fill={index === 0 ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="lg:opacity-0 lg:group-hover:opacity-100 bg-red-500 text-white p-1.5 lg:p-2 rounded-full hover:bg-red-600 transition-all"
                          >
                            <FiTrash2 size={14} className="lg:hidden" />
                            <FiTrash2 size={18} className="hidden lg:block" />
                          </button>
                        </div>
                        {index === 0 && (
                          <div className="absolute top-1 left-1 lg:top-2 lg:left-2 bg-orange-500 text-white px-1.5 lg:px-2 py-0.5 lg:py-1 rounded text-[10px] lg:text-xs font-semibold flex items-center gap-0.5 lg:gap-1">
                            <FiStar size={10} className="lg:hidden" fill="currentColor" />
                            <FiStar size={12} className="hidden lg:block" fill="currentColor" />
                            <span className="hidden sm:inline">Principal</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 lg:py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-sm lg:text-base"
                  disabled={uploading}
                >
                  <FiUpload size={18} />
                  <span>{uploading ? 'Enviando...' : 'Adicionar Imagens'}</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
              </div>

              {/* Campos do formulário */}
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <div className="col-span-2">
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                    Nome {formData.tipo === 'servico' ? 'do Serviço' : 'do Produto'} *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    className={`w-full px-2.5 lg:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder={formData.tipo === 'servico' ? 'Ex: Consultoria Técnica' : 'Ex: Camiseta Básica'}
                    required
                  />
                  {errors.nome && <p className="mt-1 text-xs lg:text-sm text-red-600">{errors.nome}</p>}
                </div>

                <div className="col-span-2">
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => handleInputChange('descricao', e.target.value)}
                    className="w-full px-2.5 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                    placeholder={formData.tipo === 'servico' ? 'Descrição do serviço...' : 'Descrição do produto...'}
                    rows={3}
                  />
                </div>

                {formData.tipo === 'produto' && (
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">SKU / Código</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      className="w-full px-2.5 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                      placeholder="Ex: PROD-001"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={formData.categoria_id}
                    onChange={(e) => handleInputChange('categoria_id', e.target.value)}
                    className="w-full px-2.5 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => handleInputChange('marca', e.target.value)}
                    className="w-full px-2.5 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                    placeholder="Ex: Nike"
                  />
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-2.5 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    {formData.tipo === 'produto' && <option value="esgotado">Esgotado</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    value={formData.preco ?? ''}
                    onChange={(e) => handleInputChange('preco', e.target.value ? Number(e.target.value) : null)}
                    className={`w-full px-2.5 lg:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base ${errors.preco ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="99.90"
                    min="0"
                    step="0.01"
                    required
                  />
                  {errors.preco && <p className="mt-1 text-xs lg:text-sm text-red-600">{errors.preco}</p>}
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Preço Promocional</label>
                  <input
                    type="number"
                    value={formData.preco_promocional ?? ''}
                    onChange={(e) => handleInputChange('preco_promocional', e.target.value ? Number(e.target.value) : null)}
                    className={`w-full px-2.5 lg:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base ${errors.preco_promocional ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="79.90"
                    min="0"
                    step="0.01"
                  />
                  {errors.preco_promocional && <p className="mt-1 text-xs lg:text-sm text-red-600">{errors.preco_promocional}</p>}
                </div>

                {/* Campos exclusivos de Produto */}
                {formData.tipo === 'produto' && (
                  <>
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Qtd. Estoque</label>
                      <input
                        type="number"
                        value={formData.quantidade_estoque ?? ''}
                        onChange={(e) => handleInputChange('quantidade_estoque', e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-2.5 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="100"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Unidade de Medida</label>
                      <select
                        value={formData.unidade_medida}
                        onChange={(e) => handleInputChange('unidade_medida', e.target.value)}
                        className="w-full px-2.5 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                      >
                        {unitOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Campos exclusivos de Serviço */}
                {formData.tipo === 'servico' && (
                  <>
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Duração Estimada</label>
                      <input
                        type="text"
                        value={formData.duracao_estimada}
                        onChange={(e) => handleInputChange('duracao_estimada', e.target.value)}
                        className="w-full px-2.5 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="Ex: 30min, 1h, 2h"
                      />
                    </div>

                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Recorrência</label>
                      <select
                        value={formData.recorrencia}
                        onChange={(e) => handleInputChange('recorrencia', e.target.value)}
                        className="w-full px-2.5 lg:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                      >
                        {recurrenceOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 lg:gap-3 px-3 lg:px-6 py-3 lg:py-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 lg:px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base"
                disabled={loading || uploading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 lg:px-6 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                disabled={loading || uploading}
              >
                {loading || uploading ? 'Salvando...' : isEditMode ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
