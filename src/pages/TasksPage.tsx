import { useState, useMemo, useEffect } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { MainLayout } from '../components/layout/MainLayout'
import { useTasksLogic } from '../hooks/useTasksLogic'
import { NewTaskModal } from '../components/tasks/NewTaskModal'
import { TaskViewModeSelector, TasksList, TasksStats, TasksFilters } from '../components'
import EditTaskModal from '../components/tasks/EditTaskModal'
import { ds, statusColors } from '../utils/designSystem'
import type { Task } from '../types'
import type { TaskViewMode } from '../components/tasks/TaskViewModeSelector'
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  UserIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { getAllProfiles } from '../services/profileService'

// Tipos para filtros e ordenação
type SortBy = 'created_at' | 'due_date' | 'priority' | 'status'
type SortOrder = 'asc' | 'desc'

export default function TasksPage() {
  // Estado para o modo de visualização
  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    const saved = localStorage.getItem('tasks-view-mode')
    return (saved as TaskViewMode) || 'cards'
  })

  const {
    tasks,
    loading,
    error,
    updateTaskData,
    loadTasks
  } = useTasksLogic()

  // Estados para filtros e visualização
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortBy>('due_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [profiles, setProfiles] = useState<{ uuid: string; full_name: string; email: string }[]>([])

  // Estados para modais
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<any>(null)

  // Função para recarregar tarefas após criação
  const handleTaskCreated = async () => {
    console.log('🔄 Recarregando tarefas após criação...')
    try {
      await loadTasks()
      console.log('✅ Tarefas recarregadas com sucesso')
    } catch (error) {
      console.error('❌ Erro ao recarregar tarefas:', error)
    }
  }

  // Carregar perfis quando a página carregar
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const { data: profilesData, error } = await getAllProfiles()
        if (error) throw new Error(error.message)
        setProfiles(profilesData || [])
      } catch (err) {
        console.error('Erro ao carregar perfis:', err)
      }
    }

    loadProfiles()
  }, [])

  // Função para abrir modal de criação
  const openNewTaskModal = () => {
    setShowNewTaskModal(true)
  }

  // Função para fechar modal de criação
  const closeNewTaskModal = () => {
    setShowNewTaskModal(false)
  }

  // Função para abrir modal de edição
  const handleEditTask = (task: any) => {
    setSelectedTaskForEdit(task)
    setShowEditTaskModal(true)
  }

  // Função para fechar modal de edição
  const closeEditTaskModal = () => {
    setShowEditTaskModal(false)
    setSelectedTaskForEdit(null)
  }

  // Função para submeter edição da tarefa
  const submitEditTask = async (taskData: any) => {
    try {
      await updateTaskData(selectedTaskForEdit.id, taskData)
      closeEditTaskModal()
      await loadTasks()
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
    }
  }

  // Função para obter o nome do responsável
  const getResponsibleName = (assignedTo?: string) => {
    if (!assignedTo) return 'Não atribuído'
    const profile = profiles.find(p => p.uuid === assignedTo)
    return profile?.full_name || 'Usuário não encontrado'
  }

  // Função para alterar o modo de visualização
  const handleViewModeChange = (mode: TaskViewMode) => {
    setViewMode(mode)
    localStorage.setItem('tasks-view-mode', mode)
  }

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setSortBy('due_date')
    setSortOrder('asc')
  }

  // Filtrar e ordenar tarefas
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Filtro por busca
      if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Filtro por status
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false
      }

      // Filtro por prioridade
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false
      }

      return true
    })

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'due_date':
          if (!a.due_date && !b.due_date) comparison = 0
          else if (!a.due_date) comparison = 1
          else if (!b.due_date) comparison = -1
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          break
        case 'priority':
          const priorities = { 'baixa': 1, 'media': 2, 'alta': 3, 'urgente': 4 }
          comparison = (priorities[a.priority as keyof typeof priorities] || 0) - 
                      (priorities[b.priority as keyof typeof priorities] || 0)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [tasks, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder])

  // Renderizar card de tarefa
  const renderTaskCard = (task: Task) => {
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'baixa': return 'bg-gray-100 text-gray-700'
        case 'media': return 'bg-yellow-100 text-yellow-700'
        case 'alta': return 'bg-orange-100 text-orange-700'
        case 'urgente': return 'bg-red-100 text-red-700'
        default: return 'bg-gray-100 text-gray-700'
      }
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pendente': return 'bg-yellow-100 text-yellow-800'
        case 'em_andamento': return 'bg-blue-100 text-blue-800'
        case 'concluida': return 'bg-green-100 text-green-800'
        case 'cancelada': return 'bg-red-100 text-red-800'
        case 'atrasada': return 'bg-red-100 text-red-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'pendente': return <ClockIcon className="w-4 h-4" />
        case 'em_andamento': return <PlayIcon className="w-4 h-4" />
        case 'concluida': return <CheckCircleIcon className="w-4 h-4" />
        case 'cancelada': return <ExclamationTriangleIcon className="w-4 h-4" />
        case 'atrasada': return <ExclamationTriangleIcon className="w-4 h-4" />
        default: return <ClockIcon className="w-4 h-4" />
      }
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('pt-BR')
    }

    return (
      <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-medium text-gray-900 text-sm leading-tight pr-2">
            {task.title}
          </h4>
          <button
            onClick={() => handleEditTask(task)}
            className="text-gray-400 hover:text-orange-600 flex-shrink-0"
            title="Visualizar/Editar tarefa"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
        </div>
        
        {task.description && (
          <p className="text-gray-600 text-xs mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="space-y-2">
          {/* Lead relacionado */}
          <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Lead: </span>
            <span className="text-gray-900">{task.lead?.name || '—'}</span>
          </div>
          {/* Status e Prioridade */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {getStatusIcon(task.status)}
              <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
            </span>
            
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority === 'urgente' && <ExclamationTriangleIcon className="w-3 h-3 inline mr-1" />}
              {task.priority}
            </span>
          </div>

          {/* Data de vencimento */}
          {task.due_date && (
            <div className="flex items-center text-xs text-gray-500">
              <ClockIcon className="w-3 h-3 mr-1" />
              {formatDate(task.due_date)}
              {task.due_time && ` às ${task.due_time}`}
            </div>
          )}

          {/* Responsável */}
          <div className="flex items-center text-xs text-gray-500">
            <UserIcon className="w-3 h-3 mr-1" />
            <span className="truncate">
              {getResponsibleName(task.assigned_to)}
            </span>
          </div>
          
          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">
                  {tag}
                </span>
              ))}
              {task.tags.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{task.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className={ds.pageContent()}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando tarefas...</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className={ds.pageContent()}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-4">
                <div className={`${statusColors.error.bg} ${statusColors.error.border} border rounded-lg p-6`}>
                  <p className={`${statusColors.error.text} mb-4 font-medium`}>Erro ao carregar tarefas: {error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className={ds.button('primary')}
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 overflow-hidden">
        {/* Cabeçalho */}
        <div className={ds.card()}>
          <div className={ds.header()}>
            <div>
              <h1 className={ds.headerTitle()}>Tarefas</h1>
              <p className={ds.headerSubtitle()}>Gerencie suas tarefas e acompanhe o progresso</p>
            </div>
            <div className="flex items-center space-x-4">
              <TaskViewModeSelector
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
              <button 
                onClick={openNewTaskModal}
                className={ds.headerAction()}
              >
                <PlusIcon className="w-5 h-5" />
                Nova Tarefa
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className={ds.card()}>
          <TasksStats tasks={tasks} />
        </div>

        {/* Filtros */}
        <TasksFilters
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          onSortByChange={(value) => setSortBy(value as SortBy)}
          onSortOrderChange={(value) => setSortOrder(value as SortOrder)}
          onClearFilters={clearFilters}
        />

        {/* Grid/Lista de Tarefas */}
        <div className={`${ds.card()} flex-1 min-h-0 flex flex-col max-h-[calc(100vh-400px)]`}>
          <div 
            className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6'
            }}
          >
            {viewMode === 'cards' ? (
              /* Visualização em Cards */
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedTasks.map(renderTaskCard)}
                </div>
                
                {filteredAndSortedTasks.length === 0 && (
                  <div className="text-center py-12">
                    <div className={`${statusColors.secondary.bg} rounded-lg p-6 inline-block`}>
                      <p className="text-gray-700 font-medium mb-2">Nenhuma tarefa encontrada</p>
                      <p className="text-gray-600 text-sm">
                        {tasks.length === 0 
                          ? 'Crie sua primeira tarefa para começar.'
                          : 'Tente ajustar os filtros ou busca.'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Visualização em Lista */
              <TasksList
                tasks={filteredAndSortedTasks}
                onEditTask={handleEditTask}
                getResponsibleName={getResponsibleName}
              />
            )}
          </div>
        </div>

        {/* Modals */}
        <NewTaskModal
          isOpen={showNewTaskModal}
          onClose={closeNewTaskModal}
          onTaskCreated={handleTaskCreated}
        />

        <EditTaskModal
          isOpen={showEditTaskModal}
          onClose={closeEditTaskModal}
          task={selectedTaskForEdit}
          onSubmit={submitEditTask}
        />
      </div>
    </MainLayout>
  )
}
