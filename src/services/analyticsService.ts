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
      .gte('timestamp', `${filters.period.start}T00:00:00`)
      .lte('timestamp', `${filters.period.end}T23:59:59`)
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
    const empresaId = await getUserEmpresaId()

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
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }

    // Aplicar filtro de instâncias
    if (filters.instances && filters.instances.length > 0) {
      query = query.in('instance_id', filters.instances)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar conversas por instância:', error)
      return []
    }

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

    return result.sort((a, b) => b.count - a.count)
  } catch (err) {
    console.error('Erro ao buscar conversas por instância:', err)
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
    const empresaId = await getUserEmpresaId()

    // Buscar conversas do período (limitando a 200 mais recentes para análise precisa)
    let conversationQuery = supabase
      .from('chat_conversations')
      .select('id, created_at')
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
      .limit(200)

    const { data: conversations, error: convError } = await conversationQuery

    if (convError) {
      console.error('Erro ao buscar conversas:', convError)
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_conversations: 0 }
    }

    if (!conversations || conversations.length === 0) {
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_conversations: 0 }
    }

  // Para cada conversa, calcular o tempo de primeira resposta
  const responseTimes: number[] = []

  for (const conv of conversations) {
    // Primeira mensagem do contato (direction = 'outbound')
    const { data: contactMsgs } = await supabase
      .from('chat_messages')
      .select('timestamp')
      .eq('conversation_id', conv.id)
      .eq('direction', 'outbound')
      .order('timestamp', { ascending: true })
      .limit(1)

    if (!contactMsgs || contactMsgs.length === 0) continue
    const firstContactMsg = contactMsgs[0]

    // Primeira resposta do atendente (direction = 'inbound') após a primeira mensagem do contato
    const { data: responseMsgs } = await supabase
      .from('chat_messages')
      .select('timestamp')
      .eq('conversation_id', conv.id)
      .eq('direction', 'inbound')
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

  // Formatar tempo (sempre com horas, minutos e segundos)
  let formatted: string
  const totalSeconds = Math.round(avgMinutes * 60)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  formatted = `${hours}h ${minutes}min ${seconds}seg`

    return {
      average_minutes: avgMinutes,
      formatted,
      total_conversations: responseTimes.length
    }
  } catch (err) {
    console.error('Erro ao calcular tempo médio de primeira resposta:', err)
    return { average_minutes: 0, formatted: '0h 0min 0seg', total_conversations: 0 }
  }
}

/**
 * Tempo médio para primeiro contato humano após transferência
 * Calcula o tempo entre a primeira mudança de pipeline (transferência para vendedor)
 * e a primeira mensagem do atendente humano
 */
export async function getAverageTimeToFirstProactiveContact(
  filters: AnalyticsFilters
): Promise<{ average_minutes: number; formatted: string; total_leads: number }> {
  try {
    const empresaId = await getUserEmpresaId()

    // Buscar histórico de mudanças de pipeline no período
    let historyQuery = supabase
      .from('lead_pipeline_history')
      .select('lead_id, changed_at, pipeline_id')
      .eq('empresa_id', empresaId)
      .in('change_type', ['pipeline_changed', 'both_changed']) // Apenas mudanças de pipeline
      .order('changed_at', { ascending: false })
      .limit(200)

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

    // Agrupar por lead_id e pegar a primeira mudança de cada lead
    const leadFirstChanges = new Map<string, { changed_at: string; pipeline_id: string }>()
    
    // Ordenar por data (mais antiga primeiro) para cada lead
    const sortedHistory = [...history].sort((a, b) => 
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

    const contactTimes: number[] = []

    // Para cada lead, calcular tempo até primeira mensagem
    for (const [leadId, firstChange] of leadFirstChanges.entries()) {
      // Buscar TODAS as conversas vinculadas ao lead
      let conversationQuery = supabase
        .from('chat_conversations')
        .select('id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true })

      // Aplicar filtro de instâncias se houver
      if (filters.instances && filters.instances.length > 0) {
        conversationQuery = conversationQuery.in('instance_id', filters.instances)
      }

      const { data: conversations } = await conversationQuery

      if (!conversations || conversations.length === 0) continue
      
      // Buscar primeira mensagem inbound em QUALQUER conversa após a mudança
      let firstAttendantMsg: { timestamp: string } | null = null
      
      for (const conv of conversations) {
        // Buscar primeira mensagem inbound (atendente) APÓS a mudança de pipeline nesta conversa
        const { data: attendantMsgs } = await supabase
          .from('chat_messages')
          .select('timestamp')
          .eq('conversation_id', conv.id)
          .eq('direction', 'inbound')
          .gte('timestamp', firstChange.changed_at) // Mensagem depois da mudança de pipeline
          .order('timestamp', { ascending: true })
          .limit(1)

        if (attendantMsgs && attendantMsgs.length > 0) {
          // Se ainda não temos uma mensagem ou esta é mais antiga, usar esta
          if (!firstAttendantMsg || new Date(attendantMsgs[0].timestamp) < new Date(firstAttendantMsg.timestamp)) {
            firstAttendantMsg = attendantMsgs[0]
          }
        }
      }

      if (!firstAttendantMsg) continue

      // Calcular diferença entre mudança de pipeline e primeira mensagem
      const diffMs = new Date(firstAttendantMsg.timestamp).getTime() - new Date(firstChange.changed_at).getTime()
      const diffMinutes = diffMs / (1000 * 60)
      
      // Só considerar tempos positivos (mensagem depois da transferência)
      if (diffMinutes > 0) {
        contactTimes.push(diffMinutes)
      }
    }

    if (contactTimes.length === 0) {
      return { average_minutes: 0, formatted: '0h 0min 0seg', total_leads: 0 }
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
      total_leads: contactTimes.length
    }
  } catch (err) {
    console.error('Erro ao calcular tempo de primeiro contato humano:', err)
    return { average_minutes: 0, formatted: '0h 0min 0seg', total_leads: 0 }
  }
}

/**
 * Tempo médio para primeiro contato humano por instância
 * Calcula o tempo entre a primeira mudança de pipeline e a primeira mensagem
 * de cada instância (vendedor)
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
      .limit(200)

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

    // Agrupar por lead_id e pegar a primeira mudança de cada lead
    const leadFirstChanges = new Map<string, { changed_at: string; pipeline_id: string }>()
    
    const sortedHistory = [...history].sort((a, b) => 
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

    // Buscar instâncias disponíveis
    let instanceQuery = supabase
      .from('whatsapp_instances')
      .select('id, name')
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

    const results: Array<{ instance_name: string; average_minutes: number; formatted: string; leads_count: number }> = []

    // Para cada instância, calcular tempo médio
    for (const instance of instances) {
      const contactTimes: number[] = []

      // Para cada lead que mudou de pipeline
      for (const [leadId, firstChange] of leadFirstChanges.entries()) {
        // Buscar TODAS as conversas vinculadas ao lead nesta instância
        const { data: conversations } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('lead_id', leadId)
          .eq('instance_id', instance.id)
          .order('created_at', { ascending: true })

        if (!conversations || conversations.length === 0) continue
        
        // Buscar primeira mensagem inbound em QUALQUER conversa após a mudança
        let firstAttendantMsg: { timestamp: string } | null = null
        
        for (const conv of conversations) {
          // Buscar primeira mensagem inbound APÓS a mudança de pipeline nesta conversa
          const { data: attendantMsgs } = await supabase
            .from('chat_messages')
            .select('timestamp')
            .eq('conversation_id', conv.id)
            .eq('direction', 'inbound')
            .gte('timestamp', firstChange.changed_at)
            .order('timestamp', { ascending: true })
            .limit(1)

          if (attendantMsgs && attendantMsgs.length > 0) {
            // Se ainda não temos uma mensagem ou esta é mais antiga, usar esta
            if (!firstAttendantMsg || new Date(attendantMsgs[0].timestamp) < new Date(firstAttendantMsg.timestamp)) {
              firstAttendantMsg = attendantMsgs[0]
            }
          }
        }

        if (!firstAttendantMsg) continue

        // Calcular diferença
        const diffMs = new Date(firstAttendantMsg.timestamp).getTime() - new Date(firstChange.changed_at).getTime()
        const diffMinutes = diffMs / (1000 * 60)
        
        if (diffMinutes > 0) {
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
          instance_name: instance.name,
          average_minutes: avgMinutes,
          formatted,
          leads_count: contactTimes.length
        })
      }
    }

    return results
  } catch (err) {
    console.error('Erro ao calcular tempo de primeiro contato por instância:', err)
    return []
  }
}

/**
 * Tempo médio do primeiro atendimento por instância
 */
export async function getAverageFirstResponseTimeByInstance(
  filters: AnalyticsFilters
): Promise<Array<{ instance_name: string; average_minutes: number; formatted: string; conversations_count: number }>> {
  try {
    const empresaId = await getUserEmpresaId()

    // Buscar todas as instâncias da empresa (ou filtradas)
    let instanceQuery = supabase
      .from('whatsapp_instances')
      .select('id, name')
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

  const results = []

  for (const instance of instances) {
    // Buscar conversas da instância (limitando a 200 mais recentes por instância para análise precisa)
    let conversationQuery = supabase
      .from('chat_conversations')
      .select('id, created_at')
      .eq('empresa_id', empresaId)
      .eq('instance_id', instance.id)

    if (filters.period) {
      conversationQuery = conversationQuery
        .gte('created_at', `${filters.period.start}T00:00:00`)
        .lte('created_at', `${filters.period.end}T23:59:59`)
    }
    
    conversationQuery = conversationQuery
      .order('created_at', { ascending: false })
      .limit(200)

    const { data: conversations } = await conversationQuery

    if (!conversations || conversations.length === 0) {
      continue
    }

    // Calcular tempo de resposta para cada conversa
    const responseTimes: number[] = []

    for (const conv of conversations) {
      const { data: contactMsgs } = await supabase
        .from('chat_messages')
        .select('timestamp')
        .eq('conversation_id', conv.id)
        .eq('direction', 'outbound')
        .order('timestamp', { ascending: true })
        .limit(1)

      if (!contactMsgs || contactMsgs.length === 0) continue
      const firstContactMsg = contactMsgs[0]

      const { data: responseMsgs } = await supabase
        .from('chat_messages')
        .select('timestamp')
        .eq('conversation_id', conv.id)
        .eq('direction', 'inbound')
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
      continue
    }

    const avgMinutes = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length

    // Formatar tempo (sempre com horas, minutos e segundos)
    const totalSeconds = Math.round(avgMinutes * 60)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    const formatted = `${hours}h ${minutes}min ${seconds}seg`

    results.push({
      instance_name: instance.name,
      average_minutes: avgMinutes,
      formatted,
      conversations_count: responseTimes.length
    })
  }

    return results.sort((a, b) => a.average_minutes - b.average_minutes)
  } catch (err) {
    console.error('Erro ao calcular tempo médio por instância:', err)
    return []
  }
}

