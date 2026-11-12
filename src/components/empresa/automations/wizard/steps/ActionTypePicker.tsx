import type { AutomationRule } from '../../../../../types'
import { getAllowedActions } from '../../actionCatalog'
import type { ActionType } from '../../actionCatalog'

interface ActionTypePickerProps {
  eventType: AutomationRule['event_type']
  onPick: (type: ActionType) => void
  onCancel?: () => void
}

export function ActionTypePicker({ eventType, onPick, onCancel }: ActionTypePickerProps) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">O que deve acontecer?</p>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">
            Cancelar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {getAllowedActions(eventType).map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.value}
              type="button"
              onClick={() => onPick(action.value)}
              className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-2.5 text-left transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">{action.label}</span>
                <span className="block text-xs text-gray-500">{action.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
