import { useMemo, useState } from 'react'
import { ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { parseISO } from 'date-fns'
import type { LeadHistoryEntry } from '../../../types'
import { SectionCard } from './SectionCard'
import { CHANGE_LABELS, MetadataDetails, HISTORY_CATEGORIES } from './LeadHistoryMetadata'

interface LeadSystemHistoryCardProps {
  createdAt?: string
  history: LeadHistoryEntry[]
  loadingHistory: boolean
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

        <MetadataDetails entry={entry} />

        {entry.notes && entry.notes !== 'Registro inicial criado pela migration' && (
          <div className="mt-1.5 p-2 bg-gray-50 rounded text-gray-600 italic text-xs">{entry.notes}</div>
        )}
      </div>
    </div>
  )
}

export function LeadSystemHistoryCard({ createdAt, history, loadingHistory }: LeadSystemHistoryCardProps) {
  const [filter, setFilter] = useState('all')

  // Mostra no seletor apenas as categorias que possuem registros no histórico
  const availableCategories = useMemo(() => {
    return HISTORY_CATEGORIES.filter(
      (cat) => cat.id === 'all' || history.some((entry) => cat.types.includes(entry.change_type))
    )
  }, [history])

  const filteredHistory = useMemo(() => {
    if (filter === 'all') return history
    const category = HISTORY_CATEGORIES.find((cat) => cat.id === filter)
    if (!category) return history
    return history.filter((entry) => category.types.includes(entry.change_type))
  }, [history, filter])

  return (
    <SectionCard title="Sistema" theme="slate" icon={ClockIcon}>
      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Criado:</span>{' '}
          {createdAt ? parseISO(createdAt).toLocaleString('pt-BR') : '-'}
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h5 className="text-sm font-medium text-gray-900">Histórico</h5>
            {history.length > 0 && (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded-md px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 max-w-[55%]"
                aria-label="Filtrar histórico por tipo"
              >
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            )}
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-4">
              <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Carregando...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded">Nenhuma alteração</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded">Nenhum registro para este filtro</div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((entry) => <HistoryItem key={entry.id} entry={entry} />)}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
