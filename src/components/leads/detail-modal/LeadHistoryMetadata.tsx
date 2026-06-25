import { parseISO } from 'date-fns'
import type { LeadHistoryEntry } from '../../../types'
import { formatDueDateTimePTBR } from '../../../utils/date'

// Rótulos legíveis para cada tipo de evento do histórico
export const CHANGE_LABELS: Record<string, string> = {
  created: '🎉 Criado',
  stage_changed: '🔄 Stage',
  pipeline_changed: '📋 Pipeline',
  both_changed: '🔀 Pipeline/Stage',
  marked_as_lost: '❌ Perdido',
  reactivated: '✅ Reativado',
  marked_as_sold: '💰 Vendido',
  sale_unmarked: '⚠️ Desmarcado',
  responsible_changed: '👤 Responsável',
  field_updated: '✏️ Edição',
  task_created: '📝 Tarefa criada',
  task_completed: '✔️ Tarefa concluída',
  task_cancelled: '🚫 Tarefa cancelada',
  task_rescheduled: '📅 Tarefa reagendada',
  booking_created: '📅 Agendamento criado',
  booking_cancelled: '📅 Agendamento cancelado',
  booking_completed: '📅 Agendamento concluído',
  attachment_added: '📎 Anexo adicionado',
  attachment_removed: '🗑️ Anexo removido',
  custom_field_changed: '🧩 Campo personalizado',
}

// Categorias para o filtro do histórico: agrupa os change_types relacionados
export const HISTORY_CATEGORIES: { id: string; label: string; types: string[] }[] = [
  { id: 'all', label: 'Todos os tipos', types: [] },
  { id: 'pipeline', label: 'Pipeline / Estágio', types: ['created', 'pipeline_changed', 'stage_changed', 'both_changed'] },
  { id: 'status', label: 'Venda / Perda', types: ['marked_as_lost', 'reactivated', 'marked_as_sold', 'sale_unmarked'] },
  { id: 'responsible', label: 'Responsável', types: ['responsible_changed'] },
  { id: 'fields', label: 'Edição de campos', types: ['field_updated', 'custom_field_changed'] },
  { id: 'tasks', label: 'Tarefas', types: ['task_created', 'task_completed', 'task_cancelled', 'task_rescheduled'] },
  { id: 'bookings', label: 'Agendamentos', types: ['booking_created', 'booking_cancelled', 'booking_completed'] },
  { id: 'attachments', label: 'Anexos', types: ['attachment_added', 'attachment_removed'] },
]

// Rótulos legíveis para os campos básicos do lead rastreados no histórico
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  company: 'Empresa',
  email: 'Email',
  phone: 'Telefone',
  value: 'Valor',
  origin: 'Origem',
  status: 'Status',
  notes: 'Observações',
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(vazio)'
  return String(value)
}

interface FieldChange {
  field: string
  old: unknown
  new: unknown
}

function BeforeAfter({ label, oldValue, newValue }: { label: string; oldValue: unknown; newValue: unknown }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-gray-500">{label}:</span>
      <span className="text-red-600 line-through truncate max-w-[120px]">{formatValue(oldValue)}</span>
      <span className="text-gray-400">→</span>
      <span className="text-green-600 font-medium truncate max-w-[120px]">{formatValue(newValue)}</span>
    </div>
  )
}

/** Renderiza os detalhes específicos (metadata) de cada tipo de evento do histórico. */
export function MetadataDetails({ entry }: { entry: LeadHistoryEntry }) {
  const meta = entry.metadata as Record<string, any> | null | undefined
  if (!meta) return null

  if (entry.change_type === 'responsible_changed') {
    return (
      <BeforeAfter
        label="Responsável"
        oldValue={meta.previous_responsible_name || '(nenhum)'}
        newValue={meta.new_responsible_name || '(nenhum)'}
      />
    )
  }

  if (entry.change_type === 'field_updated' && Array.isArray(meta.changes)) {
    return (
      <div className="space-y-1">
        {(meta.changes as FieldChange[]).map((change, idx) => (
          <BeforeAfter
            key={idx}
            label={FIELD_LABELS[change.field] || change.field}
            oldValue={change.old}
            newValue={change.new}
          />
        ))}
      </div>
    )
  }

  if (entry.change_type === 'custom_field_changed') {
    return <BeforeAfter label={meta.field_name || 'Campo'} oldValue={meta.old} newValue={meta.new} />
  }

  if (entry.change_type.startsWith('task_') && meta.task_title) {
    if (entry.change_type === 'task_rescheduled') {
      const previous = formatDueDateTimePTBR(meta.previous_due_date, meta.previous_due_time)
      const next = formatDueDateTimePTBR(meta.new_due_date, meta.new_due_time)
      return (
        <div className="space-y-1">
          <div className="text-gray-600">
            Tarefa: <span className="font-medium">{meta.task_title}</span>
          </div>
          <BeforeAfter label="Prazo" oldValue={previous} newValue={next} />
          {entry.notes && (
            <div className="text-gray-600 text-xs">
              Motivo: <span className="font-medium">{entry.notes}</span>
            </div>
          )}
        </div>
      )
    }
    return <div className="text-gray-600">Tarefa: <span className="font-medium">{meta.task_title}</span></div>
  }

  if (entry.change_type.startsWith('booking_')) {
    const when = meta.scheduled_at ? parseISO(meta.scheduled_at).toLocaleString('pt-BR') : null
    return (
      <div className="text-gray-600">
        {meta.booking_title && <span className="font-medium">{meta.booking_title}</span>}
        {when && <span className="ml-1">({when})</span>}
      </div>
    )
  }

  if (entry.change_type.startsWith('attachment_') && meta.file_name) {
    return <div className="text-gray-600">Arquivo: <span className="font-medium">{meta.file_name}</span></div>
  }

  return null
}
