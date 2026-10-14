import { useMemo } from 'react'
import { DataTableWidget } from '../DataTableWidget'
import { MetaAdsTimelineChart } from './MetaAdsTimelineChart'
import { buildTimeline, getGranularityLabel, type TimelineTableRow } from './metaAdsTimelineData'
import type { AnalyticsPeriod, MetaAdsGranularity, MetaAdsTimelinePoint } from '../../../types'

interface MetaAdsTimelineSectionProps {
  timeline: MetaAdsTimelinePoint[]
  granularity: MetaAdsGranularity
  period: AnalyticsPeriod
  loading: boolean
}

export function MetaAdsTimelineSection({ timeline, granularity, period, loading }: MetaAdsTimelineSectionProps) {
  const { chartData, series, tableRows } = useMemo(
    () => buildTimeline(timeline, period, granularity),
    [timeline, period, granularity]
  )
  const unit = getGranularityLabel(granularity)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <MetaAdsTimelineChart
        title={`Leads por ${unit} (por campanha)`}
        data={chartData}
        series={series}
        loading={loading}
      />
      <DataTableWidget
        title={`Detalhes por ${unit}`}
        data={tableRows}
        loading={loading}
        columns={[
          { key: 'label', label: 'Período' },
          { key: 'leads', label: 'Leads', render: (value: number) => value.toLocaleString('pt-BR') },
          {
            key: 'top_campaign',
            label: 'Campanha com mais leads',
            render: (value: string | null, row: TimelineTableRow) =>
              value ? (
                <span className="flex items-center gap-2 max-w-[260px]">
                  <span className="truncate" title={value}>{value}</span>
                  <span className="text-gray-500 flex-shrink-0">({row.top_campaign_leads})</span>
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )
          }
        ]}
      />
    </div>
  )
}
