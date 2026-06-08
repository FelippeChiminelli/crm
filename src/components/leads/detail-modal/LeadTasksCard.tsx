import {
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import type { Task } from '../../../types'
import { formatDueDateTimePTBR } from '../../../utils/date'
import { SectionCard } from './SectionCard'

interface LeadTasksCardProps {
  tasks: Task[]
  loadingTasks: boolean
  onNewTask: () => void
  onOpenTask: (task: Task) => void
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  concluida: { label: '✓ Concluída', className: 'bg-green-100 text-green-700' },
  em_andamento: { label: '⏳ Em andamento', className: 'bg-blue-100 text-blue-700' },
  atrasada: { label: '⚠️ Atrasada', className: 'bg-red-100 text-red-700' },
  cancelada: { label: '✕ Cancelada', className: 'bg-gray-100 text-gray-700' },
  pendente: { label: '○ Pendente', className: 'bg-gray-100 text-gray-700' },
}

export function LeadTasksCard(props: LeadTasksCardProps) {
  const { tasks, loadingTasks, onNewTask, onOpenTask } = props

  const actions = (
    <button
      onClick={onNewTask}
      className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap inline-flex items-center gap-1"
    >
      <PlusIcon className="w-4 h-4" />
      <span>Tarefa</span>
    </button>
  )

  return (
    <SectionCard title="Tarefas" theme="amber" icon={ClipboardDocumentListIcon} headerRight={actions}>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {loadingTasks ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Carregando tarefas...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-500 text-sm">Nenhuma tarefa criada para este lead</p>
          </div>
        ) : (
          tasks.map((task) => {
            const badge = STATUS_BADGE[task.status] || STATUS_BADGE.pendente
            return (
              <div
                key={task.id}
                onClick={() => onOpenTask(task)}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-gray-900 text-sm flex-1 min-w-0 truncate">{task.title}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${badge.className}`}>{badge.label}</span>
                </div>
                {task.due_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    Vencimento: {formatDueDateTimePTBR(task.due_date, task.due_time)}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </SectionCard>
  )
}
