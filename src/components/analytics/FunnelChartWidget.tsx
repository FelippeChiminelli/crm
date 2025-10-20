import type { FunnelStageData } from '../../types'

interface FunnelChartWidgetProps {
  title: string
  data: FunnelStageData[]
  loading?: boolean
}

export function FunnelChartWidget({
  title,
  data,
  loading = false
}: FunnelChartWidgetProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {data.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          Nenhum dado disponível para o período selecionado
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((stage, index) => {
            const width = (stage.count / maxCount) * 100
            const isFirst = index === 0
            const dropOff = stage.drop_off_rate || 0

            return (
              <div key={stage.stage_id} className="relative">
                {/* Barra do Funil */}
                <div className="relative">
                  <div
                    className="h-16 rounded-lg flex items-center justify-between px-4 transition-all"
                    style={{
                      width: `${width}%`,
                      backgroundColor: `rgba(59, 130, 246, ${1 - (index * 0.15)})`,
                      minWidth: '200px',
                      marginLeft: `${index * 10}px`
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-white">
                        {stage.stage_name}
                      </p>
                      <p className="text-sm text-white opacity-90">
                        {stage.count} leads ({stage.percentage.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {stage.count}
                    </div>
                  </div>
                </div>

                {/* Drop-off rate */}
                {!isFirst && dropOff > 0 && (
                  <div className="mt-1 ml-2 text-xs text-red-600">
                    ↓ {dropOff.toFixed(1)}% perdidos
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legenda */}
      {data.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total no topo:</span>
              <span className="ml-2 font-semibold">{data[0]?.count || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Taxa de conversão geral:</span>
              <span className="ml-2 font-semibold">
                {data.length > 1 
                  ? ((data[data.length - 1].count / data[0].count) * 100).toFixed(1)
                  : 0
                }%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

