import { useMemo, useState } from 'react'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { formatPercent } from './metaAdsLabels'
import type { MetaAdsSummaryRow } from '../../../types'

interface MetaAdsCreativesRankingProps {
  creatives: MetaAdsSummaryRow[]
  loading: boolean
  formatCurrency: (value: number) => string
}

const INITIAL_VISIBLE = 8

function CreativeThumbnail({ url, alt }: { url: string | null; alt: string }) {
  // URLs de miniatura da Meta expiram; sem imagem válida mostramos um placeholder
  const [failed, setFailed] = useState(false)

  if (!url || failed) {
    return (
      <div className="w-20 h-20 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
        <PhotoIcon className="w-7 h-7 text-gray-400" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-20 h-20 rounded-md object-cover bg-gray-100 flex-shrink-0"
    />
  )
}

function Metric({ label, value, className = 'text-gray-900' }: { label: string; value: string | number; className?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${className}`}>{value}</div>
    </div>
  )
}

function CreativeCard({ creative, position, formatCurrency }: {
  creative: MetaAdsSummaryRow
  position: number
  formatCurrency: (value: number) => string
}) {
  const name = creative.ad_name || '(sem identificação)'

  return (
    <div className="border border-gray-200 rounded-lg p-3 flex flex-col gap-3">
      <div className="flex gap-3 min-w-0">
        <CreativeThumbnail url={creative.thumbnail_url} alt={name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <span className="text-xs font-bold text-gray-400">#{position}</span>
            <span className="text-sm font-semibold text-gray-900 break-words line-clamp-2">{name}</span>
          </div>
          <div className="text-[11px] text-gray-500 truncate" title={creative.campaign_name ?? undefined}>
            {creative.campaign_name}
          </div>
          {creative.title_ads && (
            <div className="text-xs text-gray-700 font-medium mt-1 line-clamp-1">{creative.title_ads}</div>
          )}
          {creative.body_ads && (
            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{creative.body_ads}</div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100">
        <Metric label="Leads" value={creative.leads} />
        <Metric label="Vendas" value={creative.sales} className="text-emerald-700" />
        <Metric label="Conv." value={formatPercent(creative.conversion_rate)} />
        <Metric label="Receita" value={formatCurrency(creative.revenue)} />
      </div>
    </div>
  )
}

export function MetaAdsCreativesRanking({ creatives, loading, formatCurrency }: MetaAdsCreativesRankingProps) {
  const [showAll, setShowAll] = useState(false)

  const ranked = useMemo(
    () => [...creatives].sort((a, b) => b.leads - a.leads || b.conversion_rate - a.conversion_rate),
    [creatives]
  )
  const visible = showAll ? ranked : ranked.slice(0, INITIAL_VISIBLE)

  if (loading) {
    return <div className="bg-white rounded-lg border border-gray-200 p-6 h-64 animate-pulse" />
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Ranking de criativos</h3>
        {ranked.length > INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAll ? 'Mostrar menos' : `Ver todos (${ranked.length})`}
          </button>
        )}
      </div>

      {ranked.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          Nenhum dado disponível para o período selecionado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3">
          {visible.map((creative, index) => (
            <CreativeCard
              key={`${creative.campaign_id}|${creative.adset_id}|${creative.ad_id}`}
              creative={creative}
              position={index + 1}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}
    </div>
  )
}
