import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline'
import { InteractionsPanel } from '../interactions/InteractionsPanel'

interface LeadInteractionsSectionProps {
  leadId: string
  // Recarrega o histórico do lead, que espelha a interação
  onChanged?: () => void | Promise<void>
  readOnly?: boolean
}

export function LeadInteractionsSection({
  leadId,
  onChanged,
  readOnly,
}: LeadInteractionsSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-sky-600" />
        Interações
      </h3>

      <InteractionsPanel leadId={leadId} onChanged={onChanged} readOnly={readOnly} />
    </div>
  )
}
