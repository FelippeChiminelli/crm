import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../../../hooks/useEscapeKey'
import type { AutomationRule } from '../../../../types'
import { AutomationExecutionsList } from '../AutomationExecutionsList'

interface RuleExecutionsModalProps {
  rule: AutomationRule
  onClose: () => void
}

export function RuleExecutionsModal({ rule, onClose }: RuleExecutionsModalProps) {
  useEscapeKey(true, onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h3 className="truncate pr-4 text-lg font-semibold text-gray-900">Execuções • {rule.name}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">
          <AutomationExecutionsList ruleId={rule.id} />
        </div>
      </div>
    </div>
  )
}
