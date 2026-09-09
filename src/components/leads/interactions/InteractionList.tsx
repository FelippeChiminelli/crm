import {
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import type { LeadInteraction } from '../../../types'
import { formatDateTimePTBR } from '../../../utils/date'

// A data exibida é a do registro, então sinalizamos quando o texto foi alterado
// depois. O trigger de timestamps garante updated_at > created_at só nas edições.
function wasEdited(interaction: LeadInteraction): boolean {
  const created = new Date(interaction.created_at).getTime()
  const updated = new Date(interaction.updated_at).getTime()
  if (Number.isNaN(created) || Number.isNaN(updated)) return false
  return updated - created > 1000
}

interface InteractionListProps {
  interactions: LeadInteraction[]
  loading: boolean
  // Editar/excluir é exclusividade de admin; o autor não altera o próprio relato
  isAdmin: boolean
  onEdit: (interaction: LeadInteraction) => void
  onDelete: (interaction: LeadInteraction) => void
}

/**
 * Lista de interações do lead, da mais recente para a mais antiga.
 * Compartilhada pelo card do modal e pela seção da página.
 */
export function InteractionList({
  interactions,
  loading,
  isAdmin,
  onEdit,
  onDelete,
}: InteractionListProps) {
  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Carregando interações...</p>
      </div>
    )
  }

  if (interactions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500 text-sm">Nenhuma interação registrada para este lead</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {interactions.map((interaction) => (
        <div
          key={interaction.id}
          className="bg-white border border-gray-200 rounded-lg p-3 hover:border-sky-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
              <ClockIcon className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
              <span className="font-medium text-gray-700 truncate">
                {formatDateTimePTBR(interaction.created_at)}
              </span>
              {wasEdited(interaction) && (
                <span className="text-gray-400 flex-shrink-0">(editada)</span>
              )}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(interaction)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  title="Editar interação"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(interaction)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Excluir interação"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-700 mt-1.5 whitespace-pre-wrap break-words">
            {interaction.description}
          </p>

          {interaction.created_by_user?.full_name && (
            <p className="text-xs text-gray-400 mt-1.5">
              por <span className="font-medium">{interaction.created_by_user.full_name}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
