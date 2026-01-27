import React, { useState, useEffect } from 'react'
import type { 
  BookingCalendar, 
  BookingType, 
  CreateBookingData,
  AvailableSlot,
  Lead
} from '../../types'
import { 
  XMarkIcon, 
  CalendarDaysIcon,
  UserIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { TimeSlotPicker } from './TimeSlotPicker'

interface NewBookingModalProps {
  isOpen: boolean
  onClose: () => void
  calendar: BookingCalendar
  bookingTypes: BookingType[]
  onSubmit: (data: CreateBookingData) => Promise<void>
  loadAvailableSlots: (calendar_id: string, booking_type_id: string, date: string) => Promise<AvailableSlot[]>
  searchLeads?: (query: string) => Promise<Lead[]>
  saving?: boolean
}

type Step = 'type' | 'datetime' | 'client'

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  calendar,
  bookingTypes,
  onSubmit,
  loadAvailableSlots,
  searchLeads,
  saving
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<BookingType | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Cliente
  const [clientMode, setClientMode] = useState<'lead' | 'manual'>('manual')
  const [leadSearchQuery, setLeadSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [clientData, setClientData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  })

  // Reset quando abre/fecha
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('type')
      setSelectedType(null)
      setSelectedDate(new Date().toISOString().split('T')[0])
      setSelectedSlot(null)
      setAvailableSlots([])
      setClientMode('manual')
      setLeadSearchQuery('')
      setSearchResults([])
      setSelectedLead(null)
      setClientData({ name: '', phone: '', email: '', notes: '' })
    }
  }, [isOpen])

  // Carregar slots quando muda tipo ou data
  useEffect(() => {
    if (selectedType && selectedDate) {
      setLoadingSlots(true)
      loadAvailableSlots(calendar.id, selectedType.id, selectedDate)
        .then(slots => {
          setAvailableSlots(slots)
          setSelectedSlot(null)
        })
        .finally(() => setLoadingSlots(false))
    }
  }, [selectedType, selectedDate, calendar.id, loadAvailableSlots])

  // Buscar leads
  useEffect(() => {
    if (leadSearchQuery.length >= 2 && searchLeads) {
      const timer = setTimeout(() => {
        searchLeads(leadSearchQuery).then(setSearchResults)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setSearchResults([])
    }
  }, [leadSearchQuery, searchLeads])

  const handleSubmit = async () => {
    if (!selectedType || !selectedSlot) return

    const data: CreateBookingData = {
      calendar_id: calendar.id,
      booking_type_id: selectedType.id,
      start_datetime: selectedSlot.start.toISOString(),
      notes: clientData.notes || undefined
    }

    if (selectedLead) {
      data.lead_id = selectedLead.id
    } else {
      data.client_name = clientData.name
      data.client_phone = clientData.phone
      data.client_email = clientData.email
    }

    await onSubmit(data)
  }

  const canProceedFromType = !!selectedType
  const canProceedFromDateTime = !!selectedSlot
  const canSubmit = (selectedLead || clientData.name.trim()) && canProceedFromDateTime

  const navigateDate = (days: number) => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + days)
    setSelectedDate(current.toISOString().split('T')[0])
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
  }

  if (!isOpen) return null

  const activeTypes = bookingTypes.filter(t => t.is_active)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full shadow-xl sm:max-w-xl sm:w-[95%] max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-t-xl sm:rounded-xl">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div 
              className="p-1.5 sm:p-2 rounded-lg flex-shrink-0"
              style={{ backgroundColor: `${calendar.color}20` }}
            >
              <CalendarDaysIcon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: calendar.color }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Novo Agendamento</h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{calendar.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { key: 'type', label: 'Tipo' },
              { key: 'datetime', label: 'Data/Hora' },
              { key: 'client', label: 'Cliente' }
            ].map((step, index) => (
              <React.Fragment key={step.key}>
                {index > 0 && <div className="flex-1 h-px bg-gray-200" />}
                <button
                  onClick={() => {
                    if (step.key === 'type') setCurrentStep('type')
                    else if (step.key === 'datetime' && canProceedFromType) setCurrentStep('datetime')
                    else if (step.key === 'client' && canProceedFromDateTime) setCurrentStep('client')
                  }}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    currentStep === step.key
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    currentStep === step.key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="hidden xs:inline sm:inline">{step.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 flex-1 overflow-y-auto">
          {/* Step 1: Tipo de atendimento */}
          {currentStep === 'type' && (
            <div className="space-y-2 sm:space-y-3">
              <p className="text-sm text-gray-600 mb-3 sm:mb-4">
                Selecione o tipo de atendimento:
              </p>
              {activeTypes.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  Nenhum tipo de atendimento disponível
                </p>
              ) : (
                activeTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type)}
                    className={`w-full p-3 sm:p-4 rounded-lg border text-left transition-all ${
                      selectedType?.id === type.id
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${type.color}20` }}
                      >
                        <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: type.color }} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base">{type.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Duração: {formatDuration(type.duration_minutes)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2: Data e Hora */}
          {currentStep === 'datetime' && selectedType && (
            <div className="space-y-4">
              {/* Seletor de data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data
                </label>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => navigateDate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`${ds.input()} flex-1 text-center text-sm sm:text-base`}
                  />
                  <button
                    onClick={() => navigateDate(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Horários disponíveis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário
                </label>
                <TimeSlotPicker
                  slots={availableSlots}
                  selectedSlot={selectedSlot}
                  onSelect={setSelectedSlot}
                  loading={loadingSlots}
                  date={selectedDate}
                />
              </div>
            </div>
          )}

          {/* Step 3: Dados do cliente */}
          {currentStep === 'client' && (
            <div className="space-y-4">
              {/* Toggle Lead/Manual */}
              {searchLeads && (
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => {
                      setClientMode('lead')
                      setClientData({ name: '', phone: '', email: '', notes: clientData.notes })
                    }}
                    className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      clientMode === 'lead'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Buscar Lead
                  </button>
                  <button
                    onClick={() => {
                      setClientMode('manual')
                      setSelectedLead(null)
                    }}
                    className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      clientMode === 'manual'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Novo Cliente
                  </button>
                </div>
              )}

              {/* Busca de lead */}
              {clientMode === 'lead' && searchLeads && (
                <div>
                  <div className="relative mb-3">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={leadSearchQuery}
                      onChange={(e) => setLeadSearchQuery(e.target.value)}
                      className={`${ds.input()} pl-10 text-sm`}
                      placeholder="Buscar por nome, telefone ou email..."
                    />
                  </div>

                  {selectedLead ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{selectedLead.name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">
                              {selectedLead.phone || selectedLead.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedLead(null)}
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {searchResults.map(lead => (
                        <button
                          key={lead.id}
                          onClick={() => {
                            setSelectedLead(lead)
                            setLeadSearchQuery('')
                            setSearchResults([])
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {lead.phone || lead.email || lead.company}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : leadSearchQuery.length >= 2 ? (
                    <p className="text-center text-gray-500 py-4 text-sm">
                      Nenhum lead encontrado
                    </p>
                  ) : null}
                </div>
              )}

              {/* Formulário manual */}
              {clientMode === 'manual' && (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={clientData.name}
                      onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                      className={`${ds.input()} text-sm`}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={clientData.phone}
                        onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                        className={`${ds.input()} text-sm`}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={clientData.email}
                        onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                        className={`${ds.input()} text-sm`}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={clientData.notes}
                  onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
                  className={`${ds.input()} min-h-[70px] sm:min-h-[80px] resize-y text-sm`}
                  placeholder="Informações adicionais sobre o agendamento..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 flex items-center gap-2 flex-shrink-0 bg-gray-50">
          {currentStep !== 'type' && (
            <button
              onClick={() => {
                if (currentStep === 'datetime') setCurrentStep('type')
                else if (currentStep === 'client') setCurrentStep('datetime')
              }}
              className="px-3 sm:px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Voltar
            </button>
          )}
          <div className="flex-1" />
          {currentStep === 'type' && (
            <button
              onClick={() => setCurrentStep('datetime')}
              disabled={!canProceedFromType}
              className="px-4 sm:px-6 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          )}
          {currentStep === 'datetime' && (
            <button
              onClick={() => setCurrentStep('client')}
              disabled={!canProceedFromDateTime}
              className="px-4 sm:px-6 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          )}
          {currentStep === 'client' && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="px-4 sm:px-6 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Criando...' : 'Criar Agendamento'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
