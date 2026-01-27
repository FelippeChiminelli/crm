import { useState, useEffect, useCallback } from 'react'
import { FiSearch, FiX, FiCheck, FiPackage } from 'react-icons/fi'
import { getVehicles } from '../../../services/vehicleService'
import type { Vehicle } from '../../../types'
import { formatCurrency } from '../../../utils/validation'

interface VehicleSelectorProps {
  value: string // IDs separados por vírgula
  onChange: (value: string) => void
  empresaId: string
  disabled?: boolean
  error?: boolean
}

export function VehicleSelector({
  value,
  onChange,
  empresaId,
  disabled = false,
  error = false
}: VehicleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)

  // Converter string de IDs para array
  const selectedIds = value ? value.split(',').filter(id => id.trim()) : []

  // Buscar veículos quando abrir o modal ou mudar a busca
  const searchVehicles = useCallback(async (term: string) => {
    if (!empresaId) return

    try {
      setLoading(true)
      const { vehicles: data } = await getVehicles(
        empresaId,
        term ? { search: term } : undefined,
        50,
        0
      )
      setVehicles(data)
    } catch (err) {
      console.error('Erro ao buscar veículos:', err)
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  // Buscar veículos selecionados pelo ID
  const loadSelectedVehicles = useCallback(async () => {
    if (!empresaId || selectedIds.length === 0) {
      setSelectedVehicles([])
      return
    }

    try {
      // Buscar todos os veículos e filtrar pelos IDs selecionados
      const { vehicles: allVehicles } = await getVehicles(empresaId, undefined, 1000, 0)
      const selected = allVehicles.filter(v => selectedIds.includes(v.id))
      setSelectedVehicles(selected)
    } catch (err) {
      console.error('Erro ao carregar veículos selecionados:', err)
    }
  }, [empresaId, value])

  // Carregar veículos selecionados quando o valor mudar
  useEffect(() => {
    loadSelectedVehicles()
  }, [loadSelectedVehicles])

  // Buscar veículos quando abrir o dropdown
  useEffect(() => {
    if (isOpen) {
      searchVehicles(searchTerm)
    }
  }, [isOpen, searchTerm, searchVehicles])

  // Debounce na busca
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      searchVehicles(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, isOpen, searchVehicles])

  // Toggle seleção de veículo
  const toggleVehicle = (vehicle: Vehicle) => {
    const isSelected = selectedIds.includes(vehicle.id)
    let newIds: string[]

    if (isSelected) {
      newIds = selectedIds.filter(id => id !== vehicle.id)
    } else {
      newIds = [...selectedIds, vehicle.id]
    }

    onChange(newIds.join(','))
  }

  // Remover veículo selecionado
  const removeVehicle = (vehicleId: string) => {
    const newIds = selectedIds.filter(id => id !== vehicleId)
    onChange(newIds.join(','))
  }

  // Obter imagem principal do veículo
  const getVehicleImage = (vehicle: Vehicle): string | null => {
    if (vehicle.images && vehicle.images.length > 0) {
      const sorted = [...vehicle.images].sort((a, b) => a.position - b.position)
      return sorted[0].url
    }
    return null
  }

  // Formatar título do veículo
  const getVehicleTitle = (vehicle: Vehicle): string => {
    if (vehicle.titulo_veiculo) return vehicle.titulo_veiculo
    return `${vehicle.marca_veiculo || ''} ${vehicle.modelo_veiculo || ''}`.trim() || 'Veículo sem título'
  }

  return (
    <div className="relative">
      {/* Veículos selecionados */}
      <div
        className={`min-h-[42px] p-2 border rounded-lg cursor-pointer transition-colors ${
          error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {selectedVehicles.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
            <FiPackage size={16} />
            <span>Selecionar veículos do estoque...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedVehicles.map(vehicle => (
              <div
                key={vehicle.id}
                className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-1.5 pr-2"
              >
                {/* Miniatura */}
                <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {getVehicleImage(vehicle) ? (
                    <img
                      src={getVehicleImage(vehicle)!}
                      alt={getVehicleTitle(vehicle)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiPackage size={16} className="text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {getVehicleTitle(vehicle)}
                  </p>
                  <p className="text-xs text-orange-600 font-semibold">
                    {vehicle.price_veiculo ? formatCurrency(vehicle.price_veiculo) : 'Sem preço'}
                  </p>
                </div>

                {/* Botão remover */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeVehicle(vehicle.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de seleção */}
      {isOpen && !disabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Selecionar Veículos</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Campo de busca */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por marca, modelo ou título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de veículos */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FiPackage size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    {searchTerm ? 'Nenhum veículo encontrado' : 'Nenhum veículo no estoque'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {vehicles.map(vehicle => {
                    const isSelected = selectedIds.includes(vehicle.id)
                    return (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => toggleVehicle(vehicle)}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-orange-50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <FiCheck size={12} className="text-white" />}
                        </div>

                        {/* Miniatura */}
                        <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {getVehicleImage(vehicle) ? (
                            <img
                              src={getVehicleImage(vehicle)!}
                              alt={getVehicleTitle(vehicle)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiPackage size={24} className="text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getVehicleTitle(vehicle)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {vehicle.ano_veiculo && <span>{vehicle.ano_veiculo}</span>}
                            {vehicle.quilometragem_veiculo && (
                              <span>{vehicle.quilometragem_veiculo.toLocaleString('pt-BR')} km</span>
                            )}
                          </div>
                        </div>

                        {/* Preço */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-orange-600">
                            {vehicle.price_veiculo ? formatCurrency(vehicle.price_veiculo) : '-'}
                          </p>
                          {vehicle.promotion_price && (
                            <p className="text-xs text-gray-400 line-through">
                              {formatCurrency(vehicle.price_veiculo || 0)}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedIds.length} veículo(s) selecionado(s)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
