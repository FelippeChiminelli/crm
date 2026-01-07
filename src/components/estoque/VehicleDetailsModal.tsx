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
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {vehicle.titulo_veiculo || `${vehicle.marca_veiculo} ${vehicle.modelo_veiculo}`}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(vehicle)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Editar"
              >
                <FiEdit2 size={20} />
              </button>
              <button
                onClick={() => onDelete(vehicle)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir"
              >
                <FiTrash2 size={20} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Coluna esquerda - Imagens */}
              <div>
                {hasPromotion && (
                  <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg mb-4">
                    <FiTag size={20} />
                    <span className="font-semibold">VEÍCULO EM PROMOÇÃO</span>
                  </div>
                )}
                <ImageCarousel images={vehicle.images || []} />
              </div>

              {/* Coluna direita - Informações */}
              <div className="space-y-6">
                {/* Preço */}
                <div className="bg-gray-50 rounded-lg p-6">
                  {hasPromotion && vehicle.price_veiculo && (
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <span className="text-lg line-through">{formatCurrency(vehicle.price_veiculo)}</span>
                      <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                        -{Math.round(((vehicle.price_veiculo - vehicle.promotion_price!) / vehicle.price_veiculo) * 100)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <FiDollarSign size={32} className={hasPromotion ? 'text-red-600' : 'text-gray-900'} />
                    <span className={`text-4xl font-bold ${hasPromotion ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(hasPromotion ? vehicle.promotion_price! : vehicle.price_veiculo || 0)}
                    </span>
                  </div>
                </div>

                {/* Informações principais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiCalendar />
                    Informações do Veículo
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {vehicle.marca_veiculo && (
                      <div>
                        <p className="text-sm text-gray-500">Marca</p>
                        <p className="font-semibold text-gray-900">{vehicle.marca_veiculo}</p>
                      </div>
                    )}

                    {vehicle.modelo_veiculo && (
                      <div>
                        <p className="text-sm text-gray-500">Modelo</p>
                        <p className="font-semibold text-gray-900">{vehicle.modelo_veiculo}</p>
                      </div>
                    )}

                    {vehicle.ano_fabric_veiculo && (
                      <div>
                        <p className="text-sm text-gray-500">Ano de Fabricação</p>
                        <p className="font-semibold text-gray-900">{vehicle.ano_fabric_veiculo}</p>
                      </div>
                    )}

                    {vehicle.ano_veiculo && (
                      <div>
                        <p className="text-sm text-gray-500">Ano do Modelo</p>
                        <p className="font-semibold text-gray-900">{vehicle.ano_veiculo}</p>
                      </div>
                    )}

                    {vehicle.color_veiculo && (
                      <div>
                        <p className="text-sm text-gray-500">Cor</p>
                        <p className="font-semibold text-gray-900">{vehicle.color_veiculo}</p>
                      </div>
                    )}

                    {vehicle.combustivel_veiculo && (
                      <div>
                        <p className="text-sm text-gray-500">Combustível</p>
                        <p className="font-semibold text-gray-900">{vehicle.combustivel_veiculo}</p>
                      </div>
                    )}

                    {vehicle.cambio_veiculo && (
                      <div>
                        <p className="text-sm text-gray-500">Câmbio</p>
                        <p className="font-semibold text-gray-900">{vehicle.cambio_veiculo}</p>
                      </div>
                    )}

                    {vehicle.quilometragem_veiculo && (
                      <div>
                        <p className="text-sm text-gray-500">Quilometragem</p>
                        <p className="font-semibold text-gray-900">
                          {vehicle.quilometragem_veiculo.toLocaleString('pt-BR')} km
                        </p>
                      </div>
                    )}

                    {vehicle.plate_veiculo && (
                      <div>
                        <p className="text-sm text-gray-500">Placa</p>
                        <p className="font-semibold text-gray-900">{vehicle.plate_veiculo}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acessórios */}
                {vehicle.accessories_veiculo && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Acessórios</h3>
                    <p className="text-gray-700 whitespace-pre-line">{vehicle.accessories_veiculo}</p>
                  </div>
                )}

                {/* Data de cadastro */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Cadastrado em {new Date(vehicle.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={() => onEdit(vehicle)}
              className="px-6 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Editar Veículo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

