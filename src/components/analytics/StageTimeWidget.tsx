import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { StageTimeMetrics } from '../../types'

interface StageTimeWidgetProps {
  title: string
  data: StageTimeMetrics[]
  loading?: boolean
}

export function StageTimeWidget({
  title,
  data,
  loading = false
}: StageTimeWidgetProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="py-12 text-center text-gray-500">
          Nenhum dado disponível para o período selecionado
        </div>
      </div>
    )
  }

  // Agrupar por pipeline
  const byPipeline = data.reduce((acc, item) => {
    if (!acc[item.pipeline_name]) {
      acc[item.pipeline_name] = []
    }
    acc[item.pipeline_name].push(item)
    return acc
  }, {} as Record<string, StageTimeMetrics[]>)

  // Calcular tempo máximo para normalizar barras
  const maxTime = Math.max(...data.map(d => d.avg_time_minutes))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      
      <div className="space-y-8">
        {Object.entries(byPipeline).map(([pipelineName, stages]) => (
          <div key={pipelineName} className="space-y-3">
            {/* Nome do Pipeline */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <h4 className="font-semibold text-gray-900">{pipelineName}</h4>
            </div>

            {/* Estágios */}
            {stages.map((stage) => {
              const barWidth = maxTime > 0 ? (stage.avg_time_minutes / maxTime) * 100 : 0
              const hasStuckLeads = stage.leads_stuck > 0
              const stuckPercentage = (stage.leads_stuck / stage.total_leads) * 100

              // Cor baseada no tempo médio
              const barColor = 
                stage.avg_time_minutes < (24 * 60) ? 'bg-green-500' : // < 1 dia
                stage.avg_time_minutes < (3 * 24 * 60) ? 'bg-blue-500' : // < 3 dias
                stage.avg_time_minutes < (7 * 24 * 60) ? 'bg-yellow-500' : // < 7 dias
                'bg-red-500' // >= 7 dias

              return (
                <div
                  key={stage.stage_id}
                  className="relative"
                >
                  {/* Container do Estágio */}
                  <div className="flex items-center gap-3">
                    {/* Nome do Estágio e Posição */}
                    <div className="w-48 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 w-6">
                          #{stage.stage_position + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {stage.stage_name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 ml-8">
                        {stage.total_leads} lead{stage.total_leads !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Barra de Tempo */}
                    <div className="flex-1 min-w-0">
                      <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 ${barColor} transition-all duration-300 flex items-center justify-between px-3`}
                          style={{ width: `${Math.max(barWidth, 15)}%` }}
                        >
                          <span className="text-sm font-semibold text-white">
                            {stage.avg_time_formatted}
                          </span>
                          
                          {hasStuckLeads && (
                            <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded">
                              <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                              <span className="text-xs font-medium text-white">
                                {stage.leads_stuck} estagnado{stage.leads_stuck !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informações Adicionais */}
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Min: {formatMinutesToShort(stage.min_time_minutes)}
                        </span>
                        <span>
                          Mediana: {formatMinutesToShort(stage.median_time_minutes)}
                        </span>
                        <span>
                          Máx: {formatMinutesToShort(stage.max_time_minutes)}
                        </span>
                        {hasStuckLeads && (
                          <span className="text-orange-600 font-medium">
                            {stuckPercentage.toFixed(0)}% estagnados
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legenda e Informações */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Legenda de Cores */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 mb-2">Tempo Médio</h5>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-gray-600">Rápido (&lt;1d)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-gray-600">Normal (&lt;3d)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span className="text-gray-600">Lento (&lt;7d)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-gray-600">Muito Lento (≥7d)</span>
              </div>
            </div>
          </div>

          {/* Informação sobre Leads Estagnados */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
              Leads Estagnados
            </h5>
            <p className="text-xs text-gray-600">
              Leads que ficaram mais de 30 dias no mesmo estágio. 
              Requerem atenção especial para evitar perda.
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      {data.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <ClockIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Insight:</strong> O tempo médio total no funil é de{' '}
              <strong>
                {formatMinutesToShort(
                  data.reduce((sum, s) => sum + s.avg_time_minutes, 0)
                )}
              </strong>
              . Estágios com mais de 7 dias podem indicar gargalos no processo.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Função auxiliar para formatar tempo de forma compacta
function formatMinutesToShort(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`
  }
  
  if (minutes < 24 * 60) {
    const hours = Math.round(minutes / 60)
    return `${hours}h`
  }
  
  const days = Math.round(minutes / (24 * 60))
  return `${days}d`
}

