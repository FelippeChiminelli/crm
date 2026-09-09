import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline'
import { SectionCard } from './SectionCard'
import { InteractionsPanel } from '../interactions/InteractionsPanel'

interface LeadInteractionsCardProps {
  leadId?: string
  // Recarrega o histórico do lead, que espelha a interação
  onChanged?: () => void | Promise<void>
  readOnly?: boolean
}

export function LeadInteractionsCard({
  leadId,
  onChanged,
  readOnly,
}: LeadInteractionsCardProps) {
  return (
    <SectionCard title="Interações" theme="sky" icon={ChatBubbleBottomCenterTextIcon}>
      <p className="text-xs text-gray-400 mb-2">
        Anotações de contato com o cliente. Cada registro também aparece no histórico do lead.
      </p>
      <InteractionsPanel leadId={leadId} onChanged={onChanged} readOnly={readOnly} />
    </SectionCard>
  )
}
