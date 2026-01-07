import { useEffect, useRef } from 'react'
import { FiX, FiUpload, FiTrash2, FiStar } from 'react-icons/fi'
import { useVehicleForm } from '../../hooks/useVehicleForm'

interface VehicleFormProps {
  vehicleId?: string // Se fornecido, é modo de edição
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function VehicleForm({ vehicleId, isOpen, onClose, onSuccess }: VehicleFormProps) {
  const {
    formData,
    images,
    loading,
    uploading,
    errors,
    handleInputChange,
    resetForm,
    addImages,
    removeImage,
    setMainImage,
    submitCreate,
    submitUpdate,
    loadVehicle
  } = useVehicleForm()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditMode = !!vehicleId

  // Carregar veículo para edição
  useEffect(() => {
    if (isOpen && vehicleId) {
      loadVehicle(vehicleId)
    } else if (isOpen && !vehicleId) {
      resetForm()
    }
  }, [isOpen, vehicleId, loadVehicle, resetForm])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = isEditMode 
      ? await submitUpdate(vehicleId) 
      : await submitCreate()

    if (result) {
      onSuccess()
      onClose()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      addImages(files)
    }
    // Resetar input para permitir upload do mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Editar Veículo' : 'Novo Veículo'}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Imagens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagens do Veículo
                  </label>
                  
                  {/* Grid de imagens */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                      {images.map((image, index) => (
                        <div
                          key={image.id}
                          className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
                        >
                          <img
                            src={image.url}
                            alt={`Imagem ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setMainImage(image.id)}
                              className={`opacity-0 group-hover:opacity-100 p-2 rounded-full transition-all ${
                                index === 0
                                  ? 'bg-orange-500 text-white cursor-default'
                                  : 'bg-white text-orange-500 hover:bg-orange-500 hover:text-white'
                              }`}
                              disabled={index === 0}
                              title={index === 0 ? 'Imagem principal' : 'Marcar como principal'}
                            >
                              <FiStar size={18} fill={index === 0 ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(image.id)}
                              className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all"
                              title="Excluir imagem"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                          {index === 0 && (
                            <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                              <FiStar size={12} fill="currentColor" />
                              Principal
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botão de upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
                    disabled={uploading}
                  >
                    <FiUpload size={20} />
                    <span>{uploading ? 'Enviando...' : 'Adicionar Imagens'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    A primeira imagem será a imagem principal do veículo
                  </p>
                </div>

                {/* Grid de campos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Título */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título do Anúncio
                    </label>
                    <input
                      type="text"
                      value={formData.titulo_veiculo}
                      onChange={(e) => handleInputChange('titulo_veiculo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ex: Ford Fusion Titanium 2.0 Turbo AWD"
                    />
                  </div>

                  {/* Marca */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marca *
                    </label>
                    <input
                      type="text"
                      value={formData.marca_veiculo}
                      onChange={(e) => handleInputChange('marca_veiculo', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.marca_veiculo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ex: Ford"
                      required
                    />
                    {errors.marca_veiculo && (
                      <p className="mt-1 text-sm text-red-600">{errors.marca_veiculo}</p>
                    )}
                  </div>

                  {/* Modelo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      value={formData.modelo_veiculo}
                      onChange={(e) => handleInputChange('modelo_veiculo', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.modelo_veiculo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ex: Fusion"
                      required
                    />
                    {errors.modelo_veiculo && (
                      <p className="mt-1 text-sm text-red-600">{errors.modelo_veiculo}</p>
                    )}
                  </div>

                  {/* Ano de Fabricação */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ano de Fabricação
                    </label>
                    <input
                      type="number"
                      value={formData.ano_fabric_veiculo || ''}
                      onChange={(e) => handleInputChange('ano_fabric_veiculo', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ex: 2020"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>

                  {/* Ano do Modelo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ano do Modelo
                    </label>
                    <input
                      type="number"
                      value={formData.ano_veiculo || ''}
                      onChange={(e) => handleInputChange('ano_veiculo', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ex: 2021"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>

                  {/* Cor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor
                    </label>
                    <input
                      type="text"
                      value={formData.color_veiculo}
                      onChange={(e) => handleInputChange('color_veiculo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ex: Prata"
                    />
                  </div>

                  {/* Combustível */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Combustível
                    </label>
                    <select
                      value={formData.combustivel_veiculo}
                      onChange={(e) => handleInputChange('combustivel_veiculo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecione...</option>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Etanol">Etanol</option>
                      <option value="Flex">Flex</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Elétrico">Elétrico</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="GNV">GNV</option>
                    </select>
                  </div>

                  {/* Câmbio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Câmbio
                    </label>
                    <select
                      value={formData.cambio_veiculo}
                      onChange={(e) => handleInputChange('cambio_veiculo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecione...</option>
                      <option value="Manual">Manual</option>
                      <option value="Automático">Automático</option>
                      <option value="Automatizado">Automatizado</option>
                      <option value="CVT">CVT</option>
                    </select>
                  </div>

                  {/* Quilometragem */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quilometragem (km)
                    </label>
                    <input
                      type="number"
                      value={formData.quilometragem_veiculo || ''}
                      onChange={(e) => handleInputChange('quilometragem_veiculo', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ex: 50000"
                      min="0"
                    />
                  </div>

                  {/* Placa */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Placa
                    </label>
                    <input
                      type="text"
                      value={formData.plate_veiculo}
                      onChange={(e) => handleInputChange('plate_veiculo', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ex: ABC1D23"
                      maxLength={7}
                    />
                  </div>

                  {/* Preço */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço (R$) *
                    </label>
                    <input
                      type="number"
                      value={formData.price_veiculo || ''}
                      onChange={(e) => handleInputChange('price_veiculo', e.target.value ? Number(e.target.value) : null)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.price_veiculo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ex: 75000"
                      min="0"
                      step="0.01"
                      required
                    />
                    {errors.price_veiculo && (
                      <p className="mt-1 text-sm text-red-600">{errors.price_veiculo}</p>
                    )}
                  </div>

                  {/* Preço Promocional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço Promocional (R$)
                    </label>
                    <input
                      type="number"
                      value={formData.promotion_price || ''}
                      onChange={(e) => handleInputChange('promotion_price', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ex: 69900"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Acessórios */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Acessórios e Observações
                    </label>
                    <textarea
                      value={formData.accessories_veiculo}
                      onChange={(e) => handleInputChange('accessories_veiculo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Descreva os acessórios e características especiais do veículo..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading || uploading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || uploading}
              >
                {loading || uploading ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Veículo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

