import { useState, useEffect, useCallback } from 'react'
import type { AnalyticsPeriod, DashboardWidgetConfig, DashboardWidgetType, CustomFieldStatusFilter } from '../../../../types'
import {
  getAnalyticsStats,
  getLeadsByPipeline,
  getLeadsByOrigin,
  getLeadsOverTime,
  getDetailedConversionRates,
  getStageTimeMetrics,
  getPipelineFunnel,
  getSalesStats,
  getSalesByOrigin,
  getSalesByResponsible,
  getSalesOverTime,
  getLossesStats,
  getLossesByOrigin,
  getLossesByResponsible,
  getLossesByReason,
  getLossesOverTime,
  getTotalConversations,
  getConversationsByInstance,
  getAverageFirstResponseTime,
  getAverageFirstResponseTimeByInstance
} from '../../../../services/analyticsService'
import {
  getTasksStats,
  getTasksByStatus,
  getTasksByPriority,
  getTasksByType,
  getProductivityByUser,
  getTasksOverTime
} from '../../../../services/taskAnalyticsService'
import {
  getCustomFieldDistribution,
  getCustomFieldStats,
  getCustomFieldOverTime,
  getCustomFieldTable,
  getCustomFieldById
} from '../../../../services/customFieldAnalyticsService'
import { isCustomFieldMetric, extractCustomFieldId, isCalculationMetric, extractCalculationId, isVariableMetric, extractVariableId } from './index'
import { resolveCalculationById, resolveCalculationOverTime } from './calculationEngine'
import { getCalculationById, getVariableById, resolveVariableValue } from '../../../../services/calculationService'

interface WidgetDataResult {
  data: any
  loading: boolean
  error: string | null
}

/**
 * Hook para buscar dados de uma métrica específica
 */
export function useWidgetData(
  metricKey: string,
  period: AnalyticsPeriod,
  config: DashboardWidgetConfig,
  widgetType?: DashboardWidgetType
): WidgetDataResult {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Construir filtros baseados no período e config
      const filters = {
        period,
        pipelines: config.pipelines,
        stages: config.stages,
        origins: config.origins,
        responsibles: config.responsibles,
        instances: config.instances,
        status: config.status,
        // Para campos personalizados
        statusFilter: config.statusFilter,
        customFieldId: config.customFieldId
      }

      const result = await fetchMetricData(metricKey, filters, widgetType)
      setData(result)
    } catch (err) {
      console.error(`Erro ao buscar dados da métrica ${metricKey}:`, err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [metricKey, period, config, widgetType])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error }
}

/**
 * Buscar dados de uma métrica específica
 */
async function fetchMetricData(metricKey: string, filters: any, widgetType?: DashboardWidgetType): Promise<any> {
  // Verificar se é uma métrica de variável
  if (isVariableMetric(metricKey)) {
    return fetchVariableData(metricKey, filters)
  }

  // Verificar se é uma métrica de cálculo personalizado
  if (isCalculationMetric(metricKey)) {
    return fetchCalculationData(metricKey, filters, widgetType)
  }

  // Verificar se é uma métrica de campo personalizado
  if (isCustomFieldMetric(metricKey)) {
    return fetchCustomFieldData(metricKey, filters, widgetType)
  }

  switch (metricKey) {
    // =====================================================
    // LEADS
    // =====================================================
    case 'leads_total':
    case 'leads_active':
    case 'leads_total_value':
    case 'leads_average_value':
    case 'leads_conversion_rate': {
      const stats = await getAnalyticsStats(filters)
      return formatKPIData(metricKey, stats)
    }

    case 'leads_by_pipeline': {
      const data = await getLeadsByPipeline(filters)
      return data.map(item => ({
        name: item.pipeline_name,
        value: item.count,
        total_value: item.total_value,
        percentage: item.percentage
      }))
    }

    case 'leads_by_origin': {
      const data = await getLeadsByOrigin(filters)
      return data.map(item => ({
        name: item.origin || 'Sem origem',
        value: item.count,
        total_value: item.total_value,
        average_value: item.average_value,
        percentage: item.percentage
      }))
    }

    case 'leads_by_stage': {
      const conversionData = await getDetailedConversionRates(filters)
      // Agrupar por estágio
      const stageMap = new Map<string, any>()
      conversionData.forEach(item => {
        if (!stageMap.has(item.stage_from_id)) {
          stageMap.set(item.stage_from_id, {
            name: item.stage_from_name,
            value: item.total_leads_entered,
            conversion_rate: item.conversion_rate
          })
        }
      })
      return Array.from(stageMap.values())
    }

    case 'leads_over_time': {
      const data = await getLeadsOverTime(filters)
      return data.map(item => ({
        date: formatDate(item.date),
        value: item.value
      }))
    }

    case 'leads_conversion_by_stage': {
      const data = await getDetailedConversionRates(filters)
      return data.map(item => ({
        name: `${item.stage_from_name} → ${item.stage_to_name}`,
        value: item.converted_to_next,
        conversion_rate: item.conversion_rate,
        total: item.total_leads_entered
      }))
    }

    case 'leads_time_per_stage': {
      const data = await getStageTimeMetrics(filters)
      return data.map(item => ({
        name: item.stage_name,
        value: item.avg_time_minutes,
        formatted: item.avg_time_formatted,
        total: item.total_leads
      }))
    }

    case 'leads_pipeline_funnel': {
      const funnelData = await getPipelineFunnel(filters)
      if (!funnelData || funnelData.length === 0) return []
      // Pegar o primeiro pipeline
      const firstPipeline = funnelData[0]
      return firstPipeline.stages.map((stage: any) => ({
        name: stage.stage_name,
        value: stage.total_leads,
        conversion_rate: stage.conversion_rate_from_start
      }))
    }

    // =====================================================
    // VENDAS
    // =====================================================
    case 'sales_total':
    case 'sales_total_value':
    case 'sales_average_ticket': {
      const stats = await getSalesStats(filters)
      return formatKPIData(metricKey, stats)
    }

    case 'sales_by_origin': {
      const data = await getSalesByOrigin(filters)
      return data.map(item => ({
        name: item.origin || 'Sem origem',
        value: item.count,
        total_value: item.total_value
      }))
    }

    case 'sales_by_responsible': {
      const data = await getSalesByResponsible(filters)
      return data.map(item => ({
        name: item.responsible_name || 'Sem responsável',
        value: item.count,
        total_value: item.total_value
      }))
    }

    case 'sales_over_time': {
      const data = await getSalesOverTime(filters)
      return data.map(item => ({
        date: formatDate(item.date),
        value: item.value
      }))
    }

    // =====================================================
    // PERDAS
    // =====================================================
    case 'losses_total':
    case 'losses_total_value': {
      const stats = await getLossesStats(filters)
      return formatKPIData(metricKey, stats)
    }

    case 'losses_by_origin': {
      const data = await getLossesByOrigin(filters)
      return data.map(item => ({
        name: item.origin || 'Sem origem',
        value: item.count,
        total_value: item.total_value
      }))
    }

    case 'losses_by_responsible': {
      const data = await getLossesByResponsible(filters)
      return data.map(item => ({
        name: item.responsible_name || 'Sem responsável',
        value: item.count,
        total_value: item.total_value
      }))
    }

    case 'losses_by_reason': {
      const data = await getLossesByReason(filters)
      return data.map(item => ({
        name: item.reason_name || 'Sem motivo',
        value: item.count,
        total_value: item.total_value
      }))
    }

    case 'losses_over_time': {
      const data = await getLossesOverTime(filters)
      return data.map(item => ({
        date: formatDate(item.date),
        value: item.value
      }))
    }

    // =====================================================
    // CHAT
    // =====================================================
    case 'chat_total_conversations': {
      const total = await getTotalConversations({
        period: filters.period,
        instances: filters.instances
      })
      return {
        value: total,
        formatted: total.toLocaleString('pt-BR')
      }
    }

    case 'chat_avg_response_time': {
      const data = await getAverageFirstResponseTime({
        period: filters.period,
        instances: filters.instances
      })
      return {
        value: data?.average_minutes || 0,
        formatted: data?.formatted || '0min',
        subtitle: `${data?.total_conversations || 0} conversas`
      }
    }

    case 'chat_avg_first_contact': {
      // Usar o mesmo endpoint que o tempo de resposta
      const data = await getAverageFirstResponseTime({
        period: filters.period,
        instances: filters.instances
      })
      return {
        value: data?.average_minutes || 0,
        formatted: data?.formatted || '0min'
      }
    }

    case 'chat_by_instance': {
      const data = await getConversationsByInstance({
        period: filters.period,
        instances: filters.instances
      })
      return data.map(item => ({
        name: item.instance_name || 'Instância',
        value: item.count
      }))
    }

    case 'chat_response_by_instance': {
      const data = await getAverageFirstResponseTimeByInstance({
        period: filters.period,
        instances: filters.instances
      })
      return data.map(item => ({
        name: item.instance_name || 'Instância',
        value: item.average_minutes,
        formatted: item.formatted
      }))
    }

    // =====================================================
    // TAREFAS
    // =====================================================
    case 'tasks_total':
    case 'tasks_completion_rate':
    case 'tasks_overdue':
    case 'tasks_avg_completion_time': {
      const stats = await getTasksStats({
        period: filters.period,
        status: filters.status,
        priority: filters.priority,
        assigned_to: filters.responsibles,
        pipeline_id: filters.pipelines,
        task_type_id: filters.task_type_id
      })
      return formatKPIData(metricKey, stats)
    }

    case 'tasks_by_status': {
      const data = await getTasksByStatus({
        period: filters.period,
        status: filters.status,
        priority: filters.priority,
        assigned_to: filters.responsibles
      })
      return data.map(item => ({
        name: formatTaskStatus(item.status),
        value: item.count
      }))
    }

    case 'tasks_by_priority': {
      const data = await getTasksByPriority({
        period: filters.period,
        status: filters.status,
        priority: filters.priority,
        assigned_to: filters.responsibles
      })
      return data.map(item => ({
        name: formatTaskPriority(item.priority),
        value: item.count
      }))
    }

    case 'tasks_by_type': {
      const data = await getTasksByType({
        period: filters.period,
        status: filters.status,
        priority: filters.priority,
        assigned_to: filters.responsibles
      })
      return data.map(item => ({
        name: item.type_name || 'Sem tipo',
        value: item.count
      }))
    }

    case 'tasks_by_user': {
      const data = await getProductivityByUser({
        period: filters.period,
        status: filters.status,
        priority: filters.priority,
        assigned_to: filters.responsibles
      })
      return data.map(item => ({
        name: item.user_name || 'Sem usuário',
        value: item.total_tasks,
        completed: item.completed_tasks,
        completion_rate: item.completion_rate
      }))
    }

    case 'tasks_over_time': {
      const data = await getTasksOverTime({
        period: filters.period,
        status: filters.status,
        priority: filters.priority,
        assigned_to: filters.responsibles
      })
      return data.map(item => ({
        date: formatDate(item.date),
        value: item.created,
        completed: item.completed,
        overdue: item.overdue
      }))
    }

    default:
      console.warn(`Métrica não implementada: ${metricKey}`)
      return null
  }
}

/**
 * Formatar dados de KPI
 */
function formatKPIData(metricKey: string, stats: any): any {
  switch (metricKey) {
    case 'leads_total':
      return {
        value: stats?.total_leads || 0,
        formatted: (stats?.total_leads || 0).toLocaleString('pt-BR')
      }

    case 'leads_active':
      return {
        value: stats?.total_leads - (stats?.total_sales || 0) - (stats?.total_lost || 0) || 0,
        formatted: ((stats?.total_leads || 0) - (stats?.total_sales || 0) - (stats?.total_lost || 0)).toLocaleString('pt-BR')
      }

    case 'leads_total_value':
      return {
        value: stats?.total_value || 0,
        formatted: formatCurrency(stats?.total_value || 0)
      }

    case 'leads_average_value':
      return {
        value: stats?.average_value || 0,
        formatted: formatCurrency(stats?.average_value || 0)
      }

    case 'leads_conversion_rate': {
      const totalLeads = stats?.total_leads || 0
      const totalSales = stats?.total_sales || 0
      const rate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0
      return {
        value: rate,
        formatted: `${rate.toFixed(1)}%`,
        subtitle: `${totalSales} vendas de ${totalLeads} leads`
      }
    }

    case 'sales_total':
      return {
        value: stats?.total_sales || 0,
        formatted: (stats?.total_sales || 0).toLocaleString('pt-BR')
      }

    case 'sales_total_value':
      return {
        value: stats?.total_value || 0,
        formatted: formatCurrency(stats?.total_value || 0)
      }

    case 'sales_average_ticket':
      return {
        value: stats?.average_ticket || 0,
        formatted: formatCurrency(stats?.average_ticket || 0)
      }

    case 'losses_total':
      return {
        value: stats?.total_losses || 0,
        formatted: (stats?.total_losses || 0).toLocaleString('pt-BR')
      }

    case 'losses_total_value':
      return {
        value: stats?.total_value || 0,
        formatted: formatCurrency(stats?.total_value || 0)
      }

    case 'tasks_total':
      return {
        value: stats?.total_tasks || 0,
        formatted: (stats?.total_tasks || 0).toLocaleString('pt-BR')
      }

    case 'tasks_completion_rate': {
      const total = stats?.total_tasks || 0
      const completed = stats?.completed_tasks || 0
      const rate = total > 0 ? (completed / total) * 100 : 0
      return {
        value: rate,
        formatted: `${rate.toFixed(1)}%`,
        subtitle: `${completed} de ${total}`
      }
    }

    case 'tasks_overdue':
      return {
        value: stats?.overdue_tasks || 0,
        formatted: (stats?.overdue_tasks || 0).toLocaleString('pt-BR')
      }

    case 'tasks_avg_completion_time':
      return {
        value: stats?.avg_completion_minutes || 0,
        formatted: formatDuration(stats?.avg_completion_minutes || 0)
      }

    default:
      return { value: 0, formatted: '0' }
  }
}

/**
 * Formatar moeda
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formatar data
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/**
 * Formatar duração em minutos
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours < 24) return `${hours}h ${mins}min`
  const days = Math.floor(hours / 24)
  const hrs = hours % 24
  return `${days}d ${hrs}h`
}

/**
 * Formatar status de tarefa
 */
function formatTaskStatus(status: string): string {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
    atrasada: 'Atrasada'
  }
  return labels[status] || status
}

/**
 * Formatar prioridade de tarefa
 */
function formatTaskPriority(priority: string): string {
  const labels: Record<string, string> = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    urgente: 'Urgente'
  }
  return labels[priority] || priority
}

// =====================================================
// CÁLCULOS PERSONALIZADOS
// =====================================================

/**
 * Buscar dados de cálculo personalizado
 */
async function fetchCalculationData(metricKey: string, filters: any, widgetType?: DashboardWidgetType): Promise<any> {
  const calculationId = extractCalculationId(metricKey)
  if (!calculationId) {
    console.warn('ID do cálculo não encontrado:', metricKey)
    return null
  }

  // Função que busca o valor de uma métrica individual
  const fetchMetricValue = async (key: string): Promise<number> => {
    try {
      const data = await fetchMetricData(key, filters, 'kpi')
      if (data && typeof data.value === 'number') return data.value
      if (data && typeof data === 'number') return data
      return 0
    } catch {
      return 0
    }
  }

  if (widgetType === 'line_chart') {
    // Resolver para cada dia do período (série temporal)
    const calculation = await getCalculationById(calculationId)
    if (!calculation) return []

    const fetchValueForDay = async (key: string, dayPeriod: any): Promise<number> => {
      try {
        const dayFilters = { ...filters, period: dayPeriod }
        const data = await fetchMetricData(key, dayFilters, 'kpi')
        if (data && typeof data.value === 'number') return data.value
        if (data && typeof data === 'number') return data
        return 0
      } catch {
        return 0
      }
    }

    const timeSeries = await resolveCalculationOverTime(
      calculation.formula,
      filters.period,
      fetchValueForDay
    )

    return timeSeries.map(item => ({
      date: formatDate(item.date),
      value: Math.round(item.value * 100) / 100
    }))
  }

  // KPI: resolver valor único (passa period para variáveis periódicas)
  const result = await resolveCalculationById(calculationId, fetchMetricValue, filters.period)
  if (!result) return null

  return {
    value: result.value,
    formatted: result.formatted,
    subtitle: result.calculation.description || result.calculation.name
  }
}

// =====================================================
// CAMPOS PERSONALIZADOS
// =====================================================

/**
 * Buscar dados de campo personalizado
 */
async function fetchCustomFieldData(metricKey: string, filters: any, widgetType?: DashboardWidgetType): Promise<any> {
  const fieldId = extractCustomFieldId(metricKey)
  if (!fieldId) {
    console.warn('ID do campo não encontrado:', metricKey)
    return null
  }

  // Obter informações do campo para determinar o tipo
  const field = await getCustomFieldById(fieldId)
  if (!field) {
    console.warn('Campo não encontrado:', fieldId)
    return null
  }

  const period = filters.period
  const statusFilter = (filters.statusFilter || 'all') as CustomFieldStatusFilter

  // Se o widget é KPI, retornar formato KPI independente do tipo de campo
  if (widgetType === 'kpi') {
    return fetchCustomFieldKPI(field, fieldId, period, statusFilter)
  }

  // Para outros widgets, retornar dados baseado no tipo do campo
  return fetchCustomFieldChartData(field, fieldId, period, statusFilter)
}

/**
 * Retornar dados KPI para qualquer tipo de campo personalizado
 */
async function fetchCustomFieldKPI(
  field: any,
  fieldId: string,
  period: any,
  statusFilter: CustomFieldStatusFilter
): Promise<any> {
  const fieldType = field.type as string

  switch (field.type) {
    case 'number': {
      const stats = await getCustomFieldStats(fieldId, period, statusFilter, fieldType)
      return {
        value: stats.total,
        formatted: stats.total.toLocaleString('pt-BR'),
        subtitle: `Média: ${stats.average.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} | ${stats.count} leads`
      }
    }

    case 'select':
    case 'multiselect': {
      const distribution = await getCustomFieldDistribution(fieldId, period, statusFilter, fieldType)
      const totalLeads = distribution.reduce((sum, item) => sum + item.value, 0)
      const topOption = distribution.length > 0 ? distribution[0] : null

      return {
        value: totalLeads,
        formatted: totalLeads.toLocaleString('pt-BR'),
        subtitle: topOption
          ? `Mais comum: ${topOption.name} (${topOption.percentage.toFixed(0)}%)`
          : 'Nenhum dado'
      }
    }

    case 'date':
    case 'text':
    case 'link':
    case 'vehicle':
    default: {
      const tableData = await getCustomFieldTable(fieldId, period, statusFilter, fieldType)
      const total = tableData.length

      return {
        value: total,
        formatted: total.toLocaleString('pt-BR'),
        subtitle: `${total} leads com campo preenchido`
      }
    }
  }
}

/**
 * Retornar dados de gráfico/tabela para campo personalizado
 */
async function fetchCustomFieldChartData(
  field: any,
  fieldId: string,
  period: any,
  statusFilter: CustomFieldStatusFilter
): Promise<any> {
  const fieldType = field.type as string

  switch (field.type) {
    case 'select':
    case 'multiselect': {
      const distribution = await getCustomFieldDistribution(fieldId, period, statusFilter, fieldType)
      return distribution.map(item => ({
        name: item.name,
        value: item.value,
        percentage: item.percentage
      }))
    }

    case 'number': {
      const stats = await getCustomFieldStats(fieldId, period, statusFilter, fieldType)
      return {
        value: stats.total,
        formatted: stats.total.toLocaleString('pt-BR'),
        average: stats.average,
        min: stats.min,
        max: stats.max,
        count: stats.count,
        subtitle: `Média: ${stats.average.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
      }
    }

    case 'date': {
      const timeSeries = await getCustomFieldOverTime(fieldId, period, statusFilter, 'date')
      return timeSeries.map(item => ({
        date: formatDate(item.date),
        value: item.count
      }))
    }

    case 'text':
    case 'link':
    case 'vehicle':
    default: {
      const tableData = await getCustomFieldTable(fieldId, period, statusFilter, fieldType)
      return tableData.map(item => ({
        lead: item.lead_name,
        valor: item.field_value,
        status: formatLeadStatus(item.lead_status),
        data: formatDate(item.created_at)
      }))
    }
  }
}

/**
 * Formatar status do lead
 */
function formatLeadStatus(status: string): string {
  const labels: Record<string, string> = {
    'venda_confirmada': 'Vendido',
    'perdido': 'Perdido',
    'novo': 'Novo',
    'em_negociacao': 'Em Negociação'
  }
  return labels[status] || status
}

// =====================================================
// VARIÁVEIS REUTILIZÁVEIS
// =====================================================

/**
 * Buscar dados de variável para KPI, considerando valores periódicos
 */
async function fetchVariableData(metricKey: string, filters: any): Promise<any> {
  const variableId = extractVariableId(metricKey)
  if (!variableId) {
    console.warn('ID da variável não encontrado:', metricKey)
    return null
  }

  const variable = await getVariableById(variableId)
  if (!variable) return null

  // Resolver valor considerando período (periódico ou fixo)
  const period = filters?.period
  const value = period
    ? await resolveVariableValue(variable, period.start, period.end)
    : Number(variable.value)

  const format = variable.format || 'number'

  return {
    value,
    formatted: formatVariableByType(value, format),
    subtitle: variable.description || variable.name
  }
}

/**
 * Formatar valor da variável conforme o tipo
 */
function formatVariableByType(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    case 'percentage':
      return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
    default:
      return value.toLocaleString('pt-BR')
  }
}
