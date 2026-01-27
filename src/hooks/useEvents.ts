import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task, Booking } from '../types'
import { getTasksWithDates } from '../services/taskService'
import { getBookings } from '../services/bookingService'
import { taskToCalendarEvent, bookingToCalendarEvent, type CalendarEvent } from '../utils/calendarHelpers'

export function useEvents() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref para controlar se o componente ainda está montado
  const isMountedRef = useRef(true)

  // Cleanup quando componente desmonta
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📅 Buscando tarefas e agendamentos para agenda...')
      
      // Buscar tarefas e bookings em paralelo
      const [tasksResult, bookingsResult] = await Promise.all([
        getTasksWithDates(), // Buscar apenas tarefas com data
        getBookings({ status: ['pending', 'confirmed', 'completed'] }) // Buscar agendamentos ativos e concluídos
      ])

      console.log('📊 Resultado bruto das tarefas:', tasksResult)
      console.log('📊 Resultado bruto dos bookings:', bookingsResult)

      const fetchedTasks = tasksResult || []
      const fetchedBookings = bookingsResult.data || []
      
      console.log(`✅ ${fetchedTasks.length} tarefas e ${fetchedBookings.length} agendamentos encontrados`)
      
      setTasks(fetchedTasks)
      setBookings(fetchedBookings)

      console.log('🔄 Iniciando conversão para formato do calendário...')
      
      // Converter tarefas
      let convertedTasks: CalendarEvent[] = []
      try {
        convertedTasks = fetchedTasks.map(taskToCalendarEvent)
        console.log('✅ Tarefas convertidas:', convertedTasks.length)
      } catch (taskError) {
        console.error('❌ Erro ao converter tarefas:', taskError)
        convertedTasks = []
      }
      
      // Converter bookings
      let convertedBookings: CalendarEvent[] = []
      try {
        convertedBookings = fetchedBookings.map(bookingToCalendarEvent)
        console.log('✅ Agendamentos convertidos:', convertedBookings.length)
      } catch (bookingError) {
        console.error('❌ Erro ao converter agendamentos:', bookingError)
        convertedBookings = []
      }
      
      const allCalendarEvents = [...convertedTasks, ...convertedBookings]
      
      console.log(`📊 Total de ${allCalendarEvents.length} itens no calendário`)
      setCalendarEvents(allCalendarEvents)
      console.log('✅ Estado atualizado com sucesso!')

    } catch (err: any) {
      console.error('❌ Erro ao carregar tarefas/agendamentos:', err)
      setError(err.message || 'Erro ao carregar dados')
      setTasks([])
      setBookings([])
      setCalendarEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Para atualização manual
  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    tasks, // Tarefas puras
    bookings, // Agendamentos puros
    calendarEvents, // Itens combinados para o calendário (tarefas + bookings)
    loading,
    error,
    refetch
  }
}