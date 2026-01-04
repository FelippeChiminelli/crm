import { useState, useEffect } from 'react'
import { CheckCircleIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import type { PipelineFunnelData } from '../../types'

interface FunnelChartWidgetProps {
  title: string
  data: PipelineFunnelData[]
  loading?: boolean
}

export function FunnelChartWidget({ title, data, loading = false }: FunnelChartWidgetProps) {
  // Estado para controlar quais pipelines estão expandidos
  const [expandedPipelines, setExpandedPipelines] = useState<Record<string, boolean>>({})

  // Inicializar novos pipelines como colapsados
  useEffect(() => {
    if (data && data.length > 0) {
      setExpandedPipelines(prev => {
        const updated = { ...prev }
        data.forEach(pipeline => {
          // Se o pipeline ainda não tem estado, inicializar como colapsado
          if (!(pipeline.pipeline_id in updated)) {
            updated[pipeline.pipeline_id] = false
          }
        })
        return updated
      })
    }
  }, [data])

  const togglePipeline = (pipelineId: string) => {
    setExpandedPipelines(prev => ({
      ...prev,
      [pipelineId]: !prev[pipelineId]
    }))
  }
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Carregando funil...</span>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <p className="text-sm">Nenhum dado disponível para o período selecionado</p>
        </div>
      </div>
    )
  }

  const getWidthPercentage = (rate: number) => {
    return Math.max(rate, 10) // Mínimo 10% para visibilidade
  }

  const getColorByRate = (rate: number) => {
    if (rate >= 70) return 'bg-green-500'
    if (rate >= 50) return 'bg-blue-500'
    if (rate >= 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>

      <div className="space-y-8">
        {data.map((pipeline) => {
          const isExpanded = expandedPipelines[pipeline.pipeline_id] ?? false
          
          return (
            <div key={pipeline.pipeline_id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header do Pipeline - Sempre visível */}
              <div 
                className="p-5 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => togglePipeline(pipeline.pipeline_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePipeline(pipeline.pipeline_id)
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                    <h4 className="text-base font-bold text-gray-900">{pipeline.pipeline_name}</h4>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Entrada</div>
                      <div className="text-lg font-bold text-blue-600">{pipeline.total_entrada} leads</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Vendas</div>
                      <div className="text-lg font-bold text-green-600">{pipeline.total_vendas}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Taxa Final</div>
                      <div className="text-lg font-bold text-green-600">
                        {pipeline.taxa_conversao_final.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Funil Visual - Colapsável */}
              {isExpanded && (
                <div className="p-5 space-y-3">
                  {pipeline.stages.map((stage, index) => {
                    const width = getWidthPercentage(stage.conversion_rate_from_start)
                    const color = getColorByRate(stage.conversion_rate_from_start)

                    return (
                      <div key={stage.stage_id} className="relative">
                        {/* Barra do Funil */}
                        <div 
                          className={`${color} rounded-lg shadow-md transition-all duration-300 hover:shadow-lg`}
                          style={{ width: `${width}%` }}
                        >
                          <div className="p-4 text-white">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-sm">{stage.stage_name}</div>
                                <div className="text-xs opacity-90 mt-1">
                                  {stage.total_leads} leads ({stage.conversion_rate_from_start.toFixed(1)}% do total)
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold">
                                  {stage.conversion_rate_from_start.toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Seta de Conversão */}
                        {index < pipeline.stages.length - 1 && (
                          <div className="flex items-center justify-center py-2">
                            <div className="text-gray-400 text-sm font-medium">
                              ↓ {pipeline.stages[index + 1].conversion_rate_from_start.toFixed(0)}% do total inicial chegaram aqui
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Resultado Final */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Vendas */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircleIcon className="w-8 h-8 text-green-600" />
                          <div>
                            <div className="text-xs text-green-700 font-medium">Vendas Confirmadas</div>
                            <div className="text-2xl font-bold text-green-600">{pipeline.total_vendas}</div>
                            <div className="text-xs text-green-600 mt-1">
                              {pipeline.taxa_conversao_final.toFixed(1)}% do total
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Perdas */}
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <XMarkIcon className="w-8 h-8 text-red-600" />
                          <div>
                            <div className="text-xs text-red-700 font-medium">Leads Perdidos</div>
                            <div className="text-2xl font-bold text-red-600">{pipeline.total_perdas}</div>
                            <div className="text-xs text-red-600 mt-1">
                              {pipeline.total_entrada > 0 
                                ? ((pipeline.total_perdas / pipeline.total_entrada) * 100).toFixed(1)
                                : 0}% do total
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          <div className="font-medium mb-2">💡 Como interpretar:</div>
          <ul className="space-y-1 ml-4 list-disc">
            <li>A largura da barra representa a % de leads em relação ao total inicial</li>
            <li>O número na direita mostra a % de leads que chegaram neste estágio em relação ao total inicial</li>
            <li>Todas as porcentagens são calculadas em relação ao total de leads que entraram no primeiro estágio</li>
            <li>Cores: <span className="text-green-600 font-medium">Verde</span> (≥70%), <span className="text-blue-600 font-medium">Azul</span> (≥50%), <span className="text-yellow-600 font-medium">Amarelo</span> (≥30%), <span className="text-red-600 font-medium">Vermelho</span> (&lt;30%)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
