import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import type { ActionType } from '../../actionCatalog'
import { useAutomationEditor } from '../../editor/AutomationEditorContext'
import { ActionCard } from './ActionCard'
import { ActionTypePicker } from './ActionTypePicker'

interface ActionsStepProps {
  editingIndex: number | null
  onEdit: (index: number | null) => void
  onAdd: (type: ActionType) => void
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (index: number) => void
  formatAction: (action: Record<string, any>) => string
}

export function ActionsStep({ editingIndex, onEdit, onAdd, onMove, onRemove, formatAction }: ActionsStepProps) {
  const { form } = useAutomationEditor()
  const actions = form.actions
  const [pickerOpen, setPickerOpen] = useState(actions.length === 0)

  function handlePick(type: ActionType) {
    onAdd(type)
    setPickerOpen(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        As ações rodam na ordem abaixo. Clique em uma ação para configurá-la.
      </p>
      {actions.map((action, index) => (
        <ActionCard
          key={index}
          index={index}
          total={actions.length}
          action={action}
          summary={formatAction(action)}
          expanded={editingIndex === index}
          onToggle={() => onEdit(editingIndex === index ? null : index)}
          onMove={direction => onMove(index, direction)}
          onRemove={() => onRemove(index)}
        />
      ))}
      {pickerOpen || actions.length === 0 ? (
        <ActionTypePicker
          eventType={form.event_type}
          onPick={handlePick}
          onCancel={actions.length > 0 ? () => setPickerOpen(false) : undefined}
        />
      ) : (
        <button
          type="button"
          onClick={() => { onEdit(null); setPickerOpen(true) }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
        >
          <PlusIcon className="h-4 w-4" />
          Adicionar ação
        </button>
      )}
    </div>
  )
}
