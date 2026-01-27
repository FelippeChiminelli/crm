import { useState, useCallback, useEffect } from 'react'
import type {
  BookingCalendar, Booking, BookingType, BookingCalendarOwner,
  BookingAvailability, AvailableSlot,
  CreateBookingCalendarData, UpdateBookingCalendarData,
  CreateBookingTypeData, UpdateBookingTypeData,
  CreateBookingCalendarOwnerData, UpdateBookingCalendarOwnerData,
  CreateBookingData, UpdateBookingData, BookingFilters
} from '../types'
import {
  getBookingCalendars, getBookingCalendarWithDetails,
  createBookingCalendar, updateBookingCalendar, deleteBookingCalendar,
  getCalendarOwners, addCalendarOwner, updateCalendarOwner, removeCalendarOwner,
  getCalendarAvailability, setCalendarAvailability,
  getBookingTypes, createBookingType, updateBookingType, deleteBookingType,
  getBookings, createBooking, updateBooking, cancelBooking, completeBooking, markNoShow,
  getAvailableSlots
} from '../services/bookingService'
import { useToastContext } from '../contexts/ToastContext'

export function useBookingLogic() {
  const { showSuccess, showError } = useToastContext()

  // ===================== Estados =====================
  const [calendars, setCalendars] = useState<BookingCalendar[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<BookingCalendar | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([])
  const [owners, setOwners] = useState<BookingCalendarOwner[]>([])
  const [availability, setAvailability] = useState<BookingAvailability[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])

  // Loading states
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filters, setFilters] = useState<BookingFilters>({})

  // Pagination
  const [totalBookings, setTotalBookings] = useState(0)
  const [bookingsPage, setBookingsPage] = useState(1)

  // ===================== Calendários =====================

  const loadCalendars = useCallback(async () => {
    setLoadingCalendars(true)
    setError(null)
    try {
      const result = await getBookingCalendars({ is_active: true })
      setCalendars(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar agendas'
      setError(message)
      showError(message)
    } finally {
      setLoadingCalendars(false)
    }
  }, [showError])

  const loadCalendarDetails = useCallback(async (id: string) => {
    setLoadingCalendars(true)
    try {
      const calendar = await getBookingCalendarWithDetails(id)
      setSelectedCalendar(calendar)
      setOwners(calendar.owners || [])
      setAvailability(calendar.availability || [])
      setBookingTypes(calendar.booking_types || [])
      return calendar
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar detalhes da agenda'
      showError(message)
      throw err
    } finally {
      setLoadingCalendars(false)
    }
  }, [showError])

  const handleCreateCalendar = useCallback(async (data: CreateBookingCalendarData) => {
    setSaving(true)
    try {
      const created = await createBookingCalendar(data)
      setCalendars(prev => [...prev, created])
      showSuccess('Agenda criada com sucesso!')
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar agenda'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  const handleUpdateCalendar = useCallback(async (id: string, data: UpdateBookingCalendarData) => {
    setSaving(true)
    try {
      const updated = await updateBookingCalendar(id, data)
      setCalendars(prev => prev.map(c => c.id === id ? updated : c))
      if (selectedCalendar?.id === id) {
        setSelectedCalendar(prev => prev ? { ...prev, ...updated } : null)
      }
      showSuccess('Agenda atualizada com sucesso!')
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar agenda'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [selectedCalendar, showSuccess, showError])

  const handleDeleteCalendar = useCallback(async (id: string) => {
    setSaving(true)
    try {
      await deleteBookingCalendar(id)
      setCalendars(prev => prev.filter(c => c.id !== id))
      if (selectedCalendar?.id === id) {
        setSelectedCalendar(null)
      }
      showSuccess('Agenda excluída com sucesso!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir agenda'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [selectedCalendar, showSuccess, showError])

  // ===================== Owners =====================

  const loadOwners = useCallback(async (calendar_id: string) => {
    try {
      const data = await getCalendarOwners(calendar_id)
      setOwners(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar responsáveis'
      showError(message)
      throw err
    }
  }, [showError])

  const handleAddOwner = useCallback(async (calendar_id: string, data: CreateBookingCalendarOwnerData) => {
    setSaving(true)
    try {
      const created = await addCalendarOwner(calendar_id, data)
      setOwners(prev => [...prev, created])
      showSuccess('Responsável adicionado!')
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar responsável'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  const handleUpdateOwner = useCallback(async (id: string, data: UpdateBookingCalendarOwnerData) => {
    setSaving(true)
    try {
      const updated = await updateCalendarOwner(id, data)
      setOwners(prev => prev.map(o => o.id === id ? updated : o))
      showSuccess('Responsável atualizado!')
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar responsável'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  const handleRemoveOwner = useCallback(async (id: string) => {
    setSaving(true)
    try {
      await removeCalendarOwner(id)
      setOwners(prev => prev.filter(o => o.id !== id))
      showSuccess('Responsável removido!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover responsável'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  // ===================== Disponibilidade =====================

  const loadAvailability = useCallback(async (calendar_id: string) => {
    try {
      const data = await getCalendarAvailability(calendar_id)
      setAvailability(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar disponibilidade'
      showError(message)
      throw err
    }
  }, [showError])

  const handleSetAvailability = useCallback(async (
    calendar_id: string, 
    data: Omit<BookingAvailability, 'id' | 'calendar_id' | 'created_at'>[]
  ) => {
    setSaving(true)
    try {
      const updated = await setCalendarAvailability(calendar_id, data)
      setAvailability(updated)
      showSuccess('Horários salvos com sucesso!')
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar horários'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  // ===================== Tipos de Atendimento =====================

  const loadBookingTypes = useCallback(async (calendar_id: string) => {
    try {
      const data = await getBookingTypes(calendar_id)
      setBookingTypes(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar tipos de atendimento'
      showError(message)
      throw err
    }
  }, [showError])

  const handleCreateBookingType = useCallback(async (data: CreateBookingTypeData) => {
    setSaving(true)
    try {
      const created = await createBookingType(data)
      setBookingTypes(prev => [...prev, created])
      showSuccess('Tipo de atendimento criado!')
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar tipo de atendimento'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  const handleUpdateBookingType = useCallback(async (id: string, data: UpdateBookingTypeData) => {
    setSaving(true)
    try {
      const updated = await updateBookingType(id, data)
      setBookingTypes(prev => prev.map(t => t.id === id ? updated : t))
      showSuccess('Tipo de atendimento atualizado!')
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar tipo de atendimento'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  const handleDeleteBookingType = useCallback(async (id: string) => {
    setSaving(true)
    try {
      await deleteBookingType(id)
      setBookingTypes(prev => prev.filter(t => t.id !== id))
      showSuccess('Tipo de atendimento excluído!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir tipo de atendimento'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  // ===================== Agendamentos =====================

  const loadBookings = useCallback(async (customFilters?: BookingFilters) => {
    setLoadingBookings(true)
    try {
      const result = await getBookings({
        ...filters,
        ...customFilters,
        page: bookingsPage,
        limit: 25
      })
      setBookings(result.data)
      setTotalBookings(result.total)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar agendamentos'
      showError(message)
    } finally {
      setLoadingBookings(false)
    }
  }, [filters, bookingsPage, showError])

  const handleCreateBooking = useCallback(async (data: CreateBookingData) => {
    setSaving(true)
    try {
      const created = await createBooking(data)
      setBookings(prev => [created, ...prev])
      showSuccess('Agendamento criado com sucesso!')
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar agendamento'
      showError(message)
      return null
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  const handleUpdateBooking = useCallback(async (id: string, data: UpdateBookingData) => {
    setSaving(true)
    try {
      const updated = await updateBooking(id, data)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b))
      showSuccess('Agendamento atualizado!')
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar agendamento'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  const handleCancelBooking = useCallback(async (id: string, reason?: string) => {
    setSaving(true)
    try {
      const updated = await cancelBooking(id, reason)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
      showSuccess('Agendamento cancelado!')
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar agendamento'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  const handleCompleteBooking = useCallback(async (id: string) => {
    setSaving(true)
    try {
      const updated = await completeBooking(id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'completed' } : b))
      showSuccess('Agendamento concluído!')
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao concluir agendamento'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  const handleMarkNoShow = useCallback(async (id: string) => {
    setSaving(true)
    try {
      const updated = await markNoShow(id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'no_show' } : b))
      showSuccess('Marcado como não compareceu!')
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao marcar não comparecimento'
      showError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])

  // ===================== Slots Disponíveis =====================

  const loadAvailableSlots = useCallback(async (
    calendar_id: string, 
    booking_type_id: string, 
    date: string
  ) => {
    setLoadingSlots(true)
    try {
      const slots = await getAvailableSlots(calendar_id, booking_type_id, date)
      setAvailableSlots(slots)
      return slots
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar horários disponíveis'
      showError(message)
      setAvailableSlots([])
      return []
    } finally {
      setLoadingSlots(false)
    }
  }, [showError])

  const clearAvailableSlots = useCallback(() => {
    setAvailableSlots([])
  }, [])

  // ===================== Effects =====================

  // Carregar calendários ao montar
  useEffect(() => {
    loadCalendars()
  }, [loadCalendars])

  // Recarregar bookings quando filtros ou página mudarem
  useEffect(() => {
    if (filters.calendar_id) {
      loadBookings()
    }
  }, [filters, bookingsPage, loadBookings])

  // ===================== Return =====================

  return {
    // Estados
    calendars,
    selectedCalendar,
    setSelectedCalendar,
    bookings,
    bookingTypes,
    owners,
    availability,
    availableSlots,

    // Loading
    loadingCalendars,
    loadingBookings,
    loadingSlots,
    saving,
    error,

    // Filtros e paginação
    filters,
    setFilters,
    totalBookings,
    bookingsPage,
    setBookingsPage,

    // Calendários
    loadCalendars,
    loadCalendarDetails,
    handleCreateCalendar,
    handleUpdateCalendar,
    handleDeleteCalendar,

    // Owners
    loadOwners,
    handleAddOwner,
    handleUpdateOwner,
    handleRemoveOwner,

    // Disponibilidade
    loadAvailability,
    handleSetAvailability,

    // Tipos de atendimento
    loadBookingTypes,
    handleCreateBookingType,
    handleUpdateBookingType,
    handleDeleteBookingType,

    // Agendamentos
    loadBookings,
    handleCreateBooking,
    handleUpdateBooking,
    handleCancelBooking,
    handleCompleteBooking,
    handleMarkNoShow,

    // Slots
    loadAvailableSlots,
    clearAvailableSlots
  }
}
