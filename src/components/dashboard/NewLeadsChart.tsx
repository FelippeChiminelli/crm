import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import {
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import type { Lead } from '../../types'

interface NewLeadsChartProps {
  leads: Lead[]
}

function buildDailyData(leads: Lead[], days: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets: { date: Date; label: string; total: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    buckets.push({
      date: d,
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      total: 0
    })
  }

  for (const lead of leads) {
    const created = new Date(lead.created_at)
    if (isNaN(created.getTime())) continue
    const dateStr = created.toDateString()
    const bucket = buckets.find(b => b.date.toDateString() === dateStr)
    if (bucket) bucket.total++
  }

  return buckets.map(b => ({ name: b.label, total: b.total }))
}

function calcGrowth(data: { total: number }[]): number {
  const half = Math.floor(data.length / 2)
  const first = data.slice(0, half).reduce((s, d) => s + d.total, 0)
  const second = data.slice(half).reduce((s, d) => s + d.total, 0)
  if (first === 0) return second > 0 ? 100 : 0
  return ((second - first) / first) * 100
}

export function NewLeadsChart({ leads }: NewLeadsChartProps) {
  const [days, setDays] = useState(7)

  const chartData = useMemo(() => buildDailyData(leads, days), [leads, days])

  const totalPeriod = useMemo(
    () => chartData.reduce((s, d) => s + d.total, 0),
    [chartData]
  )

  const growth = useMemo(() => calcGrowth(chartData), [chartData])
  const growthLabel = growth.toFixed(1)
  const isPositive = growth >= 0

  return (
    <Card>
      <CardHeader className="p-2.5 sm:p-4 pb-0 sm:pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-[11px] sm:text-sm">
            <UserGroupIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
            <span className="hidden sm:inline">Evolução de Leads</span>
            <span className="sm:hidden">Leads</span>
            <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-normal">
              {isPositive ? (
                <ArrowTrendingUpIcon className="w-3 h-3 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="w-3 h-3 text-red-500" />
              )}
              <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                {growthLabel}%
              </span>
            </span>
          </CardTitle>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-[9px] sm:text-[10px] border border-gray-300 rounded-md px-1.5 py-0.5 sm:py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-1 sm:pt-2">
        <div className="h-36 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                labelStyle={{ fontWeight: 600 }}
                formatter={(value: number) => [`${value} lead${value !== 1 ? 's' : ''}`, 'Novos']}
              />
              <Bar
                dataKey="total"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-1.5 sm:mt-3 pt-1.5 sm:pt-3 border-t border-gray-100 text-center">
          <div className="text-lg sm:text-xl font-bold text-blue-600">{totalPeriod}</div>
          <div className="text-[9px] sm:text-[10px] text-gray-500">
            Leads nos últimos {days} dias
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
