import { useState, useCallback, useMemo } from 'react'
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
    if (filters.status) {
      filtered = filtered.filter(task => task.status === filters.status)
    }

    // Filtro por prioridade
    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority)
    }

    // Filtro por responsável
    if (filters.responsible_uuid) {
      filtered = filtered.filter(task => task.responsible_uuid === filters.responsible_uuid)
    }

    // Filtro por tipo de tarefa
    if (filters.task_type_id) {
      filtered = filtered.filter(task => task.task_type_id === filters.task_type_id)
    }

    // Filtro por lead
    if (filters.lead_id) {
      filtered = filtered.filter(task => task.lead_id === filters.lead_id)
    }

    // Filtro por data de vencimento
    if (filters.due_date_start) {
      const startDate = new Date(filters.due_date_start)
      filtered = filtered.filter(task => 
        task.due_date && new Date(task.due_date) >= startDate
      )
    }

    if (filters.due_date_end) {
      const endDate = new Date(filters.due_date_end)
      filtered = filtered.filter(task => 
        task.due_date && new Date(task.due_date) <= endDate
      )
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
      return new Date(task.due_date) < now
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
    return Object.keys(filters).length > 0 || searchTerm.trim().length > 0
  }, [filters, searchTerm])

  // Obter resumo dos filtros
  const getFilterSummary = useMemo(() => {
    const summary: string[] = []
    
    if (searchTerm.trim()) {
      summary.push(`Busca: "${searchTerm}"`)
    }
    
    if (filters.status) {
      summary.push(`Status: ${filters.status}`)
    }
    
    if (filters.priority) {
      summary.push(`Prioridade: ${filters.priority}`)
    }
    
    if (filters.responsible_uuid) {
      summary.push('Com responsável específico')
    }
    
    if (filters.task_type_id) {
      summary.push('Tipo específico')
    }
    
    if (filters.lead_id) {
      summary.push('Lead específico')
    }
    
    if (filters.due_date_start || filters.due_date_end) {
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
