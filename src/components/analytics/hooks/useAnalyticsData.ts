import { useState, useEffect, useCallback, useRef } from 'react'
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
  getLossesByReason,
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
  getTasksByType,
  getProductivityByUser,
  getTasksOverTime,
  getOverdueTasks,
  getAverageCompletionTime,
  invalidateTasksCache
} from '../../../services/taskAnalyticsService'
import { getInvestmentsByPeriod } from '../../../services/originInvestmentService'
import { normalizeOriginKey } from '../../../utils/originUtils'
import type { LeadsByOriginResult } from '../../../types'

export function useAnalyticsData(
  leadFilters: LeadAnalyticsFilters,
  chatFilters: ChatAnalyticsFilters,
  taskFilters: TaskAnalyticsFilters,
  salesFilters: SalesAnalyticsFilters
) {
  const { showError } = useToastContext()
  const [loading, setLoading] = useState(false)
  const requestIdRef = useRef(0)
  
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
  const [lossesByReason, setLossesByReason] = useState<any[]>([])
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
  const [tasksByType, setTasksByType] = useState<any[]>([])
  const [productivityByUser, setProductivityByUser] = useState<any[]>([])
  const [tasksOverTime, setTasksOverTime] = useState<any[]>([])
  const [overdueTasks, setOverdueTasks] = useState<any[]>([])
  const [avgCompletionTime, setAvgCompletionTime] = useState<any>(null)

  const mergeInvestments = useCallback((
    originData: LeadsByOriginResult[],
    investmentMap: Map<string, number>,
    type: 'leads' | 'sales' | 'losses'
  ): LeadsByOriginResult[] => {
    return originData.map(item => {
      const investment = investmentMap.get(normalizeOriginKey(item.origin)) || 0
      if (investment === 0) return item

      const enriched: LeadsByOriginResult = { ...item, investment }

      if (type === 'leads') {
        enriched.cost_per_lead = item.count > 0 ? investment / item.count : 0
        enriched.roi = investment > 0 ? ((item.total_value / investment) - 1) * 100 : 0
        enriched.conversion_value = item.total_value - investment
      } else if (type === 'sales') {
        enriched.cost_per_sale = item.count > 0 ? investment / item.count : 0
        enriched.roi = investment > 0 ? ((item.total_value / investment) - 1) * 100 : 0
        enriched.conversion_value = item.total_value - investment
      } else {
        enriched.cost_per_loss = item.count > 0 ? investment / item.count : 0
      }

      return enriched
    })
  }, [])

  const loadData = useCallback(async () => {
    const thisRequestId = ++requestIdRef.current
    try {
      setLoading(true)

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
        lossesReasonData,
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
        tasksTypeData,
        productivityData,
        tasksTimeData,
        overdueTasksData,
        avgCompletionData,
        leadInvestments,
        salesInvestments
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
        getLossesByReason(salesFilters),
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
        getTasksByType(taskFilters),
        getProductivityByUser(taskFilters),
        getTasksOverTime(taskFilters),
        getOverdueTasks(taskFilters),
        getAverageCompletionTime(taskFilters),
        getInvestmentsByPeriod(leadFilters.period.start, leadFilters.period.end),
        getInvestmentsByPeriod(salesFilters.period.start, salesFilters.period.end)
      ])

      if (thisRequestId !== requestIdRef.current) return

      setStats(statsData)
      setLeadsByPipeline(pipelineData)
      setLeadsByOrigin(mergeInvestments(originData, leadInvestments, 'leads'))
      setLeadsOverTime(timeSeriesData)
      setDetailedConversionRates(conversionRatesData)
      setStageTimeMetrics(stageTimeData)
      setPipelineFunnel(pipelineFunnelData)
      setSalesStats(salesStatsData)
      setSalesByOrigin(mergeInvestments(salesOriginData, salesInvestments, 'sales'))
      setSalesByResponsible(salesResponsibleData)
      setSalesOverTime(salesTimeData)
      setLossesStats(lossesStatsData)
      setLossesByOrigin(mergeInvestments(lossesOriginData, salesInvestments, 'losses'))
      setLossesByResponsible(lossesResponsibleData)
      setLossesByReason(lossesReasonData)
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
      setTasksByType(tasksTypeData)
      setProductivityByUser(productivityData)
      setTasksOverTime(tasksTimeData)
      setOverdueTasks(overdueTasksData)
      setAvgCompletionTime(avgCompletionData)
    } catch (error: any) {
      console.error('Erro ao carregar analytics:', error)
      showError('Erro', error.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [leadFilters, chatFilters, taskFilters, salesFilters, showError])

  useEffect(() => {
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
    lossesByReason,
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
    tasksByType,
    productivityByUser,
    tasksOverTime,
    overdueTasks,
    avgCompletionTime,
    // Função para recarregar manualmente
    reload: loadData
  }
}

