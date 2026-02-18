import React, { useState, useEffect } from 'react'
import type { 
  BookingCalendar, 
  CreateBookingCalendarData, 
  UpdateBookingCalendarData,
  BookingAvailability,
  Profile
} from '../../types'
import { 
  XMarkIcon, 
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  LinkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { AvailabilityEditor } from './AvailabilityEditor'
import { BookingOwnerList } from './BookingOwnerList'
import { BookingTypeList } from './BookingTypeList'
import { PublicSlugConfig } from './PublicSlugConfig'

interface BookingCalendarFormProps {
  isOpen: boolean
  onClose: () => void
  calendar?: BookingCalendar | null
  onSubmit: (data: CreateBookingCalendarData | UpdateBookingCalendarData) => Promise<void>
  onDelete?: () => Promise<void>
  saving?: boolean
  availableUsers?: Profile[]
  // Callbacks para operações específicas
  onAddOwner?: (user_id: string, role: 'admin' | 'member') => Promise<void>
  onRemoveOwner?: (owner_id: string) => Promise<void>
  onUpdateOwner?: (owner_id: string, data: { can_receive_bookings?: boolean; booking_weight?: number }) => Promise<void>
  onSaveAvailability?: (availability: Omit<BookingAvailability, 'id' | 'calendar_id' | 'created_at'>[]) => Promise<void>
  onCreateBookingType?: (data: { name: string; duration_minutes: number; color?: string }) => Promise<void>
  onUpdateBookingType?: (id: string, data: { name?: string; duration_minutes?: number; is_active?: boolean }) => Promise<void>
  onDeleteBookingType?: (id: string) => Promise<void>
  // Gerenciamento de múltiplas agendas
  calendars?: BookingCalendar[]
  onSelectCalendar?: (calendar: BookingCalendar) => void
  onCreateNew?: () => void
}

type TabType = 'info' | 'owners' | 'availability' | 'types' | 'public'

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6b7280', // gray
]

export const BookingCalendarForm: React.FC<BookingCalendarFormProps> = ({
  isOpen,
  onClose,
  calendar,
  onSubmit,
  onDelete,
  saving,
  availableUsers = [],
  onAddOwner,
  onRemoveOwner,
  onUpdateOwner,
  onSaveAvailability,
  onCreateBookingType,
  onUpdateBookingType,
  onDeleteBookingType,
  calendars = [],
  onSelectCalendar,
  onCreateNew
}) => {
  const isEditing = !!calendar
  const hasMultipleCalendars = calendars.length > 0

  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    timezone: 'America/Sao_Paulo',
    max_bookings_per_slot: 1
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCalendarList, setShowCalendarList] = useState(false)

  // Atualizar form data quando calendar muda
  useEffect(() => {
    if (calendar) {
      setFormData({
        name: calendar.name,
        description: calendar.description || '',
        color: calendar.color,
        timezone: calendar.timezone,
        max_bookings_per_slot: calendar.max_bookings_per_slot ?? 1
      })
    }
  }, [calendar])

  // Reset completo apenas quando ABRE o modal (isOpen muda de false para true)
  useEffect(() => {
    if (isOpen) {
      if (!calendar) {
        // Nova agenda: resetar tudo
        setFormData({
          name: '',
          description: '',
          color: '#6366f1',
          timezone: 'America/Sao_Paulo',
          max_bookings_per_slot: 1
        })
        setActiveTab('info')
      } else {
        // Editando: ir para primeira aba
        setActiveTab('info')
      }
      setShowDeleteConfirm(false)
      setShowCalendarList(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]) // Propositalmente só depende de isOpen

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) return

    await onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      timezone: formData.timezone,
      max_bookings_per_slot: formData.max_bookings_per_slot
    })
  }

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete()
      setShowDeleteConfirm(false)
    }
  }

  const handleSelectCalendar = (cal: BookingCalendar) => {
    onSelectCalendar?.(cal)
    setShowCalendarList(false)
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'info' as TabType, label: 'Info', fullLabel: 'Informações', icon: Cog6ToothIcon },
    { id: 'owners' as TabType, label: 'Equipe', fullLabel: 'Responsáveis', icon: UserGroupIcon, disabled: !isEditing },
    { id: 'availability' as TabType, label: 'Horários', fullLabel: 'Horários', icon: ClockIcon, disabled: !isEditing },
    { id: 'types' as TabType, label: 'Tipos', fullLabel: 'Tipos', icon: CalendarDaysIcon, disabled: !isEditing },
    { id: 'public' as TabType, label: 'Link', fullLabel: 'Link Público', icon: LinkIcon, disabled: !isEditing },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full shadow-xl sm:max-w-4xl sm:w-[95%] max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-t-xl sm:rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div 
              className="p-1.5 sm:p-2 rounded-lg flex-shrink-0"
              style={{ backgroundColor: `${formData.color}20` }}
            >
              <CalendarDaysIcon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: formData.color }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {hasMultipleCalendars ? 'Configurar Agendas' : isEditing ? 'Editar Agenda' : 'Nova Agenda'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">
                {isEditing ? 'Configure sua agenda personalizada' : 'Crie uma nova agenda de atendimentos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Calendar Selector */}
        {hasMultipleCalendars && (
          <div className="sm:hidden border-b border-gray-200 p-2">
            <button
              onClick={() => setShowCalendarList(!showCalendarList)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: calendar?.color || formData.color }}
                />
                <span className="text-sm font-medium text-gray-700 truncate">
                  {calendar?.name || 'Selecionar agenda'}
                </span>
              </div>
              <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${showCalendarList ? 'rotate-180' : ''}`} />
            </button>
            
            {showCalendarList && (
              <div className="mt-2 bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    onCreateNew?.()
                    setShowCalendarList(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Nova Agenda</span>
                </button>
                {calendars.map(cal => (
                  <button
                    key={cal.id}
                    onClick={() => handleSelectCalendar(cal)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      calendar?.id === cal.id ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: cal.color }}
                    />
                    <span className="text-sm font-medium text-gray-700 truncate flex-1">
                      {cal.name}
                    </span>
                    {calendar?.id === cal.id && (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop Sidebar com lista de agendas */}
          {hasMultipleCalendars && (
            <div className="hidden sm:flex w-56 border-r border-gray-200 bg-gray-50 flex-col flex-shrink-0">
              <div className="p-3 border-b border-gray-200">
                <button
                  onClick={onCreateNew}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Nova Agenda
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {calendars.map(cal => (
                  <button
                    key={cal.id}
                    onClick={() => onSelectCalendar?.(cal)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      calendar?.id === cal.id 
                        ? 'bg-white shadow-sm border border-gray-200' 
                        : 'hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: cal.color }}
                    />
                    <span className="text-sm font-medium text-gray-700 truncate flex-1">
                      {cal.name}
                    </span>
                    {calendar?.id === cal.id && (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Área principal */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tabs */}
            <div className="border-b border-gray-200 px-2 sm:px-6 flex-shrink-0">
              <nav className="flex gap-1 sm:gap-4 -mb-px overflow-x-auto scrollbar-hide">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setActiveTab(tab.id)}
                    disabled={tab.disabled}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : tab.disabled
                        ? 'border-transparent text-gray-300 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="sm:hidden">{tab.label}</span>
                    <span className="hidden sm:inline">{tab.fullLabel}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-6 flex-1 overflow-y-auto">
              {/* Tab: Informações */}
              {activeTab === 'info' && (
                <form id="calendar-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nome da Agenda *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`${ds.input()} text-sm`}
                      placeholder="Ex: Consultório, Reuniões, Atendimentos..."
                      required
                    />
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`${ds.input()} min-h-[70px] sm:min-h-[80px] resize-y text-sm`}
                      placeholder="Descreva o propósito desta agenda..."
                      rows={3}
                    />
                  </div>

                  {/* Cor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cor
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-all ${
                              formData.color === color 
                                ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Fuso Horário
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className={`${ds.input()} text-sm`}
                    >
                      <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                      <option value="America/Manaus">Manaus (GMT-4)</option>
                      <option value="America/Cuiaba">Cuiabá (GMT-4)</option>
                      <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                      <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                    </select>
                  </div>

                  {/* Agendamentos por horário */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Agendamentos por Horário
                    </label>
                    <input
                      type="number"
                      value={formData.max_bookings_per_slot}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        max_bookings_per_slot: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) 
                      })}
                      min={1}
                      max={50}
                      className={`${ds.input()} text-sm w-32`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Quantos atendimentos podem ser realizados simultaneamente no mesmo horário.
                    </p>
                  </div>

                  {!isEditing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-blue-700">
                        Após criar a agenda, você poderá adicionar responsáveis, configurar horários de atendimento e tipos de agendamento.
                      </p>
                    </div>
                  )}

                  {/* Zona de perigo - Excluir */}
                  {isEditing && onDelete && (
                    <div className="pt-4 border-t border-gray-200">
                      {!showDeleteConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Excluir esta agenda
                        </button>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                          <p className="text-xs sm:text-sm text-red-700 mb-3">
                            Tem certeza? Todos os agendamentos desta agenda serão excluídos permanentemente.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirm(false)}
                              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleDelete}
                              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                            >
                              Sim, excluir
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              )}

              {/* Tab: Responsáveis */}
              {activeTab === 'owners' && calendar && (
                <BookingOwnerList
                  owners={calendar.owners || []}
                  availableUsers={availableUsers}
                  onAdd={onAddOwner}
                  onRemove={onRemoveOwner}
                  onUpdate={onUpdateOwner}
                />
              )}

              {/* Tab: Horários */}
              {activeTab === 'availability' && calendar && (
                <AvailabilityEditor
                  availability={calendar.availability || []}
                  onSave={onSaveAvailability}
                  saving={saving}
                />
              )}

              {/* Tab: Tipos de Atendimento */}
              {activeTab === 'types' && calendar && (
                <BookingTypeList
                  bookingTypes={calendar.booking_types || []}
                  calendarId={calendar.id}
                  onCreate={onCreateBookingType}
                  onUpdate={onUpdateBookingType}
                  onDelete={onDeleteBookingType}
                />
              )}

              {/* Tab: Link Público */}
              {activeTab === 'public' && calendar && (
                <PublicSlugConfig
                  calendarId={calendar.id}
                  calendarName={calendar.name}
                  isPublic={calendar.is_public ?? false}
                  publicSlug={calendar.public_slug}
                  minAdvanceHours={calendar.min_advance_hours ?? 2}
                  maxAdvanceDays={calendar.max_advance_days ?? 30}
                  onUpdate={async (data) => {
                    try {
                      await onSubmit(data)
                    } catch (error: any) {
                      // Se as colunas não existem, mostrar mensagem amigável
                      if (error?.code === '42703' || error?.message?.includes('column')) {
                        alert('As colunas de link público ainda não existem no banco de dados. Execute a migration 003_add_public_booking_columns.sql no Supabase SQL Editor.')
                      } else {
                        throw error
                      }
                    }
                  }}
                  saving={saving}
                />
              )}
            </div>

            {/* Footer */}
            {activeTab === 'info' && (
              <div className="p-3 sm:p-4 border-t border-gray-200 flex items-center gap-2 flex-shrink-0 bg-gray-50">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="calendar-form"
                  disabled={saving || !formData.name.trim()}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Agenda'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
