import { BoltIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { ActionFormFields } from '../../actions/ActionFormFields'
import { getActionDefinition, getActionTypeLabel } from '../../actionCatalog'
import { getActionIssues } from '../../validation'

interface ActionCardProps {
  index: number
  total: number
  action: Record<string, any>
  summary: string
  expanded: boolean
  onToggle: () => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}

const iconButton = 'rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30'

export function ActionCard({ index, total, action, summary, expanded, onToggle, onMove, onRemove }: ActionCardProps) {
  const Icon = getActionDefinition(action.type)?.icon || BoltIcon
  const issues = getActionIssues(action)

  return (
    <div className={`rounded-lg border bg-white transition-shadow ${expanded ? 'border-primary-300 shadow-sm' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
            {index + 1}
          </span>
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
              {getActionTypeLabel(action.type)}
              {issues.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <ExclamationTriangleIcon className="h-3 w-3" />
                  Pendente
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-gray-500">{summary}</span>
          </span>
        </button>
        <div className="flex flex-shrink-0 items-center">
          <button type="button" className={iconButton} disabled={index === 0} onClick={() => onMove(-1)} title="Mover para cima">
            <ChevronUpIcon className="h-4 w-4" />
          </button>
          <button type="button" className={iconButton} disabled={index === total - 1} onClick={() => onMove(1)} title="Mover para baixo">
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          <button type="button" className={`${iconButton} hover:text-red-600`} onClick={onRemove} title="Remover ação">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4">
          <ActionFormFields />
        </div>
      )}
    </div>
  )
}
