import React from 'react'
import type { AvailableSlot } from '../../types'
import { ClockIcon } from '@heroicons/react/24/outline'

interface TimeSlotPickerProps {
  slots: AvailableSlot[]
  selectedSlot?: AvailableSlot | null
  onSelect: (slot: AvailableSlot) => void
  loading?: boolean
  date?: string
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  onSelect,
  loading,
  date
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div 
              key={i} 
              className="h-10 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <ClockIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
        <p className="font-medium">Nenhum horário disponível</p>
        <p className="text-sm">
          {date 
            ? 'Não há horários livres para esta data' 
            : 'Selecione uma data para ver horários'
          }
        </p>
      </div>
    )
  }

  // Agrupar por período (manhã, tarde, noite)
  const morning = slots.filter(s => s.start.getHours() < 12)
  const afternoon = slots.filter(s => s.start.getHours() >= 12 && s.start.getHours() < 18)
  const evening = slots.filter(s => s.start.getHours() >= 18)

  const renderSlots = (periodSlots: AvailableSlot[], label: string) => {
    if (periodSlots.length === 0) return null

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">{label}</h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {periodSlots.map((slot, index) => {
            const isSelected = selectedSlot && 
              slot.start.getTime() === selectedSlot.start.getTime()

            return (
              <button
                key={index}
                onClick={() => onSelect(slot)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-orange-500 text-white ring-2 ring-orange-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {formatTime(slot.start)}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderSlots(morning, 'Manhã')}
      {renderSlots(afternoon, 'Tarde')}
      {renderSlots(evening, 'Noite')}
    </div>
  )
}
