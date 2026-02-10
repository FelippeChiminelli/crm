import { useState } from 'react'
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { NewTaskModal } from '../../tasks/NewTaskModal'
import EditTaskModal from '../../tasks/EditTaskModal'
import { updateTask } from '../../../services/taskService'
import type { Task } from '../../../types'

interface LeadTasksSectionProps {
  tasks: Task[]
  leadId: string
  pipelineId: string
  onReload: () => void
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
  atrasada: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  atrasada: 'Atrasada',
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return iso
  }
}

export function LeadTasksSection({ tasks, leadId, pipelineId, onReload }: LeadTasksSectionProps) {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Ordenar: pendentes/em andamento primeiro, depois concluídas
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      atrasada: 0, pendente: 1, em_andamento: 2, concluida: 3, cancelada: 4,
    }
    return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5)
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardDocumentListIcon className="w-4 h-4 text-gray-500" />
          Tarefas
          {tasks.length > 0 && (
            <span className="text-xs font-normal text-gray-400">({tasks.length})</span>
          )}
        </h3>
        <button
          onClick={() => setShowNewTaskModal(true)}
          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Nova tarefa"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {sortedTasks.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
          Nenhuma tarefa vinculada
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {sortedTasks.map(task => {
            const isDone = task.status === 'concluida' || task.status === 'cancelada'

            return (
              <button
                key={task.id}
                onClick={() => setEditingTask(task)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {isDone ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'} truncate`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[task.status] || task.status}
                      </span>
                      {task.due_date && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <ClockIcon className="w-3 h-3" />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modais */}
      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        leadId={leadId}
        pipelineId={pipelineId}
        onTaskCreated={() => {
          setShowNewTaskModal(false)
          onReload()
        }}
      />

      {editingTask && (
        <EditTaskModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          onSubmit={async (taskData) => {
            await updateTask(editingTask.id, taskData)
            setEditingTask(null)
            onReload()
          }}
        />
      )}
    </div>
  )
}
