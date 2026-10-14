import type { MetaAdsLeadRow } from '../../../../types'

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : null

interface MetaAdsLeadOutcomeProps {
  row: MetaAdsLeadRow
  formatCurrency: (value: number) => string
}

/** Resultado atual do lead: venda (valor e data), perda (motivo) ou em aberto. */
export function MetaAdsLeadOutcome({ row, formatCurrency }: MetaAdsLeadOutcomeProps) {
  if (row.lead_status === 'venda_confirmada') {
    return (
      <div className="min-w-0">
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
          Venda · {formatCurrency(row.sold_value)}
        </span>
        {row.sold_at && <div className="text-[11px] text-gray-500 mt-0.5">em {formatDate(row.sold_at)}</div>}
      </div>
    )
  }

  if (row.lead_status === 'perdido') {
    return (
      <div className="min-w-0">
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
          Perdido
        </span>
        <div className="text-[11px] text-gray-500 mt-0.5 truncate" title={row.loss_reason ?? undefined}>
          {row.loss_reason || 'Sem motivo'}
          {row.lost_at && ` · ${formatDate(row.lost_at)}`}
        </div>
      </div>
    )
  }

  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      Em aberto
    </span>
  )
}
