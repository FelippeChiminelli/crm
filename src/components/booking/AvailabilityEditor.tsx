import React, { useState, useEffect } from 'react'
import type { BookingAvailability } from '../../types'
import { PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'

interface AvailabilityEditorProps {
  availability: BookingAvailability[]
  onSave?: (availability: Omit<BookingAvailability, 'id' | 'calendar_id' | 'created_at'>[]) => Promise<void>
  saving?: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
]

interface TimeSlot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

export const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({
  availability,
  onSave,
  saving
}) => {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Inicializar slots com disponibilidade existente
  useEffect(() => {
    if (availability.length > 0) {
      setSlots(availability.map((a, idx) => ({
        id: a.id || `temp-${idx}`,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
        is_active: a.is_active
      })))
    } else {
      // Inicializar com horários padrão (Segunda a Sexta, 9h-12h e 14h-18h)
      const defaultSlots: TimeSlot[] = []
      for (let day = 1; day <= 5; day++) {
        defaultSlots.push({
          id: `default-${day}-1`,
          day_of_week: day,
          start_time: '09:00',
          end_time: '12:00',
          is_active: true
        })
        defaultSlots.push({
          id: `default-${day}-2`,
          day_of_week: day,
          start_time: '14:00',
          end_time: '18:00',
          is_active: true
        })
      }
      setSlots(defaultSlots)
      setHasChanges(true)
    }
  }, [availability])

  const addSlot = (day_of_week: number) => {
    const newSlot: TimeSlot = {
      id: `new-${Date.now()}`,
      day_of_week,
      start_time: '09:00',
      end_time: '18:00',
      is_active: true
    }
    setSlots([...slots, newSlot])
    setHasChanges(true)
  }

  const updateSlot = (id: string, field: keyof TimeSlot, value: string | boolean) => {
    setSlots(slots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ))
    setHasChanges(true)
  }

  const removeSlot = (id: string) => {
    setSlots(slots.filter(slot => slot.id !== id))
    setHasChanges(true)
  }

  const toggleDay = (day_of_week: number) => {
    const daySlots = slots.filter(s => s.day_of_week === day_of_week)
    if (daySlots.length > 0) {
      // Remover todos os slots do dia
      setSlots(slots.filter(s => s.day_of_week !== day_of_week))
    } else {
      // Adicionar slot padrão para o dia
      addSlot(day_of_week)
    }
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!onSave) return
    
    const dataToSave = slots.map(slot => ({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_active: slot.is_active
    }))

    await onSave(dataToSave)
    setHasChanges(false)
  }

  const getSlotsForDay = (day: number) => {
    return slots.filter(s => s.day_of_week === day).sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900">Horários de Atendimento</h3>
          <p className="text-sm text-gray-500">
            Configure os horários disponíveis para agendamentos
          </p>
        </div>
        {hasChanges && onSave && (
          <button
            onClick={handleSave}
            disabled={saving}
            className={ds.button('primary')}
          >
            {saving ? 'Salvando...' : (
              <>
                <CheckIcon className="w-4 h-4" />
                Salvar Horários
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {DAYS_OF_WEEK.map(day => {
          const daySlots = getSlotsForDay(day.value)
          const isActive = daySlots.length > 0

          return (
            <div 
              key={day.value}
              className={`border rounded-lg p-4 ${
                isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      isActive ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  >
                    <span 
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        isActive ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                  <span className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                    {day.label}
                  </span>
                </div>
                {isActive && (
                  <button
                    type="button"
                    onClick={() => addSlot(day.value)}
                    className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Adicionar horário
                  </button>
                )}
              </div>

              {isActive && (
                <div className="space-y-2 ml-13">
                  {daySlots.map(slot => (
                    <div key={slot.id} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateSlot(slot.id, 'start_time', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500"
                      />
                      <span className="text-gray-400">às</span>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateSlot(slot.id, 'end_time', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeSlot(slot.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
          Você tem alterações não salvas. Clique em "Salvar Horários" para aplicar.
        </div>
      )}
    </div>
  )
}
