import { ClockIcon } from '@heroicons/react/24/outline'
import type { LeadHistoryEntry } from '../../../types'

interface LeadHistorySectionProps {
  history: LeadHistoryEntry[]
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  created: { label: 'Criado', icon: '🎉', color: 'text-blue-700' },
  stage_changed: { label: 'Mudança de Estágio', icon: '🔄', color: 'text-orange-700' },
  pipeline_changed: { label: 'Mudança de Pipeline', icon: '📋', color: 'text-purple-700' },
  both_changed: { label: 'Pipeline e Estágio', icon: '🔀', color: 'text-indigo-700' },
  marked_as_lost: { label: 'Marcado como Perdido', icon: '❌', color: 'text-red-700' },
  reactivated: { label: 'Reativado', icon: '✅', color: 'text-green-700' },
  marked_as_sold: { label: 'Venda Concluída', icon: '💰', color: 'text-green-700' },
  sale_unmarked: { label: 'Venda Desmarcada', icon: '⚠️', color: 'text-orange-700' },
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function LeadHistorySection({ history }: LeadHistorySectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <ClockIcon className="w-4 h-4 text-gray-500" />
        Histórico
        {history.length > 0 && (
          <span className="text-xs font-normal text-gray-400">({history.length})</span>
        )}
      </h3>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
          Nenhum registro no histórico
        </p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {history.map((entry) => {
            const config = CHANGE_TYPE_CONFIG[entry.change_type] || {
              label: entry.change_type, icon: '📝', color: 'text-gray-700',
            }

            return (
              <div key={entry.id} className="relative pl-6 pb-3 border-l-2 border-gray-200 last:border-l-transparent">
                {/* Bullet point */}
                <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-gray-300" />

                <div className="bg-gray-50 rounded-lg p-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{config.icon}</span>
                      <span className={`text-sm font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {formatDate(entry.changed_at)}
                    </span>
                  </div>

                  {/* Usuário */}
                  {entry.changed_by_user?.full_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      por <span className="font-medium">{entry.changed_by_user.full_name}</span>
                    </p>
                  )}

                  {/* Detalhes de mudança */}
                  <div className="mt-2 space-y-1 text-xs">
                    {(entry.change_type === 'pipeline_changed' || entry.change_type === 'both_changed') && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-gray-500">Pipeline:</span>
                        {entry.previous_pipeline?.name && (
                          <>
                            <span className="text-red-600 line-through">{entry.previous_pipeline.name}</span>
                            <span className="text-gray-400">→</span>
                          </>
                        )}
                        <span className="text-green-600 font-medium">{entry.pipeline?.name || 'N/A'}</span>
                      </div>
                    )}

                    {(entry.change_type === 'stage_changed' || entry.change_type === 'both_changed' || entry.change_type === 'created') && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-gray-500">Estágio:</span>
                        {entry.previous_stage?.name && entry.change_type !== 'created' && (
                          <>
                            <span className="text-red-600 line-through">{entry.previous_stage.name}</span>
                            <span className="text-gray-400">→</span>
                          </>
                        )}
                        <span className="text-green-600 font-medium">{entry.stage?.name || 'N/A'}</span>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  {entry.notes && entry.notes !== 'Registro inicial criado pela migration' && (
                    <div className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs text-gray-600 whitespace-pre-wrap">
                      {entry.notes}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
