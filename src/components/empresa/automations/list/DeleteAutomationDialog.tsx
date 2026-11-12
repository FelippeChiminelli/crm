import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../../../hooks/useEscapeKey'
import type { AutomationRule } from '../../../../types'

interface DeleteAutomationDialogProps {
  rule: AutomationRule
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteAutomationDialog({ rule, deleting, onCancel, onConfirm }: DeleteAutomationDialogProps) {
  useEscapeKey(true, onCancel)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Excluir automação</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tem certeza que deseja excluir a automação "{rule.name}"? Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}
