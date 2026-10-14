import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { LeadDetailModal } from '../../../leads/LeadDetailModal'
import { MetaAdsLeadList } from './MetaAdsLeadList'
import { META_ADS_DRILLDOWN_CATEGORIES, getDrilldownCategory } from './metaAdsDrilldownCategories'
import { META_ADS_LEADS_PAGE_SIZE, getMetaAdsLeads } from '../../../../services/metaAdsAnalyticsService'
import type { Lead, MetaAdsAnalyticsFilters, MetaAdsLeadCategory, MetaAdsLeadRow } from '../../../../types'

interface MetaAdsDrilldownModalProps {
  category: MetaAdsLeadCategory | null
  filters: MetaAdsAnalyticsFilters
  formatCurrency: (value: number) => string
  onCategoryChange: (category: MetaAdsLeadCategory) => void
  onClose: () => void
}

export function MetaAdsDrilldownModal({
  category,
  filters,
  formatCurrency,
  onCategoryChange,
  onClose
}: MetaAdsDrilldownModalProps) {
  const [rows, setRows] = useState<MetaAdsLeadRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Volta para a primeira página sempre que a lista muda
  useEffect(() => {
    setPage(0)
  }, [category])

  useEffect(() => {
    if (!category) return

    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getMetaAdsLeads(filters, category, page)
        if (cancelled) return
        setRows(result.rows)
        setTotal(result.total)
      } catch (err) {
        if (cancelled) return
        console.error('Erro ao carregar leads de Meta Ads:', err)
        setError('Não foi possível carregar os leads.')
        setRows([])
        setTotal(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [category, filters, page])

  const handleOpenLead = async (leadId: string) => {
    try {
      const { getLeadById } = await import('../../../../services/leadService')
      const { data: lead, error: leadError } = await getLeadById(leadId)
      if (leadError) throw leadError
      if (lead) setSelectedLead(lead)
    } catch (err) {
      console.error('Erro ao buscar lead:', err)
    }
  }

  if (!category) return null

  const config = getDrilldownCategory(category)
  const totalPages = Math.max(1, Math.ceil(total / META_ADS_LEADS_PAGE_SIZE))
  const unit = category === 'clicks' ? 'cliques' : 'leads'

  return (
    <>
      {/* z-[52] fica acima do menu lateral (z-50 no MainLayout), como no drill-down do Chat */}
      <div className="fixed inset-0 z-[52] bg-black/40 flex items-stretch lg:items-center justify-center lg:p-6">
        <div className="bg-white w-full lg:max-w-6xl h-full lg:h-auto lg:max-h-[85vh] flex flex-col overflow-hidden rounded-none lg:rounded-lg lg:shadow-xl">
          <div className="p-3 lg:p-4 border-b border-gray-200 shrink-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm lg:text-base font-semibold text-gray-900">Meta Ads · {config.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {loading ? 'Carregando...' : `${total.toLocaleString('pt-BR')} ${unit}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded shrink-0"
                aria-label="Fechar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto">
              {META_ADS_DRILLDOWN_CATEGORIES.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onCategoryChange(item.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    item.key === category ? 'bg-sky-50 text-sky-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* min-h-0 permite que o flex encolha e a rolagem funcione */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <MetaAdsLeadList
              rows={rows}
              category={category}
              loading={loading}
              error={error}
              formatCurrency={formatCurrency}
              onOpenLead={handleOpenLead}
            />
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 p-3 border-t border-gray-200 shrink-0">
              <span className="text-xs text-gray-500">Página {page + 1} de {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0 || loading}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page + 1 >= totalPages || loading}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isOpen={true}
          onClose={() => setSelectedLead(null)}
          onLeadUpdate={(updatedLead) => setSelectedLead(updatedLead)}
        />
      )}
    </>
  )
}
