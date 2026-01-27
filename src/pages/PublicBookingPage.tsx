import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import type { PublicBookingCalendar, BookingType, AvailableSlot, CreatePublicBookingData } from '../types'
import {
  getPublicCalendarBySlug,
  getPublicAvailableSlots,
  getPublicAvailableDates,
  createPublicBooking
} from '../services/publicBookingService'

type Step = 'type' | 'date' | 'time' | 'info' | 'confirm' | 'success'

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const PublicBookingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  
  // Estados
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendar, setCalendar] = useState<PublicBookingCalendar | null>(null)
  
  // Multi-step form
  const [currentStep, setCurrentStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<BookingType | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Calendário
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableDates, setAvailableDates] = useState<number[]>([])
  
  // Formulário de cliente
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')
  
  // Submissão
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Carregar calendário
  useEffect(() => {
    const loadCalendar = async () => {
      if (!slug) {
        setError('Link inválido')
        setLoading(false)
        return
      }

      try {
        const data = await getPublicCalendarBySlug(slug)
        if (!data) {
          setError('Agenda não encontrada ou não está disponível para agendamentos')
          setLoading(false)
          return
        }
        setCalendar(data)
        
        // Se só tem um tipo, selecionar automaticamente
        if (data.booking_types.length === 1) {
          setSelectedType(data.booking_types[0])
          setCurrentStep('date')
        }
      } catch (err) {
        setError('Erro ao carregar agenda')
      } finally {
        setLoading(false)
      }
    }

    loadCalendar()
  }, [slug])

  // Carregar datas disponíveis quando mudar o mês
  useEffect(() => {
    const loadDates = async () => {
      if (!calendar) return
      
      const dates = await getPublicAvailableDates(
        calendar.id,
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        calendar.min_advance_hours,
        calendar.max_advance_days
      )
      setAvailableDates(dates)
    }

    loadDates()
  }, [calendar, currentMonth])

  // Carregar slots quando selecionar data
  useEffect(() => {
    const loadSlots = async () => {
      if (!calendar || !selectedType || !selectedDate) return

      setLoadingSlots(true)
      try {
        const dateStr = selectedDate.toISOString().split('T')[0]
        const slots = await getPublicAvailableSlots(
          calendar.id,
          selectedType.id,
          dateStr,
          calendar.min_advance_hours,
          calendar.max_advance_days
        )
        setAvailableSlots(slots)
      } catch (err) {
        console.error('Erro ao carregar horários:', err)
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadSlots()
  }, [calendar, selectedType, selectedDate])

  // Gerar calendário do mês
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days: (number | null)[] = []
    
    // Preencher dias vazios no início
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }
    
    // Preencher dias do mês
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(d)
    }
    
    return days
  }, [currentMonth])

  // Handlers
  const handleSelectType = (type: BookingType) => {
    setSelectedType(type)
    setSelectedSlot(null)
    setCurrentStep('date')
  }

  const handleSelectDate = (day: number) => {
    if (!availableDates.includes(day)) return
    
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSelectedDate(date)
    setSelectedSlot(null)
    setCurrentStep('time')
  }

  const handleSelectSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot)
    setCurrentStep('info')
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'date':
        if (calendar && calendar.booking_types.length > 1) {
          setCurrentStep('type')
        }
        break
      case 'time':
        setCurrentStep('date')
        break
      case 'info':
        setCurrentStep('time')
        break
      case 'confirm':
        setCurrentStep('info')
        break
    }
  }

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim() || !clientPhone.trim()) return
    setCurrentStep('confirm')
  }

  const handleConfirm = async () => {
    if (!calendar || !selectedType || !selectedSlot) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const data: CreatePublicBookingData = {
        calendar_id: calendar.id,
        booking_type_id: selectedType.id,
        start_datetime: selectedSlot.start.toISOString(),
        end_datetime: selectedSlot.end.toISOString(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: clientEmail.trim() || undefined,
        notes: notes.trim() || undefined
      }

      await createPublicBooking(data)
      setCurrentStep('success')
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao criar agendamento')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Renderização de loading/erro
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error || !calendar) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ops!</h1>
          <p className="text-gray-600">{error || 'Agenda não encontrada'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${calendar.color}20` }}
            >
              <CalendarDaysIcon className="w-6 h-6" style={{ color: calendar.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{calendar.name}</h1>
              {calendar.description && (
                <p className="text-sm text-gray-500">{calendar.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {currentStep !== 'success' && (
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm">
            {['Tipo', 'Data', 'Horário', 'Dados', 'Confirmar'].map((label, index) => {
              const steps: Step[] = ['type', 'date', 'time', 'info', 'confirm']
              const stepIndex = steps.indexOf(currentStep)
              const isActive = index <= stepIndex
              const isCurrent = index === stepIndex
              
              return (
                <div key={label} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${isCurrent ? 'bg-indigo-600 text-white' : isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}
                  `}>
                    {index + 1}
                  </div>
                  {index < 4 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-1 ${isActive && index < stepIndex ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          
          {/* Step: Tipo de Atendimento */}
          {currentStep === 'type' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Selecione o tipo de atendimento</h2>
              <div className="space-y-3">
                {calendar.booking_types.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type)}
                    className="w-full p-4 text-left border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: type.color || calendar.color }}
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{type.name}</span>
                        {type.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{type.description}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">{type.duration_minutes} min</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Data */}
          {currentStep === 'date' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Selecione a data</h2>
                <div className="w-9" />
              </div>

              {/* Navegação do mês */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <span className="font-medium text-gray-900">
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowRightIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid do calendário */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="p-2" />
                  }
                  
                  const isAvailable = availableDates.includes(day)
                  const isSelected = selectedDate?.getDate() === day && 
                    selectedDate?.getMonth() === currentMonth.getMonth() &&
                    selectedDate?.getFullYear() === currentMonth.getFullYear()
                  
                  return (
                    <button
                      key={day}
                      onClick={() => handleSelectDate(day)}
                      disabled={!isAvailable}
                      className={`
                        p-2 text-center rounded-lg transition-colors
                        ${isSelected ? 'bg-indigo-600 text-white' : ''}
                        ${isAvailable && !isSelected ? 'hover:bg-indigo-100 text-gray-900' : ''}
                        ${!isAvailable ? 'text-gray-300 cursor-not-allowed' : ''}
                      `}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {selectedType && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Tipo:</span> {selectedType.name} ({selectedType.duration_minutes} min)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: Horário */}
          {currentStep === 'time' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Selecione o horário</h2>
                <div className="w-9" />
              </div>

              {selectedDate && (
                <p className="text-center text-gray-600 mb-4 capitalize">
                  {formatDate(selectedDate)}
                </p>
              )}

              {loadingSlots ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Carregando horários...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Nenhum horário disponível nesta data</p>
                  <button
                    onClick={handleBack}
                    className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Escolher outra data
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot, index) => {
                    const isSelected = selectedSlot?.start.getTime() === slot.start.getTime()
                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectSlot(slot)}
                        className={`
                          p-3 text-center rounded-lg border-2 transition-colors
                          ${isSelected 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                          }
                        `}
                      >
                        <span className="font-medium">{formatTime(slot.start)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step: Dados do Cliente */}
          {currentStep === 'info' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Seus dados</h2>
                <div className="w-9" />
              </div>

              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-colors"
                    placeholder="Seu nome"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone/WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-colors"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-gray-400">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-colors"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações <span className="text-gray-400">(opcional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Alguma informação adicional..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={!clientName.trim() || !clientPhone.trim()}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar
                </button>
              </form>
            </div>
          )}

          {/* Step: Confirmação */}
          {currentStep === 'confirm' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Confirmar agendamento</h2>
                <div className="w-9" />
              </div>

              <div className="space-y-4">
                {/* Resumo */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Atendimento</p>
                      <p className="font-medium text-gray-900">{selectedType?.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Data e horário</p>
                      <p className="font-medium text-gray-900 capitalize">
                        {selectedDate && formatDate(selectedDate)} às {selectedSlot && formatTime(selectedSlot.start)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <ClockIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Duração</p>
                      <p className="font-medium text-gray-900">{selectedType?.duration_minutes} minutos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Cliente</p>
                      <p className="font-medium text-gray-900">{clientName}</p>
                      <p className="text-sm text-gray-600">{clientPhone}</p>
                      {clientEmail && <p className="text-sm text-gray-600">{clientEmail}</p>}
                    </div>
                  </div>
                  
                  {notes && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-500">Observações</p>
                      <p className="text-gray-900">{notes}</p>
                    </div>
                  )}
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm">{submitError}</p>
                  </div>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Confirmar Agendamento
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Sucesso */}
          {currentStep === 'success' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h2>
              <p className="text-gray-600 mb-6">
                Seu agendamento foi realizado com sucesso.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-500">Atendimento:</span>{' '}
                    <span className="font-medium">{selectedType?.name}</span>
                  </p>
                  <p className="text-sm capitalize">
                    <span className="text-gray-500">Data:</span>{' '}
                    <span className="font-medium">{selectedDate && formatDate(selectedDate)}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Horário:</span>{' '}
                    <span className="font-medium">{selectedSlot && formatTime(selectedSlot.start)}</span>
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Você pode fechar esta página. Entraremos em contato caso necessário.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-sm text-gray-400">
          Agendamento online powered by <span className="font-medium">Aucta CRM</span>
        </p>
      </div>
    </div>
  )
}

export default PublicBookingPage
