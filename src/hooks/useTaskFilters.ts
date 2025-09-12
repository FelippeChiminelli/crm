import { useState, useCallback, useMemo } from 'react'
import { getEndOfDayLocal, getStartOfDayLocal, isOverdueLocal } from '../utils/date'
import type { Task, TaskFilters, TaskPriority, TaskStatus } from '../types'

/**
 * Hook para gerenciar filtros e busca de tarefas
 * Separado do useTasksLogic para melhor organização
 */

interface UseTaskFiltersProps {
  initialFilters?: TaskFilters
}

export function useTaskFilters({ initialFilters = {} }: UseTaskFiltersProps = {}) {
  const [filters, setFilters] = useState<TaskFilters>(initialFilters)
  const [searchTerm, setSearchTerm] = useState('')

  // Limpar filtros
  const clearFilters = useCallback(() => {
    setFilters({})
    setSearchTerm('')
  }, [])

  // Atualizar filtro específico
  const updateFilter = useCallback(<K extends keyof TaskFilters>(
    key: K, 
    value: TaskFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Filtrar tarefas localmente
  const filterTasks = useCallback((tasks: Task[]): Task[] => {
    let filtered = [...tasks]

    // Filtro por termo de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(task => 
        task.title?.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term)
      )
    }

    // Filtro por status
    if (filters.status?.length) {
      filtered = filtered.filter(task => filters.status!.includes(task.status))
    }

    // Filtro por prioridade
    if (filters.priority?.length) {
      filtered = filtered.filter(task => filters.priority!.includes(task.priority))
    }

    // Filtro por responsável (assigned_to)
    if (filters.assigned_to?.length) {
      filtered = filtered.filter(task => task.assigned_to && filters.assigned_to!.includes(task.assigned_to))
    }

    // Filtro por tipo de tarefa
    if (filters.task_type_id?.length) {
      filtered = filtered.filter(task => task.task_type_id && filters.task_type_id!.includes(task.task_type_id))
    }

    // Filtro por lead
    if (filters.lead_id?.length) {
      filtered = filtered.filter(task => task.lead_id && filters.lead_id!.includes(task.lead_id))
    }

    // Filtro por data de vencimento
    if (filters.due_date_from) {
      const startDate = getStartOfDayLocal(filters.due_date_from)
      filtered = filtered.filter(task => {
        if (!task.due_date) return false
        const dueComparable = getEndOfDayLocal(task.due_date)
        return !!startDate && !!dueComparable && dueComparable >= startDate
      })
    }

    if (filters.due_date_to) {
      const endDate = getEndOfDayLocal(filters.due_date_to)
      filtered = filtered.filter(task => {
        if (!task.due_date) return false
        const dueComparable = getEndOfDayLocal(task.due_date)
        return !!endDate && !!dueComparable && dueComparable <= endDate
      })
    }

    return filtered
  }, [filters, searchTerm])

  // Contar tarefas por status
  const getTaskCountsByStatus = useCallback((tasks: Task[]) => {
    const filtered = filterTasks(tasks)
    
    return {
      total: filtered.length,
      pendente: filtered.filter(t => t.status === 'pendente').length,
      em_andamento: filtered.filter(t => t.status === 'em_andamento').length,
      concluida: filtered.filter(t => t.status === 'concluida').length,
      atrasada: filtered.filter(t => t.status === 'atrasada').length,
      cancelada: filtered.filter(t => t.status === 'cancelada').length
    }
  }, [filterTasks])

  // Contar tarefas por prioridade
  const getTaskCountsByPriority = useCallback((tasks: Task[]) => {
    const filtered = filterTasks(tasks)
    
    return {
      baixa: filtered.filter(t => t.priority === 'baixa').length,
      media: filtered.filter(t => t.priority === 'media').length,
      alta: filtered.filter(t => t.priority === 'alta').length,
      urgente: filtered.filter(t => t.priority === 'urgente').length
    }
  }, [filterTasks])

  // Obter tarefas em atraso
  const getOverdueTasks = useCallback((tasks: Task[]): Task[] => {
    const now = new Date()
    return filterTasks(tasks).filter(task => {
      if (!task.due_date) return false
      if (task.status === 'concluida' || task.status === 'cancelada') return false
      return isOverdueLocal(task.due_date, task.due_time, now)
    })
  }, [filterTasks])

  // Obter tarefas por status específico
  const getTasksByStatus = useCallback((tasks: Task[], status: TaskStatus): Task[] => {
    return filterTasks(tasks).filter(task => task.status === status)
  }, [filterTasks])

  // Obter tarefas por prioridade específica
  const getTasksByPriority = useCallback((tasks: Task[], priority: TaskPriority): Task[] => {
    return filterTasks(tasks).filter(task => task.priority === priority)
  }, [filterTasks])

  // Verificar se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    return (
      (filters.status?.length || 0) > 0 ||
      (filters.priority?.length || 0) > 0 ||
      (filters.assigned_to?.length || 0) > 0 ||
      (filters.created_by?.length || 0) > 0 ||
      (filters.task_type_id?.length || 0) > 0 ||
      (filters.lead_id?.length || 0) > 0 ||
      (filters.pipeline_id?.length || 0) > 0 ||
      !!filters.due_date_from ||
      !!filters.due_date_to ||
      (filters.search?.trim().length || 0) > 0 ||
      (filters.tags?.length || 0) > 0 ||
      searchTerm.trim().length > 0
    )
  }, [filters, searchTerm])

  // Obter resumo dos filtros
  const getFilterSummary = useMemo(() => {
    const summary: string[] = []
    
    if (searchTerm.trim()) {
      summary.push(`Busca: "${searchTerm}"`)
    }
    
    if (filters.status?.length) {
      summary.push(`Status: ${filters.status.join(', ')}`)
    }
    
    if (filters.priority?.length) {
      summary.push(`Prioridade: ${filters.priority.join(', ')}`)
    }
    
    if (filters.assigned_to?.length) {
      summary.push('Com responsável específico')
    }
    
    if (filters.task_type_id?.length) {
      summary.push('Tipo específico')
    }
    
    if (filters.lead_id?.length) {
      summary.push('Lead específico')
    }
    
    if (filters.due_date_from || filters.due_date_to) {
      summary.push('Período específico')
    }
    
    return summary
  }, [filters, searchTerm])

  return {
    // Estado
    filters,
    searchTerm,
    hasActiveFilters,
    
    // Setters
    setFilters,
    setSearchTerm,
    updateFilter,
    clearFilters,
    
    // Funções de filtro
    filterTasks,
    getTaskCountsByStatus,
    getTaskCountsByPriority,
    getOverdueTasks,
    getTasksByStatus,
    getTasksByPriority,
    
    // Utilitários
    getFilterSummary
  }
}
