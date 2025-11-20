import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, InformationCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import type { DetailedConversionRate, StageTimeMetrics } from '../../types'

interface ConversionRateWidgetProps {
  title: string
  data: DetailedConversionRate[]
  stageTimeData?: StageTimeMetrics[]
  loading?: boolean
}

export function ConversionRateWidget({
  title,
  data,
  stageTimeData,
  loading = false
}: ConversionRateWidgetProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [expandedPipelines, setExpandedPipelines] = useState<Set<string>>(new Set())

  // Agrupar por pipeline (precisa estar no topo para ser usado nas funções)
  const byPipeline = data?.reduce((acc, item) => {
    if (!acc[item.pipeline_name]) {
      acc[item.pipeline_name] = []
    }
    acc[item.pipeline_name].push(item)
    return acc
  }, {} as Record<string, DetailedConversionRate[]>) || {}

  // Criar um mapa de stage_id -> StageTimeMetrics para fácil lookup
  const stageTimeMap = new Map<string, StageTimeMetrics>()
  if (stageTimeData) {
    stageTimeData.forEach(stage => {
      stageTimeMap.set(stage.stage_id, stage)
    })
  }

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedItems(newExpanded)
  }

  const togglePipeline = (pipelineName: string) => {
    const newExpanded = new Set(expandedPipelines)
    if (newExpanded.has(pipelineName)) {
      newExpanded.delete(pipelineName)
    } else {
      newExpanded.add(pipelineName)
    }
    setExpandedPipelines(newExpanded)
  }

  const expandAllPipelines = () => {
    const allPipelines = Object.keys(byPipeline)
    setExpandedPipelines(new Set(allPipelines))
  }

  const collapseAllPipelines = () => {
    setExpandedPipelines(new Set())
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
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

  const getPerformanceColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600'
    if (rate >= 50) return 'text-blue-600'
    if (rate >= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBg = (rate: number) => {
    if (rate >= 70) return 'bg-green-50'
    if (rate >= 50) return 'bg-blue-50'
    if (rate >= 30) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  const getPerformanceLabel = (rate: number) => {
    if (rate >= 70) return 'Ótima conversão'
    if (rate >= 50) return 'Boa conversão'
    if (rate >= 30) return 'Conversão regular'
    return 'Conversão baixa'
  }

  const pipelineCount = Object.keys(byPipeline).length
  const allExpanded = expandedPipelines.size === pipelineCount

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Cabeçalho com Dica */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {pipelineCount > 1 && (
            <button
              onClick={allExpanded ? collapseAllPipelines : expandAllPipelines}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              {allExpanded ? (
                <>
                  <ChevronUpIcon className="w-4 h-4" />
                  Recolher todos
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-4 h-4" />
                  Expandir todos
                </>
              )}
            </button>
          )}
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p>
            Mostra quantos leads avançaram de cada estágio para o próximo. 
            <span className="font-medium"> Clique nos pipelines e itens</span> para ver mais detalhes.
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        {Object.entries(byPipeline).map(([pipelineName, conversions]) => {
          const isPipelineExpanded = expandedPipelines.has(pipelineName)
          
          // Calcular taxa média de conversão do pipeline
          const avgConversionRate = conversions.reduce((sum, conv) => sum + conv.conversion_rate, 0) / conversions.length

          // Calcular total de leads do pipeline (soma de todos os estágios deste pipeline)
          const totalLeadsInPipeline = stageTimeData
            ?.filter(stage => stage.pipeline_name === pipelineName)
            .reduce((sum, stage) => sum + stage.total_leads, 0) || 0

          return (
            <div key={pipelineName} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Cabeçalho do Pipeline - Clicável */}
              <button
                onClick={() => togglePipeline(pipelineName)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <h4 className="font-semibold text-gray-900 text-base">{pipelineName}</h4>
                  <span className="text-sm text-gray-500">
                    ({conversions.length} {conversions.length === 1 ? 'transição' : 'transições'})
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {/* Total de Leads */}
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Total de leads</div>
                    <div className="text-lg font-bold text-gray-900">
                      {totalLeadsInPipeline}
                    </div>
                  </div>
                  {/* Taxa Média */}
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Taxa média</div>
                    <div className={`text-lg font-bold ${getPerformanceColor(avgConversionRate)}`}>
                      {avgConversionRate.toFixed(0)}%
                    </div>
                  </div>
                  {/* Ícone de Expandir/Recolher */}
                  {isPipelineExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Conteúdo do Pipeline */}
              {isPipelineExpanded && (
                <div className="p-4 space-y-2 bg-white">

                  {/* Lista de Conversões - Versão Simplificada */}
                  {conversions.map((conv, idx) => {
                    const itemKey = `${conv.stage_from_id}_${conv.stage_to_id}_${idx}`
                    const isExpanded = expandedItems.has(itemKey)

                    return (
                      <div
                        key={itemKey}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                    {/* Versão Compacta - Sempre Visível */}
                    <button
                      onClick={() => toggleExpanded(itemKey)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Estágios */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {conv.stage_from_name}
                          </span>
                          <ArrowRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {conv.stage_to_name}
                          </span>
                        </div>

                        {/* Métricas Principais */}
                        <div className="flex items-center gap-4">
                          {/* Taxa de Conversão */}
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getPerformanceColor(conv.conversion_rate)}`}>
                              {conv.conversion_rate.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {conv.converted_to_next} de {conv.total_leads_entered} leads
                            </div>
                          </div>

                          {/* Ícone de Expandir */}
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Detalhes Expandidos */}
                    {isExpanded && (
                      <div className={`border-t border-gray-200 p-4 ${getPerformanceBg(conv.conversion_rate)}`}>
                        {/* Status de Performance */}
                        <div className="mb-4 flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Status:</span>
                          <span className={`text-sm font-semibold ${getPerformanceColor(conv.conversion_rate)}`}>
                            {getPerformanceLabel(conv.conversion_rate)}
                          </span>
                        </div>

                        {/* Grid de Métricas Detalhadas */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {/* Leads que Avançaram */}
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="text-xs text-gray-600 mb-1">✓ Avançaram</div>
                            <div className="text-xl font-bold text-green-600">
                              {conv.converted_to_next}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {conv.conversion_rate.toFixed(1)}% do total
                            </div>
                          </div>

                          {/* Leads Perdidos */}
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="text-xs text-gray-600 mb-1">✗ Perdidos</div>
                            <div className="text-xl font-bold text-red-600">
                              {conv.lost_leads}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {conv.loss_rate.toFixed(1)}% do total
                            </div>
                          </div>

                          {/* Tempo para Avançar */}
                          <div className="bg-white rounded-lg p-3 shadow-sm col-span-2 md:col-span-1">
                            <div className="text-xs text-gray-600 mb-1">⏱ Tempo médio</div>
                            <div className="text-lg font-bold text-gray-900">
                              {conv.avg_time_to_convert_formatted}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              para avançar de estágio
                            </div>
                          </div>
                        </div>

                        {/* Explicação Contextual */}
                        <div className="mt-3 text-xs text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                          <span className="font-medium">Interpretação:</span> De cada 100 leads que chegaram em 
                          <span className="font-medium"> {conv.stage_from_name}</span>, 
                          aproximadamente <span className="font-medium">{Math.round(conv.conversion_rate)}</span> avançaram 
                          para <span className="font-medium">{conv.stage_to_name}</span>.
                        </div>

                        {/* Tempo Médio por Estágio - Seção Integrada */}
                        {stageTimeMap.has(conv.stage_from_id) && (
                          <div className="mt-4 pt-4 border-t border-gray-300">
                            <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <ClockIcon className="w-4 h-4 text-blue-600" />
                              Tempo Médio no Estágio "{conv.stage_from_name}"
                            </h5>
                            
                            {(() => {
                              const stageTime = stageTimeMap.get(conv.stage_from_id)!
                              const hasStuckLeads = stageTime.leads_stuck > 0

                              return (
                                <div className="space-y-3">
                                  {/* Gráfico de Barras - Distribuição de Tempo */}
                                  <div className="bg-white rounded-lg p-3 shadow-sm">
                                    <div className="space-y-2">
                                      {/* Barra de Tempo Mínimo */}
                                      <div className="flex items-center gap-3">
                                        <div className="w-16 text-xs text-gray-600 text-right">Mínimo</div>
                                        <div className="flex-1 bg-gray-200 rounded-full h-5 relative overflow-hidden">
                                          <div
                                            className="absolute inset-y-0 left-0 bg-green-400 rounded-full flex items-center justify-end px-2"
                                            style={{ 
                                              width: `${Math.min((stageTime.min_time_minutes / stageTime.max_time_minutes) * 100, 100)}%`,
                                              minWidth: '50px'
                                            }}
                                          >
                                            <span className="text-xs font-semibold text-white">
                                              {formatMinutesToShort(stageTime.min_time_minutes)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Barra de Tempo Mediano */}
                                      <div className="flex items-center gap-3">
                                        <div className="w-16 text-xs text-gray-600 text-right">Mediana</div>
                                        <div className="flex-1 bg-gray-200 rounded-full h-5 relative overflow-hidden">
                                          <div
                                            className="absolute inset-y-0 left-0 bg-blue-400 rounded-full flex items-center justify-end px-2"
                                            style={{ 
                                              width: `${Math.min((stageTime.median_time_minutes / stageTime.max_time_minutes) * 100, 100)}%`,
                                              minWidth: '50px'
                                            }}
                                          >
                                            <span className="text-xs font-semibold text-white">
                                              {formatMinutesToShort(stageTime.median_time_minutes)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Barra de Tempo Médio - Destaque */}
                                      <div className="flex items-center gap-3">
                                        <div className="w-16 text-xs text-gray-700 text-right font-semibold">Média</div>
                                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden ring-2 ring-blue-400">
                                          <div
                                            className="absolute inset-y-0 left-0 bg-blue-600 rounded-full flex items-center justify-end px-2"
                                            style={{ 
                                              width: `${Math.min((stageTime.avg_time_minutes / stageTime.max_time_minutes) * 100, 100)}%`,
                                              minWidth: '60px'
                                            }}
                                          >
                                            <span className="text-sm font-bold text-white">
                                              {stageTime.avg_time_formatted}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Barra de Tempo Máximo */}
                                      <div className="flex items-center gap-3">
                                        <div className="w-16 text-xs text-gray-600 text-right">Máximo</div>
                                        <div className="flex-1 bg-gray-200 rounded-full h-5 relative overflow-hidden">
                                          <div
                                            className="absolute inset-y-0 left-0 bg-red-400 rounded-full flex items-center justify-end px-2"
                                            style={{ width: '100%' }}
                                          >
                                            <span className="text-xs font-semibold text-white">
                                              {formatMinutesToShort(stageTime.max_time_minutes)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Cards de Métricas de Tempo */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                                      <div className="text-xs text-gray-600">Total Leads</div>
                                      <div className="text-lg font-bold text-gray-900">{stageTime.total_leads}</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                                      <div className="text-xs text-gray-600">Tempo Médio</div>
                                      <div className="text-lg font-bold text-blue-600">{stageTime.avg_time_formatted}</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                                      <div className="text-xs text-gray-600">Mediana</div>
                                      <div className="text-lg font-bold text-purple-600">{formatMinutesToShort(stageTime.median_time_minutes)}</div>
                                    </div>
                                    {hasStuckLeads ? (
                                      <div className="bg-orange-50 rounded-lg p-2 shadow-sm border border-orange-200">
                                        <div className="text-xs text-orange-700 flex items-center gap-1">
                                          <ExclamationTriangleIcon className="w-3 h-3" />
                                          Estagnados
                                        </div>
                                        <div className="text-lg font-bold text-orange-600">
                                          {stageTime.leads_stuck}
                                          <span className="text-xs text-orange-500 ml-1">
                                            ({((stageTime.leads_stuck / stageTime.total_leads) * 100).toFixed(0)}%)
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-green-50 rounded-lg p-2 shadow-sm border border-green-200">
                                        <div className="text-xs text-green-700">Status</div>
                                        <div className="text-sm font-semibold text-green-600">✓ Fluindo bem</div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Info adicional */}
                                  <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-100">
                                    <span className="font-medium">💡 Contexto:</span> Os leads ficam em média{' '}
                                    <span className="font-semibold">{stageTime.avg_time_formatted}</span> neste estágio antes de avançar ou serem perdidos.
                                    {hasStuckLeads && (
                                      <span className="text-orange-700 font-medium"> Atenção: {stageTime.leads_stuck} lead{stageTime.leads_stuck !== 1 ? 's' : ''} estagnado{stageTime.leads_stuck !== 1 ? 's' : ''} há mais de 30 dias.</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  )
                })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legenda Simplificada */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-2">
          <div className="font-medium mb-2">Como interpretar:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>≥70% é ótimo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span>≥50% é bom</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span>≥30% é regular</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>&lt;30% precisa atenção</span>
            </div>
          </div>
        </div>
      </div>
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

