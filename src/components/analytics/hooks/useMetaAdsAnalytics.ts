import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getMetaAdsSummary,
  getMetaAdsTimeline,
  invalidateMetaAdsCache
} from '../../../services/metaAdsAnalyticsService'
import { buildMetaAdsTree } from '../metaAds/buildMetaAdsTree'
import { getTimelineGranularity } from '../metaAds/metaAdsTimelineData'
import type {
  MetaAdsAnalyticsFilters,
  MetaAdsGranularity,
  MetaAdsSummaryRow,
  MetaAdsTimelinePoint
} from '../../../types'

/**
 * Carrega os dados da aba Meta Ads.
 *
 * Fica fora do useAnalyticsData pelo mesmo motivo do useChatEngagement:
 * só roda quando a aba está montada, sem pesar nas demais.
 */
export function useMetaAdsAnalytics(filters: MetaAdsAnalyticsFilters) {
  const [rows, setRows] = useState<MetaAdsSummaryRow[]>([])
  const [timeline, setTimeline] = useState<MetaAdsTimelinePoint[]>([])
  // Guardado junto da série para o gráfico nunca misturar dados e rótulos de granularidades diferentes
  const [granularity, setGranularity] = useState<MetaAdsGranularity>('day')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const load = useCallback(async () => {
    const thisRequestId = ++requestIdRef.current

    try {
      setLoading(true)
      setError(null)

      const granularity = getTimelineGranularity(filters.period)
      const [summaryData, timelineData] = await Promise.all([
        getMetaAdsSummary(filters),
        getMetaAdsTimeline(filters, granularity)
      ])

      // Descarta respostas de requisições antigas
      if (thisRequestId !== requestIdRef.current) return
      setRows(summaryData)
      setTimeline(timelineData)
      setGranularity(granularity)
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return
      console.error('Erro ao carregar analytics de Meta Ads:', err)
      setError('Não foi possível carregar os dados de Meta Ads.')
      setRows([])
      setTimeline([])
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const reload = useCallback(() => {
    invalidateMetaAdsCache()
    return load()
  }, [load])

  const derived = useMemo(() => ({
    totals: rows.find((row) => row.level === 'total') ?? null,
    tree: buildMetaAdsTree(rows),
    platforms: rows.filter((row) => row.level === 'platform'),
    creatives: rows.filter((row) => row.level === 'ad')
  }), [rows])

  return { ...derived, timeline, granularity, loading, error, reload }
}
