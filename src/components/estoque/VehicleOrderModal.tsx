import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FiX, FiSearch, FiMenu } from 'react-icons/fi'
import type { Vehicle } from '../../types'
import * as vehicleService from '../../services/vehicleService'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../contexts/ToastContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { formatCurrency } from '../../utils/validation'

interface VehicleOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface SortableVehicleItemProps {
  vehicle: Vehicle
  index: number
  disabled: boolean
}

function SortableVehicleItem({ vehicle, index, disabled }: SortableVehicleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vehicle.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const thumbnail = vehicle.images?.[0]?.url
  const title = vehicle.titulo_veiculo || `${vehicle.marca_veiculo || ''} ${vehicle.modelo_veiculo || ''}`.trim()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        disabled={disabled}
        className={`p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Arrastar para reordenar"
      >
        <FiMenu size={18} />
      </button>

      <span className="w-7 text-sm font-medium text-gray-400 flex-shrink-0 text-center">
        {index + 1}
      </span>

      <div className="w-16 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            Sem foto
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{title || 'Veículo sem título'}</p>
        <p className="text-sm text-gray-500 truncate">
          {vehicle.ano_veiculo ? `${vehicle.ano_veiculo}` : 'Ano não informado'}
          {vehicle.price_veiculo ? ` · ${formatCurrency(vehicle.price_veiculo)}` : ''}
        </p>
      </div>
    </div>
  )
}

export function VehicleOrderModal({ isOpen, onClose, onSuccess }: VehicleOrderModalProps) {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEscapeKey(isOpen, onClose)

  const loadVehicles = useCallback(async () => {
    if (!profile?.empresa_id) return

    try {
      setLoading(true)
      const data = await vehicleService.getVehiclesForOrdering(profile.empresa_id)
      setVehicles(data)
      setHasChanges(false)
    } catch {
      showToast('Erro ao carregar veículos para ordenação', 'error')
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id, showToast])

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      loadVehicles()
    }
  }, [isOpen, loadVehicles])

  const filteredVehicles = useMemo(() => {
    if (!search.trim()) return vehicles

    const term = search.toLowerCase()
    return vehicles.filter(
      (v) =>
        v.titulo_veiculo?.toLowerCase().includes(term) ||
        v.marca_veiculo?.toLowerCase().includes(term) ||
        v.modelo_veiculo?.toLowerCase().includes(term)
    )
  }, [vehicles, search])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || search.trim()) return

    const oldIndex = vehicles.findIndex((v) => v.id === active.id)
    const newIndex = vehicles.findIndex((v) => v.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    setVehicles(arrayMove(vehicles, oldIndex, newIndex))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!profile?.empresa_id) return

    try {
      setSaving(true)
      await vehicleService.reorderVehicles(
        profile.empresa_id,
        vehicles.map((v) => v.id)
      )
      showToast('Ordem do estoque atualizada com sucesso!', 'success')
      onSuccess()
      onClose()
    } catch {
      showToast('Erro ao salvar ordem do estoque', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 lg:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ordenar Estoque</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Arraste os veículos para definir a ordem de exibição no CRM e nos sites
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Busca */}
          <div className="px-4 lg:px-6 py-3 border-b border-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar veículo na lista..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
            {search.trim() && (
              <p className="text-xs text-amber-600 mt-2">
                Limpe a busca para reordenar os veículos
              </p>
            )}
          </div>

          {/* Lista */}
          <div className="px-4 lg:px-6 py-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : vehicles.length === 0 ? (
              <p className="text-center text-gray-500 py-12">
                Nenhum veículo disponível para ordenar
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredVehicles.map((v) => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {filteredVehicles.map((vehicle) => {
                      const globalIndex = vehicles.findIndex((v) => v.id === vehicle.id)
                      return (
                        <SortableVehicleItem
                          key={vehicle.id}
                          vehicle={vehicle}
                          index={globalIndex}
                          disabled={saving || !!search.trim()}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-500">
              {vehicles.length} veículo{vehicles.length !== 1 ? 's' : ''} em estoque
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading || !hasChanges}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar ordem'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
