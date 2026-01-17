import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import type { Task } from '../../types'
import { formatDueDateTimePTBR, isOverdueLocal } from '../../utils/date'

interface TasksListDesktopProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask?: (taskId: string) => Promise<void>
  getResponsibleName: (assignedTo?: string) => string
}

/**
 * Versão desktop da lista de tarefas (tabela completa)
 * Preserva a implementação original para telas grandes
 */
export function TasksListDesktop({ 
  tasks, 
  onEditTask, 
  onDeleteTask, 
  getResponsibleName 
}: TasksListDesktopProps) {
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

  const formatDateTime = (dateString: string, timeString?: string) => {
    return formatDueDateTimePTBR(dateString, timeString)
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
    <div className="w-full">
      {/* Cabeçalho da tabela */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1fr_1fr_1.2fr_auto] gap-3 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider justify-items-start">
          <div className="col-span-1 text-left">Tarefa</div>
          <div className="col-span-1 text-left">Lead</div>
          <div className="col-span-1 text-left">Responsável</div>
          <div className="col-span-1 text-left">Status</div>
          <div className="col-span-1 text-left">Prioridade</div>
          <div className="col-span-1 text-left">Vencimento</div>
          <div className="col-span-1 text-left">Ações</div>
        </div>
      </div>

      {/* Lista de tarefas */}
      <div className="bg-white divide-y divide-gray-200">
        {tasks.map((task) => (
          <div key={task.id} className="hover:bg-gray-50 transition-colors">
            <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1fr_1fr_1.2fr_auto] gap-3 px-4 py-4 items-center justify-items-start">
              {/* Tarefa */}
              <div className="col-span-1">
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
              <div className="col-span-1">
                <div className="text-sm text-gray-900 truncate">
                  {task.lead?.name || '—'}
                </div>
              </div>

              {/* Responsável */}
              <div className="col-span-1">
                <div className="flex items-center">
                  <UserIcon className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-900 truncate">
                    {getResponsibleName(task.assigned_to)}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="col-span-1">
                {(() => {
                  const displayStatus = (task.status !== 'concluida' && task.status !== 'cancelada' && isOverdueLocal(task.due_date, task.due_time))
                    ? 'atrasada'
                    : task.status
                  return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                      <span className="capitalize">{displayStatus.replace('_', ' ')}</span>
                    </span>
                  )
                })()}
              </div>

              {/* Prioridade */}
              <div className="col-span-1">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  <span className="capitalize">{task.priority}</span>
                </span>
              </div>

              {/* Vencimento */}
              <div className="col-span-1">
                {task.due_date ? (
                  <div className="flex items-center text-sm text-gray-900">
                    <CalendarIcon className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="truncate">{formatDateTime(task.due_date, task.due_time)}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">—</span>
                )}
              </div>

              {/* Ações */}
              <div className="col-span-1">
                <div className="flex items-center space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => onEditTask(task)}
                    className="text-gray-400 hover:text-orange-600 transition-colors p-1.5"
                    title="Ver detalhes"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  
                  {onDeleteTask && (
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1.5"
                      title="Excluir"
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
  )
}
