import React, { useState } from 'react'
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import type { Booking, BookingStatus, UpdateBookingData } from '../../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface BookingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking
  onUpdate?: (id: string, data: UpdateBookingData) => Promise<void>
  saving?: boolean
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { 
    label: 'Pendente', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-100',
    icon: ClockIcon
  },
  confirmed: { 
    label: 'Confirmado', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    icon: CheckCircleIcon
  },
  completed: { 
    label: 'Concluído', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    icon: CheckCircleIcon
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    icon: XCircleIcon
  },
  no_show: { 
    label: 'Não Compareceu', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-100',
    icon: ExclamationTriangleIcon
  }
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  isOpen,
  onClose,
  booking,
  onUpdate,
  saving
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<UpdateBookingData>({
    status: booking.status,
    notes: booking.notes || ''
  })

  if (!isOpen) return null

  const startDate = new Date(booking.start_datetime)
  const endDate = new Date(booking.end_datetime)
  
  const formattedDate = format(startDate, "EEEE, d 'de' MMMM", { locale: ptBR })
  const formattedTime = `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))

  const statusConfig = STATUS_CONFIG[booking.status]
  const StatusIcon = statusConfig.icon

  const handleSave = async () => {
    if (!onUpdate) return
    await onUpdate(booking.id, editData)
    setIsEditing(false)
  }

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!onUpdate) return
    await onUpdate(booking.id, { status: newStatus })
  }

  const handleCancel = async () => {
    if (!onUpdate) return
    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      await onUpdate(booking.id, { status: 'cancelled' })
    }
  }

  // Nome do cliente
  const clientName = booking.lead?.name || booking.client_name || 'Cliente não identificado'
  const clientPhone = booking.lead?.phone || booking.client_phone
  const clientEmail = booking.lead?.email || booking.client_email
  const clientCompany = booking.lead?.company

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full shadow-xl sm:max-w-lg sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-t-xl sm:rounded-xl flex flex-col">
        {/* Header */}
        <div 
          className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: booking.calendar?.color || booking.booking_type?.color || '#6366f1' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-white truncate">
                {booking.booking_type?.name || 'Agendamento'}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 truncate">
                {booking.calendar?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
          {/* Status Badge + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor} self-start`}>
              <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
              <span className={`text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            
            {/* Quick Status Actions */}
            {booking.status !== 'cancelled' && booking.status !== 'completed' && onUpdate && (
              <div className="flex items-center gap-2">
                {booking.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange('confirmed')}
                    disabled={saving}
                    className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex-1 sm:flex-none"
                  >
                    Confirmar
                  </button>
                )}
                {(booking.status === 'confirmed' || booking.status === 'pending') && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    disabled={saving}
                    className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex-1 sm:flex-none"
                  >
                    Concluir
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-900 capitalize">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-900">
                {formattedTime}
                <span className="text-gray-500 ml-2">({duration} min)</span>
              </span>
            </div>
          </div>

          {/* Client Info */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Cliente</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-900 truncate">{clientName}</span>
                {booking.lead_id && (
                  <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded flex-shrink-0">
                    Lead
                  </span>
                )}
              </div>
              
              {clientCompany && (
                <div className="flex items-center gap-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-900 truncate">{clientCompany}</span>
                </div>
              )}
              
              {clientPhone && (
                <div className="flex items-center gap-3">
                  <PhoneIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <a 
                    href={`tel:${clientPhone}`}
                    className="text-sm text-indigo-600 hover:underline truncate"
                  >
                    {clientPhone}
                  </a>
                </div>
              )}
              
              {clientEmail && (
                <div className="flex items-center gap-3">
                  <EnvelopeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <a 
                    href={`mailto:${clientEmail}`}
                    className="text-sm text-indigo-600 hover:underline truncate"
                  >
                    {clientEmail}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Assigned User */}
          {booking.assigned_user && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Responsável</h3>
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-indigo-600">
                    {booking.assigned_user.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {booking.assigned_user.full_name}
                  </p>
                  {booking.assigned_user.email && (
                    <p className="text-xs text-gray-500 truncate">{booking.assigned_user.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Observações</h3>
              {onUpdate && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <PencilSquareIcon className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  className={`${ds.input()} min-h-[80px]`}
                  placeholder="Adicione observações sobre o agendamento..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditData({ status: booking.status, notes: booking.notes || '' })
                      setIsEditing(false)
                    }}
                    className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg min-h-[60px]">
                {booking.notes ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Nenhuma observação</p>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
            <p>Criado em {format(new Date(booking.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
          </div>
        </div>

        {/* Footer Actions */}
        {onUpdate && booking.status !== 'cancelled' && (
          <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:justify-between bg-gray-50 flex-shrink-0">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="text-sm px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 order-2 sm:order-1"
            >
              Cancelar Agendamento
            </button>
            
            <button
              onClick={onClose}
              className="text-sm px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors order-1 sm:order-2"
            >
              Fechar
            </button>
          </div>
        )}
        
        {(!onUpdate || booking.status === 'cancelled') && (
          <div className="p-3 sm:p-4 border-t border-gray-200 flex justify-center sm:justify-end bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full sm:w-auto text-sm px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
