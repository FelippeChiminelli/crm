import { useMemo } from 'react'
import { FunnelChartWidget } from '../FunnelChartWidget'
import { DataTableWidget } from '../DataTableWidget'
import { AnalyticsViewHeader } from '../layout/AnalyticsViewHeader'
import type { LeadAnalyticsFilters, DetailedConversionRate, StageTimeMetrics } from '../../../types'

interface FunnelViewProps {
  data: any
  filters: LeadAnalyticsFilters
  formatPeriod: (start: string, end: string) => string
  onOpenMobileMenu?: () => void
  onOpenFilters: () => void
}

function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0min'
  if (minutes < 60) return `${Math.round(minutes)}min`

  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const mins = Math.round(minutes % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}min`)

  return parts.join(' ')
}

export function FunnelView({ data, filters, formatPeriod, onOpenMobileMenu, onOpenFilters }: FunnelViewProps) {
  const { 
    loading, 
    pipelineFunnel,
    detailedConversionRates,
    stageTimeMetrics
  } = data

  const activeFiltersCount = [
    filters.pipelines?.length || 0,
    filters.stages?.length || 0,
    filters.origins?.length || 0,
    filters.status?.length || 0
  ].reduce((sum: number, count: number) => sum + count, 0)

  const conversionByPipeline = useMemo(() => {
    if (!detailedConversionRates || detailedConversionRates.length === 0) return new Map()
    const map = new Map<string, { name: string; data: DetailedConversionRate[] }>()
    for (const rate of detailedConversionRates) {
      if (!map.has(rate.pipeline_id)) {
        map.set(rate.pipeline_id, { name: rate.pipeline_name, data: [] })
      }
      map.get(rate.pipeline_id)!.data.push(rate)
    }
    return map
  }, [detailedConversionRates])

  const timeByPipeline = useMemo(() => {
    if (!stageTimeMetrics || stageTimeMetrics.length === 0) return new Map()
    const map = new Map<string, { name: string; data: StageTimeMetrics[] }>()
    for (const metric of stageTimeMetrics) {
      if (!map.has(metric.pipeline_id)) {
        map.set(metric.pipeline_id, { name: metric.pipeline_name, data: [] })
      }
      map.get(metric.pipeline_id)!.data.push(metric)
    }
    for (const entry of map.values()) {
      entry.data.sort((a, b) => a.stage_position - b.stage_position)
    }
    return map
  }, [stageTimeMetrics])

  const allPipelineIds = useMemo(() => {
    const ids = new Set<string>()
    conversionByPipeline.forEach((_, id) => ids.add(id))
    timeByPipeline.forEach((_, id) => ids.add(id))
    return Array.from(ids)
  }, [conversionByPipeline, timeByPipeline])

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <AnalyticsViewHeader
        title="Funil de Conversão"
        subtitle="Análise do funil por pipeline"
        period={formatPeriod(filters.period.start, filters.period.end)}
        activeFiltersCount={activeFiltersCount}
        onOpenMobileMenu={onOpenMobileMenu}
        onOpenFilters={onOpenFilters}
      />

      <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
        <FunnelChartWidget
          title="Funil de Conversão por Pipeline"
          data={pipelineFunnel}
          loading={loading}
        />

        {allPipelineIds.map(pipelineId => {
          const convData = conversionByPipeline.get(pipelineId)
          const timeData = timeByPipeline.get(pipelineId)
          const pipelineName = convData?.name || timeData?.name || ''

          return (
            <PipelineFunnelTables
              key={pipelineId}
              pipelineName={pipelineName}
              conversionData={convData?.data || []}
              timeData={timeData?.data || []}
              loading={loading}
            />
          )
        })}
      </div>
    </div>
  )
}

function PipelineFunnelTables({
  pipelineName,
  conversionData,
  timeData,
  loading
}: {
  pipelineName: string
  conversionData: DetailedConversionRate[]
  timeData: StageTimeMetrics[]
  loading: boolean
}) {
  const conversionTotals = useMemo(() => {
    if (conversionData.length === 0) return undefined
    const totalEntered = conversionData.reduce((s, r) => s + r.total_leads_entered, 0)
    const totalConverted = conversionData.reduce((s, r) => s + r.converted_to_next, 0)
    const totalLost = conversionData.reduce((s, r) => s + r.lost_leads, 0)
    const avgConversion = totalEntered > 0 ? (totalConverted / totalEntered) * 100 : 0
    const avgLoss = totalEntered > 0 ? (totalLost / totalEntered) * 100 : 0

    const totalWeightedTime = conversionData.reduce(
      (s, r) => s + r.avg_time_to_convert_minutes * r.converted_to_next, 0
    )
    const avgTime = totalConverted > 0 ? totalWeightedTime / totalConverted : 0

    return {
      stage_from_name: 'Total',
      stage_to_name: '',
      total_leads_entered: totalEntered.toLocaleString('pt-BR'),
      converted_to_next: totalConverted.toLocaleString('pt-BR'),
      conversion_rate: `${avgConversion.toFixed(1)}%`,
      lost_leads: totalLost.toLocaleString('pt-BR'),
      loss_rate: `${avgLoss.toFixed(1)}%`,
      avg_time_to_convert_formatted: formatMinutes(avgTime)
    }
  }, [conversionData])

  const timeTotals = useMemo(() => {
    if (timeData.length === 0) return undefined
    const totalLeads = timeData.reduce((s, r) => s + r.total_leads, 0)
    const totalStuck = timeData.reduce((s, r) => s + r.leads_stuck, 0)

    const totalWeightedAvg = timeData.reduce((s, r) => s + r.avg_time_minutes * r.total_leads, 0)
    const avgTime = totalLeads > 0 ? totalWeightedAvg / totalLeads : 0

    const totalWeightedMedian = timeData.reduce((s, r) => s + r.median_time_minutes * r.total_leads, 0)
    const medianTime = totalLeads > 0 ? totalWeightedMedian / totalLeads : 0

    return {
      stage_name: 'Total',
      total_leads: totalLeads.toLocaleString('pt-BR'),
      avg_time_formatted: formatMinutes(avgTime),
      median_time_minutes: formatMinutes(medianTime),
      leads_stuck: totalStuck.toLocaleString('pt-BR')
    }
  }, [timeData])

  if (conversionData.length === 0 && timeData.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">
        {pipelineName}
      </h3>

      {conversionData.length > 0 && (
        <DataTableWidget
          title="Conversão por Etapa"
          data={conversionData}
          columns={[
            {
              key: 'stage_from_name',
              label: 'De',
              render: (val) => val || 'N/A'
            },
            {
              key: 'stage_to_name',
              label: 'Para',
              render: (val) => val || 'N/A'
            },
            {
              key: 'total_leads_entered',
              label: 'Entraram',
              render: (val) => val.toLocaleString('pt-BR')
            },
            {
              key: 'converted_to_next',
              label: 'Converteram',
              render: (val) => val.toLocaleString('pt-BR')
            },
            {
              key: 'conversion_rate',
              label: 'Conversão',
              render: (val) => `${val.toFixed(1)}%`
            },
            {
              key: 'lost_leads',
              label: 'Perdidos',
              render: (val) => val.toLocaleString('pt-BR')
            },
            {
              key: 'loss_rate',
              label: 'Taxa Perda',
              render: (val) => `${val.toFixed(1)}%`
            },
            {
              key: 'avg_time_to_convert_formatted',
              label: 'Tempo Médio',
              render: (val) => val || '-'
            }
          ]}
          loading={loading}
          totals={conversionTotals}
        />
      )}

      {timeData.length > 0 && (
        <DataTableWidget
          title="Tempo por Etapa"
          data={timeData}
          columns={[
            {
              key: 'stage_name',
              label: 'Etapa',
              render: (val) => val || 'N/A'
            },
            {
              key: 'total_leads',
              label: 'Leads',
              render: (val) => val.toLocaleString('pt-BR')
            },
            {
              key: 'avg_time_formatted',
              label: 'Tempo Médio',
              render: (val) => val || '-'
            },
            {
              key: 'median_time_minutes',
              label: 'Mediana',
              render: (val) => formatMinutes(val)
            },
            {
              key: 'leads_stuck',
              label: 'Estagnados',
              render: (val) => val.toLocaleString('pt-BR')
            }
          ]}
          loading={loading}
          totals={timeTotals}
        />
      )}
    </div>
  )
}
