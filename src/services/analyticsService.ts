import { supabase } from './supabaseClient'
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
  TimeInterval
} from '../types'

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

  if (filters.period) {
    query = query
      .gte('created_at', filters.period.start)
      .lte('created_at', filters.period.end)
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

// =====================================================
// MÉTRICAS: LEADS POR PIPELINE
// =====================================================

export async function getLeadsByPipeline(
  filters: AnalyticsFilters
): Promise<LeadsByPipelineResult[]> {
  const empresaId = await getUserEmpresaId()

  let query = supabase
    .from('leads')
    .select('pipeline_id, pipelines(name), value')

  query = applyFilters(query, filters, empresaId)

  const { data, error } = await query

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
}

// =====================================================
// MÉTRICAS: LEADS POR ESTÁGIO
// =====================================================

export async function getLeadsByStage(
  filters: AnalyticsFilters
): Promise<LeadsByStageResult[]> {
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

  const { data, error } = await query

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
}

// =====================================================
// MÉTRICAS: LEADS POR ORIGEM
// =====================================================

export async function getLeadsByOrigin(
  filters: AnalyticsFilters
): Promise<LeadsByOriginResult[]> {
  const empresaId = await getUserEmpresaId()

  let query = supabase
    .from('leads')
    .select('origin, value')

  query = applyFilters(query, filters, empresaId)

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar leads por origem:', error)
    throw new Error('Erro ao buscar leads por origem')
  }

  // Agrupar
  const grouped = data.reduce((acc: any, lead: any) => {
    const origin = lead.origin || 'Não informado'
    if (!acc[origin]) {
      acc[origin] = {
        origin,
        count: 0,
        total_value: 0
      }
    }
    acc[origin].count++
    acc[origin].total_value += lead.value || 0
    return acc
  }, {})

  const results: LeadsByOriginResult[] = Object.values(grouped)
  const totalLeads = results.reduce((sum, r: any) => sum + r.count, 0)

  return results.map((r: any) => ({
    ...r,
    percentage: totalLeads > 0 ? (r.count / totalLeads) * 100 : 0,
    average_value: r.count > 0 ? r.total_value / r.count : 0
  })).sort((a, b) => b.count - a.count)
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

  const { data, error } = await query

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
      whatsapp_instances!instance_id(name)
    `)
    .eq('empresa_id', empresaId)

  if (filters.period) {
    query = query
      .gte('timestamp', filters.period.start)
      .lte('timestamp', filters.period.end)
  }

  if (filters.instances && filters.instances.length > 0) {
    query = query.in('instance_id', filters.instances)
  }

  const { data, error } = await query.order('timestamp', { ascending: true })

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
        instance_name: msg.whatsapp_instances?.name || 'Sem nome',
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

  const { data, error } = await query

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

  const { data, error } = await query

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
        key = date.toISOString().split('T')[0]
        break
      case 'week':
        const week = getWeekNumber(date)
        key = `${date.getFullYear()}-W${week}`
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        key = date.toISOString().split('T')[0]
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
  const empresaId = await getUserEmpresaId()

  let query = supabase
    .from('leads')
    .select('id, value, pipeline_id, responsible_uuid')

  query = applyFilters(query, filters, empresaId)

  const { data, error } = await query

  if (error) {
    throw new Error('Erro ao buscar estatísticas')
  }

  const totalValue = data.reduce((sum, lead) => sum + (lead.value || 0), 0)
  const uniquePipelines = new Set(data.map(l => l.pipeline_id)).size
  const uniqueUsers = new Set(data.map(l => l.responsible_uuid)).size

  return {
    total_leads: data.length,
    total_value: totalValue,
    average_value: data.length > 0 ? totalValue / data.length : 0,
    active_pipelines: uniquePipelines,
    active_users: uniqueUsers,
    period: filters.period
  }
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
    console.log('📊 getTotalConversations: Iniciando...', filters.period, 'instances:', filters.instances)
    const empresaId = await getUserEmpresaId()
    console.log('📊 getTotalConversations: empresa_id =', empresaId)

    let query = supabase
      .from('chat_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)

    // Aplicar filtro de período
    if (filters.period) {
      query = query
        .gte('created_at', filters.period.start)
        .lte('created_at', filters.period.end + 'T23:59:59')
    }

    // Aplicar filtro de instâncias
    if (filters.instances && filters.instances.length > 0) {
      console.log('📊 getTotalConversations: Aplicando filtro de instâncias:', filters.instances)
      query = query.in('instance_id', filters.instances)
    }

    const { count, error } = await query

    if (error) {
      console.error('❌ getTotalConversations: Erro:', error)
      return 0
    }

    console.log('✅ getTotalConversations: Total =', count)
    return count || 0
  } catch (err) {
    console.error('❌ getTotalConversations: Exception:', err)
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
    console.log('📊 getConversationsByInstance: Iniciando...', filters.period, 'instances:', filters.instances)
    const empresaId = await getUserEmpresaId()
    console.log('📊 getConversationsByInstance: empresa_id =', empresaId)

    let query = supabase
      .from('chat_conversations')
      .select(`
        id,
        whatsapp_instances!instance_id(name)
      `)
      .eq('empresa_id', empresaId)

    // Aplicar filtro de período
    if (filters.period) {
      query = query
        .gte('created_at', filters.period.start)
        .lte('created_at', filters.period.end + 'T23:59:59')
    }

    // Aplicar filtro de instâncias
    if (filters.instances && filters.instances.length > 0) {
      console.log('📊 getConversationsByInstance: Aplicando filtro de instâncias:', filters.instances)
      query = query.in('instance_id', filters.instances)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ getConversationsByInstance: Erro:', error)
      return []
    }

    console.log('📊 getConversationsByInstance: Dados recebidos:', data?.length, 'conversas')

    // Agrupar por instância
    const grouped = data.reduce((acc: any, conv: any) => {
      const instanceName = conv.whatsapp_instances?.name || 'Não informado'
      acc[instanceName] = (acc[instanceName] || 0) + 1
      return acc
    }, {})

    const total = data.length
    const result = Object.entries(grouped).map(([instance_name, count]) => ({
      instance_name,
      count: count as number,
      percentage: total > 0 ? ((count as number) / total) * 100 : 0
    }))

    console.log('✅ getConversationsByInstance: Resultado:', result)
    return result.sort((a, b) => b.count - a.count)
  } catch (err) {
    console.error('❌ getConversationsByInstance: Exception:', err)
    return []
  }
}

/**
 * Tempo médio do primeiro atendimento (geral)
 * Calcula o tempo entre a primeira mensagem do contato e a primeira resposta do atendente
 */
export async function getAverageFirstResponseTime(
  filters: AnalyticsFilters
): Promise<{ average_minutes: number; formatted: string; total_conversations: number }> {
  try {
    console.log('📊 getAverageFirstResponseTime: Iniciando...', filters.period, 'instances:', filters.instances)
    const empresaId = await getUserEmpresaId()
    console.log('📊 getAverageFirstResponseTime: empresa_id =', empresaId)

    // Buscar conversas do período (limitando a 200 mais recentes para análise precisa)
    let conversationQuery = supabase
      .from('chat_conversations')
      .select('id')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (filters.period) {
      conversationQuery = conversationQuery
        .gte('created_at', filters.period.start)
        .lte('created_at', filters.period.end + 'T23:59:59')
    }

    // Aplicar filtro de instâncias
    if (filters.instances && filters.instances.length > 0) {
      console.log('📊 getAverageFirstResponseTime: Aplicando filtro de instâncias:', filters.instances)
      conversationQuery = conversationQuery.in('instance_id', filters.instances)
    }

    const { data: conversations, error: convError } = await conversationQuery

    if (convError) {
      console.error('❌ getAverageFirstResponseTime: Erro ao buscar conversas:', convError)
      return { average_minutes: 0, formatted: '0 min', total_conversations: 0 }
    }

    if (!conversations || conversations.length === 0) {
      console.log('⚠️ getAverageFirstResponseTime: Nenhuma conversa encontrada')
      return { average_minutes: 0, formatted: '0 min', total_conversations: 0 }
    }

    console.log('📊 getAverageFirstResponseTime: Processando', conversations.length, 'conversas...')

  // Para cada conversa, calcular o tempo de primeira resposta
  const responseTimes: number[] = []

  for (const conv of conversations) {
    // Primeira mensagem do contato (direction = 'inbound')
    const { data: contactMsgs } = await supabase
      .from('chat_messages')
      .select('timestamp')
      .eq('conversation_id', conv.id)
      .eq('direction', 'inbound')
      .order('timestamp', { ascending: true })
      .limit(1)

    if (!contactMsgs || contactMsgs.length === 0) continue
    const firstContactMsg = contactMsgs[0]

    // Primeira resposta do atendente (direction = 'outbound') após a primeira mensagem do contato
    const { data: responseMsgs } = await supabase
      .from('chat_messages')
      .select('timestamp')
      .eq('conversation_id', conv.id)
      .eq('direction', 'outbound')
      .gt('timestamp', firstContactMsg.timestamp)
      .order('timestamp', { ascending: true })
      .limit(1)

    if (!responseMsgs || responseMsgs.length === 0) continue
    const firstResponse = responseMsgs[0]

    // Calcular diferença em minutos
    const diffMs = new Date(firstResponse.timestamp).getTime() - new Date(firstContactMsg.timestamp).getTime()
    const diffMinutes = diffMs / (1000 * 60)
    responseTimes.push(diffMinutes)
  }

  if (responseTimes.length === 0) {
    return { average_minutes: 0, formatted: '0 min', total_conversations: 0 }
  }

  const avgMinutes = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length

  // Formatar tempo
  let formatted: string
  if (avgMinutes < 60) {
    formatted = `${Math.round(avgMinutes)} min`
  } else if (avgMinutes < 1440) {
    const hours = Math.floor(avgMinutes / 60)
    const mins = Math.round(avgMinutes % 60)
    formatted = `${hours}h ${mins}min`
  } else {
    const days = Math.floor(avgMinutes / 1440)
    const hours = Math.floor((avgMinutes % 1440) / 60)
    formatted = `${days}d ${hours}h`
  }

    console.log('✅ getAverageFirstResponseTime: Resultado:', {
      average_minutes: avgMinutes,
      formatted,
      total_conversations: responseTimes.length
    })

    return {
      average_minutes: avgMinutes,
      formatted,
      total_conversations: responseTimes.length
    }
  } catch (err) {
    console.error('❌ getAverageFirstResponseTime: Exception:', err)
    return { average_minutes: 0, formatted: '0 min', total_conversations: 0 }
  }
}

/**
 * Tempo médio do primeiro atendimento por instância
 */
export async function getAverageFirstResponseTimeByInstance(
  filters: AnalyticsFilters
): Promise<Array<{ instance_name: string; average_minutes: number; formatted: string; conversations_count: number }>> {
  try {
    console.log('📊 getAverageFirstResponseTimeByInstance: Iniciando...', filters.period, 'instances:', filters.instances)
    const empresaId = await getUserEmpresaId()
    console.log('📊 getAverageFirstResponseTimeByInstance: empresa_id =', empresaId)

    // Buscar todas as instâncias da empresa (ou filtradas)
    let instanceQuery = supabase
      .from('whatsapp_instances')
      .select('id, name')
      .eq('empresa_id', empresaId)

    // Aplicar filtro de instâncias
    if (filters.instances && filters.instances.length > 0) {
      console.log('📊 getAverageFirstResponseTimeByInstance: Aplicando filtro de instâncias:', filters.instances)
      instanceQuery = instanceQuery.in('id', filters.instances)
    }

    const { data: instances, error: instError } = await instanceQuery

    if (instError) {
      console.error('❌ getAverageFirstResponseTimeByInstance: Erro ao buscar instâncias:', instError)
      return []
    }

    if (!instances || instances.length === 0) {
      console.log('⚠️ getAverageFirstResponseTimeByInstance: Nenhuma instância encontrada')
      return []
    }

    console.log('📊 getAverageFirstResponseTimeByInstance: Encontradas', instances.length, 'instâncias')

  const results = []

  for (const instance of instances) {
    console.log(`📊 Processando instância: ${instance.name}...`)
    
    // Buscar conversas da instância (limitando a 100 mais recentes por instância para análise precisa)
    let conversationQuery = supabase
      .from('chat_conversations')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('instance_id', instance.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (filters.period) {
      conversationQuery = conversationQuery
        .gte('created_at', filters.period.start)
        .lte('created_at', filters.period.end + 'T23:59:59')
    }

    const { data: conversations } = await conversationQuery

    if (!conversations || conversations.length === 0) {
      console.log(`⚠️ Nenhuma conversa encontrada para ${instance.name}`)
      continue
    }

    console.log(`📊 ${instance.name}: Processando ${conversations.length} conversas...`)

    // Calcular tempo de resposta para cada conversa
    const responseTimes: number[] = []

    for (const conv of conversations) {
      const { data: contactMsgs } = await supabase
        .from('chat_messages')
        .select('timestamp')
        .eq('conversation_id', conv.id)
        .eq('direction', 'inbound')
        .order('timestamp', { ascending: true })
        .limit(1)

      if (!contactMsgs || contactMsgs.length === 0) continue
      const firstContactMsg = contactMsgs[0]

      const { data: responseMsgs } = await supabase
        .from('chat_messages')
        .select('timestamp')
        .eq('conversation_id', conv.id)
        .eq('direction', 'outbound')
        .gt('timestamp', firstContactMsg.timestamp)
        .order('timestamp', { ascending: true })
        .limit(1)

      if (!responseMsgs || responseMsgs.length === 0) continue
      const firstResponse = responseMsgs[0]

      const diffMs = new Date(firstResponse.timestamp).getTime() - new Date(firstContactMsg.timestamp).getTime()
      const diffMinutes = diffMs / (1000 * 60)
      responseTimes.push(diffMinutes)
    }

    if (responseTimes.length === 0) {
      console.log(`⚠️ ${instance.name}: Nenhum tempo de resposta calculado`)
      continue
    }

    const avgMinutes = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length

    let formatted: string
    if (avgMinutes < 60) {
      formatted = `${Math.round(avgMinutes)} min`
    } else if (avgMinutes < 1440) {
      const hours = Math.floor(avgMinutes / 60)
      const mins = Math.round(avgMinutes % 60)
      formatted = `${hours}h ${mins}min`
    } else {
      const days = Math.floor(avgMinutes / 1440)
      const hours = Math.floor((avgMinutes % 1440) / 60)
      formatted = `${days}d ${hours}h`
    }

    console.log(`✅ ${instance.name}: Tempo médio = ${formatted} (${responseTimes.length} conversas)`)

    results.push({
      instance_name: instance.name,
      average_minutes: avgMinutes,
      formatted,
      conversations_count: responseTimes.length
    })
  }

    console.log('✅ getAverageFirstResponseTimeByInstance: Resultado:', results.length, 'instâncias processadas')
    return results.sort((a, b) => a.average_minutes - b.average_minutes)
  } catch (err) {
    console.error('❌ getAverageFirstResponseTimeByInstance: Exception:', err)
    return []
  }
}

