import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import type { TaskAnalyticsFilters, TaskStatus, TaskPriority } from '../../types'
import { supabase } from '../../services/supabaseClient'
import { getLocalDateString } from '../../utils/dateHelpers'

interface TaskFilterSelectorProps {
  filters: TaskAnalyticsFilters
  onFiltersChange: (filters: TaskAnalyticsFilters) => void
}

interface User {
  uuid: string
  full_name: string
}

interface Pipeline {
  id: string
  name: string
}

interface TaskType {
  id: string
  name: string
  icon: string
}

export function TaskFilterSelector({ filters, onFiltersChange }: TaskFilterSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingPipelines, setLoadingPipelines] = useState(true)
  const [loadingTaskTypes, setLoadingTaskTypes] = useState(true)

  useEffect(() => {
    loadUsers()
    loadPipelines()
    loadTaskTypes()
  }, [])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      
      // Obter empresa_id do usuário logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('uuid', user.id)
        .single()

      if (profileError || !profile?.empresa_id) return

      const { data, error } = await supabase
        .from('profiles')
        .select('uuid, full_name')
        .eq('empresa_id', profile.empresa_id)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadPipelines = async () => {
    try {
      setLoadingPipelines(true)
      
      // Obter empresa_id do usuário logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('uuid', user.id)
        .single()

      if (profileError || !profile?.empresa_id) return

      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('empresa_id', profile.empresa_id)
        .order('name')

      if (error) throw error
      setPipelines(data || [])
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error)
    } finally {
      setLoadingPipelines(false)
    }
  }

  const loadTaskTypes = async () => {
    try {
      setLoadingTaskTypes(true)
      
      // Obter empresa_id do usuário logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('uuid', user.id)
        .single()

      if (profileError || !profile?.empresa_id) return

      const { data, error } = await supabase
        .from('task_types')
        .select('id, name, icon')
        .eq('empresa_id', profile.empresa_id)
        .eq('active', true)
        .order('name')

      if (error) throw error
      setTaskTypes(data || [])
    } catch (error) {
      console.error('Erro ao carregar tipos de tarefa:', error)
    } finally {
      setLoadingTaskTypes(false)
    }
  }

  const handlePeriodChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      period: {
        ...filters.period,
        [field]: value
      }
    })
  }

  const handleStatusToggle = (status: TaskStatus) => {
    const currentStatuses = filters.status || []
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status]
    
    onFiltersChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined
    })
  }

  const handlePriorityToggle = (priority: TaskPriority) => {
    const currentPriorities = filters.priority || []
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority]
    
    onFiltersChange({
      ...filters,
      priority: newPriorities.length > 0 ? newPriorities : undefined
    })
  }

  const handleUserToggle = (userId: string) => {
    const currentUsers = filters.assigned_to || []
    const newUsers = currentUsers.includes(userId)
      ? currentUsers.filter(id => id !== userId)
      : [...currentUsers, userId]
    
    onFiltersChange({
      ...filters,
      assigned_to: newUsers.length > 0 ? newUsers : undefined
    })
  }

  const handlePipelineToggle = (pipelineId: string) => {
    const currentPipelines = filters.pipeline_id || []
    const newPipelines = currentPipelines.includes(pipelineId)
      ? currentPipelines.filter(id => id !== pipelineId)
      : [...currentPipelines, pipelineId]
    
    onFiltersChange({
      ...filters,
      pipeline_id: newPipelines.length > 0 ? newPipelines : undefined
    })
  }

  const handleTaskTypeToggle = (taskTypeId: string) => {
    const currentTypes = filters.task_type_id || []
    const newTypes = currentTypes.includes(taskTypeId)
      ? currentTypes.filter(id => id !== taskTypeId)
      : [...currentTypes, taskTypeId]
    
    onFiltersChange({
      ...filters,
      task_type_id: newTypes.length > 0 ? newTypes : undefined
    })
  }

  // Presets de período
  const applyPreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const end = new Date()
    const start = new Date()

    switch (preset) {
      case 'today':
        // Sem alteração no start, já é hoje
        break
      case 'week':
        start.setDate(end.getDate() - 6) // 7 dias = hoje + 6 dias atrás
        break
      case 'month':
        start.setDate(end.getDate() - 29) // 30 dias = hoje + 29 dias atrás
        break
      case 'quarter':
        start.setDate(end.getDate() - 89) // 90 dias = hoje + 89 dias atrás
        break
      case 'year':
        start.setDate(end.getDate() - 364) // 365 dias = hoje + 364 dias atrás
        break
    }

    onFiltersChange({
      ...filters,
      period: {
        start: getLocalDateString(start),
        end: getLocalDateString(end)
      }
    })
  }

  const statusLabels: Record<TaskStatus, string> = {
    'pendente': 'Pendente',
    'em_andamento': 'Em Andamento',
    'concluida': 'Concluída',
    'cancelada': 'Cancelada',
    'atrasada': 'Atrasada'
  }

  const priorityLabels: Record<TaskPriority, string> = {
    'baixa': 'Baixa',
    'media': 'Média',
    'alta': 'Alta',
    'urgente': 'Urgente'
  }

  return (
    <div className="space-y-6">
      {/* Período */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Período</label>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="w-4 h-4" />
                Recolher
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4" />
                Expandir
              </>
            )}
          </button>
        </div>

        {/* Presets de Período */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => applyPreset('today')}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => applyPreset('week')}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            7 dias
          </button>
          <button
            onClick={() => applyPreset('month')}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            30 dias
          </button>
          <button
            onClick={() => applyPreset('quarter')}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            90 dias
          </button>
          <button
            onClick={() => applyPreset('year')}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            1 ano
          </button>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Data Inicial</label>
              <input
                type="date"
                value={filters.period.start}
                onChange={(e) => handlePeriodChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Data Final</label>
              <input
                type="date"
                value={filters.period.end}
                onChange={(e) => handlePeriodChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Filtros em duas colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna 1 */}
        <div className="space-y-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="space-y-2">
              {(Object.keys(statusLabels) as TaskStatus[]).map(status => (
                <label key={status} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(filters.status || []).includes(status)}
                    onChange={() => handleStatusToggle(status)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{statusLabels[status]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridade
            </label>
            <div className="space-y-2">
              {(Object.keys(priorityLabels) as TaskPriority[]).map(priority => (
                <label key={priority} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(filters.priority || []).includes(priority)}
                    onChange={() => handlePriorityToggle(priority)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{priorityLabels[priority]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna 2 */}
        <div className="space-y-6">
          {/* Usuários */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuário Atribuído
            </label>
            {loadingUsers ? (
              <div className="text-sm text-gray-500">Carregando usuários...</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {users.map(user => (
                  <label key={user.uuid} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(filters.assigned_to || []).includes(user.uuid)}
                      onChange={() => handleUserToggle(user.uuid)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{user.full_name}</span>
                  </label>
                ))}
                {users.length === 0 && (
                  <div className="text-sm text-gray-500">Nenhum usuário encontrado</div>
                )}
              </div>
            )}
          </div>

          {/* Pipelines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pipeline Associado
            </label>
            {loadingPipelines ? (
              <div className="text-sm text-gray-500">Carregando pipelines...</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pipelines.map(pipeline => (
                  <label key={pipeline.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(filters.pipeline_id || []).includes(pipeline.id)}
                      onChange={() => handlePipelineToggle(pipeline.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{pipeline.name}</span>
                  </label>
                ))}
                {pipelines.length === 0 && (
                  <div className="text-sm text-gray-500">Nenhum pipeline encontrado</div>
                )}
              </div>
            )}
          </div>

          {/* Tipos de Tarefa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Tarefa
            </label>
            {loadingTaskTypes ? (
              <div className="text-sm text-gray-500">Carregando tipos...</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {taskTypes.map(type => (
                  <label key={type.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(filters.task_type_id || []).includes(type.id)}
                      onChange={() => handleTaskTypeToggle(type.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      {type.name}
                    </span>
                  </label>
                ))}
                {taskTypes.length === 0 && (
                  <div className="text-sm text-gray-500">Nenhum tipo encontrado</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dica */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
        <p className="text-xs text-blue-700">
          💡 <strong>Dica:</strong> Use os filtros para refinar sua análise. Deixe em branco para ver todos os dados.
        </p>
      </div>
    </div>
  )
}

