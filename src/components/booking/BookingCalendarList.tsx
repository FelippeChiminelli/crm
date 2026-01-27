import React from 'react'
import type { BookingCalendar } from '../../types'
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  ClockIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'

interface BookingCalendarListProps {
  calendars: BookingCalendar[]
  loading?: boolean
  onSelect?: (calendar: BookingCalendar) => void
  onEdit?: (calendar: BookingCalendar) => void
  onDelete?: (calendar: BookingCalendar) => void
  onViewBookings?: (calendar: BookingCalendar) => void
}

export const BookingCalendarList: React.FC<BookingCalendarListProps> = ({
  calendars,
  loading,
  onSelect,
  onEdit,
  onDelete,
  onViewBookings
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className={`${ds.card()} p-6 animate-pulse`}>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (calendars.length === 0) {
    return (
      <div className={`${ds.card()} p-8 text-center`}>
        <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhuma agenda encontrada
        </h3>
        <p className="text-gray-500 mb-4">
          Crie sua primeira agenda personalizada para começar a receber agendamentos.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {calendars.map(calendar => (
        <div 
          key={calendar.id}
          className={`${ds.card(true)} p-5 cursor-pointer group`}
          onClick={() => onSelect?.(calendar)}
        >
          {/* Header com cor */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${calendar.color}20` }}
              >
                <CalendarDaysIcon 
                  className="w-5 h-5" 
                  style={{ color: calendar.color }} 
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                  {calendar.name}
                </h3>
                {calendar.description && (
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {calendar.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Status badge */}
            <span className={`px-2 py-1 text-xs rounded-full ${
              calendar.is_active 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {calendar.is_active ? 'Ativa' : 'Inativa'}
            </span>
          </div>

          {/* Info */}
          <div className="space-y-2 mb-4">
            {calendar.owners && calendar.owners.length > 0 ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserGroupIcon className="w-4 h-4" />
                <span>{calendar.owners.length} responsável(is)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <UserGroupIcon className="w-4 h-4" />
                <span>Sem responsáveis configurados</span>
              </div>
            )}
            {calendar.booking_types && calendar.booking_types.length > 0 ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClockIcon className="w-4 h-4" />
                <span>{calendar.booking_types.length} tipo(s) de atendimento</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <ClockIcon className="w-4 h-4" />
                <span>Sem tipos de atendimento</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewBookings?.(calendar)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
              <span>Ver</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(calendar)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <PencilSquareIcon className="w-4 h-4" />
              <span>Editar</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(calendar)
              }}
              className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
