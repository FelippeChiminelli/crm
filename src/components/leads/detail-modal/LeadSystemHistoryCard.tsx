import { ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { parseISO } from 'date-fns'
import type { LeadHistoryEntry } from '../../../types'
import { SectionCard } from './SectionCard'

interface LeadSystemHistoryCardProps {
  createdAt?: string
  history: LeadHistoryEntry[]
  loadingHistory: boolean
}

const CHANGE_LABELS: Record<string, string> = {
  created: '🎉 Criado',
  stage_changed: '🔄 Stage',
  pipeline_changed: '📋 Pipeline',
  both_changed: '🔀 Pipeline/Stage',
  marked_as_lost: '❌ Perdido',
  reactivated: '✅ Reativado',
  marked_as_sold: '💰 Vendido',
  sale_unmarked: '⚠️ Desmarcado',
}

function HistoryItem({ entry }: { entry: LeadHistoryEntry }) {
  const showPipeline = entry.change_type === 'pipeline_changed' || entry.change_type === 'both_changed'
  const showStage = entry.change_type === 'stage_changed' || entry.change_type === 'both_changed' || entry.change_type === 'created'

  return (
    <div className="bg-white rounded-lg p-2.5 border border-gray-200 text-sm">
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm truncate">
            {CHANGE_LABELS[entry.change_type] || entry.change_type}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            {entry.changed_at ? parseISO(entry.changed_at).toLocaleString('pt-BR') : '-'}
            {entry.changed_by_user?.full_name && (
              <span className="ml-1">por <span className="font-medium">{entry.changed_by_user.full_name}</span></span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-0.5 text-xs">
        {showPipeline && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-500">Pipeline:</span>
            {entry.previous_pipeline?.name && (
              <span className="text-red-600 line-through truncate max-w-[120px]">{entry.previous_pipeline.name}</span>
            )}
            <span className="text-gray-400">→</span>
            <span className="text-green-600 font-medium truncate max-w-[120px]">{entry.pipeline?.name || 'N/A'}</span>
          </div>
        )}

        {showStage && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-500">Stage:</span>
            {entry.previous_stage?.name && entry.change_type !== 'created' && (
              <span className="text-red-600 line-through truncate max-w-[120px]">{entry.previous_stage.name}</span>
            )}
            {entry.previous_stage?.name && entry.change_type !== 'created' && <span className="text-gray-400">→</span>}
            <span className="text-green-600 font-medium truncate max-w-[120px]">{entry.stage?.name || 'N/A'}</span>
          </div>
        )}

        {entry.notes && entry.notes !== 'Registro inicial criado pela migration' && (
          <div className="mt-1.5 p-2 bg-gray-50 rounded text-gray-600 italic text-xs">{entry.notes}</div>
        )}
      </div>
    </div>
  )
}

export function LeadSystemHistoryCard({ createdAt, history, loadingHistory }: LeadSystemHistoryCardProps) {
  return (
    <SectionCard title="Sistema" theme="slate" icon={ClockIcon}>
      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Criado:</span>{' '}
          {createdAt ? parseISO(createdAt).toLocaleString('pt-BR') : '-'}
        </div>

        <div className="border-t border-gray-200 pt-3">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Histórico</h5>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-4">
              <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Carregando...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded">Nenhuma alteração</div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => <HistoryItem key={entry.id} entry={entry} />)}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
