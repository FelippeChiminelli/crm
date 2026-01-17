import type { Vehicle } from '../../types'
import { FiEdit2, FiTrash2, FiEye, FiTag } from 'react-icons/fi'
import { formatCurrency } from '../../utils/validation'

interface VehicleCardProps {
  vehicle: Vehicle
  onView: (vehicle: Vehicle) => void
  onEdit: (vehicle: Vehicle) => void
  onDelete: (vehicle: Vehicle) => void
}

export function VehicleCard({ vehicle, onView, onEdit, onDelete }: VehicleCardProps) {
  const firstImage = vehicle.images && vehicle.images.length > 0 
    ? vehicle.images[0].url 
    : '/placeholder-car.jpg'

  const hasPromotion = vehicle.promotion_price && vehicle.promotion_price > 0
  const displayPrice = hasPromotion ? vehicle.promotion_price : vehicle.price_veiculo

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Imagem */}
      <div className="relative h-40 lg:h-48 bg-gray-200 overflow-hidden group cursor-pointer" onClick={() => onView(vehicle)}>
        <img
          src={firstImage}
          alt={vehicle.titulo_veiculo || `${vehicle.marca_veiculo} ${vehicle.modelo_veiculo}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="16"%3ESem imagem%3C/text%3E%3C/svg%3E'
          }}
        />
        {hasPromotion && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md flex items-center gap-1 text-xs lg:text-sm font-semibold">
            <FiTag size={12} className="lg:hidden" />
            <FiTag size={14} className="hidden lg:block" />
            <span className="hidden sm:inline">Promoção</span>
          </div>
        )}
        {vehicle.images && vehicle.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs">
            +{vehicle.images.length - 1}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-3 lg:p-4">
        {/* Título */}
        <h3 className="font-semibold text-sm lg:text-lg text-gray-900 mb-1 line-clamp-1">
          {vehicle.titulo_veiculo || `${vehicle.marca_veiculo} ${vehicle.modelo_veiculo}`}
        </h3>

        {/* Marca/Modelo/Ano */}
        <p className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3 truncate">
          {vehicle.marca_veiculo} {vehicle.modelo_veiculo} {vehicle.ano_veiculo}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 lg:gap-2 mb-2 lg:mb-3">
          {vehicle.combustivel_veiculo && (
            <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-orange-100 text-orange-700 text-[10px] lg:text-xs rounded-md">
              {vehicle.combustivel_veiculo}
            </span>
          )}
          {vehicle.cambio_veiculo && (
            <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-purple-100 text-purple-700 text-[10px] lg:text-xs rounded-md">
              {vehicle.cambio_veiculo}
            </span>
          )}
          {vehicle.quilometragem_veiculo && (
            <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-gray-100 text-gray-700 text-[10px] lg:text-xs rounded-md">
              {vehicle.quilometragem_veiculo.toLocaleString('pt-BR')} km
            </span>
          )}
        </div>

        {/* Preço */}
        <div className="mb-3 lg:mb-4">
          {hasPromotion && vehicle.price_veiculo && (
            <p className="text-xs lg:text-sm text-gray-500 line-through">
              {formatCurrency(vehicle.price_veiculo)}
            </p>
          )}
          <p className={`font-bold text-base lg:text-xl ${hasPromotion ? 'text-red-600' : 'text-gray-900'}`}>
            {displayPrice ? formatCurrency(displayPrice) : 'Preço não informado'}
          </p>
        </div>

        {/* Ações */}
        <div className="flex gap-1.5 lg:gap-2">
          <button
            onClick={() => onView(vehicle)}
            className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 lg:py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-xs lg:text-sm"
          >
            <FiEye size={14} className="lg:hidden" />
            <FiEye size={16} className="hidden lg:block" />
            Ver
          </button>
          <button
            onClick={() => onEdit(vehicle)}
            className="flex items-center justify-center px-2 lg:px-3 py-1.5 lg:py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <FiEdit2 size={14} className="lg:hidden" />
            <FiEdit2 size={16} className="hidden lg:block" />
          </button>
          <button
            onClick={() => onDelete(vehicle)}
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

