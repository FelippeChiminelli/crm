import { EyeIcon } from '@heroicons/react/24/outline'
import { MetaAdsLeadOutcome } from './MetaAdsLeadOutcome'
import { getPlatformLabel } from '../metaAdsLabels'
import type { MetaAdsLeadCategory, MetaAdsLeadRow } from '../../../../types'

interface MetaAdsLeadListProps {
  rows: MetaAdsLeadRow[]
  category: MetaAdsLeadCategory
  loading: boolean
  error: string | null
  formatCurrency: (value: number) => string
  onOpenLead: (leadId: string) => void
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

function AdOrigin({ row }: { row: MetaAdsLeadRow }) {
  return (
    <div className="min-w-0">
      <div className="text-gray-900 truncate" title={row.ad_name ?? undefined}>{row.ad_name || '-'}</div>
      <div className="text-[11px] text-gray-500 truncate" title={`${row.campaign_name ?? ''} › ${row.adset_name ?? ''}`}>
        {row.campaign_name} › {row.adset_name}
      </div>
    </div>
  )
}

/**
 * Em telas pequenas usa cards empilhados; a tabela só aparece a partir de lg,
 * onde há largura suficiente para todas as colunas.
 */
export function MetaAdsLeadList({ rows, category, loading, error, formatCurrency, onOpenLead }: MetaAdsLeadListProps) {
  const clickLabel = category === 'clicks' ? 'Clique em' : 'Último clique'

  if (error) {
    return (
      <div className="m-3 lg:m-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
    )
  }

  if (loading) {
    return (
      <div className="p-3 lg:p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-14 lg:h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-gray-500">Nenhum lead nesta lista.</div>
  }

  return (
    <>
      <ul className="lg:hidden divide-y divide-gray-100">
        {rows.map((row, index) => (
          <li key={`${row.lead_id}-${row.clicked_at}-${index}`} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{row.lead_name || 'Sem nome'}</p>
                <p className="text-xs text-gray-600">{row.phone || 'Sem telefone'}</p>
              </div>
              <button
                onClick={() => onOpenLead(row.lead_id)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 shrink-0"
              >
                <EyeIcon className="w-4 h-4" />
                Lead
              </button>
            </div>
            <MetaAdsLeadOutcome row={row} formatCurrency={formatCurrency} />
            <div className="text-xs"><AdOrigin row={row} /></div>
            <p className="text-[11px] text-gray-500">
              {getPlatformLabel(row.platform)} · {clickLabel} {formatDateTime(row.clicked_at)}
              {category !== 'clicks' && row.clicks > 1 && ` · ${row.clicks} cliques`}
              {' · '}{row.responsible_name || 'Sem responsável'}
            </p>
          </li>
        ))}
      </ul>

      <table className="hidden lg:table w-full text-sm table-fixed">
        <thead>
          <tr className="text-left text-xs text-gray-600 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-gray-50">
            <th className="px-3 py-2 font-medium w-[19%]">Lead</th>
            <th className="px-3 py-2 font-medium w-[17%]">Resultado</th>
            <th className="px-3 py-2 font-medium w-[26%]">Anúncio</th>
            <th className="px-3 py-2 font-medium w-[10%]">Plataforma</th>
            <th className="px-3 py-2 font-medium w-[13%]">{clickLabel}</th>
            <th className="px-3 py-2 font-medium w-[11%]">Responsável</th>
            <th className="px-3 py-2 w-[4%]" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, index) => (
            <tr key={`${row.lead_id}-${row.clicked_at}-${index}`} className="hover:bg-gray-50 align-top">
              <td className="px-3 py-2">
                <div className="text-gray-900 truncate">{row.lead_name || 'Sem nome'}</div>
                <div className="text-[11px] text-gray-500 truncate">{row.phone || '-'}</div>
              </td>
              <td className="px-3 py-2"><MetaAdsLeadOutcome row={row} formatCurrency={formatCurrency} /></td>
              <td className="px-3 py-2"><AdOrigin row={row} /></td>
              <td className="px-3 py-2 text-gray-600">{getPlatformLabel(row.platform)}</td>
              <td className="px-3 py-2 text-gray-700">
                <div className="whitespace-nowrap">{formatDateTime(row.clicked_at)}</div>
                {category !== 'clicks' && row.clicks > 1 && (
                  <div className="text-[11px] text-gray-500">{row.clicks} cliques</div>
                )}
              </td>
              <td className="px-3 py-2 text-gray-600 truncate">{row.responsible_name || 'Sem responsável'}</td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => onOpenLead(row.lead_id)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  title="Ver detalhes do lead"
                  aria-label="Ver detalhes do lead"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
