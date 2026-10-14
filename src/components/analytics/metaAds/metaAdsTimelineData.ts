import { META_ADS_COLORS } from './metaAdsLabels'
import type { AnalyticsPeriod, MetaAdsGranularity, MetaAdsTimelinePoint } from '../../../types'

// Acima disso o gráfico fica ilegível; o restante vira "Outras"
const MAX_SERIES = 5
export const OTHERS_KEY = '__outras'
const OTHERS_COLOR = '#94A3B8'

const GRANULARITY_LABEL: Record<MetaAdsGranularity, string> = {
  day: 'dia',
  week: 'semana',
  month: 'mês'
}

export function getGranularityLabel(granularity: MetaAdsGranularity): string {
  return GRANULARITY_LABEL[granularity]
}

const toUtcDate = (day: string) => new Date(`${day}T00:00:00Z`)
const toKey = (date: Date) => date.toISOString().slice(0, 10)

function periodDays(period: AnalyticsPeriod): number {
  return Math.round((toUtcDate(period.end).getTime() - toUtcDate(period.start).getTime()) / 86400000) + 1
}

/** Dia a dia até um mês, por semana até 6 meses e por mês acima disso. */
export function getTimelineGranularity(period: AnalyticsPeriod): MetaAdsGranularity {
  const days = periodDays(period)
  if (days <= 31) return 'day'
  if (days <= 183) return 'week'
  return 'month'
}

/** Início do período no mesmo critério do date_trunc do Postgres (semana começa na segunda). */
function bucketStart(day: string, granularity: MetaAdsGranularity): string {
  const date = toUtcDate(day)
  if (granularity === 'week') date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  if (granularity === 'month') date.setUTCDate(1)
  return toKey(date)
}

function listBuckets(period: AnalyticsPeriod, granularity: MetaAdsGranularity): string[] {
  const buckets = new Set<string>()
  const current = toUtcDate(period.start)
  const end = toUtcDate(period.end)
  while (current <= end) {
    buckets.add(bucketStart(toKey(current), granularity))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return [...buckets]
}

const formatShort = (day: string) => {
  const [, month, date] = day.split('-')
  return `${date}/${month}`
}

/** Rótulo do período, recortado ao intervalo filtrado nas pontas. */
export function formatBucket(bucket: string, granularity: MetaAdsGranularity, period: AnalyticsPeriod): string {
  if (granularity === 'day') return formatShort(bucket)

  if (granularity === 'month') {
    return toUtcDate(bucket)
      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
      .replace('. de ', '/')
      .replace(' de ', '/')
  }

  const end = toUtcDate(bucket)
  end.setUTCDate(end.getUTCDate() + 6)
  const from = bucket < period.start ? period.start : bucket
  const to = toKey(end) > period.end ? period.end : toKey(end)
  return `${formatShort(from)} a ${formatShort(to)}`
}

export interface TimelineSeries {
  dataKey: string
  label: string
  color: string
}

export interface TimelineTableRow {
  label: string
  leads: number
  top_campaign: string | null
  top_campaign_leads: number
}

export function buildTimeline(
  points: MetaAdsTimelinePoint[],
  period: AnalyticsPeriod,
  granularity: MetaAdsGranularity
) {
  const campaignPoints = points.filter((point) => point.campaign_id !== null)
  const totalsByBucket = new Map(
    points.filter((point) => point.campaign_id === null).map((point) => [point.day, point.leads])
  )

  const totalsByCampaign = new Map<string, { name: string; leads: number }>()
  for (const point of campaignPoints) {
    const id = point.campaign_id as string
    const entry = totalsByCampaign.get(id) ?? { name: point.campaign_name || id, leads: 0 }
    entry.leads += point.leads
    totalsByCampaign.set(id, entry)
  }

  const ranked = [...totalsByCampaign.entries()].sort((a, b) => b[1].leads - a[1].leads)
  const topIds = new Set(ranked.slice(0, MAX_SERIES).map(([id]) => id))
  const series: TimelineSeries[] = ranked.slice(0, MAX_SERIES).map(([id, { name }], index) => ({
    dataKey: id,
    label: name,
    color: META_ADS_COLORS[index % META_ADS_COLORS.length]
  }))
  if (ranked.length > MAX_SERIES) {
    series.push({ dataKey: OTHERS_KEY, label: 'Outras campanhas', color: OTHERS_COLOR })
  }

  const chartRows = new Map<string, Record<string, number | string>>()
  for (const bucket of listBuckets(period, granularity)) {
    const row: Record<string, number | string> = { label: formatBucket(bucket, granularity, period) }
    series.forEach((item) => { row[item.dataKey] = 0 })
    chartRows.set(bucket, row)
  }

  const topByBucket = new Map<string, { name: string; leads: number }>()
  for (const point of campaignPoints) {
    const row = chartRows.get(point.day)
    if (!row) continue
    const key = topIds.has(point.campaign_id as string) ? (point.campaign_id as string) : OTHERS_KEY
    row[key] = Number(row[key] ?? 0) + point.leads

    const top = topByBucket.get(point.day)
    if (!top || point.leads > top.leads) {
      topByBucket.set(point.day, { name: point.campaign_name || '', leads: point.leads })
    }
  }

  const tableRows: TimelineTableRow[] = [...chartRows.keys()]
    .map((bucket) => ({
      label: formatBucket(bucket, granularity, period),
      leads: totalsByBucket.get(bucket) ?? 0,
      top_campaign: topByBucket.get(bucket)?.name ?? null,
      top_campaign_leads: topByBucket.get(bucket)?.leads ?? 0
    }))
    .reverse()

  return {
    chartData: points.length > 0 ? [...chartRows.values()] : [],
    series,
    tableRows: points.length > 0 ? tableRows : []
  }
}
