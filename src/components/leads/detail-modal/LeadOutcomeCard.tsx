import { ExclamationTriangleIcon, CheckIcon } from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import type { Lead, LossReason } from '../../../types'
import { getLossReasonLabel } from '../../../utils/constants'
import { SectionCard } from './SectionCard'

interface LeadOutcomeCardProps {
  lead: Lead
  lossReasons: LossReason[]
}

function OutcomeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">{label}</p>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  )
}

export function LeadOutcomeCard({ lead, lossReasons }: LeadOutcomeCardProps) {
  return (
    <>
      {lead.loss_reason_category && (
        <SectionCard title="Perdido" theme="red" icon={ExclamationTriangleIcon}>
          <div className="space-y-2.5">
            <OutcomeRow label="Motivo">
              <span className="font-medium">{getLossReasonLabel(lead.loss_reason_category, lossReasons)}</span>
            </OutcomeRow>
            {lead.loss_reason_notes && (
              <OutcomeRow label="Detalhes">
                <span className="whitespace-pre-wrap">{lead.loss_reason_notes}</span>
              </OutcomeRow>
            )}
            {lead.lost_at && (
              <OutcomeRow label="Data">{format(parseISO(lead.lost_at), 'dd/MM/yyyy HH:mm')}</OutcomeRow>
            )}
          </div>
        </SectionCard>
      )}

      {lead.sold_at && (
        <SectionCard title="Venda" theme="green" icon={CheckIcon}>
          <div className="space-y-2.5">
            <OutcomeRow label="Valor">
              <span className="font-medium">
                {lead.sold_value
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.sold_value)
                  : '-'}
              </span>
            </OutcomeRow>
            {lead.sale_notes && (
              <OutcomeRow label="Observações">
                <span className="whitespace-pre-wrap">{lead.sale_notes}</span>
              </OutcomeRow>
            )}
            <OutcomeRow label="Data">{format(parseISO(lead.sold_at), 'dd/MM/yyyy HH:mm')}</OutcomeRow>
          </div>
        </SectionCard>
      )}
    </>
  )
}
