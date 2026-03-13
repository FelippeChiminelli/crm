import { supabase } from './supabaseClient'
import { useCachedQuery, cacheService } from './cacheService'
import { normalizeOriginKey, ORIGIN_NAO_INFORMADO } from '../utils/originUtils'
import type {
  AnalyticsFilters,
  LeadsByPipelineResult,
  LeadsByStageResult,
  LeadsByOriginResult,
  ConversionRateResult,
  AverageTimeResult,
  TimeSeriesPoint,
  FunnelStageData,
  AnalyticsStats,
  TimeInterval,
  DetailedConversionRate,
  StageTimeMetrics
} from '../types'

// =====================================================
// CONFIGURAÇÕES DE PERFORMANCE
// =====================================================

/**
 * Limites de registros para análises
 * Ajuste estes valores baseado no volume de dados e performance necessária
 */
export const ANALYTICS_LIMITS = {
  // Conversas para análise de tempo de resposta
  CONVERSATIONS_RESPONSE_TIME: 500,
  CONVERSATIONS_RESPONSE_TIME_BY_INSTANCE: 1000,
  
  // Histórico de pipeline para análise de contato proativo
  PIPELINE_HISTORY: 500,
  
  // Dias máximos para considerar tempos válidos (evitar outliers)
  MAX_RESPONSE_TIME_DAYS: 7,
  MAX_PROACTIVE_CONTACT_DAYS: 14,

  // PostgREST retorna no máximo este número de rows por request (padrão Supabase: 1000)
  POSTGREST_MAX_ROWS: 1000
}

/**
 * Busca TODOS os registros de uma query paginando automaticamente.
 * O PostgREST do Supabase limita a 1000 rows por padrão.
 * Esta função faz múltiplas requisições usando .range() até obter todos os dados.
 * 
 * IMPORTANTE: O queryBuilder é reutilizado entre iterações (PostgREST JS
 * re-executa o fetch a cada await, usando os headers atuais).
 */
async function fetchAllRows<T = any>(queryBuilder: any): Promise<{ data: T[]; error: any }> {
  const batchSize = ANALYTICS_LIMITS.POSTGREST_MAX_ROWS
  const allData: T[] = []
  let offset = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await queryBuilder.range(offset, offset + batchSize - 1)

    if (error) {
      return { data: allData, error }
    }

    if (!data || data.length === 0) break

    allData.push(...data)

    if (data.length < batchSize) break

    offset += batchSize
  }

  return { data: allData, error: null }
}

/**
 * Atualizar limites dinamicamente (útil para empresas com muito volume)
 */
export function setAnalyticsLimits(limits: Partial<typeof ANALYTICS_LIMITS>): void {
  Object.assign(ANALYTICS_LIMITS, limits)
  
  // Invalidar cache ao mudar limites
  invalidateAnalyticsCache()
}

/**
 * Obter empresa_id do usuário autenticado
 */
async function getUserEmpresaId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('uuid', user.id)
    .single()

  if (!profile?.empresa_id) throw new Error('Empresa não encontrada')
  return profile.empresa_id
}

/**
 * Verificar se usuário tem permissão de analytics
 */
export async function hasAnalyticsPermission(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase.rpc('has_analytics_permission', {
    user_uuid: user.id
  })

  return data || false
}

/**
 * Aplicar filtros comuns em queries
 */
function applyFilters(query: any, filters: AnalyticsFilters, empresaId: string) {
  query = query.eq('empresa_id', empresaId)

  if (filters.period && filters.period.start && filters.period.end) {
    // Adicionar horários para evitar problema de timezone
    // Start: início do dia (00:00:00)
    // End: fim do dia (23:59:59)
    query = query
      .gte('created_at', `${filters.period.start}T00:00:00`)
      .lte('created_at', `${filters.period.end}T23:59:59`)
  }

  if (filters.pipelines && filters.pipelines.length > 0) {
    query = query.in('pipeline_id', filters.pipelines)
  }

  if (filters.stages && filters.stages.length > 0) {
    query = query.in('stage_id', filters.stages)
  }

  if (filters.origins && filters.origins.length > 0) {
    query = query.in('origin', filters.origins)
  }

  if (filters.responsibles && filters.responsibles.length > 0) {
    query = query.in('responsible_uuid', filters.responsibles)
  }

  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  return query
}

// Helper para filtrar dados de chat por horário (aplicado após query, em memória)
function filterByTimeRange<T extends { created_at?: string; timestamp?: string }>(
  data: T[],
  timeRange?: { start: string; end: string }
): T[] {
  if (!timeRange) return data

  return data.filter(item => {
    const timestamp = item.created_at || item.timestamp
    if (!timestamp) return true

    // Extrair horário do timestamp (formato: YYYY-MM-DDTHH:mm:ss)
    const time = timestamp.split('T')[1]?.substring(0, 5) // HH:mm
    if (!time) return true

    return time >= timeRange.start && time <= timeRange.end
  })
}

// =====================================================
// MÉTRICAS: LEADS POR PIPELINE
// =====================================================

export async function getLeadsByPipeline(
  filters: AnalyticsFilters
): Promise<LeadsByPipelineResult[]> {
  return useCachedQuery('analytics_pipeline', filters, async () => {
    const empresaId = await getUserEmpresaId()

    let query = supabase
      .from('leads')
      .select('pipeline_id, pipelines(name), value')

    query = applyFilters(query, filters, empresaId)

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('Erro ao buscar leads por pipeline:', error)
      throw new Error('Erro ao buscar leads por pipeline')
    }

    // Agrupar e calcular
    const grouped = data.reduce((acc: any, lead: any) => {
      const pipelineId = lead.pipeline_id
      if (!acc[pipelineId]) {
        acc[pipelineId] = {
          pipeline_id: pipelineId,
          pipeline_name: lead.pipelines?.name || 'Sem pipeline',
          count: 0,
          total_value: 0
        }
      }
      acc[pipelineId].count++
      acc[pipelineId].total_value += lead.value || 0
      return acc
    }, {})

    const results: LeadsByPipelineResult[] = Object.values(grouped)
    const totalLeads = results.reduce((sum, r: any) => sum + r.count, 0)

    // Calcular percentuais
    return results.map((r: any) => ({
      ...r,
      percentage: totalLeads > 0 ? (r.count / totalLeads) * 100 : 0
    }))
  })
}

// =====================================================
// MÉTRICAS: LEADS POR ESTÁGIO
// =====================================================

export async function getLeadsByStage(
  filters: AnalyticsFilters
): Promise<LeadsByStageResult[]> {
  return useCachedQuery('analytics_stage', filters, async () => {
    const empresaId = await getUserEmpresaId()

    let query = supabase
      .from('leads')
      .select(`
        stage_id,
        pipeline_id,
        value,
        stages(name, position),
        pipelines(name)
      `)

    query = applyFilters(query, filters, empresaId)

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('Erro ao buscar leads por estágio:', error)
      throw new Error('Erro ao buscar leads por estágio')
    }

    // Agrupar
    const grouped = data.reduce((acc: any, lead: any) => {
      const stageId = lead.stage_id
      if (!acc[stageId]) {
        acc[stageId] = {
          stage_id: stageId,
          stage_name: lead.stages?.name || 'Sem estágio',
          stage_position: lead.stages?.position || 0,
          pipeline_id: lead.pipeline_id,
          pipeline_name: lead.pipelines?.name || 'Sem pipeline',
          count: 0,
          total_value: 0
        }
      }
      acc[stageId].count++
      acc[stageId].total_value += lead.value || 0
      return acc
    }, {})

    const results: LeadsByStageResult[] = Object.values(grouped)
    const totalLeads = results.reduce((sum, r: any) => sum + r.count, 0)

    return results.map((r: any) => ({
      ...r,
      percentage: totalLeads > 0 ? (r.count / totalLeads) * 100 : 0,
      average_value: r.count > 0 ? r.total_value / r.count : 0
    })).sort((a, b) => a.stage_position - b.stage_position)
  })
}

// =====================================================
// MÉTRICAS: LEADS POR ORIGEM
// =====================================================

export async function getLeadsByOrigin(
  filters: AnalyticsFilters
): Promise<LeadsByOriginResult[]> {
  return useCachedQuery('analytics_origin', filters, async () => {
    const empresaId = await getUserEmpresaId()

    let query = supabase
      .from('leads')
      .select('origin, value')

    query = applyFilters(query, filters, empresaId)

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('Erro ao buscar leads por origem:', error)
      throw new Error('Erro ao buscar leads por origem')
    }

    // Agrupar por chave normalizada (olx, Olx, OLX → uma única linha)
    const grouped = data.reduce((acc: any, lead: any) => {
      const rawOrigin = lead.origin || ORIGIN_NAO_INFORMADO
      const key = normalizeOriginKey(rawOrigin)
      if (!acc[key]) {
        acc[key] = { origin: rawOrigin, count: 0, total_value: 0 }
      }
      acc[key].count++
      acc[key].total_value += lead.value || 0
      return acc
    }, {})

    const results: LeadsByOriginResult[] = Object.values(grouped)
    const totalLeads = results.reduce((sum, r: any) => sum + r.count, 0)

    return results.map((r: any) => ({
      ...r,
      percentage: totalLeads > 0 ? (r.count / totalLeads) * 100 : 0,
      average_value: r.count > 0 ? r.total_value / r.count : 0
    })).sort((a, b) => b.count - a.count)
  })
}

// =====================================================
// MÉTRICAS: VENDAS POR ORIGEM
// =====================================================

export async function getSalesByOrigin(
  filters: import('../types').SalesAnalyticsFilters
): Promise<LeadsByOriginResult[]> {
  console.log('📊 [getSalesByOrigin] CHAMADA INICIADA - Filtros recebidos:', filters)
  
  return useCachedQuery('analytics_sales_origin', filters, async () => {
    console.log('📊 [getSalesByOrigin] EXECUTANDO QUERY (não veio do cache)')
    const empresaId = await getUserEmpresaId()

    console.log('📊 [getSalesByOrigin] Filtros recebidos:', filters)
    console.log('📊 [getSalesByOrigin] Empresa ID:', empresaId)

    let query = supabase
      .from('leads')
      .select('origin, value, sold_value, status, sold_at, pipeline_id')
      .eq('empresa_id', empresaId)
      .eq('status', 'venda_confirmada')
      .not('sold_at', 'is', null)

    // Aplicar filtro de período (por sold_at, não created_at)
    if (filters.period) {
      console.log('📊 [getSalesByOrigin] Aplicando filtro de período:', filters.period)
      query = query
        .gte('sold_at', `${filters.period.start}T00:00:00`)
        .lte('sold_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtro de pipelines
    if (filters.pipelines && filters.pipelines.length > 0) {
      console.log('📊 [getSalesByOrigin] Aplicando filtro de pipelines:', filters.pipelines)
      query = query.in('pipeline_id', filters.pipelines)
    }

    // Aplicar filtro de origens
    if (filters.origins && filters.origins.length > 0) {
      console.log('📊 [getSalesByOrigin] Aplicando filtro de origens:', filters.origins)
      query = query.in('origin', filters.origins)
    }

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('❌ [getSalesByOrigin] Erro ao buscar vendas por origem:', error)
      throw new Error('Erro ao buscar vendas por origem')
    }

    console.log('📊 [getSalesByOrigin] Dados retornados:', data?.length, 'vendas')
    console.log('📊 [getSalesByOrigin] Primeiros registros:', data?.slice(0, 3))

    if (!data || data.length === 0) {
      console.log('⚠️ [getSalesByOrigin] Nenhuma venda encontrada')
      return []
    }

    // Agrupar por chave normalizada (olx, Olx, OLX → uma única linha)
    const grouped = data.reduce((acc: any, lead: any) => {
      const rawOrigin = lead.origin || ORIGIN_NAO_INFORMADO
      const key = normalizeOriginKey(rawOrigin)
      if (!acc[key]) {
        acc[key] = { origin: rawOrigin, count: 0, total_value: 0 }
      }
      acc[key].count++
      acc[key].total_value += lead.sold_value || 0
      return acc
    }, {})

    const results: LeadsByOriginResult[] = Object.values(grouped)
    const totalSales = results.reduce((sum, r: any) => sum + r.count, 0)

    return results.map((r: any) => ({
      ...r,
      percentage: totalSales > 0 ? (r.count / totalSales) * 100 : 0,
      average_value: r.count > 0 ? r.total_value / r.count : 0
    })).sort((a, b) => b.count - a.count)
  })
}

// =====================================================
// MÉTRICAS: VENDAS POR RESPONSÁVEL (VENDEDOR)
// =====================================================

export async function getSalesByResponsible(
  filters: import('../types').SalesAnalyticsFilters
): Promise<any[]> {
  console.log('📊 [getSalesByResponsible] CHAMADA INICIADA - Filtros recebidos:', filters)
  
  return useCachedQuery('analytics_sales_responsible', filters, async () => {
    console.log('📊 [getSalesByResponsible] EXECUTANDO QUERY (não veio do cache)')
    const empresaId = await getUserEmpresaId()

    console.log('📊 [getSalesByResponsible] Filtros recebidos:', filters)
    console.log('📊 [getSalesByResponsible] Empresa ID:', empresaId)

    let query = supabase
      .from('leads')
      .select(`
        responsible_uuid,
        value,
        sold_value,
        status,
        sold_at,
        pipeline_id,
        origin,
        profiles:responsible_uuid (
          full_name
        )
      `)
      .eq('empresa_id', empresaId)
      .eq('status', 'venda_confirmada')
      .not('sold_at', 'is', null)

    // Aplicar filtro de período (por sold_at, não created_at)
    if (filters.period) {
      console.log('📊 [getSalesByResponsible] Aplicando filtro de período:', filters.period)
      query = query
        .gte('sold_at', `${filters.period.start}T00:00:00`)
        .lte('sold_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtro de pipelines
    if (filters.pipelines && filters.pipelines.length > 0) {
      console.log('📊 [getSalesByResponsible] Aplicando filtro de pipelines:', filters.pipelines)
      query = query.in('pipeline_id', filters.pipelines)
    }

    // Aplicar filtro de origens
    if (filters.origins && filters.origins.length > 0) {
      console.log('📊 [getSalesByResponsible] Aplicando filtro de origens:', filters.origins)
      query = query.in('origin', filters.origins)
    }

    // Aplicar filtro de responsáveis
    if (filters.responsibles && filters.responsibles.length > 0) {
      console.log('📊 [getSalesByResponsible] Aplicando filtro de responsáveis:', filters.responsibles)
      query = query.in('responsible_uuid', filters.responsibles)
    }

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('❌ [getSalesByResponsible] Erro ao buscar vendas por responsável:', error)
      throw new Error('Erro ao buscar vendas por responsável')
    }

    console.log('📊 [getSalesByResponsible] Dados retornados:', data?.length, 'vendas')
    console.log('📊 [getSalesByResponsible] Primeiros registros:', data?.slice(0, 3))

    if (!data || data.length === 0) {
      console.log('⚠️ [getSalesByResponsible] Nenhuma venda encontrada')
      return []
    }

    // Agrupar por responsável
    const grouped = data.reduce((acc: any, lead: any) => {
      const responsibleId = lead.responsible_uuid || 'sem_responsavel'
      const responsibleName = lead.profiles?.full_name || 'Sem responsável'
      
      if (!acc[responsibleId]) {
        acc[responsibleId] = {
          responsible_uuid: responsibleId,
          responsible_name: responsibleName,
          count: 0,
          total_value: 0
        }
      }
      acc[responsibleId].count++
      acc[responsibleId].total_value += lead.sold_value || 0
      return acc
    }, {})

    const results = Object.values(grouped)
    const totalSales = results.reduce((sum: number, r: any) => sum + r.count, 0)

    return results.map((r: any) => ({
      ...r,
      percentage: totalSales > 0 ? (r.count / totalSales) * 100 : 0,
      average_value: r.count > 0 ? r.total_value / r.count : 0
    })).sort((a: any, b: any) => b.count - a.count)
  })
}

// =====================================================
// MÉTRICAS: TAXA DE CONVERSÃO POR ESTÁGIO
// =====================================================

export async function getConversionRateByStage(
  filters: AnalyticsFilters
): Promise<ConversionRateResult[]> {
  const empresaId = await getUserEmpresaId()

  // Buscar todos os leads com seus stages
  let query = supabase
    .from('leads')
    .select(`
      id,
      stage_id,
      created_at,
      stages(id, name, position, pipeline_id)
    `)

  query = applyFilters(query, filters, empresaId)

  const { data, error } = await fetchAllRows(query)

  if (error) {
    console.error('Erro ao calcular conversão:', error)
    throw new Error('Erro ao calcular taxa de conversão')
  }

  // Agrupar por pipeline e calcular conversão entre estágios
  const pipelineStages: any = {}
  
  data.forEach((lead: any) => {
    const pipelineId = lead.stages?.pipeline_id
    if (!pipelineId) return
    
    if (!pipelineStages[pipelineId]) {
      pipelineStages[pipelineId] = {}
    }
    
    const stageId = lead.stage_id
    if (!pipelineStages[pipelineId][stageId]) {
      pipelineStages[pipelineId][stageId] = {
        stage_id: stageId,
        stage_name: lead.stages?.name,
        position: lead.stages?.position,
        count: 0
      }
    }
    pipelineStages[pipelineId][stageId].count++
  })

  // Calcular conversão entre estágios consecutivos
  const results: ConversionRateResult[] = []
  
  Object.values(pipelineStages).forEach((stages: any) => {
    const stageArray = Object.values(stages).sort((a: any, b: any) => a.position - b.position)
    
    for (let i = 0; i < stageArray.length - 1; i++) {
      const from: any = stageArray[i]
      const to: any = stageArray[i + 1]
      
      results.push({
        stage_from_id: from.stage_id,
        stage_from_name: from.stage_name,
        stage_to_id: to.stage_id,
        stage_to_name: to.stage_name,
        total_leads: from.count,
        converted_leads: to.count,
        conversion_rate: from.count > 0 ? (to.count / from.count) * 100 : 0,
        average_time_days: 0 // TODO: calcular tempo médio
      })
    }
  })

  return results
}

// =====================================================
// MÉTRICAS: TEMPO MÉDIO DE ATENDIMENTO
// =====================================================

export async function getAverageResponseTime(
  filters: Partial<AnalyticsFilters> & { instances?: string[] }
): Promise<AverageTimeResult[]> {
  const empresaId = await getUserEmpresaId()

  // Query complexa para calcular tempo entre mensagens inbound e outbound
  let query = supabase
    .from('chat_messages')
    .select(`
      conversation_id,
      instance_id,
      timestamp,
      direction,
      whatsapp_instances!instance_id(name, display_name)
    `)
    .eq('empresa_id', empresaId)

  if (filters.period) {
    query = query
      .gte('timestamp', `${filters.period.start}T00:00:00`)
      .lte('timestamp', `${filters.period.end}T23:59:59`)
  }

  if (filters.instances && filters.instances.length > 0) {
    query = query.in('instance_id', filters.instances)
  }

  const { data, error } = await fetchAllRows(query.order('timestamp', { ascending: true }))

  if (error) {
    console.error('Erro ao calcular tempo médio:', error)
    throw new Error('Erro ao calcular tempo médio de atendimento')
  }

  // Agrupar por instância e calcular tempos
  const instanceData: any = {}
  
  data.forEach((msg: any) => {
    const instanceId = msg.instance_id
    if (!instanceData[instanceId]) {
      instanceData[instanceId] = {
        instance_id: instanceId,
        instance_name: msg.whatsapp_instances?.display_name || msg.whatsapp_instances?.name || 'Sem nome',
        response_times: [],
        conversations: new Set()
      }
    }
    instanceData[instanceId].conversations.add(msg.conversation_id)
  })

  // Calcular médias
  const results: AverageTimeResult[] = Object.values(instanceData).map((inst: any) => {
    const avgSeconds = inst.response_times.length > 0
      ? inst.response_times.reduce((a: number, b: number) => a + b, 0) / inst.response_times.length
      : 0

    const hours = Math.floor(avgSeconds / 3600)
    const minutes = Math.floor((avgSeconds % 3600) / 60)

    return {
      instance_id: inst.instance_id,
      instance_name: inst.instance_name,
      average_seconds: avgSeconds,
      average_formatted: `${hours}h ${minutes}min`,
      total_conversations: inst.conversations.size
    }
  })

  return results
}

// =====================================================
// MÉTRICAS: TEMPO DO PRIMEIRO ATENDIMENTO
// =====================================================

export async function getFirstResponseTime(
  filters: Partial<AnalyticsFilters>
): Promise<AverageTimeResult> {
  const empresaId = await getUserEmpresaId()

  // Buscar primeira mensagem inbound e primeira outbound por conversation
  const { data, error } = await supabase.rpc('calculate_first_response_time', {
    p_empresa_id: empresaId,
    p_start_date: filters.period?.start,
    p_end_date: filters.period?.end
  })

  if (error) {
    console.error('Erro ao calcular primeiro atendimento:', error)
    // Fallback se RPC não existir
    return {
      average_seconds: 0,
      average_formatted: '0h 0min',
      total_conversations: 0
    }
  }

  return data || {
    average_seconds: 0,
    average_formatted: '0h 0min',
    total_conversations: 0
  }
}

// =====================================================
// MÉTRICAS: VALOR MÉDIO DE LEADS
// =====================================================

export async function getAverageLeadValue(
  filters: AnalyticsFilters
): Promise<number> {
  const empresaId = await getUserEmpresaId()

  let query = supabase
    .from('leads')
    .select('value')

  query = applyFilters(query, filters, empresaId)

  const { data, error } = await fetchAllRows(query)

  if (error || !data || data.length === 0) {
    return 0
  }

  const total = data.reduce((sum, lead) => sum + (lead.value || 0), 0)
  return total / data.length
}

// =====================================================
// MÉTRICAS: SÉRIES TEMPORAIS
// =====================================================

export async function getLeadsOverTime(
  filters: AnalyticsFilters,
  interval: TimeInterval = 'day'
): Promise<TimeSeriesPoint[]> {
  const empresaId = await getUserEmpresaId()

  let query = supabase
    .from('leads')
    .select('created_at, value')

  query = applyFilters(query, filters, empresaId)

  const { data, error } = await fetchAllRows(query)

  if (error) {
    console.error('Erro ao buscar série temporal:', error)
    throw new Error('Erro ao buscar evolução de leads')
  }

  // Agrupar por intervalo
  const grouped: any = {}
  
  data.forEach(lead => {
    const date = new Date(lead.created_at)
    let key: string

    switch (interval) {
      case 'day':
        // IMPORTANTE: Usar UTC para garantir consistência com filtros SQL
        // O filtro SQL usa timestamps UTC, então o agrupamento também deve usar UTC
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
        break
      case 'week':
        const week = getWeekNumber(date)
        key = `${date.getUTCFullYear()}-W${week}`
        break
      case 'month':
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
        break
      default:
        // IMPORTANTE: Usar UTC para garantir consistência com filtros SQL
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    }

    // Só incluir se a data estiver dentro do período filtrado
    if (filters.period) {
      if (key < filters.period.start || key > filters.period.end) {
        return // Pular este lead
      }
    }

    if (!grouped[key]) {
      grouped[key] = { count: 0, value: 0 }
    }
    grouped[key].count++
    grouped[key].value += lead.value || 0
  })

  return Object.entries(grouped)
    .map(([date, data]: [string, any]) => ({
      date,
      value: data.count,
      label: date,
      metadata: { total_value: data.value }
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Função auxiliar para calcular número da semana
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// =====================================================
// MÉTRICAS: FUNIL DE CONVERSÃO
// =====================================================

export async function getFunnelData(
  filters: AnalyticsFilters
): Promise<FunnelStageData[]> {
  const stageData = await getLeadsByStage(filters)
  
  const totalLeads = stageData.reduce((sum, stage) => sum + stage.count, 0)
  
  return stageData.map((stage, index) => ({
    stage_id: stage.stage_id,
    stage_name: stage.stage_name,
    stage_position: stage.stage_position,
    count: stage.count,
    percentage: (stage.count / totalLeads) * 100,
    drop_off_rate: index > 0 
      ? ((stageData[index - 1].count - stage.count) / stageData[index - 1].count) * 100 
      : 0
  }))
}

// =====================================================
// ESTATÍSTICAS GERAIS
// =====================================================

export async function getAnalyticsStats(
  filters: AnalyticsFilters
): Promise<AnalyticsStats> {
  return useCachedQuery('analytics_stats', filters, async () => {
    const empresaId = await getUserEmpresaId()

    console.log('📊 [getAnalyticsStats] Filtros recebidos:', filters)

    let query = supabase
      .from('leads')
      .select('id, value, pipeline_id, responsible_uuid, status, sold_value, sold_at, created_at')

    query = applyFilters(query, filters, empresaId)

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('❌ [getAnalyticsStats] Erro ao buscar estatísticas:', error)
      throw new Error('Erro ao buscar estatísticas')
    }

    console.log('📊 [getAnalyticsStats] Total de leads encontrados:', data?.length)

    const totalValue = data.reduce((sum, lead) => sum + (lead.value || 0), 0)
    const uniquePipelines = new Set(data.map(l => l.pipeline_id)).size
    const uniqueUsers = new Set(data.map(l => l.responsible_uuid)).size

    // Calcular métricas de vendas
    // Considerar lead como venda se tiver status 'venda_confirmada' E sold_at preenchido
    const leadsWithVendaStatus = data.filter(lead => lead.status === 'venda_confirmada')
    const sales = data.filter(lead => 
      lead.status === 'venda_confirmada' && lead.sold_at
    )
    
    console.log('📊 [getAnalyticsStats] Leads com status venda_confirmada:', leadsWithVendaStatus.length)
    console.log('📊 [getAnalyticsStats] Leads com venda_confirmada + sold_at:', sales.length)
    
    if (leadsWithVendaStatus.length > sales.length) {
      console.warn('⚠️ [getAnalyticsStats] Alguns leads têm status venda_confirmada mas sem sold_at:', 
        leadsWithVendaStatus.length - sales.length)
      const missingDates = leadsWithVendaStatus.filter(l => !l.sold_at)
      console.log('📊 [getAnalyticsStats] Exemplos sem sold_at:', missingDates.slice(0, 3).map(l => ({
        id: l.id,
        status: l.status,
        sold_at: l.sold_at
      })))
    }
    
    console.log('📊 [getAnalyticsStats] Primeiras vendas:', sales.slice(0, 3).map(s => ({
      status: s.status,
      sold_at: s.sold_at,
      sold_value: s.sold_value,
      created_at: s.created_at
    })))
    
    const totalSales = sales.length
    const salesValue = sales.reduce((sum, lead) => sum + (lead.sold_value || 0), 0)

    // Calcular leads perdidos
    const lostLeads = data.filter(lead => lead.status === 'perdido')
    const totalLost = lostLeads.length

    console.log('📊 [getAnalyticsStats] Resultado final:', {
      total_leads: data.length,
      total_sales: totalSales,
      sales_value: salesValue,
      total_lost: totalLost
    })

    return {
      total_leads: data.length,
      total_value: totalValue,
      average_value: data.length > 0 ? totalValue / data.length : 0,
      active_pipelines: uniquePipelines,
      active_users: uniqueUsers,
      total_sales: totalSales,
      sales_value: salesValue,
      total_lost: totalLost,
      period: filters.period
    }
  })
}

// =====================================================
// MÉTRICAS AVANÇADAS: CONVERSÃO E TEMPO POR ESTÁGIO
// =====================================================

/**
 * Obter taxa de conversão detalhada entre estágios
 * Analisa o histórico de mudanças para calcular conversão real
 * OTIMIZADO: Usa cache e busca dados em batch
 */
export async function getDetailedConversionRates(
  filters: AnalyticsFilters
): Promise<DetailedConversionRate[]> {
  return useCachedQuery('analytics_conversion_detailed', filters, async () => {
    const empresaId = await getUserEmpresaId()

    // Buscar histórico de mudanças de estágio
    // IMPORTANTE: Buscar histórico completo primeiro, depois filtrar pelo período
    let historyQuery = supabase
      .from('lead_pipeline_history')
      .select(`
        lead_id,
        changed_at,
        change_type,
        stage_id,
        previous_stage_id,
        pipeline_id,
        empresa_id
      `)
      .eq('empresa_id', empresaId)
      .in('change_type', ['stage_changed', 'both_changed', 'created', 'marked_as_lost'])

    if (filters.pipelines && filters.pipelines.length > 0) {
      historyQuery = historyQuery.in('pipeline_id', filters.pipelines)
    }

    const { data: allHistory, error: historyError } = await fetchAllRows(
      historyQuery.order('changed_at', { ascending: true })
    )

    if (historyError) {
      console.error('Erro ao buscar histórico:', historyError)
      return []
    }

    if (!allHistory || allHistory.length === 0) {
      return []
    }

    // Filtrar mudanças que aconteceram NO período selecionado
    const history = filters.period 
      ? allHistory.filter(h => {
          const changedAt = utcToLocalDate(h.changed_at)
          return changedAt >= filters.period!.start && changedAt <= filters.period!.end
        })
      : allHistory

    const debugInfo = {
      periodo: filters.period,
      totalHistorico: allHistory.length,
      mudancasNoPeriodo: history.length,
      leadsUnicos: new Set(history.map(h => h.lead_id)).size
    }
    console.log('📊 Conversão Detalhada - Debug:', debugInfo)
    console.table(debugInfo)

    if (history.length === 0) {
      console.warn('⚠️ Nenhuma mudança de estágio encontrada no período')
      return []
    }

    // Buscar informações dos estágios e pipelines
    const stageIds = new Set<string>()
    history.forEach(h => {
      if (h.stage_id) stageIds.add(h.stage_id)
      if (h.previous_stage_id) stageIds.add(h.previous_stage_id)
    })

    const { data: stages } = await supabase
      .from('stages')
      .select('id, name, position, pipeline_id, pipelines(name)')
      .in('id', Array.from(stageIds))

    if (!stages || stages.length === 0) {
      return []
    }

    // Criar mapa de estágios para acesso rápido
    const stageMap = new Map<string, any>()
    stages.forEach(stage => {
      stageMap.set(stage.id, stage)
    })

    // Determinar último estágio de cada lead no período para desconsiderar retornos
    const leadFinalStage = new Map<string, string>()
    history.forEach(change => {
      if (change.stage_id) {
        leadFinalStage.set(change.lead_id, change.stage_id)
      }
    })

    // Agrupar transições por par de estágios (from -> to)
    const transitions = new Map<string, {
      from: any
      to: any
      times: number[]
      leads: Set<string>
    }>()

    // Processar histórico para encontrar transições (apenas avanços)
    for (let i = 0; i < history.length; i++) {
      const change = history[i]
      
      if (!change.previous_stage_id || !change.stage_id) continue
      
      const fromStage = stageMap.get(change.previous_stage_id)
      const toStage = stageMap.get(change.stage_id)
      
      if (!fromStage || !toStage) continue
      if (fromStage.pipeline_id !== toStage.pipeline_id) continue
      if (fromStage.position >= toStage.position) continue

      // Só contar se o lead permaneceu no estágio destino ou avançou além
      const finalStageId = leadFinalStage.get(change.lead_id)
      const finalStage = finalStageId ? stageMap.get(finalStageId) : null
      if (!finalStage || finalStage.position < toStage.position) continue

      const key = `${change.previous_stage_id}_${change.stage_id}`
      
      if (!transitions.has(key)) {
        transitions.set(key, {
          from: fromStage,
          to: toStage,
          times: [],
          leads: new Set()
        })
      }

      const previousEntry = history
        .slice(0, i)
        .reverse()
        .find(h => h.lead_id === change.lead_id && h.stage_id === change.previous_stage_id)

      if (previousEntry) {
        const timeInStage = new Date(change.changed_at).getTime() - new Date(previousEntry.changed_at).getTime()
        const minutes = timeInStage / (1000 * 60)
        
        if (minutes > 0 && minutes < (90 * 24 * 60)) {
          transitions.get(key)!.times.push(minutes)
        }
      }

      transitions.get(key)!.leads.add(change.lead_id)
    }

    // Contar total de leads que entraram em cada estágio
    // Para uma contagem precisa, consideramos o histórico completo
    const stageEntries = new Map<string, Set<string>>()
    
    // Para cada lead, verificar em qual estágio estava no início do período
    // e rastrear por quais estágios passou durante o período
    const leadStages = new Map<string, string[]>()
    
    allHistory.forEach(change => {
      if (!leadStages.has(change.lead_id)) {
        leadStages.set(change.lead_id, [])
      }
      if (change.stage_id) {
        leadStages.get(change.lead_id)!.push(change.stage_id)
      }
    })
    
    // Agora contar quantos leads passaram por cada estágio considerando:
    // 1. Leads que já estavam no estágio antes do período
    // 2. Leads que entraram no estágio durante o período
    history.forEach(change => {
      if (change.stage_id) {
        if (!stageEntries.has(change.stage_id)) {
          stageEntries.set(change.stage_id, new Set())
        }
        stageEntries.get(change.stage_id)!.add(change.lead_id)
      }
      // Também contar o estágio anterior (de onde veio)
      if (change.previous_stage_id) {
        if (!stageEntries.has(change.previous_stage_id)) {
          stageEntries.set(change.previous_stage_id, new Set())
        }
        stageEntries.get(change.previous_stage_id)!.add(change.lead_id)
      }
    })

    // Mapear leads marcados como perdidos por estágio (stage_id no momento da perda)
    const lostAtStage = new Map<string, Set<string>>()
    history.forEach(h => {
      if (h.change_type === 'marked_as_lost' && h.stage_id) {
        if (!lostAtStage.has(h.stage_id)) {
          lostAtStage.set(h.stage_id, new Set())
        }
        lostAtStage.get(h.stage_id)!.add(h.lead_id)
      }
    })

    const results: DetailedConversionRate[] = []

    console.log('📊 Entradas por estágio:', Array.from(stageEntries.entries()).map(([id, leads]) => ({
      estágio: stageMap.get(id)?.name,
      totalLeads: leads.size
    })))

    for (const [, transition] of transitions.entries()) {
      const totalEntered = stageEntries.get(transition.from.id)?.size || 0
      const convertedToNext = transition.leads.size
      const conversionRate = totalEntered > 0 ? (convertedToNext / totalEntered) * 100 : 0
      const lostLeads = lostAtStage.get(transition.from.id)?.size || 0
      const lossRate = totalEntered > 0 ? (lostLeads / totalEntered) * 100 : 0

      console.log(`  ✓ ${transition.from.name} → ${transition.to.name}: ${convertedToNext}/${totalEntered} leads (${conversionRate.toFixed(1)}%)`)

      // Calcular tempo médio de conversão
      let avgTime = 0
      let avgTimeFormatted = '0h 0min'
      
      if (transition.times.length > 0) {
        avgTime = transition.times.reduce((sum, t) => sum + t, 0) / transition.times.length
        avgTimeFormatted = formatMinutesToReadable(avgTime)
      }

      results.push({
        stage_from_id: transition.from.id,
        stage_from_name: transition.from.name,
        stage_to_id: transition.to.id,
        stage_to_name: transition.to.name,
        pipeline_id: transition.from.pipeline_id,
        pipeline_name: transition.from.pipelines?.name || 'Pipeline',
        total_leads_entered: totalEntered,
        converted_to_next: convertedToNext,
        conversion_rate: conversionRate,
        lost_leads: lostLeads,
        loss_rate: lossRate,
        avg_time_to_convert_minutes: avgTime,
        avg_time_to_convert_formatted: avgTimeFormatted
      })
    }

    // Ordenar por pipeline e posição do estágio
    return results.sort((a, b) => {
      const aStage = stageMap.get(a.stage_from_id)
      const bStage = stageMap.get(b.stage_from_id)
      
      if (a.pipeline_id !== b.pipeline_id) {
        return a.pipeline_name.localeCompare(b.pipeline_name)
      }
      
      return (aStage?.position || 0) - (bStage?.position || 0)
    })
  })
}

/**
 * Obter tempo médio que leads ficam em cada estágio
 * OTIMIZADO: Usa cache e processa dados em batch
 */
export async function getStageTimeMetrics(
  filters: AnalyticsFilters
): Promise<StageTimeMetrics[]> {
  return useCachedQuery('analytics_stage_time', filters, async () => {
    const empresaId = await getUserEmpresaId()

    // Para calcular tempo corretamente, precisamos do histórico completo
    // depois filtramos para considerar apenas leads ativos no período
    let historyQuery = supabase
      .from('lead_pipeline_history')
      .select(`
        lead_id,
        changed_at,
        stage_id,
        previous_stage_id,
        pipeline_id
      `)
      .eq('empresa_id', empresaId)
      .in('change_type', ['stage_changed', 'both_changed', 'created'])

    if (filters.pipelines && filters.pipelines.length > 0) {
      historyQuery = historyQuery.in('pipeline_id', filters.pipelines)
    }

    const { data: allHistory, error: historyError } = await historyQuery
      .order('lead_id', { ascending: true })
      .order('changed_at', { ascending: true })

    if (historyError) {
      console.error('Erro ao buscar histórico:', historyError)
      return []
    }

    if (!allHistory || allHistory.length === 0) {
      return []
    }

    // Filtrar para considerar apenas leads com atividade no período
    const history = filters.period 
      ? allHistory.filter(h => {
          const changedAt = utcToLocalDate(h.changed_at)
          return changedAt >= filters.period!.start && changedAt <= filters.period!.end
        })
      : allHistory

    if (history.length === 0) {
      return []
    }

    // Identificar todos os leads que tiveram atividade no período
    const activeLeadIds = new Set(history.map(h => h.lead_id))
    
    // Usar histórico completo apenas para esses leads ativos
    const relevantHistory = allHistory.filter(h => activeLeadIds.has(h.lead_id))

    const timeDebugInfo = {
      periodo: filters.period,
      totalHistorico: allHistory.length,
      mudancasNoPeriodo: history.length,
      leadsAtivos: activeLeadIds.size,
      historicoRelevante: relevantHistory.length
    }
    console.log('⏱️ Tempo por Estágio - Debug:', timeDebugInfo)
    console.table(timeDebugInfo)

    // Buscar informações dos estágios
    const stageIds = new Set<string>()
    relevantHistory.forEach(h => {
      if (h.stage_id) stageIds.add(h.stage_id)
      if (h.previous_stage_id) stageIds.add(h.previous_stage_id)
    })

    const { data: stages } = await supabase
      .from('stages')
      .select('id, name, position, pipeline_id, pipelines(name)')
      .in('id', Array.from(stageIds))

    if (!stages || stages.length === 0) {
      return []
    }

    // Criar mapa de estágios
    const stageMap = new Map<string, any>()
    stages.forEach(stage => {
      stageMap.set(stage.id, stage)
    })

    // Agrupar mudanças por lead para calcular tempo em cada estágio
    const leadChanges = new Map<string, typeof relevantHistory>()
    relevantHistory.forEach(change => {
      if (!leadChanges.has(change.lead_id)) {
        leadChanges.set(change.lead_id, [])
      }
      leadChanges.get(change.lead_id)!.push(change)
    })

    // Calcular tempo em cada estágio
    const stageTimes = new Map<string, number[]>()

    for (const [, changes] of leadChanges.entries()) {
      for (let i = 0; i < changes.length - 1; i++) {
        const current = changes[i]
        const next = changes[i + 1]

        if (!current.stage_id) continue

        const timeInStage = new Date(next.changed_at).getTime() - new Date(current.changed_at).getTime()
        const minutes = timeInStage / (1000 * 60)

        // Filtrar outliers (tempo no estágio > 180 dias)
        if (minutes > 0 && minutes < (180 * 24 * 60)) {
          if (!stageTimes.has(current.stage_id)) {
            stageTimes.set(current.stage_id, [])
          }
          stageTimes.get(current.stage_id)!.push(minutes)
        }
      }

      // Para o último estágio de cada lead (se ainda está nele)
      const lastChange = changes[changes.length - 1]
      if (lastChange.stage_id) {
        const now = new Date()
        const timeInStage = now.getTime() - new Date(lastChange.changed_at).getTime()
        const minutes = timeInStage / (1000 * 60)

        // Só adicionar se for recente (últimos 180 dias)
        if (minutes > 0 && minutes < (180 * 24 * 60)) {
          if (!stageTimes.has(lastChange.stage_id)) {
            stageTimes.set(lastChange.stage_id, [])
          }
          stageTimes.get(lastChange.stage_id)!.push(minutes)
        }
      }
    }

    // Construir resultados
    const results: StageTimeMetrics[] = []
    const stuckThresholdDays = 30 // Considerar "estagnado" após 30 dias

    for (const [stageId, times] of stageTimes.entries()) {
      const stage = stageMap.get(stageId)
      if (!stage) continue

      if (times.length === 0) continue

      // Calcular estatísticas
      const sortedTimes = [...times].sort((a, b) => a - b)
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
      const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)]
      const minTime = sortedTimes[0]
      const maxTime = sortedTimes[sortedTimes.length - 1]
      const leadsStuck = times.filter(t => t > (stuckThresholdDays * 24 * 60)).length

      results.push({
        stage_id: stageId,
        stage_name: stage.name,
        stage_position: stage.position,
        pipeline_id: stage.pipeline_id,
        pipeline_name: stage.pipelines?.name || 'Pipeline',
        total_leads: times.length,
        avg_time_minutes: avgTime,
        avg_time_formatted: formatMinutesToReadable(avgTime),
        median_time_minutes: medianTime,
        min_time_minutes: minTime,
        max_time_minutes: maxTime,
        leads_stuck: leadsStuck
      })
    }

    // Ordenar por pipeline e posição
    return results.sort((a, b) => {
      if (a.pipeline_id !== b.pipeline_id) {
        return a.pipeline_name.localeCompare(b.pipeline_name)
      }
      return a.stage_position - b.stage_position
    })
  })
}

/**
 * Converte ISO string UTC para data local no formato YYYY-MM-DD
 */
function utcToLocalDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('sv-SE')
}

/**
 * Formatar minutos para formato legível
 * Exemplo: 1500 minutos = "1d 1h 0min"
 */
function formatMinutesToReadable(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`
  }

  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const mins = Math.round(minutes % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}min`)

  return parts.join(' ')
}

// =====================================================
// MÉTRICAS DE CHAT
// =====================================================

/**
 * Total de conversas no período
 */
export async function getTotalConversations(
  filters: AnalyticsFilters
): Promise<number> {
  try {
    const empresaId = await getUserEmpresaId()

    // Se há filtro de horário, precisamos buscar os dados e filtrar em memória
    const chatFilters = filters as any
    const hasTimeFilter = chatFilters.timeRange

    if (hasTimeFilter) {
      let query = supabase
        .from('chat_conversations')
        .select('id, created_at')
        .eq('empresa_id', empresaId)

      // Aplicar filtro de período
      if (filters.period) {
        query = query
          .gte('created_at', `${filters.period.start}T00:00:00`)
          .lte('created_at', `${filters.period.end}T23:59:59`)
      }

      // Aplicar filtro de instâncias
      if (filters.instances && filters.instances.length > 0) {
        query = query.in('instance_id', filters.instances)
      }

      const { data, error } = await fetchAllRows(query)

      if (error) {
        console.error('Erro ao buscar total de conversas:', error)
        return 0
      }

      // Filtrar por horário
      const filtered = filterByTimeRange(data || [], chatFilters.timeRange)
      return filtered.length
    }

    // Sem filtro de horário, usa count otimizado
    let query = supabase
      .from('chat_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)

    // Aplicar filtro de período
    if (filters.period) {
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtro de instâncias
    if (filters.instances && filters.instances.length > 0) {
      query = query.in('instance_id', filters.instances)
    }

    const { count, error } = await query

    if (error) {
      console.error('Erro ao buscar total de conversas:', error)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('Erro ao buscar total de conversas:', err)
    return 0
  }
}

/**
 * Conversas por instância WhatsApp
 */
export async function getConversationsByInstance(
  filters: AnalyticsFilters
): Promise<Array<{ instance_name: string; count: number; percentage: number }>> {
  try {
    const empresaId = await getUserEmpresaId()
    const chatFilters = filters as any

    let query = supabase
      .from('chat_conversations')
      .select(`
        id,
        created_at,
        whatsapp_instances!instance_id(name, display_name)
      `)
      .eq('empresa_id', empresaId)

    // Aplicar filtro de período
    if (filters.period) {
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtro de instâncias
    if (filters.instances && filters.instances.length > 0) {
      query = query.in('instance_id', filters.instances)
    }

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('Erro ao buscar conversas por instância:', error)
      return []
    }

    // Aplicar filtro de horário se necessário
    const filteredData = filterByTimeRange(data || [], chatFilters.timeRange)

    // Agrupar por instância
    const grouped = filteredData.reduce((acc: any, conv: any) => {
      const instanceName = conv.whatsapp_instances?.display_name || conv.whatsapp_instances?.name || 'Não informado'
      acc[instanceName] = (acc[instanceName] || 0) + 1
      return acc
    }, {})

    const total = filteredData.length
    const result = Object.entries(grouped).map(([instance_name, count]) => ({
      instance_name,
      count: count as number,
      percentage: total > 0 ? ((count as number) / total) * 100 : 0
    }))

    return result.sort((a, b) => b.count - a.count)
  } catch (err) {
    console.error('Erro ao buscar conversas por instância:', err)
    return []
  }
}

/**
 * Tempo médio de resposta (geral)
 * Calcula o tempo médio entre TODAS as mensagens do cliente e as respostas do atendente
 * (não apenas a primeira, mas todas as interações ao longo da conversa)
 * OTIMIZADO: Elimina N+1 queries buscando todas as mensagens de uma vez
 */
export async function getAverageFirstResponseTime(
  filters: AnalyticsFilters
): Promise<{ 
  average_minutes: number
  formatted: string
  total_conversations: number
  details?: Array<{
    id: string
    lead_id?: string
    lead_name?: string
    created_at: string
    phone: string
    contact_name?: string
    response_time_minutes: number
    response_time_formatted: string
  }>
}> {
  try {
    const empresaId = await getUserEmpresaId()
    const chatFilters = filters as any

    // Buscar conversas do período (limite configurável)
    let conversationQuery = supabase
      .from('chat_conversations')
      .select('id, created_at, fone, Nome_Whatsapp, lead_id')
      .eq('empresa_id', empresaId)

    if (filters.period) {
      conversationQuery = conversationQuery
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtro de instâncias
    if (filters.instances && filters.instances.length > 0) {
      conversationQuery = conversationQuery.in('instance_id', filters.instances)
    }
    
    conversationQuery = conversationQuery
      .order('created_at', { ascending: false })
      .limit(ANALYTICS_LIMITS.CONVERSATIONS_RESPONSE_TIME)

    const { data: conversations, error: convError } = await conversationQuery

    if (convError) {
      console.error('Erro ao buscar conversas:', convError)
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_conversations: 0 }
    }

    if (!conversations || conversations.length === 0) {
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_conversations: 0 }
    }

    // Aplicar filtro de horário nas conversas
    const filteredConversations = filterByTimeRange(conversations, chatFilters.timeRange)

    if (filteredConversations.length === 0) {
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_conversations: 0 }
    }

    // OTIMIZAÇÃO: Buscar TODAS as mensagens das conversas de uma só vez
    const conversationIds = filteredConversations.map(c => c.id)
    
    const { data: allMessages, error: msgError } = await supabase
      .from('chat_messages')
      .select('conversation_id, timestamp, direction')
      .in('conversation_id', conversationIds)
      .order('timestamp', { ascending: true })

    if (msgError || !allMessages) {
      console.error('Erro ao buscar mensagens:', msgError)
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_conversations: 0 }
    }

    // Aplicar filtro de horário nas mensagens
    const filteredMessages = filterByTimeRange(allMessages, chatFilters.timeRange)

    // Agrupar mensagens por conversa
    const messagesByConversation = new Map<string, typeof filteredMessages>()
    for (const msg of filteredMessages) {
      if (!messagesByConversation.has(msg.conversation_id)) {
        messagesByConversation.set(msg.conversation_id, [])
      }
      messagesByConversation.get(msg.conversation_id)!.push(msg)
    }

    // Calcular tempo médio de TODAS as respostas (não apenas primeira)
    const responseTimes: number[] = []
    const conversationResponseTimes = new Map<string, number[]>() // Para calcular média por conversa
    
    for (const conv of filteredConversations) {
      const messages = messagesByConversation.get(conv.id)
      if (!messages || messages.length === 0) continue

      const convResponseTimes: number[] = []

      // Percorrer todas as mensagens procurando pares cliente→atendente
      for (let i = 0; i < messages.length - 1; i++) {
        const currentMsg = messages[i]
        
        // Se é mensagem do cliente (outbound)
        if (currentMsg.direction === 'outbound') {
          // Procurar a próxima mensagem do atendente (inbound)
          const nextResponse = messages.slice(i + 1).find(m => m.direction === 'inbound')
          
          if (nextResponse) {
            const diffMs = new Date(nextResponse.timestamp).getTime() - new Date(currentMsg.timestamp).getTime()
            const diffMinutes = diffMs / (1000 * 60)
            
            // Filtrar tempos negativos ou muito grandes (outliers)
            if (diffMinutes > 0 && diffMinutes < (ANALYTICS_LIMITS.MAX_RESPONSE_TIME_DAYS * 24 * 60)) {
              convResponseTimes.push(diffMinutes)
              responseTimes.push(diffMinutes)
            }
          }
        }
      }

      // Salvar tempos de resposta desta conversa
      if (convResponseTimes.length > 0) {
        conversationResponseTimes.set(conv.id, convResponseTimes)
      }
    }

    // Buscar nomes dos leads para as conversas que têm lead_id
    const leadIds = filteredConversations
      .map(c => c.lead_id)
      .filter((id): id is string => !!id)
    
    const leadsMap = new Map<string, string>()
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name')
        .in('id', leadIds)
      
      if (leads) {
        leads.forEach(lead => {
          leadsMap.set(lead.id, lead.name)
        })
      }
    }

    // Criar detalhes por conversa (média de cada conversa)
    const details: Array<{
      id: string
      lead_id?: string
      lead_name?: string
      created_at: string
      phone: string
      contact_name?: string
      instance_name?: string
      response_time_minutes: number
      response_time_formatted: string
    }> = []

    for (const conv of filteredConversations) {
      const convTimes = conversationResponseTimes.get(conv.id)
      if (!convTimes || convTimes.length === 0) continue

      // Calcular média desta conversa
      const avgMinutes = convTimes.reduce((sum, t) => sum + t, 0) / convTimes.length

      // Formatar tempo
      const totalSec = Math.round(avgMinutes * 60)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      const timeFormatted = `${h}h ${m}min ${s}seg`

      details.push({
        id: conv.id,
        lead_id: conv.lead_id,
        lead_name: conv.lead_id ? leadsMap.get(conv.lead_id) : undefined,
        created_at: conv.created_at,
        phone: conv.fone || 'Não informado',
        contact_name: conv.Nome_Whatsapp,
        response_time_minutes: avgMinutes,
        response_time_formatted: timeFormatted
      })
    }

    if (responseTimes.length === 0) {
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_conversations: 0, details: [] }
    }

    const avgMinutes = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length

    // Formatar tempo (sempre com horas, minutos e segundos)
    const totalSeconds = Math.round(avgMinutes * 60)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    const formatted = `${hours}h ${minutes}min ${seconds}seg`

    // Log para debug
    console.log('\n📊 [KPI - Tempo Médio de Resposta] Estatísticas:')
    console.table({
      'Total de Conversas Analisadas': filteredConversations.length,
      'Conversas com Respostas': conversationResponseTimes.size,
      'Total de Pares Pergunta-Resposta': responseTimes.length,
      'Tempo Médio (min)': Math.round(avgMinutes * 10) / 10,
      'Tempo Médio Formatado': formatted
    })
    
    console.log('\n💡 ATENÇÃO: Para comparar com a tabela, o "Tempo Médio" deve ser calculado com a mesma lógica!')

    return {
      average_minutes: avgMinutes,
      formatted,
      total_conversations: conversationResponseTimes.size, // Número de conversas únicas, não de respostas
      details
    }
  } catch (err) {
    console.error('Erro ao calcular tempo médio de resposta:', err)
    return { average_minutes: 0, formatted: '0h 0min 0seg', total_conversations: 0, details: [] }
  }
}

/**
 * Tempo médio para primeiro contato humano após transferência
 * Calcula o tempo entre a primeira mudança de pipeline (transferência para vendedor)
 * e a primeira mensagem do atendente humano
 * 
 * REGRA IMPORTANTE:
 * - Se já existirem mensagens do atendente ANTES da mudança de pipeline, 
 *   o lead é IGNORADO no cálculo (contato pré-existente)
 * - Isso evita distorções quando o lead é criado DEPOIS da conversa ter iniciado
 * - Só calcula tempo para leads que realmente receberam o primeiro contato APÓS a transferência
 * 
 * OTIMIZADO: Busca todos os dados de uma vez e processa em memória
 */
export async function getAverageTimeToFirstProactiveContact(
  filters: AnalyticsFilters
): Promise<{ 
  average_minutes: number
  formatted: string
  total_leads: number
  details?: Array<{
    id: string
    lead_name?: string
    phone?: string
    contact_name?: string
    changed_at: string
    first_contact_time_minutes: number
    first_contact_time_formatted: string
  }>
}> {
  try {
    const empresaId = await getUserEmpresaId()

    // Buscar histórico de mudanças de pipeline no período
    let historyQuery = supabase
      .from('lead_pipeline_history')
      .select('lead_id, changed_at, pipeline_id')
      .eq('empresa_id', empresaId)
      .in('change_type', ['pipeline_changed', 'both_changed']) // Apenas mudanças de pipeline
      .order('changed_at', { ascending: false })
      .limit(ANALYTICS_LIMITS.PIPELINE_HISTORY)

    if (filters.period) {
      historyQuery = historyQuery
        .gte('changed_at', `${filters.period.start}T00:00:00`)
        .lte('changed_at', `${filters.period.end}T23:59:59`)
    }

    const { data: history, error: historyError } = await historyQuery

    if (historyError) {
      console.error('Erro ao buscar histórico:', historyError)
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_leads: 0 }
    }

    if (!history || history.length === 0) {
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_leads: 0 }
    }

    // Aplicar filtro de horário baseado no critério escolhido
    const chatFilters = filters as any
    const filterBy = chatFilters.filterBy || 'messages' // Padrão: mensagens
    
    let filteredHistory = history
    
    if (filterBy === 'lead_transfer' && chatFilters.timeRange) {
      // Filtrar pelo horário da transferência do lead
      filteredHistory = filterByTimeRange(
        history.map(h => ({ ...h, timestamp: h.changed_at })),
        chatFilters.timeRange
      ).map(h => ({ ...h, timestamp: undefined })) as typeof history
      
      console.log(`\n🔍 Filtro por Transferência: ${history.length} → ${filteredHistory.length} leads`)
    }

    if (filteredHistory.length === 0) {
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_leads: 0, details: [] }
    }

    // Agrupar por lead_id e pegar a primeira mudança de cada lead
    const leadFirstChanges = new Map<string, { changed_at: string; pipeline_id: string }>()
    
    // Ordenar por data (mais antiga primeiro) para cada lead
    const sortedHistory = [...filteredHistory].sort((a, b) => 
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    )
    
    for (const record of sortedHistory) {
      if (!leadFirstChanges.has(record.lead_id)) {
        leadFirstChanges.set(record.lead_id, {
          changed_at: record.changed_at,
          pipeline_id: record.pipeline_id
        })
      }
    }

    const leadIds = Array.from(leadFirstChanges.keys())

    // Buscar informações dos leads (nome e telefone)
    const { data: leadsData } = await supabase
      .from('leads')
      .select('id, name, phone')
      .in('id', leadIds)

    // Criar mapa de lead_id -> dados do lead
    const leadsMap = new Map<string, { name: string; phone: string }>()
    if (leadsData) {
      leadsData.forEach(lead => {
        leadsMap.set(lead.id, {
          name: lead.name || 'Sem nome',
          phone: lead.phone || 'Não informado'
        })
      })
    }

    // OTIMIZAÇÃO: Buscar TODAS as conversas dos leads de uma vez
    let conversationQuery = supabase
      .from('chat_conversations')
      .select('id, lead_id, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: true })

    // Aplicar filtro de instâncias se houver
    if (filters.instances && filters.instances.length > 0) {
      conversationQuery = conversationQuery.in('instance_id', filters.instances)
    }

    const { data: conversations } = await conversationQuery

    if (!conversations || conversations.length === 0) {
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_leads: 0, details: [] }
    }

    // OTIMIZAÇÃO: Buscar TODAS as mensagens inbound de uma vez
    // Importante: buscar TODAS as mensagens inbound, não só as posteriores à mudança
    const conversationIds = conversations.map(c => c.id)
    
    const { data: allMessages, error: msgError } = await supabase
      .from('chat_messages')
      .select('conversation_id, timestamp, direction')
      .in('conversation_id', conversationIds)
      .eq('direction', 'inbound')
      .order('timestamp', { ascending: true })

    if (msgError || !allMessages) {
      console.error('Erro ao buscar mensagens:', msgError)
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_leads: 0, details: [] }
    }

    // Aplicar filtro de horário nas mensagens se filterBy === 'messages'
    let filteredMessages = allMessages
    
    if (filterBy === 'messages' && chatFilters.timeRange) {
      filteredMessages = filterByTimeRange(allMessages, chatFilters.timeRange)
      console.log(`\n🔍 Filtro por Mensagens: ${allMessages.length} → ${filteredMessages.length} mensagens`)
    }

    // Agrupar conversas por lead_id
    const conversationsByLead = new Map<string, typeof conversations>()
    for (const conv of conversations) {
      if (!conv.lead_id) continue
      if (!conversationsByLead.has(conv.lead_id)) {
        conversationsByLead.set(conv.lead_id, [])
      }
      conversationsByLead.get(conv.lead_id)!.push(conv)
    }

    // Agrupar mensagens por conversation_id (usando mensagens filtradas)
    const messagesByConversation = new Map<string, typeof filteredMessages>()
    for (const msg of filteredMessages) {
      if (!messagesByConversation.has(msg.conversation_id)) {
        messagesByConversation.set(msg.conversation_id, [])
      }
      messagesByConversation.get(msg.conversation_id)!.push(msg)
    }

    const contactTimes: number[] = []
    const details: Array<{
      id: string
      lead_name?: string
      phone?: string
      contact_name?: string
      changed_at: string
      first_contact_time_minutes: number
      first_contact_time_formatted: string
    }> = []

    // Estatísticas para debug
    let totalLeadsAnalyzed = 0
    let leadsWithPreExistingContact = 0
    let leadsWithoutFirstMessage = 0
    let leadsCalculated = 0

    // Para cada lead, calcular tempo até primeira mensagem
    for (const [leadId, firstChange] of leadFirstChanges.entries()) {
      totalLeadsAnalyzed++
      
      const leadConversations = conversationsByLead.get(leadId)
      if (!leadConversations || leadConversations.length === 0) continue
      
      // MELHORIA: Verificar se já existem mensagens do atendente ANTES da mudança de pipeline
      let hasPreExistingContact = false
      
      for (const conv of leadConversations) {
        const messages = messagesByConversation.get(conv.id)
        if (!messages || messages.length === 0) continue

        // Verificar se há alguma mensagem inbound ANTES da mudança
        const msgBeforeChange = messages.find(
          m => new Date(m.timestamp) < new Date(firstChange.changed_at)
        )

        if (msgBeforeChange) {
          hasPreExistingContact = true
          break // Já encontramos contato prévio, não precisa continuar
        }
      }

      // Se já havia contato anterior, pular este lead (não calcular tempo)
      if (hasPreExistingContact) {
        leadsWithPreExistingContact++
        console.log(`Lead ${leadId}: Contato pré-existente antes da mudança de pipeline. Ignorado no cálculo.`)
        continue
      }
      
      // Buscar primeira mensagem inbound em QUALQUER conversa após a mudança
      let firstAttendantMsg: { timestamp: string } | null = null
      
      for (const conv of leadConversations) {
        const messages = messagesByConversation.get(conv.id)
        if (!messages || messages.length === 0) continue

        // Encontrar primeira mensagem APÓS a mudança de pipeline
        const msgAfterChange = messages.find(
          m => new Date(m.timestamp) >= new Date(firstChange.changed_at)
        )

        if (msgAfterChange) {
          // Se ainda não temos uma mensagem ou esta é mais antiga, usar esta
          if (!firstAttendantMsg || new Date(msgAfterChange.timestamp) < new Date(firstAttendantMsg.timestamp)) {
            firstAttendantMsg = msgAfterChange
          }
        }
      }

      if (!firstAttendantMsg) {
        leadsWithoutFirstMessage++
        continue
      }

      // Calcular diferença entre mudança de pipeline e primeira mensagem
      const diffMs = new Date(firstAttendantMsg.timestamp).getTime() - new Date(firstChange.changed_at).getTime()
      const diffMinutes = diffMs / (1000 * 60)
      
      // Só considerar tempos positivos e não outliers
      if (diffMinutes > 0 && diffMinutes < (ANALYTICS_LIMITS.MAX_PROACTIVE_CONTACT_DAYS * 24 * 60)) {
        leadsCalculated++
        contactTimes.push(diffMinutes)

        // Formatar tempo individual
        const totalSec = Math.round(diffMinutes * 60)
        const h = Math.floor(totalSec / 3600)
        const m = Math.floor((totalSec % 3600) / 60)
        const s = totalSec % 60
        const timeFormatted = `${h}h ${m}min ${s}seg`

        const leadInfo = leadsMap.get(leadId)
        
        details.push({
          id: leadId,
          lead_name: leadInfo?.name,
          phone: leadInfo?.phone,
          changed_at: firstChange.changed_at,
          first_contact_time_minutes: diffMinutes,
          first_contact_time_formatted: timeFormatted
        })
      }
    }

    // Log de estatísticas para análise
    console.log('\n📊 Estatísticas - Tempo Médio 1º Contato:')
    console.table({
      'Total de Leads Analisados': totalLeadsAnalyzed,
      'Leads com Contato Pré-existente (ignorados)': leadsWithPreExistingContact,
      'Leads sem Mensagem Posterior (ignorados)': leadsWithoutFirstMessage,
      'Leads Calculados com Sucesso': leadsCalculated,
      'Taxa de Aproveitamento': `${totalLeadsAnalyzed > 0 ? ((leadsCalculated / totalLeadsAnalyzed) * 100).toFixed(1) : 0}%`
    })

    if (contactTimes.length === 0) {
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_leads: 0, details: [] }
    }

    const avgMinutes = contactTimes.reduce((sum, time) => sum + time, 0) / contactTimes.length

    // Formatar tempo (sempre com horas, minutos e segundos)
    const totalSeconds = Math.round(avgMinutes * 60)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    const formatted = `${hours}h ${minutes}min ${seconds}seg`

    return {
      average_minutes: avgMinutes,
      formatted,
      total_leads: contactTimes.length,
      details
    }
  } catch (err) {
    console.error('Erro ao calcular tempo de primeiro contato humano:', err)
    return { average_minutes: 0, formatted: '0h 0min 0seg', total_leads: 0, details: [] }
  }
}

/**
 * Tempo médio para primeiro contato humano por instância
 * Calcula o tempo entre a primeira mudança de pipeline e a primeira mensagem
 * de cada instância (vendedor)
 * OTIMIZADO: Busca todos os dados de uma vez e agrupa em memória
 */
export async function getAverageTimeToFirstProactiveContactByInstance(
  filters: AnalyticsFilters
): Promise<Array<{ instance_name: string; average_minutes: number; formatted: string; leads_count: number }>> {
  try {
    const empresaId = await getUserEmpresaId()

    // Buscar histórico de mudanças de pipeline no período
    let historyQuery = supabase
      .from('lead_pipeline_history')
      .select('lead_id, changed_at, pipeline_id')
      .eq('empresa_id', empresaId)
      .in('change_type', ['pipeline_changed', 'both_changed'])
      .order('changed_at', { ascending: false })
      .limit(ANALYTICS_LIMITS.PIPELINE_HISTORY)

    if (filters.period) {
      historyQuery = historyQuery
        .gte('changed_at', `${filters.period.start}T00:00:00`)
        .lte('changed_at', `${filters.period.end}T23:59:59`)
    }

    const { data: history, error: historyError } = await historyQuery

    if (historyError) {
      console.error('Erro ao buscar histórico:', historyError)
      return []
    }

    if (!history || history.length === 0) {
      return []
    }

    // Aplicar filtro de horário baseado no critério escolhido
    const chatFilters = filters as any
    const filterBy = chatFilters.filterBy || 'messages' // Padrão: mensagens
    
    let filteredHistory = history
    
    if (filterBy === 'lead_transfer' && chatFilters.timeRange) {
      // Filtrar pelo horário da transferência do lead
      filteredHistory = filterByTimeRange(
        history.map(h => ({ ...h, timestamp: h.changed_at })),
        chatFilters.timeRange
      ).map(h => ({ ...h, timestamp: undefined })) as typeof history
      
      console.log(`\n🔍 [ByInstance] Filtro por Transferência: ${history.length} → ${filteredHistory.length} leads`)
    }

    if (filteredHistory.length === 0) {
      return []
    }

    // Agrupar por lead_id e pegar a primeira mudança de cada lead
    const leadFirstChanges = new Map<string, { changed_at: string; pipeline_id: string }>()
    
    const sortedHistory = [...filteredHistory].sort((a, b) => 
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    )
    
    for (const record of sortedHistory) {
      if (!leadFirstChanges.has(record.lead_id)) {
        leadFirstChanges.set(record.lead_id, {
          changed_at: record.changed_at,
          pipeline_id: record.pipeline_id
        })
      }
    }

    const leadIds = Array.from(leadFirstChanges.keys())

    // Buscar instâncias disponíveis
    let instanceQuery = supabase
      .from('whatsapp_instances')
      .select('id, name, display_name')
      .eq('empresa_id', empresaId)
      .order('name')

    // Aplicar filtro de instâncias se houver
    if (filters.instances && filters.instances.length > 0) {
      instanceQuery = instanceQuery.in('id', filters.instances)
    }

    const { data: instances } = await instanceQuery

    if (!instances || instances.length === 0) {
      return []
    }

    // OTIMIZAÇÃO: Buscar TODAS as conversas de TODOS os leads de uma vez
    const { data: conversations } = await supabase
      .from('chat_conversations')
      .select('id, lead_id, instance_id, created_at')
      .in('lead_id', leadIds)
      .in('instance_id', instances.map(i => i.id))
      .order('created_at', { ascending: true })

    if (!conversations || conversations.length === 0) {
      return []
    }

    // OTIMIZAÇÃO: Buscar TODAS as mensagens inbound de uma vez
    const conversationIds = conversations.map(c => c.id)
    
    const { data: allMessages, error: msgError } = await supabase
      .from('chat_messages')
      .select('conversation_id, timestamp, direction')
      .in('conversation_id', conversationIds)
      .eq('direction', 'inbound')
      .order('timestamp', { ascending: true })

    if (msgError || !allMessages) {
      console.error('Erro ao buscar mensagens:', msgError)
      return []
    }

    // Aplicar filtro de horário nas mensagens se filterBy === 'messages'
    let filteredMessages = allMessages
    
    if (filterBy === 'messages' && chatFilters.timeRange) {
      filteredMessages = filterByTimeRange(allMessages, chatFilters.timeRange)
      console.log(`\n🔍 [ByInstance] Filtro por Mensagens: ${allMessages.length} → ${filteredMessages.length} mensagens`)
    }

    // Agrupar conversas por lead_id e instance_id
    const conversationsByLeadAndInstance = new Map<string, typeof conversations>()
    for (const conv of conversations) {
      if (!conv.lead_id || !conv.instance_id) continue
      const key = `${conv.lead_id}_${conv.instance_id}`
      if (!conversationsByLeadAndInstance.has(key)) {
        conversationsByLeadAndInstance.set(key, [])
      }
      conversationsByLeadAndInstance.get(key)!.push(conv)
    }

    // Agrupar mensagens por conversation_id (usando mensagens filtradas)
    const messagesByConversation = new Map<string, typeof filteredMessages>()
    for (const msg of filteredMessages) {
      if (!messagesByConversation.has(msg.conversation_id)) {
        messagesByConversation.set(msg.conversation_id, [])
      }
      messagesByConversation.get(msg.conversation_id)!.push(msg)
    }

    const results: Array<{ instance_name: string; average_minutes: number; formatted: string; leads_count: number }> = []

    // Para cada instância, calcular tempo médio
    for (const instance of instances) {
      const contactTimes: number[] = []

      // Para cada lead que mudou de pipeline
      for (const [leadId, firstChange] of leadFirstChanges.entries()) {
        const key = `${leadId}_${instance.id}`
        const leadConversations = conversationsByLeadAndInstance.get(key)
        
        if (!leadConversations || leadConversations.length === 0) continue
        
        // MELHORIA: Verificar se já existem mensagens do atendente ANTES da mudança de pipeline
        let hasPreExistingContact = false
        
        for (const conv of leadConversations) {
          const messages = messagesByConversation.get(conv.id)
          if (!messages || messages.length === 0) continue

          // Verificar se há alguma mensagem inbound ANTES da mudança
          const msgBeforeChange = messages.find(
            m => new Date(m.timestamp) < new Date(firstChange.changed_at)
          )

          if (msgBeforeChange) {
            hasPreExistingContact = true
            break // Já encontramos contato prévio, não precisa continuar
          }
        }

        // Se já havia contato anterior, pular este lead (não calcular tempo)
        if (hasPreExistingContact) {
          continue
        }
        
        // Buscar primeira mensagem inbound em QUALQUER conversa após a mudança
        let firstAttendantMsg: { timestamp: string } | null = null
        
        for (const conv of leadConversations) {
          const messages = messagesByConversation.get(conv.id)
          if (!messages || messages.length === 0) continue

          // Encontrar primeira mensagem APÓS a mudança de pipeline
          const msgAfterChange = messages.find(
            m => new Date(m.timestamp) >= new Date(firstChange.changed_at)
          )

          if (msgAfterChange) {
            // Se ainda não temos uma mensagem ou esta é mais antiga, usar esta
            if (!firstAttendantMsg || new Date(msgAfterChange.timestamp) < new Date(firstAttendantMsg.timestamp)) {
              firstAttendantMsg = msgAfterChange
            }
          }
        }

        if (!firstAttendantMsg) continue

        // Calcular diferença
        const diffMs = new Date(firstAttendantMsg.timestamp).getTime() - new Date(firstChange.changed_at).getTime()
        const diffMinutes = diffMs / (1000 * 60)
        
        // Filtrar outliers
        if (diffMinutes > 0 && diffMinutes < (ANALYTICS_LIMITS.MAX_PROACTIVE_CONTACT_DAYS * 24 * 60)) {
          contactTimes.push(diffMinutes)
        }
      }

      if (contactTimes.length > 0) {
        const avgMinutes = contactTimes.reduce((sum, time) => sum + time, 0) / contactTimes.length

        // Formatar tempo
        const totalSeconds = Math.round(avgMinutes * 60)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        
        const formatted = `${hours}h ${minutes}min ${seconds}seg`

        results.push({
          instance_name: instance.display_name || instance.name,
          average_minutes: avgMinutes,
          formatted,
          leads_count: contactTimes.length
        })
      }
    }

    // Log para debug
    console.log('\n📊 [Tempo Médio 1º Contato por Instância]:')
    console.table(results.map(r => ({
      'Instância': r.instance_name,
      'Leads': r.leads_count,
      'Tempo Médio': r.formatted,
      'Minutos': Math.round(r.average_minutes * 10) / 10
    })))

    const totalLeads = results.reduce((sum, r) => sum + r.leads_count, 0)
    console.log(`\n✅ Total de leads nas tabelas: ${totalLeads}`)

    return results.sort((a, b) => a.average_minutes - b.average_minutes)
  } catch (err) {
    console.error('Erro ao calcular tempo de primeiro contato por instância:', err)
    return []
  }
}

// =====================================================
// UTILITÁRIOS DE CACHE
// =====================================================

/**
 * Invalidar todo o cache de analytics
 * Usar quando houver mudanças significativas nos dados (ex: novo lead, lead movido, etc)
 */
export function invalidateAnalyticsCache(): void {
  cacheService.invalidateAllAnalytics()
}

/**
 * Invalidar cache específico de leads
 */
export function invalidateLeadsCache(): void {
  cacheService.invalidateType('analytics_pipeline')
  cacheService.invalidateType('analytics_stage')
  cacheService.invalidateType('analytics_origin')
  cacheService.invalidateType('analytics_stats')
  cacheService.invalidateType('analytics_funnel')
  cacheService.invalidateType('analytics_timeseries')
  cacheService.invalidateType('analytics_conversion_detailed')
  cacheService.invalidateType('analytics_stage_time')
  cacheService.invalidateType('analytics_pipeline_funnel')
}

export function invalidateSalesCache(): void {
  console.log('🗑️ Cache de analytics de vendas invalidado')
  cacheService.invalidateType('analytics_sales_origin')
  cacheService.invalidateType('analytics_sales_responsible')
  cacheService.invalidateType('analytics_sales_stats')
  cacheService.invalidateType('analytics_sales_over_time_day')
  cacheService.invalidateType('analytics_sales_over_time_week')
  cacheService.invalidateType('analytics_sales_over_time_month')
}

export function invalidateLossesCache(): void {
  console.log('🗑️ Cache de analytics de perdas invalidado')
  cacheService.invalidateType('analytics_losses_origin')
  cacheService.invalidateType('analytics_losses_responsible')
  cacheService.invalidateType('analytics_losses_reason')
  cacheService.invalidateType('analytics_losses_stats')
  cacheService.invalidateType('analytics_losses_over_time_day')
  cacheService.invalidateType('analytics_losses_over_time_week')
  cacheService.invalidateType('analytics_losses_over_time_month')
}

// =====================================================
// EVOLUÇÃO DE VENDAS NO TEMPO
// =====================================================

export async function getSalesOverTime(
  filters: import('../types').SalesAnalyticsFilters,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<TimeSeriesPoint[]> {
  return useCachedQuery(`analytics_sales_over_time_${groupBy}`, filters, async () => {
    const empresaId = await getUserEmpresaId()

    let query = supabase
      .from('leads')
      .select('sold_at, sold_value, status, pipeline_id, origin')
      .eq('empresa_id', empresaId)
      .eq('status', 'venda_confirmada')
      .not('sold_at', 'is', null)

    // Aplicar filtro de período (por sold_at)
    if (filters.period) {
      query = query
        .gte('sold_at', `${filters.period.start}T00:00:00`)
        .lte('sold_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtros
    if (filters.pipelines && filters.pipelines.length > 0) {
      query = query.in('pipeline_id', filters.pipelines)
    }

    if (filters.origins && filters.origins.length > 0) {
      query = query.in('origin', filters.origins)
    }

    const { data, error } = await fetchAllRows(query.order('sold_at', { ascending: true }))

    if (error) {
      console.error('Erro ao buscar vendas ao longo do tempo:', error)
      throw new Error('Erro ao buscar evolução de vendas')
    }

    if (!data || data.length === 0) {
      return []
    }

    // Agrupar por período
    const grouped = data.reduce((acc: any, lead: any) => {
      const date = new Date(lead.sold_at)
      let key: string

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]
      } else if (groupBy === 'week') {
        const weekNum = getWeekNumber(date)
        key = `${date.getUTCFullYear()}-W${weekNum}`
      } else {
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      }

      if (!acc[key]) {
        acc[key] = { date: key, value: 0, total_value: 0 }
      }
      acc[key].value++
      acc[key].total_value += lead.sold_value || 0

      return acc
    }, {})

    return Object.values(grouped).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    ) as TimeSeriesPoint[]
  })
}

// =====================================================
// EVOLUÇÃO DE PERDAS NO TEMPO
// =====================================================

export async function getLossesOverTime(
  filters: import('../types').SalesAnalyticsFilters,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<TimeSeriesPoint[]> {
  return useCachedQuery(`analytics_losses_over_time_${groupBy}`, filters, async () => {
    const empresaId = await getUserEmpresaId()

    let query = supabase
      .from('leads')
      .select('created_at, value, status, pipeline_id, origin')
      .eq('empresa_id', empresaId)
      .eq('status', 'perdido')

    // Aplicar filtro de período (por created_at)
    if (filters.period) {
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtros
    if (filters.pipelines && filters.pipelines.length > 0) {
      query = query.in('pipeline_id', filters.pipelines)
    }

    if (filters.origins && filters.origins.length > 0) {
      query = query.in('origin', filters.origins)
    }

    const { data, error } = await fetchAllRows(query.order('created_at', { ascending: true }))

    if (error) {
      console.error('Erro ao buscar perdas ao longo do tempo:', error)
      throw new Error('Erro ao buscar evolução de perdas')
    }

    if (!data || data.length === 0) {
      return []
    }

    // Agrupar por período
    const grouped = data.reduce((acc: any, lead: any) => {
      const date = new Date(lead.created_at)
      let key: string

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]
      } else if (groupBy === 'week') {
        const weekNum = getWeekNumber(date)
        key = `${date.getUTCFullYear()}-W${weekNum}`
      } else {
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      }

      if (!acc[key]) {
        acc[key] = { date: key, value: 0, total_value: 0 }
      }
      acc[key].value++
      acc[key].total_value += lead.value || 0

      return acc
    }, {})

    return Object.values(grouped).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    ) as TimeSeriesPoint[]
  })
}

// =====================================================
// ESTATÍSTICAS DE PERDAS
// =====================================================

export async function getLossesStats(
  filters: import('../types').SalesAnalyticsFilters
): Promise<{
  total_losses: number
  losses_value: number
  average_ticket: number
}> {
  console.log('📊 [getLossesStats] CHAMADA INICIADA - Filtros:', filters)
  
  return useCachedQuery('analytics_losses_stats', filters, async () => {
    console.log('📊 [getLossesStats] EXECUTANDO QUERY')
    const empresaId = await getUserEmpresaId()

    let query = supabase
      .from('leads')
      .select('id, value, status, pipeline_id, origin, created_at')
      .eq('empresa_id', empresaId)
      .eq('status', 'perdido')

    // Aplicar filtro de período (por created_at - data de criação do lead)
    if (filters.period) {
      console.log('📊 [getLossesStats] Período de perdas:', filters.period)
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtros
    if (filters.pipelines && filters.pipelines.length > 0) {
      query = query.in('pipeline_id', filters.pipelines)
    }

    if (filters.origins && filters.origins.length > 0) {
      query = query.in('origin', filters.origins)
    }

    if (filters.responsibles && filters.responsibles.length > 0) {
      console.log('📊 [getSalesStats] Aplicando filtro de responsáveis:', filters.responsibles)
      query = query.in('responsible_uuid', filters.responsibles)
    }

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('❌ [getLossesStats] Erro:', error)
      throw new Error('Erro ao buscar estatísticas de perdas')
    }

    console.log('📊 [getLossesStats] Perdas encontradas:', data?.length)

    const totalLosses = data?.length || 0
    const lossesValue = data?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0
    const averageTicket = totalLosses > 0 ? lossesValue / totalLosses : 0

    console.log('📊 [getLossesStats] Resultado:', {
      total_losses: totalLosses,
      losses_value: lossesValue,
      average_ticket: averageTicket
    })

    return {
      total_losses: totalLosses,
      losses_value: lossesValue,
      average_ticket: averageTicket
    }
  })
}

export async function getLossesByOrigin(
  filters: import('../types').SalesAnalyticsFilters
): Promise<LeadsByOriginResult[]> {
  console.log('📊 [getLossesByOrigin] CHAMADA INICIADA - Filtros recebidos:', filters)
  
  return useCachedQuery('analytics_losses_origin', filters, async () => {
    console.log('📊 [getLossesByOrigin] EXECUTANDO QUERY (não veio do cache)')
    const empresaId = await getUserEmpresaId()

    let query = supabase
      .from('leads')
      .select('origin, value, status, created_at, pipeline_id')
      .eq('empresa_id', empresaId)
      .eq('status', 'perdido')

    // Aplicar filtro de período (por created_at)
    if (filters.period) {
      console.log('📊 [getLossesByOrigin] Aplicando filtro de período:', filters.period)
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtro de pipelines
    if (filters.pipelines && filters.pipelines.length > 0) {
      console.log('📊 [getLossesByOrigin] Aplicando filtro de pipelines:', filters.pipelines)
      query = query.in('pipeline_id', filters.pipelines)
    }

    // Aplicar filtro de origens
    if (filters.origins && filters.origins.length > 0) {
      console.log('📊 [getLossesByOrigin] Aplicando filtro de origens:', filters.origins)
      query = query.in('origin', filters.origins)
    }

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('❌ [getLossesByOrigin] Erro ao buscar perdas por origem:', error)
      throw new Error('Erro ao buscar perdas por origem')
    }

    console.log('📊 [getLossesByOrigin] Dados retornados:', data?.length, 'perdas')

    if (!data || data.length === 0) {
      console.log('⚠️ [getLossesByOrigin] Nenhuma perda encontrada')
      return []
    }

    // Agrupar por chave normalizada (olx, Olx, OLX → uma única linha)
    const grouped = data.reduce((acc: any, lead: any) => {
      const rawOrigin = lead.origin || ORIGIN_NAO_INFORMADO
      const key = normalizeOriginKey(rawOrigin)
      if (!acc[key]) {
        acc[key] = { origin: rawOrigin, count: 0, total_value: 0 }
      }
      acc[key].count++
      acc[key].total_value += lead.value || 0
      return acc
    }, {})

    const results: LeadsByOriginResult[] = Object.values(grouped)
    const totalLosses = results.reduce((sum, r: any) => sum + r.count, 0)

    return results.map((r: any) => ({
      ...r,
      percentage: totalLosses > 0 ? (r.count / totalLosses) * 100 : 0,
      average_value: r.count > 0 ? r.total_value / r.count : 0
    })).sort((a, b) => b.count - a.count)
  })
}

export async function getLossesByResponsible(
  filters: import('../types').SalesAnalyticsFilters
): Promise<any[]> {
  console.log('📊 [getLossesByResponsible] CHAMADA INICIADA - Filtros recebidos:', filters)
  
  return useCachedQuery('analytics_losses_responsible', filters, async () => {
    console.log('📊 [getLossesByResponsible] EXECUTANDO QUERY (não veio do cache)')
    const empresaId = await getUserEmpresaId()

    let query = supabase
      .from('leads')
      .select(`
        responsible_uuid,
        value,
        status,
        created_at,
        pipeline_id,
        origin,
        profiles:responsible_uuid (
          full_name
        )
      `)
      .eq('empresa_id', empresaId)
      .eq('status', 'perdido')

    // Aplicar filtro de período (por created_at)
    if (filters.period) {
      console.log('📊 [getLossesByResponsible] Aplicando filtro de período:', filters.period)
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtro de pipelines
    if (filters.pipelines && filters.pipelines.length > 0) {
      console.log('📊 [getLossesByResponsible] Aplicando filtro de pipelines:', filters.pipelines)
      query = query.in('pipeline_id', filters.pipelines)
    }

    // Aplicar filtro de origens
    if (filters.origins && filters.origins.length > 0) {
      console.log('📊 [getLossesByResponsible] Aplicando filtro de origens:', filters.origins)
      query = query.in('origin', filters.origins)
    }

    // Aplicar filtro de responsáveis
    if (filters.responsibles && filters.responsibles.length > 0) {
      console.log('📊 [getLossesByResponsible] Aplicando filtro de responsáveis:', filters.responsibles)
      query = query.in('responsible_uuid', filters.responsibles)
    }

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('❌ [getLossesByResponsible] Erro ao buscar perdas por responsável:', error)
      throw new Error('Erro ao buscar perdas por responsável')
    }

    console.log('📊 [getLossesByResponsible] Dados retornados:', data?.length, 'perdas')

    if (!data || data.length === 0) {
      console.log('⚠️ [getLossesByResponsible] Nenhuma perda encontrada')
      return []
    }

    // Agrupar por responsável
    const grouped = data.reduce((acc: any, lead: any) => {
      const responsibleId = lead.responsible_uuid || 'sem_responsavel'
      const responsibleName = lead.profiles?.full_name || 'Sem responsável'
      
      if (!acc[responsibleId]) {
        acc[responsibleId] = {
          responsible_uuid: responsibleId,
          responsible_name: responsibleName,
          count: 0,
          total_value: 0
        }
      }
      acc[responsibleId].count++
      acc[responsibleId].total_value += lead.value || 0
      return acc
    }, {})

    const results = Object.values(grouped)
    const totalLosses = results.reduce((sum: number, r: any) => sum + r.count, 0)

    return results.map((r: any) => ({
      ...r,
      percentage: totalLosses > 0 ? (r.count / totalLosses) * 100 : 0,
      average_value: r.count > 0 ? r.total_value / r.count : 0
    })).sort((a: any, b: any) => b.count - a.count)
  })
}

// =====================================================
// PERDAS POR MOTIVO
// =====================================================

export interface LossesByReasonResult {
  reason_id: string
  reason_name: string
  count: number
  total_value: number
  percentage: number
  average_value: number
}

export async function getLossesByReason(
  filters: import('../types').SalesAnalyticsFilters
): Promise<LossesByReasonResult[]> {
  console.log('📊 [getLossesByReason] CHAMADA INICIADA - Filtros recebidos:', filters)
  
  return useCachedQuery('analytics_losses_reason', filters, async () => {
    console.log('📊 [getLossesByReason] EXECUTANDO QUERY (não veio do cache)')
    const empresaId = await getUserEmpresaId()
    const { LOSS_REASON_MAP } = await import('../utils/constants')

    // Buscar motivos do banco para mapeamento
    const { data: allLossReasons } = await supabase
      .from('loss_reasons')
      .select('id, name')
      .eq('empresa_id', empresaId)
      .eq('is_active', true)
    
    // Criar mapa de IDs para nomes
    const lossReasonsMap = new Map<string, string>()
    if (allLossReasons) {
      allLossReasons.forEach(reason => {
        lossReasonsMap.set(reason.id, reason.name)
      })
    }

    // Buscar leads perdidos (sem JOIN para evitar erro com valores antigos)
    let query = supabase
      .from('leads')
      .select(`
        loss_reason_category,
        value,
        status,
        created_at,
        pipeline_id,
        origin
      `)
      .eq('empresa_id', empresaId)
      .eq('status', 'perdido')
      .not('loss_reason_category', 'is', null)

    // Aplicar filtro de período (por created_at)
    if (filters.period) {
      console.log('📊 [getLossesByReason] Aplicando filtro de período:', filters.period)
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtro de pipelines
    if (filters.pipelines && filters.pipelines.length > 0) {
      console.log('📊 [getLossesByReason] Aplicando filtro de pipelines:', filters.pipelines)
      query = query.in('pipeline_id', filters.pipelines)
    }

    // Aplicar filtro de origens
    if (filters.origins && filters.origins.length > 0) {
      console.log('📊 [getLossesByReason] Aplicando filtro de origens:', filters.origins)
      query = query.in('origin', filters.origins)
    }

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('❌ [getLossesByReason] Erro ao buscar perdas por motivo:', error)
      throw new Error('Erro ao buscar perdas por motivo')
    }

    console.log('📊 [getLossesByReason] Dados retornados:', data?.length, 'perdas')

    if (!data || data.length === 0) {
      console.log('⚠️ [getLossesByReason] Nenhuma perda encontrada')
      return []
    }

    // Agrupar por motivo
    const grouped = data.reduce((acc: any, lead: any) => {
      const reasonId = lead.loss_reason_category || 'sem_motivo'
      
      // Determinar nome do motivo
      let reasonName = 'Sem motivo informado'
      
      // Verificar se é UUID (novo sistema)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reasonId)
      
      if (isUUID && lossReasonsMap.has(reasonId)) {
        // Novo sistema: buscar nome do mapa
        reasonName = lossReasonsMap.get(reasonId) || reasonId
      } else if (reasonId in LOSS_REASON_MAP) {
        // Sistema antigo: usar mapeamento
        reasonName = LOSS_REASON_MAP[reasonId as keyof typeof LOSS_REASON_MAP]
      } else {
        // Fallback: usar o próprio valor ou "Não informado"
        reasonName = reasonId || 'Não informado'
      }
      
      if (!acc[reasonId]) {
        acc[reasonId] = {
          reason_id: reasonId,
          reason_name: reasonName,
          count: 0,
          total_value: 0
        }
      }
      acc[reasonId].count++
      acc[reasonId].total_value += lead.value || 0
      return acc
    }, {})

    const results: LossesByReasonResult[] = Object.values(grouped)
    const totalLosses = results.reduce((sum, r: any) => sum + r.count, 0)

    return results.map((r: any) => ({
      ...r,
      percentage: totalLosses > 0 ? (r.count / totalLosses) * 100 : 0,
      average_value: r.count > 0 ? r.total_value / r.count : 0
    })).sort((a, b) => b.count - a.count)
  })
}

// =====================================================
// ESTATÍSTICAS DE VENDAS
// =====================================================

export async function getSalesStats(
  filters: import('../types').SalesAnalyticsFilters
): Promise<{
  total_sales: number
  sales_value: number
  average_ticket: number
}> {
  console.log('📊 [getSalesStats] CHAMADA INICIADA - Filtros:', filters)
  
  return useCachedQuery('analytics_sales_stats', filters, async () => {
    console.log('📊 [getSalesStats] EXECUTANDO QUERY')
    const empresaId = await getUserEmpresaId()
    const normalizedResponsibles = Array.isArray(filters.responsibles)
      ? filters.responsibles
      : (filters.responsibles ? [filters.responsibles as unknown as string] : [])

    let query = supabase
      .from('leads')
      .select('id, sold_value, status, sold_at, pipeline_id, origin, responsible_uuid')
      .eq('empresa_id', empresaId)
      .eq('status', 'venda_confirmada')
      .not('sold_at', 'is', null)

    // Aplicar filtro de período (por sold_at)
    if (filters.period) {
      console.log('📊 [getSalesStats] Período de vendas:', filters.period)
      query = query
        .gte('sold_at', `${filters.period.start}T00:00:00`)
        .lte('sold_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtros
    if (filters.pipelines && filters.pipelines.length > 0) {
      query = query.in('pipeline_id', filters.pipelines)
    }

    if (filters.origins && filters.origins.length > 0) {
      query = query.in('origin', filters.origins)
    }

    if (normalizedResponsibles.length > 0) {
      console.log('📊 [getSalesStats] Aplicando filtro de responsáveis:', normalizedResponsibles)
      query = query.in('responsible_uuid', normalizedResponsibles)
    }

    const { data, error } = await fetchAllRows(query)

    if (error) {
      console.error('❌ [getSalesStats] Erro:', error)
      throw new Error('Erro ao buscar estatísticas de vendas')
    }

    console.log('📊 [getSalesStats] Vendas encontradas:', data?.length)

    const totalSales = data?.length || 0
    const salesValue = data?.reduce((sum, lead) => sum + (lead.sold_value || 0), 0) || 0
    const averageTicket = totalSales > 0 ? salesValue / totalSales : 0

    console.log('📊 [getSalesStats] Resultado:', {
      total_sales: totalSales,
      sales_value: salesValue,
      average_ticket: averageTicket
    })

    return {
      total_sales: totalSales,
      sales_value: salesValue,
      average_ticket: averageTicket
    }
  })
}

/**
 * Invalidar cache específico de chat
 */
export function invalidateChatCache(): void {
  cacheService.invalidateType('analytics_chat')
  cacheService.invalidateType('analytics_chat_response')
  cacheService.invalidateType('analytics_chat_proactive')
}

/**
 * Obter estatísticas do cache
 */
export function getAnalyticsCacheStats() {
  return cacheService.getStats()
}

/**
 * Tempo médio do primeiro atendimento por instância
 * OTIMIZADO: Busca todas as conversas e mensagens de uma vez, depois agrupa
 */
export async function getAverageFirstResponseTimeByInstance(
  filters: AnalyticsFilters
): Promise<Array<{ instance_name: string; average_minutes: number; formatted: string; conversations_count: number }>> {
  try {
    const empresaId = await getUserEmpresaId()

    // Buscar todas as instâncias da empresa (ou filtradas)
    let instanceQuery = supabase
      .from('whatsapp_instances')
      .select('id, name, display_name')
      .eq('empresa_id', empresaId)

    // Aplicar filtro de instâncias
    if (filters.instances && filters.instances.length > 0) {
      instanceQuery = instanceQuery.in('id', filters.instances)
    }

    const { data: instances, error: instError } = await instanceQuery

    if (instError) {
      console.error('Erro ao buscar instâncias:', instError)
      return []
    }

    if (!instances || instances.length === 0) {
      return []
    }

    // OTIMIZAÇÃO: Buscar TODAS as conversas de TODAS as instâncias de uma vez
    let conversationQuery = supabase
      .from('chat_conversations')
      .select('id, created_at, instance_id')
      .eq('empresa_id', empresaId)
      .in('instance_id', instances.map(i => i.id))

    if (filters.period) {
      conversationQuery = conversationQuery
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }
    
    conversationQuery = conversationQuery
      .order('created_at', { ascending: false })
      .limit(ANALYTICS_LIMITS.CONVERSATIONS_RESPONSE_TIME_BY_INSTANCE) // Limite maior já que estamos buscando para múltiplas instâncias

    const { data: conversations } = await conversationQuery

    if (!conversations || conversations.length === 0) {
      return []
    }

    // Aplicar filtro de horário nas conversas (sempre que timeRange existir)
    const chatFilters = filters as any
    
    const filteredConversations = filterByTimeRange(conversations, chatFilters.timeRange)
    console.log(`🔍 [ByInstance] Filtro por horário de conversas: ${conversations.length} → ${filteredConversations.length}`)

    if (filteredConversations.length === 0) {
      return []
    }

    // OTIMIZAÇÃO: Buscar TODAS as mensagens de uma só vez
    const conversationIds = filteredConversations.map(c => c.id)
    
    const { data: allMessages, error: msgError } = await supabase
      .from('chat_messages')
      .select('conversation_id, timestamp, direction')
      .in('conversation_id', conversationIds)
      .order('timestamp', { ascending: true })

    if (msgError || !allMessages) {
      console.error('Erro ao buscar mensagens:', msgError)
      return []
    }

    // Aplicar filtro de horário nas mensagens (sempre que timeRange existir)
    const filteredMessages = filterByTimeRange(allMessages, chatFilters.timeRange)
    console.log(`🔍 [ByInstance] Filtro por horário de mensagens: ${allMessages.length} → ${filteredMessages.length}`)

    // Agrupar mensagens por conversa (usando mensagens filtradas)
    const messagesByConversation = new Map<string, typeof filteredMessages>()
    for (const msg of filteredMessages) {
      if (!messagesByConversation.has(msg.conversation_id)) {
        messagesByConversation.set(msg.conversation_id, [])
      }
      messagesByConversation.get(msg.conversation_id)!.push(msg)
    }

    // Calcular tempos por instância
    const results = []
    const debugInfo: any[] = [] // Para logs detalhados

    for (const instance of instances) {
      // Filtrar conversas desta instância (usando conversas filtradas)
      const instanceConversations = filteredConversations.filter(c => c.instance_id === instance.id)
      
      if (instanceConversations.length === 0) {
        continue
      }

      const responseTimes: number[] = []
      const conversationsWithResponses = new Set<string>() // Para contar conversas únicas

      for (const conv of instanceConversations) {
        const messages = messagesByConversation.get(conv.id)
        if (!messages || messages.length === 0) continue

        let hasResponse = false

        // Calcular tempo de TODAS as respostas, não apenas a primeira
        for (let i = 0; i < messages.length - 1; i++) {
          const currentMsg = messages[i]
          
          // Se é mensagem do cliente (outbound)
          if (currentMsg.direction === 'outbound') {
            // Procurar a próxima mensagem do atendente (inbound)
            const nextResponse = messages.slice(i + 1).find(m => m.direction === 'inbound')
            
            if (nextResponse) {
              const diffMs = new Date(nextResponse.timestamp).getTime() - new Date(currentMsg.timestamp).getTime()
              const diffMinutes = diffMs / (1000 * 60)
              
              // Filtrar outliers
              if (diffMinutes > 0 && diffMinutes < (ANALYTICS_LIMITS.MAX_RESPONSE_TIME_DAYS * 24 * 60)) {
                responseTimes.push(diffMinutes)
                hasResponse = true
              }
            }
          }
        }

        // Se esta conversa teve pelo menos uma resposta, adicionar ao Set
        if (hasResponse) {
          conversationsWithResponses.add(conv.id)
        }
      }

      if (responseTimes.length === 0) {
        continue
      }

      const avgMinutes = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length

      // Formatar tempo
      const totalSeconds = Math.round(avgMinutes * 60)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      
      const formatted = `${hours}h ${minutes}min ${seconds}seg`

      results.push({
        instance_name: instance.display_name || instance.name,
        average_minutes: avgMinutes,
        formatted,
        conversations_count: conversationsWithResponses.size // Número de conversas únicas, não de respostas
      })

      // Guardar info para debug
      debugInfo.push({
        instance: instance.display_name || instance.name,
        conversas_totais: instanceConversations.length,
        conversas_com_resposta: conversationsWithResponses.size,
        pares_resposta: responseTimes.length,
        tempo_medio_min: Math.round(avgMinutes * 10) / 10
      })
    }

    // Log para debug detalhado
    console.log('\n📊 [Tempo Médio de Resposta por Instância] - Detalhado:')
    console.table(debugInfo)

    const totalConversations = results.reduce((sum, r) => sum + r.conversations_count, 0)
    const totalResponsePairs = debugInfo.reduce((sum, d) => sum + d.pares_resposta, 0)
    const globalAvg = totalResponsePairs > 0 
      ? debugInfo.reduce((sum, d) => sum + (d.pares_resposta * d.tempo_medio_min), 0) / totalResponsePairs
      : 0
    
    console.log('\n📊 Comparação - Tabela vs KPI:')
    console.table({
      'Conversas nas Tabelas (soma)': totalConversations,
      'Conversas Filtradas (total)': filteredConversations.length,
      'Pares Resposta (soma tabelas)': totalResponsePairs,
      'Tempo Médio Ponderado': `${Math.round(globalAvg * 10) / 10} min`
    })
    
    console.log('\n⚠️ Se "Conversas nas Tabelas" < "Conversas Filtradas", algumas conversas não têm instance_id!')

    return results.sort((a, b) => a.average_minutes - b.average_minutes)
  } catch (err) {
    console.error('Erro ao calcular tempo médio por instância:', err)
    return []
  }
}

// =====================================================
// MÉTRICAS: FUNIL DE CONVERSÃO POR PIPELINE
// =====================================================

export async function getPipelineFunnel(
  filters: AnalyticsFilters
): Promise<import('../types').PipelineFunnelData[]> {
  return useCachedQuery('analytics_pipeline_funnel', filters, async () => {
    const empresaId = await getUserEmpresaId()

    // Buscar todos os leads no período com suas posições atuais e histórico
    let query = supabase
      .from('leads')
      .select(`
        id,
        pipeline_id,
        stage_id,
        status,
        created_at,
        pipelines(id, name),
        stages(id, name, position)
      `)
      .eq('empresa_id', empresaId)

    // Aplicar filtros de pipeline
    if (filters.pipelines && filters.pipelines.length > 0) {
      query = query.in('pipeline_id', filters.pipelines)
    }

    // Filtrar por período de criação
    if (filters.period) {
      query = query
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    const { data: leads, error } = await fetchAllRows(query)

    if (error) {
      console.error('Erro ao buscar leads para funil:', error)
      return []
    }

    if (!leads || leads.length === 0) {
      return []
    }

    // Buscar histórico para saber por quais estágios cada lead passou
    const leadIds = leads.map(l => l.id)
    const { data: history } = await fetchAllRows(
      supabase
        .from('lead_pipeline_history')
        .select('lead_id, stage_id, previous_stage_id, changed_at, change_type')
        .eq('empresa_id', empresaId)
        .in('lead_id', leadIds)
        .order('lead_id')
        .order('changed_at', { ascending: true })
    )

    // Buscar todos os estágios para ter informações completas
    const pipelineIds = [...new Set(leads.map(l => l.pipeline_id))]
    const { data: allStages } = await supabase
      .from('stages')
      .select('id, name, position, pipeline_id')
      .in('pipeline_id', pipelineIds)
      .order('position', { ascending: true })

    if (!allStages || allStages.length === 0) {
      return []
    }

    // Agrupar por pipeline
    const pipelineMap = new Map<string, {
      name: string
      stages: Map<string, { id: string, name: string, position: number, leads: Set<string> }>
      allLeads: Set<string>
      vendas: Set<string>
      perdas: Set<string>
    }>()

    // Inicializar estrutura de pipelines
    leads.forEach(lead => {
      if (!pipelineMap.has(lead.pipeline_id)) {
        const pipelineName = (lead.pipelines as any)?.name || 'Pipeline'
        pipelineMap.set(lead.pipeline_id, {
          name: pipelineName,
          stages: new Map(),
          allLeads: new Set(),
          vendas: new Set(),
          perdas: new Set()
        })
      }
      pipelineMap.get(lead.pipeline_id)!.allLeads.add(lead.id)
      
      // Contar vendas e perdas
      if (lead.status === 'venda_confirmada') {
        pipelineMap.get(lead.pipeline_id)!.vendas.add(lead.id)
      } else if (lead.status === 'perdido') {
        pipelineMap.get(lead.pipeline_id)!.perdas.add(lead.id)
      }
    })

    // Inicializar estágios de cada pipeline
    allStages.forEach(stage => {
      const pipeline = pipelineMap.get(stage.pipeline_id)
      if (pipeline) {
        pipeline.stages.set(stage.id, {
          id: stage.id,
          name: stage.name,
          position: stage.position,
          leads: new Set()
        })
      }
    })

    // Mapear quais leads passaram por quais estágios (usando histórico)
    const leadStages = new Map<string, Set<string>>()
    
    if (history && history.length > 0) {
      history.forEach(h => {
        if (!leadStages.has(h.lead_id)) {
          leadStages.set(h.lead_id, new Set())
        }
        if (h.stage_id) {
          leadStages.get(h.lead_id)!.add(h.stage_id)
        }
        if (h.previous_stage_id) {
          leadStages.get(h.lead_id)!.add(h.previous_stage_id)
        }
      })
    }

    // Para leads sem histórico, usar estágio atual
    leads.forEach(lead => {
      if (!leadStages.has(lead.id) || leadStages.get(lead.id)!.size === 0) {
        leadStages.set(lead.id, new Set([lead.stage_id]))
      }
    })

    // Adicionar leads apenas aos estágios que realmente visitaram (sem preencher intermediários)
    leads.forEach(lead => {
      const pipeline = pipelineMap.get(lead.pipeline_id)
      if (pipeline) {
        const visitedStages = leadStages.get(lead.id) || new Set<string>()
        visitedStages.forEach((stageId: string) => {
          const stage = pipeline.stages.get(stageId)
          if (stage) {
            stage.leads.add(lead.id)
          }
        })
      }
    })

    // Construir resultados
    const results: import('../types').PipelineFunnelData[] = []

    for (const [pipelineId, pipeline] of pipelineMap.entries()) {
      // Ordenar estágios por posição
      const sortedStages = Array.from(pipeline.stages.values())
        .sort((a, b) => a.position - b.position)

      const totalEntrada = pipeline.allLeads.size
      
      // Calcular taxa de conversão para cada estágio
      const funnelStages: import('../types').PipelineFunnelStageData[] = sortedStages.map((stage, index) => {
        const leadsInStage = stage.leads.size
        // Sempre calcular em relação ao total inicial (totalEntrada)
        const conversionFromStart = totalEntrada > 0 ? (leadsInStage / totalEntrada) * 100 : 0
        
        // Manter cálculo de conversão anterior apenas para referência (não usado na UI)
        let conversionFromPrevious = 100
        if (index > 0) {
          const previousStage = sortedStages[index - 1]
          const previousLeads = previousStage.leads.size
          conversionFromPrevious = previousLeads > 0 ? (leadsInStage / previousLeads) * 100 : 0
        }

        return {
          stage_id: stage.id,
          stage_name: stage.name,
          position: stage.position,
          total_leads: leadsInStage,
          conversion_rate_from_start: conversionFromStart,
          conversion_rate_from_previous: conversionFromPrevious,
          pipeline_id: pipelineId,
          pipeline_name: pipeline.name
        }
      })

      const totalVendas = pipeline.vendas.size
      const taxaConversaoFinal = totalEntrada > 0 ? (totalVendas / totalEntrada) * 100 : 0

      results.push({
        pipeline_id: pipelineId,
        pipeline_name: pipeline.name,
        stages: funnelStages,
        total_entrada: totalEntrada,
        total_vendas: totalVendas,
        total_perdas: pipeline.perdas.size,
        taxa_conversao_final: taxaConversaoFinal
      })
    }

    return results
  })
}

