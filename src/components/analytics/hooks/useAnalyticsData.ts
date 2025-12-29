import { useState, useEffect, useCallback } from 'react'
import { useToastContext } from '../../../contexts/ToastContext'
import type { LeadAnalyticsFilters, ChatAnalyticsFilters, TaskAnalyticsFilters, SalesAnalyticsFilters } from '../../../types'
import {
  getLeadsByPipeline,
  getLeadsByOrigin,
  getLeadsOverTime,
  getAnalyticsStats,
  getSalesByOrigin,
  getSalesByResponsible,
  getSalesStats,
  getSalesOverTime,
  getLossesByOrigin,
  getLossesByResponsible,
  getLossesStats,
  getLossesOverTime,
  getTotalConversations,
  getConversationsByInstance,
  getAverageFirstResponseTime,
  getAverageFirstResponseTimeByInstance,
  getAverageTimeToFirstProactiveContact,
  getAverageTimeToFirstProactiveContactByInstance,
  getDetailedConversionRates,
  getStageTimeMetrics,
  getPipelineFunnel,
  invalidateLeadsCache,
  invalidateChatCache,
  invalidateSalesCache,
  invalidateLossesCache
} from '../../../services/analyticsService'
import {
  getTasksStats,
  getTasksByPriority,
  getTasksByStatus,
  getProductivityByUser,
  getTasksOverTime,
  getOverdueTasks,
  getAverageCompletionTime,
  invalidateTasksCache
} from '../../../services/taskAnalyticsService'

export function useAnalyticsData(
  leadFilters: LeadAnalyticsFilters,
  chatFilters: ChatAnalyticsFilters,
  taskFilters: TaskAnalyticsFilters,
  salesFilters: SalesAnalyticsFilters
) {
  const { showError } = useToastContext()
  const [loading, setLoading] = useState(false)
  
  // Estados de dados de Pipeline/Leads
  const [stats, setStats] = useState<any>(null)
  const [leadsByPipeline, setLeadsByPipeline] = useState<any[]>([])
  const [leadsByOrigin, setLeadsByOrigin] = useState<any[]>([])
  const [leadsOverTime, setLeadsOverTime] = useState<any[]>([])
  const [detailedConversionRates, setDetailedConversionRates] = useState<any[]>([])
  const [stageTimeMetrics, setStageTimeMetrics] = useState<any[]>([])
  const [pipelineFunnel, setPipelineFunnel] = useState<any[]>([])
  
  // Estados de dados de Vendas
  const [salesStats, setSalesStats] = useState<any>(null)
  const [salesByOrigin, setSalesByOrigin] = useState<any[]>([])
  const [salesByResponsible, setSalesByResponsible] = useState<any[]>([])
  const [salesOverTime, setSalesOverTime] = useState<any[]>([])
  
  // Estados de dados de Perdas
  const [lossesStats, setLossesStats] = useState<any>(null)
  const [lossesByOrigin, setLossesByOrigin] = useState<any[]>([])
  const [lossesByResponsible, setLossesByResponsible] = useState<any[]>([])
  const [lossesOverTime, setLossesOverTime] = useState<any[]>([])
  
  // Estados de dados de Chat
  const [totalConversations, setTotalConversations] = useState<number>(0)
  const [conversationsByInstance, setConversationsByInstance] = useState<any[]>([])
  const [firstResponseTime, setFirstResponseTime] = useState<any>(null)
  const [firstResponseByInstance, setFirstResponseByInstance] = useState<any[]>([])
  const [proactiveContactTime, setProactiveContactTime] = useState<any>(null)
  const [proactiveContactByInstance, setProactiveContactByInstance] = useState<any[]>([])
  
  // Estados de dados de Tarefas
  const [tasksStats, setTasksStats] = useState<any>(null)
  const [tasksByPriority, setTasksByPriority] = useState<any[]>([])
  const [tasksByStatus, setTasksByStatus] = useState<any[]>([])
  const [productivityByUser, setProductivityByUser] = useState<any[]>([])
  const [tasksOverTime, setTasksOverTime] = useState<any[]>([])
  const [overdueTasks, setOverdueTasks] = useState<any[]>([])
  const [avgCompletionTime, setAvgCompletionTime] = useState<any>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Debug: Verificar filtros aplicados
      console.log('🔍 Carregando analytics com filtros:')
      console.log('  📅 Período Leads:', leadFilters.period)
      console.log('  📅 Período Chat:', chatFilters.period)
      console.log('  📅 Período Tarefas:', taskFilters.period)
      console.log('  📅 Período Vendas:', salesFilters.period)
      console.log('  🔍 Pipelines filtrados:', leadFilters.pipelines?.length || 'todos')
      console.log('  🔍 Instâncias filtradas:', chatFilters.instances?.length || 'todas')
      console.log('  🔍 Status de tarefas filtradas:', taskFilters.status?.length || 'todos')
      console.log('  🔍 Responsáveis de vendas filtrados:', salesFilters.responsibles?.length || 'todos')
      console.log('🔍 [useAnalyticsData] Iniciando busca de vendas...')

      // Carregar todas as métricas em paralelo (usando filtros separados)
      const [
        statsData,
        pipelineData,
        originData,
        timeSeriesData,
        conversionRatesData,
        stageTimeData,
        pipelineFunnelData,
        salesStatsData,
        salesOriginData,
        salesResponsibleData,
        salesTimeData,
        lossesStatsData,
        lossesOriginData,
        lossesResponsibleData,
        lossesTimeData,
        totalConv,
        convByInstance,
        firstRespTime,
        firstRespByInst,
        proactiveTime,
        proactiveByInst,
        tasksStatsData,
        tasksPriorityData,
        tasksStatusData,
        productivityData,
        tasksTimeData,
        overdueTasksData,
        avgCompletionData
      ] = await Promise.all([
        getAnalyticsStats(leadFilters),
        getLeadsByPipeline(leadFilters),
        getLeadsByOrigin(leadFilters),
        getLeadsOverTime(leadFilters, 'day'),
        getDetailedConversionRates(leadFilters),
        getStageTimeMetrics(leadFilters),
        getPipelineFunnel(leadFilters),
        getSalesStats(salesFilters),
        getSalesByOrigin(salesFilters),
        getSalesByResponsible(salesFilters),
        getSalesOverTime(salesFilters, 'day'),
        getLossesStats(salesFilters),
        getLossesByOrigin(salesFilters),
        getLossesByResponsible(salesFilters),
        getLossesOverTime(salesFilters, 'day'),
        getTotalConversations(chatFilters),
        getConversationsByInstance(chatFilters),
        getAverageFirstResponseTime(chatFilters),
        getAverageFirstResponseTimeByInstance(chatFilters),
        getAverageTimeToFirstProactiveContact(chatFilters),
        getAverageTimeToFirstProactiveContactByInstance(chatFilters),
        getTasksStats(taskFilters),
        getTasksByPriority(taskFilters),
        getTasksByStatus(taskFilters),
        getProductivityByUser(taskFilters),
        getTasksOverTime(taskFilters),
        getOverdueTasks(taskFilters),
        getAverageCompletionTime(taskFilters)
      ])

      setStats(statsData)
      setLeadsByPipeline(pipelineData)
      setLeadsByOrigin(originData)
      setLeadsOverTime(timeSeriesData)
      setDetailedConversionRates(conversionRatesData)
      setStageTimeMetrics(stageTimeData)
      setPipelineFunnel(pipelineFunnelData)
      setSalesStats(salesStatsData)
      setSalesByOrigin(salesOriginData)
      setSalesByResponsible(salesResponsibleData)
      setSalesOverTime(salesTimeData)
      setLossesStats(lossesStatsData)
      setLossesByOrigin(lossesOriginData)
      setLossesByResponsible(lossesResponsibleData)
      setLossesOverTime(lossesTimeData)
      setTotalConversations(totalConv)
      setConversationsByInstance(convByInstance)
      setFirstResponseTime(firstRespTime)
      setFirstResponseByInstance(firstRespByInst)
      setProactiveContactTime(proactiveTime)
      setProactiveContactByInstance(proactiveByInst)
      setTasksStats(tasksStatsData)
      setTasksByPriority(tasksPriorityData)
      setTasksByStatus(tasksStatusData)
      setProductivityByUser(productivityData)
      setTasksOverTime(tasksTimeData)
      setOverdueTasks(overdueTasksData)
      setAvgCompletionTime(avgCompletionData)

      // Debug: Ver o que foi carregado
      console.log('✅ Dados carregados:')
      console.log('  📊 Stats:', statsData)
      console.log('  📈 Taxa de Conversão:', conversionRatesData?.length, 'transições')
      console.log('  ⏱️ Tempo por Estágio:', stageTimeData?.length, 'estágios')
      console.log('  📊 Total de Leads:', statsData?.total_leads)
      console.log('  ✅ Total de Tarefas:', tasksStatsData?.total_tasks)
      console.log('  📋 Taxa de Conclusão:', tasksStatsData?.completion_rate?.toFixed(1), '%')
    } catch (error: any) {
      console.error('Erro ao carregar analytics:', error)
      showError('Erro', error.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [leadFilters, chatFilters, taskFilters, salesFilters, showError])

  useEffect(() => {
    console.log('🔄 Filtros mudaram, invalidando cache e recarregando...')
    invalidateLeadsCache()
    invalidateChatCache()
    invalidateTasksCache()
    invalidateSalesCache()
    invalidateLossesCache()
    loadData()
  }, [loadData])

  return {
    loading,
    // Dados de Pipeline/Leads
    stats,
    leadsByPipeline,
    leadsByOrigin,
    leadsOverTime,
    detailedConversionRates,
    stageTimeMetrics,
    pipelineFunnel,
    // Dados de Vendas
    salesStats,
    salesByOrigin,
    salesByResponsible,
    salesOverTime,
    // Dados de Perdas
    lossesStats,
    lossesByOrigin,
    lossesByResponsible,
    lossesOverTime,
    // Dados de Chat
    totalConversations,
    conversationsByInstance,
    firstResponseTime,
    firstResponseByInstance,
    proactiveContactTime,
    proactiveContactByInstance,
    // Dados de Tarefas
    tasksStats,
    tasksByPriority,
    tasksByStatus,
    productivityByUser,
    tasksOverTime,
    overdueTasks,
    avgCompletionTime,
    // Função para recarregar manualmente
    reload: loadData
  }
}

