import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TimelineSeries } from './metaAdsTimelineData'

interface MetaAdsTimelineChartProps {
  title: string
  data: Record<string, number | string>[]
  series: TimelineSeries[]
  loading: boolean
}

const LEGEND_MAX_CHARS = 28

const truncate = (text: string) =>
  text.length > LEGEND_MAX_CHARS ? `${text.slice(0, LEGEND_MAX_CHARS - 1)}…` : text

/**
 * Barras empilhadas por campanha: com muitos períodos, linhas sobrepostas
 * viram um emaranhado; a pilha mostra volume total e composição ao mesmo tempo.
 */
export function MetaAdsTimelineChart({ title, data, series, loading }: MetaAdsTimelineChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse h-full">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-72 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      {data.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-gray-500">
          Nenhum dado disponível para o período selecionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              stroke="#666"
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#666" allowDecimals={false} />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: 12 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value: string) => truncate(value)}
            />
            {series.map((item) => (
              <Bar
                key={item.dataKey}
                dataKey={item.dataKey}
                name={item.label}
                stackId="leads"
                fill={item.color}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
