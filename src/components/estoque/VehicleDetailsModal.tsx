import type { Vehicle } from '../../types'
import { FiX, FiEdit2, FiTrash2, FiTag, FiCalendar, FiDollarSign } from 'react-icons/fi'
import { ImageCarousel } from './ImageCarousel'
import { formatCurrency } from '../../utils/validation'

interface VehicleDetailsModalProps {
  vehicle: Vehicle
  isOpen: boolean
  onClose: () => void
  onEdit: (vehicle: Vehicle) => void
  onDelete: (vehicle: Vehicle) => void
}

export function VehicleDetailsModal({
  vehicle,
  isOpen,
  onClose,
  onEdit,
  onDelete
}: VehicleDetailsModalProps) {
  if (!isOpen) return null

  const hasPromotion = vehicle.promotion_price && vehicle.promotion_price > 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 lg:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-6xl my-2 lg:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl lg:rounded-2xl max-h-[95vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 lg:px-6 py-3 lg:py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-lg lg:text-2xl font-bold text-gray-900 truncate pr-2">
              {vehicle.titulo_veiculo || `${vehicle.marca_veiculo} ${vehicle.modelo_veiculo}`}
            </h2>
            <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
              <button
                onClick={() => onEdit(vehicle)}
                className="p-1.5 lg:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Editar"
              >
                <FiEdit2 size={18} className="lg:hidden" />
                <FiEdit2 size={20} className="hidden lg:block" />
              </button>
              <button
                onClick={() => onDelete(vehicle)}
                className="p-1.5 lg:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir"
              >
                <FiTrash2 size={18} className="lg:hidden" />
                <FiTrash2 size={20} className="hidden lg:block" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 lg:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
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
                    <span className="font-semibold">VEÍCULO EM PROMOÇÃO</span>
                  </div>
                )}
                <ImageCarousel images={vehicle.images || []} />
              </div>

              {/* Coluna direita - Informações */}
              <div className="space-y-4 lg:space-y-6">
                {/* Preço */}
                <div className="bg-gray-50 rounded-lg p-4 lg:p-6">
                  {hasPromotion && vehicle.price_veiculo && (
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <span className="text-sm lg:text-lg line-through">{formatCurrency(vehicle.price_veiculo)}</span>
                      <span className="bg-red-500 text-white px-2 py-0.5 lg:py-1 rounded text-xs lg:text-sm font-semibold">
                        -{Math.round(((vehicle.price_veiculo - vehicle.promotion_price!) / vehicle.price_veiculo) * 100)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1 lg:gap-2">
                    <FiDollarSign size={24} className={`lg:hidden ${hasPromotion ? 'text-red-600' : 'text-gray-900'}`} />
                    <FiDollarSign size={32} className={`hidden lg:block ${hasPromotion ? 'text-red-600' : 'text-gray-900'}`} />
                    <span className={`text-2xl lg:text-4xl font-bold ${hasPromotion ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(hasPromotion ? vehicle.promotion_price! : vehicle.price_veiculo || 0)}
                    </span>
                  </div>
                </div>

                {/* Informações principais */}
                <div className="space-y-3 lg:space-y-4">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiCalendar size={18} />
                    Informações do Veículo
                  </h3>

                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                    {vehicle.marca_veiculo && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500">Marca</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{vehicle.marca_veiculo}</p>
                      </div>
                    )}

                    {vehicle.modelo_veiculo && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500">Modelo</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{vehicle.modelo_veiculo}</p>
                      </div>
                    )}

                    {vehicle.ano_fabric_veiculo && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500">Ano Fab.</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{vehicle.ano_fabric_veiculo}</p>
                      </div>
                    )}

                    {vehicle.ano_veiculo && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500">Ano Mod.</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{vehicle.ano_veiculo}</p>
                      </div>
                    )}

                    {vehicle.color_veiculo && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500">Cor</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{vehicle.color_veiculo}</p>
                      </div>
                    )}

                    {vehicle.combustivel_veiculo && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500">Combustível</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{vehicle.combustivel_veiculo}</p>
                      </div>
                    )}

                    {vehicle.cambio_veiculo && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500">Câmbio</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{vehicle.cambio_veiculo}</p>
                      </div>
                    )}

                    {vehicle.quilometragem_veiculo && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500">KM</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">
                          {vehicle.quilometragem_veiculo.toLocaleString('pt-BR')} km
                        </p>
                      </div>
                    )}

                    {vehicle.plate_veiculo && (
                      <div>
                        <p className="text-xs lg:text-sm text-gray-500">Placa</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{vehicle.plate_veiculo}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acessórios */}
                {vehicle.accessories_veiculo && (
                  <div className="space-y-2">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900">Acessórios</h3>
                    <p className="text-gray-700 whitespace-pre-line text-sm lg:text-base">{vehicle.accessories_veiculo}</p>
                  </div>
                )}

                {/* Data de cadastro */}
                <div className="pt-3 lg:pt-4 border-t border-gray-200">
                  <p className="text-xs lg:text-sm text-gray-500">
                    Cadastrado em {new Date(vehicle.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 lg:gap-3 px-3 lg:px-6 py-3 lg:py-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
            <button
              onClick={onClose}
              className="px-3 lg:px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base"
            >
              Fechar
            </button>
            <button
              onClick={() => onEdit(vehicle)}
              className="px-3 lg:px-6 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors text-sm lg:text-base"
            >
              <span className="hidden sm:inline">Editar Veículo</span>
              <span className="sm:hidden">Editar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

