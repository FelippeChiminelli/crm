import type { Vehicle } from '../../types'
import { VehicleCard } from './VehicleCard'
import { FiPackage } from 'react-icons/fi'

interface VehicleGridProps {
  vehicles: Vehicle[]
  loading: boolean
  onView: (vehicle: Vehicle) => void
  onEdit: (vehicle: Vehicle) => void
  onDelete: (vehicle: Vehicle) => void
}

export function VehicleGrid({ vehicles, loading, onView, onEdit, onDelete }: VehicleGridProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
            <div className="h-32 lg:h-48 bg-gray-200" />
            <div className="p-3 lg:p-4 space-y-2 lg:space-y-3">
              <div className="h-3 lg:h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-2 lg:h-3 bg-gray-200 rounded w-1/2" />
              <div className="flex gap-1 lg:gap-2">
                <div className="h-4 lg:h-6 bg-gray-200 rounded w-12 lg:w-16" />
                <div className="h-4 lg:h-6 bg-gray-200 rounded w-12 lg:w-16" />
              </div>
              <div className="h-4 lg:h-6 bg-gray-200 rounded w-1/2" />
              <div className="flex gap-1 lg:gap-2">
                <div className="h-7 lg:h-9 bg-gray-200 rounded flex-1" />
                <div className="h-7 lg:h-9 bg-gray-200 rounded w-8 lg:w-12" />
                <div className="h-7 lg:h-9 bg-gray-200 rounded w-8 lg:w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 lg:py-16 px-4">
        <div className="bg-gray-100 rounded-full p-4 lg:p-6 mb-3 lg:mb-4">
          <FiPackage size={32} className="text-gray-400 lg:hidden" />
          <FiPackage size={48} className="text-gray-400 hidden lg:block" />
        </div>
        <h3 className="text-base lg:text-xl font-semibold text-gray-900 mb-2">
          Nenhum veículo encontrado
        </h3>
        <p className="text-gray-500 text-center max-w-md text-sm lg:text-base">
          Não há veículos cadastrados ou nenhum corresponde aos filtros.
        </p>
      </div>
    )
  }

  // Grid de veículos
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-6">
      {vehicles.map((vehicle) => (
        <VehicleCard
          key={vehicle.id}
          vehicle={vehicle}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

