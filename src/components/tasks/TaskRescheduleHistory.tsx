import { useEffect, useState } from 'react'
import { ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline'
import { getTaskComments } from '../../services/taskService'
import type { TaskComment } from '../../types'
import { formatDueDateTimePTBR } from '../../utils/date'

interface TaskRescheduleHistoryProps {
  taskId: string
  refreshKey?: number
}

function formatCommentDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatDueFromMetadata(date?: string | null, time?: string | null): string {
  if (!date) return '(sem prazo)'
  return formatDueDateTimePTBR(date, time || undefined)
}

export function TaskRescheduleHistory({ taskId, refreshKey = 0 }: TaskRescheduleHistoryProps) {
  const [entries, setEntries] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const comments = await getTaskComments(taskId)
        if (!cancelled) {
          setEntries(comments.filter(c => c.type === 'due_date_change'))
        }
      } catch (err) {
        console.error('Erro ao carregar histórico de reagendamentos:', err)
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [taskId, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <ArrowPathIcon className="w-4 h-4 animate-spin" />
        Carregando histórico...
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-2">Nenhum reagendamento registrado.</p>
    )
  }

  return (
    <div className="space-y-3 max-h-[240px] overflow-y-auto">
      {[...entries].reverse().map((entry) => {
        const meta = entry.metadata as Record<string, string | null> | undefined
        const previous = formatDueFromMetadata(meta?.previous_due_date, meta?.previous_due_time)
        const next = formatDueFromMetadata(meta?.new_due_date, meta?.new_due_time)

        return (
          <div key={entry.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-gray-700">
                {entry.user?.full_name || 'Usuário'}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {formatCommentDate(entry.created_at)}
              </span>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              <span className="text-red-600 line-through">{previous}</span>
              <span className="mx-1.5 text-gray-400">→</span>
              <span className="text-green-700 font-medium">{next}</span>
            </div>
            <p className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1.5">
              <span className="font-medium text-gray-500">Motivo: </span>
              {entry.comment}
            </p>
          </div>
        )
      })}
    </div>
  )
}
