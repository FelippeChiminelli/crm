import React, { useState, useEffect } from 'react'
import type { BookingType } from '../../types'
import { 
  PlusIcon, 
  TrashIcon, 
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { getAllBookingTypes } from '../../services/bookingService'

interface BookingTypeWithCalendar extends BookingType {
  calendar?: { id: string; name: string }
}

interface BookingTypeListProps {
  bookingTypes: BookingType[]
  calendarId: string
  onCreate?: (data: { name: string; duration_minutes: number; color?: string; description?: string }) => Promise<void>
  onUpdate?: (id: string, data: { name?: string; duration_minutes?: number; is_active?: boolean }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#eab308', // yellow
  '#ef4444', // red
]

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
]

export const BookingTypeList: React.FC<BookingTypeListProps> = ({
  bookingTypes,
  calendarId,
  onCreate,
  onUpdate,
  onDelete
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showExistingTypes, setShowExistingTypes] = useState(false)
  const [existingTypes, setExistingTypes] = useState<BookingTypeWithCalendar[]>([])
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: 30,
    color: '#3b82f6',
    description: ''
  })

  // Carregar tipos existentes de outras agendas
  useEffect(() => {
    const loadExistingTypes = async () => {
      if (!showExistingTypes) return
      
      setLoadingExisting(true)
      try {
        const types = await getAllBookingTypes()
        // Filtrar tipos que não são desta agenda e não estão já adicionados
        const currentTypeNames = bookingTypes.map(t => t.name.toLowerCase())
        const filtered = types.filter(t => 
          t.calendar_id !== calendarId && 
          !currentTypeNames.includes(t.name.toLowerCase())
        )
        setExistingTypes(filtered)
      } catch (error) {
        console.error('Erro ao carregar tipos existentes:', error)
      } finally {
        setLoadingExisting(false)
      }
    }

    loadExistingTypes()
  }, [showExistingTypes, calendarId, bookingTypes])

  const resetForm = () => {
    setFormData({
      name: '',
      duration_minutes: 30,
      color: '#3b82f6',
      description: ''
    })
  }

  const handleImportType = async (type: BookingTypeWithCalendar) => {
    if (!onCreate) return
    
    setSaving(true)
    try {
      await onCreate({
        name: type.name,
        duration_minutes: type.duration_minutes,
        color: type.color,
        description: type.description || undefined
      })
      // Remover da lista de existentes
      setExistingTypes(prev => prev.filter(t => t.id !== type.id))
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !onCreate) return
    
    setSaving(true)
    try {
      await onCreate({
        name: formData.name.trim(),
        duration_minutes: formData.duration_minutes,
        color: formData.color,
        description: formData.description.trim() || undefined
      })
      setShowAddForm(false)
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!onDelete) return
    if (!confirm('Excluir este tipo de atendimento?')) return
    await onDelete(id)
  }

  const handleToggleActive = async (type: BookingType) => {
    if (!onUpdate) return
    await onUpdate(type.id, { is_active: !type.is_active })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900">Tipos de Atendimento</h3>
          <p className="text-sm text-gray-500">
            Configure os tipos de serviço disponíveis para agendamento
          </p>
        </div>
        {!showAddForm && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExistingTypes(!showExistingTypes)}
              className={ds.button('secondary')}
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Usar Existente
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showExistingTypes ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className={ds.button('primary')}
            >
              <PlusIcon className="w-4 h-4" />
              Novo Tipo
            </button>
          </div>
        )}
      </div>

      {/* Lista de tipos existentes para importar */}
      {showExistingTypes && !showAddForm && (
        <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium text-indigo-900">Tipos de Outras Agendas</h4>
              <p className="text-sm text-indigo-700">Clique para adicionar à esta agenda</p>
            </div>
            <button
              onClick={() => setShowExistingTypes(false)}
              className="p-1 hover:bg-indigo-100 rounded"
            >
              <XMarkIcon className="w-5 h-5 text-indigo-600" />
            </button>
          </div>
          
          {loadingExisting ? (
            <div className="text-center py-4 text-indigo-600">Carregando...</div>
          ) : existingTypes.length === 0 ? (
            <div className="text-center py-4 text-indigo-600">
              <p>Nenhum tipo disponível para importar</p>
              <p className="text-sm">Todos os tipos já estão nesta agenda ou não existem outras agendas</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {existingTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleImportType(type)}
                  disabled={saving}
                  className="w-full flex items-center justify-between p-2 bg-white rounded-lg border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${type.color}20` }}
                    >
                      <ClockIcon className="w-4 h-4" style={{ color: type.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{type.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatDuration(type.duration_minutes)}
                        {type.calendar && ` • ${type.calendar.name}`}
                      </p>
                    </div>
                  </div>
                  <PlusIcon className="w-5 h-5 text-indigo-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form para adicionar novo tipo */}
      {showAddForm && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={ds.input()}
                  placeholder="Ex: Consulta, Retorno, Avaliação..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duração *
                </label>
                <select
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  className={ds.input()}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={ds.input()}
                placeholder="Breve descrição do atendimento (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor
              </label>
              <div className="flex gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      formData.color === color 
                        ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  resetForm()
                }}
                className={ds.button('secondary')}
              >
                <XMarkIcon className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.name.trim() || saving}
                className={ds.button('primary')}
              >
                {saving ? 'Salvando...' : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Criar Tipo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de tipos */}
      {bookingTypes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ClockIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>Nenhum tipo de atendimento</p>
          <p className="text-sm">Crie tipos para que clientes possam agendar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookingTypes.map(type => (
            <div 
              key={type.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                type.is_active 
                  ? 'border-gray-200 bg-white' 
                  : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${type.color}20` }}
                >
                  <ClockIcon className="w-5 h-5" style={{ color: type.color }} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {type.name}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{formatDuration(type.duration_minutes)}</span>
                    {type.description && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">{type.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Toggle ativo */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {type.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(type)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      type.is_active ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span 
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        type.is_active ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Excluir */}
                <button
                  onClick={() => handleDelete(type.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
