import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  TrashIcon,
  CheckCircleIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import type { Task } from '../../types'

interface TasksListProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask?: (taskId: string) => Promise<void>
  getResponsibleName: (assignedTo?: string) => string
}

export function TasksList({ tasks, onEditTask, onDeleteTask, getResponsibleName }: TasksListProps) {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'baixa': return 'bg-gray-100 text-gray-800'
      case 'media': return 'bg-yellow-100 text-yellow-800'
      case 'alta': return 'bg-orange-100 text-orange-800'
      case 'urgente': return 'bg-red-100 text-red-800'
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

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(dateString).toLocaleDateString('pt-BR')
    if (timeString) {
      return `${date} às ${timeString}`
    }
    return date
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto text-gray-400 mb-4">
          <ClockIcon className="w-full h-full" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhuma tarefa encontrada
        </h3>
        <p className="text-gray-600">
          Não há tarefas que correspondam aos filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <div className="min-w-full">
        {/* Cabeçalho da tabela */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Tarefa</div>
            <div className="col-span-2">Lead</div>
            <div className="col-span-2">Responsável</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Prioridade</div>
            <div className="col-span-2">Vencimento</div>
            <div className="col-span-1">Ações</div>
          </div>
        </div>

        {/* Lista de tarefas */}
        <div className="bg-white divide-y divide-gray-200">
          {tasks.map((task) => (
            <div key={task.id} className="hover:bg-gray-50 transition-colors">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                {/* Tarefa */}
                <div className="col-span-3">
                  <div className="flex items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                          {task.description}
                        </p>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800"
                            >
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
                </div>

                {/* Lead */}
                <div className="col-span-2">
                  <div className="text-sm text-gray-900 truncate">
                    {task.lead?.name || '—'}
                  </div>
                </div>

                {/* Responsável */}
                <div className="col-span-2">
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900 truncate">
                      {getResponsibleName(task.assigned_to)}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
                  </span>
                </div>

                {/* Prioridade */}
                <div className="col-span-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority === 'urgente' && <ExclamationTriangleIcon className="w-3 h-3 mr-1" />}
                    <span className="capitalize">{task.priority}</span>
                  </span>
                </div>

                {/* Vencimento */}
                <div className="col-span-2">
                  {task.due_date ? (
                    <div className="flex items-center text-sm text-gray-900">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{formatDateTime(task.due_date, task.due_time)}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Sem prazo</span>
                  )}
                </div>

                {/* Ações */}
                <div className="col-span-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                      title="Visualizar/Editar tarefa"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    
                    {onDeleteTask && (
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Excluir tarefa"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
