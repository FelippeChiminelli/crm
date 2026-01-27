import React from 'react'
import type { Booking, BookingStatus } from '../../types'
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'

interface BookingListProps {
  bookings: Booking[]
  loading?: boolean
  onComplete?: (booking: Booking) => void
  onCancel?: (booking: Booking) => void
  onNoShow?: (booking: Booking) => void
  onSelect?: (booking: Booking) => void
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pendente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  confirmed: { label: 'Confirmado', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  completed: { label: 'Concluído', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelado', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  no_show: { label: 'Não compareceu', color: 'text-red-700', bgColor: 'bg-red-100' }
}

export const BookingList: React.FC<BookingListProps> = ({
  bookings,
  loading,
  onComplete,
  onCancel,
  onNoShow,
  onSelect
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'short',
      day: '2-digit', 
      month: 'short'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getClientName = (booking: Booking) => {
    if (booking.lead?.name) return booking.lead.name
    return booking.client_name || 'Cliente não informado'
  }

  const getClientContact = (booking: Booking) => {
    if (booking.lead?.phone) return booking.lead.phone
    return booking.client_phone || booking.client_email || ''
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className={`${ds.card()} p-4 animate-pulse`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className={`${ds.card()} p-8 text-center`}>
        <CalendarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhum agendamento encontrado
        </h3>
        <p className="text-gray-500">
          Os agendamentos aparecerão aqui quando forem criados.
        </p>
      </div>
    )
  }

  // Agrupar por data
  const groupedByDate = bookings.reduce((acc, booking) => {
    const dateKey = booking.start_datetime.split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(booking)
    return acc
  }, {} as Record<string, Booking[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([dateKey, dateBookings]) => (
        <div key={dateKey}>
          {/* Header da data */}
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-700">
              {formatDate(dateKey + 'T00:00:00')}
            </h3>
            <span className="text-sm text-gray-500">
              ({dateBookings.length} agendamento{dateBookings.length > 1 ? 's' : ''})
            </span>
          </div>

          {/* Lista de bookings do dia */}
          <div className="space-y-2">
            {dateBookings.map(booking => {
              const status = STATUS_CONFIG[booking.status]
              const isPast = new Date(booking.end_datetime) < new Date()
              const canComplete = booking.status === 'confirmed' && isPast
              const canCancel = ['pending', 'confirmed'].includes(booking.status) && !isPast
              const canNoShow = booking.status === 'confirmed' && isPast

              return (
                <div 
                  key={booking.id}
                  onClick={() => onSelect?.(booking)}
                  className={`${ds.card(true)} p-4 cursor-pointer`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Info principal */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Horário */}
                      <div 
                        className="flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center"
                        style={{ 
                          backgroundColor: `${booking.booking_type?.color || '#6366f1'}15` 
                        }}
                      >
                        <span 
                          className="text-lg font-bold"
                          style={{ color: booking.booking_type?.color || '#6366f1' }}
                        >
                          {formatTime(booking.start_datetime)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(booking.end_datetime)}
                        </span>
                      </div>

                      {/* Detalhes */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {getClientName(booking)}
                          </h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-1">
                          {booking.booking_type?.name || 'Atendimento'}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {getClientContact(booking) && (
                            <span className="flex items-center gap-1">
                              <PhoneIcon className="w-3.5 h-3.5" />
                              {getClientContact(booking)}
                            </span>
                          )}
                          {booking.assigned_user && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5" />
                              {booking.assigned_user.full_name}
                            </span>
                          )}
                        </div>

                        {booking.notes && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {booking.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    {(canComplete || canCancel || canNoShow) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canComplete && onComplete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onComplete(booking)
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Marcar como concluído"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                        )}
                        {canNoShow && onNoShow && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onNoShow(booking)
                            }}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Não compareceu"
                          >
                            <ExclamationTriangleIcon className="w-5 h-5" />
                          </button>
                        )}
                        {canCancel && onCancel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCancel(booking)
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancelar agendamento"
                          >
                            <XCircleIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
