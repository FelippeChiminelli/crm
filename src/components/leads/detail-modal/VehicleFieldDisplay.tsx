import { useState, useEffect } from 'react'
import { FiPackage } from 'react-icons/fi'
import { getVehicles } from '../../../services/vehicleService'
import { formatCurrency } from '../../../utils/validation'
import type { Vehicle } from '../../../types'

interface VehicleFieldDisplayProps {
  vehicleIds: string
  empresaId: string
}

// Exibe veículos vinculados a um campo personalizado em modo visualização
export function VehicleFieldDisplay({ vehicleIds, empresaId }: VehicleFieldDisplayProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadVehicles() {
      if (!vehicleIds || !empresaId) {
        if (!cancelled) {
          setVehicles([])
          setLoading(false)
        }
        return
      }

      try {
        const ids = vehicleIds.split(',').filter(id => id.trim())
        if (ids.length === 0) {
          if (!cancelled) {
            setVehicles([])
            setLoading(false)
          }
          return
        }

        const { vehicles: allVehicles } = await getVehicles(empresaId, { status_veiculo: 'todos' }, 1000, 0)
        if (!cancelled) {
          const selected = allVehicles.filter(v => ids.includes(v.id))
          setVehicles(selected)
        }
      } catch (err) {
        console.error('Erro ao carregar veículos:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    setLoading(true)
    loadVehicles()

    return () => { cancelled = true }
  }, [vehicleIds, empresaId])

  if (loading) {
    return <span className="text-gray-400 text-sm">Carregando...</span>
  }

  if (vehicles.length === 0) {
    return <span className="text-gray-500">Nenhum veículo vinculado</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {vehicles.map(vehicle => {
        const image = vehicle.images && vehicle.images.length > 0
          ? [...vehicle.images].sort((a, b) => a.position - b.position)[0].url
          : null
        const title = vehicle.titulo_veiculo || `${vehicle.marca_veiculo || ''} ${vehicle.modelo_veiculo || ''}`.trim() || 'Veículo'

        return (
          <div
            key={vehicle.id}
            className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-1.5 pr-2"
          >
            <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {image ? (
                <img src={image} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiPackage size={14} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{title}</p>
              <p className="text-xs text-orange-600 font-semibold">
                {vehicle.price_veiculo ? formatCurrency(vehicle.price_veiculo) : '-'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
