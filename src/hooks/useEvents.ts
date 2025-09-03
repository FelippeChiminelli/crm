import { useState, useEffect, useCallback, useRef } from 'react'
import type { Event, EventFilters, Task } from '../types'
import { getEvents } from '../services/eventService'
import { getTasksWithDates } from '../services/taskService'
import { taskToCalendarEvent, eventToCalendarEvent, type CalendarEvent } from '../utils/calendarHelpers'

export function useEvents(initialFilters: EventFilters = {}) {
  const [events, setEvents] = useState<Event[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<EventFilters>(initialFilters)

  // Ref para controlar se o componente ainda está montado
  const isMountedRef = useRef(true)

  // Cleanup quando componente desmonta
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchEvents = useCallback(async (overrideFilters?: EventFilters) => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📅 Buscando eventos e tarefas para agenda...')
      console.log('🔍 Filtros aplicados:', overrideFilters || filters)
      
      // Buscar eventos e tarefas em paralelo
      const [eventsResult, tasksResult] = await Promise.all([
        getEvents(overrideFilters || filters),
        getTasksWithDates() // Buscar apenas tarefas com data
      ])

      console.log('📊 Resultado bruto dos eventos:', eventsResult)
      console.log('📊 Resultado bruto das tarefas:', tasksResult)

      if (eventsResult.error) {
        console.error('❌ Erro no service de eventos:', eventsResult.error)
        // Não lançar erro, apenas usar array vazio
        eventsResult.data = []
      }
      
      console.log('🔍 Processando dados dos eventos...')
      const fetchedEvents = eventsResult.data || []
      
      console.log('🔍 Processando dados das tarefas...')
      // Como getTasksWithDates retorna Promise<Task[]>, tasksResult é Task[]
      const fetchedTasks = tasksResult || []
      
      console.log(`✅ ${fetchedEvents.length} eventos e ${fetchedTasks.length} tarefas encontrados`)
      console.log('📝 Eventos encontrados:', fetchedEvents)
      console.log('📝 Tarefas encontradas:', fetchedTasks)
      
      console.log('🔄 Definindo estados...')
      setEvents(fetchedEvents)
      setTasks(fetchedTasks)
      console.log('✅ Estados definidos')

      console.log('🔄 Iniciando conversão para formato do calendário...')
      
      // Converter para formato do calendário com tratamento de erro individual
      console.log('🔄 Convertendo eventos...')
      let convertedEvents: CalendarEvent[] = []
      try {
        convertedEvents = fetchedEvents.map(eventToCalendarEvent)
        console.log('✅ Eventos convertidos:', convertedEvents.length)
      } catch (eventError) {
        console.error('❌ Erro ao converter eventos:', eventError)
        convertedEvents = [] // Usar array vazio se falhar
      }
      
      console.log('🔄 Convertendo tarefas...')
      let convertedTasks: CalendarEvent[] = []
      try {
        convertedTasks = fetchedTasks.map(taskToCalendarEvent)
        console.log('✅ Tarefas convertidas:', convertedTasks.length)
      } catch (taskError) {
        console.error('❌ Erro ao converter tarefas:', taskError)
        convertedTasks = [] // Usar array vazio se falhar
      }
      
      const allCalendarEvents = [...convertedEvents, ...convertedTasks]
      
      console.log(`📊 Total de ${allCalendarEvents.length} itens no calendário`)
      console.log('📅 Eventos do calendário:', allCalendarEvents)
      console.log('🔄 Definindo calendarEvents no estado...')
      setCalendarEvents(allCalendarEvents)
      console.log('✅ Estado atualizado com sucesso!')

    } catch (err: any) {
      console.error('❌ Erro ao carregar eventos/tarefas:', err)
      setError(err.message || 'Erro ao carregar eventos')
      // Definir arrays vazios para não quebrar a interface
      setEvents([])
      setTasks([])
      setCalendarEvents([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Para atualização manual
  const refetch = useCallback(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events, // Eventos puros
    tasks, // Tarefas puras
    calendarEvents, // Eventos combinados para o calendário
    loading,
    error,
    filters,
    setFilters,
    refetch
  }
}