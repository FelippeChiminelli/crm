import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import type { Task } from '../../types'
import { formatDueDateTimePTBR, isOverdueLocal } from '../../utils/date'
import { cn } from '../../utils/designSystem'

interface TasksListMobileProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask?: (taskId: string) => Promise<void>
  getResponsibleName: (assignedTo?: string) => string
}

/**
 * Versão mobile-friendly da lista de tarefas
 * Exibe tarefas em cards verticais com prioridade visual para status e vencimento
 */
export function TasksListMobile({ 
  tasks, 
  onEditTask, 
  onDeleteTask, 
  getResponsibleName 
}: TasksListMobileProps) {
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
      case 'baixa': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'alta': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'urgente': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'baixa': return 'Baixa'
      case 'media': return 'Média'
      case 'alta': return 'Alta'
      case 'urgente': return 'Urgente'
      default: return priority
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente'
      case 'em_andamento': return 'Em Andamento'
      case 'concluida': return 'Concluída'
      case 'cancelada': return 'Cancelada'
      case 'atrasada': return 'Atrasada'
      default: return status
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
        <p className="text-gray-600 text-sm">
          Não há tarefas que correspondam aos filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-2">
      {tasks.map((task) => {
        const displayStatus = (task.status !== 'concluida' && task.status !== 'cancelada' && isOverdueLocal(task.due_date, task.due_time))
          ? 'atrasada'
          : task.status
        const isOverdue = displayStatus === 'atrasada'

        return (
          <div 
            key={task.id} 
            className={cn(
              "bg-white rounded-xl shadow border p-4 transition-all duration-200",
              isOverdue 
                ? 'border-red-300 bg-red-50/30' 
                : 'border-gray-200 hover:shadow-lg active:shadow-md'
            )}
          >
            {/* Header do Card */}
            <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex-1 min-w-0 mr-2">
                <h3 className="text-base font-semibold text-gray-900 mb-1.5 line-clamp-2">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              
              {/* Badges de Status e Prioridade */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                  getStatusColor(displayStatus)
                )}>
                  {getStatusLabel(displayStatus)}
                </span>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border",
                  getPriorityColor(task.priority)
                )}>
                  {getPriorityLabel(task.priority)}
                </span>
              </div>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {task.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800"
                  >
                    {tag}
                  </span>
                ))}
                {task.tags.length > 3 && (
                  <span className="text-xs text-gray-500 font-medium px-2 py-1">
                    +{task.tags.length - 3} mais
                  </span>
                )}
              </div>
            )}

            {/* Grid de Informações */}
            <div className="space-y-2.5 mb-3">
              {/* Lead */}
              {task.lead && (
                <div className="flex items-center text-sm bg-gray-50 rounded-lg p-2">
                  <span className="text-gray-500 font-medium mr-2 flex-shrink-0">Lead:</span>
                  <span className="text-gray-900 font-semibold truncate">{task.lead.name}</span>
                </div>
              )}

              {/* Responsável */}
              <div className="flex items-center text-sm">
                <UserIcon className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{getResponsibleName(task.assigned_to)}</span>
              </div>

              {/* Vencimento */}
              {task.due_date && (
                <div className={cn(
                  "flex items-center text-sm",
                  isOverdue ? "text-red-600 font-semibold" : "text-gray-700"
                )}>
                  <CalendarIcon className={cn(
                    "w-4 h-4 mr-2 flex-shrink-0",
                    isOverdue ? "text-red-500" : "text-orange-500"
                  )} />
                  <span className="truncate">{formatDateTime(task.due_date, task.due_time)}</span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => onEditTask(task)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all duration-200 text-sm font-semibold min-h-[48px] shadow-sm"
              >
                <EyeIcon className="w-5 h-5" />
                Ver Detalhes
              </button>
              
              {onDeleteTask && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteTask(task.id)
                  }}
                  className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95 min-h-[48px] min-w-[48px] flex items-center justify-center border border-gray-200"
                  title="Excluir"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
