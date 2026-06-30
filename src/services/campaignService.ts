import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type {
  WhatsAppCampaign,
  WhatsAppCampaignLog,
  CreateWhatsAppCampaignData,
  UpdateWhatsAppCampaignData,
  CreateWhatsAppCampaignLogData,
  Lead,
  WhatsAppCampaignStats
} from '../types'
import SecureLogger from '../utils/logger'

// URLs dos webhooks n8n
const N8N_WEBHOOK_URL_STAGE = 'https://n8n.advcrm.com.br/webhook/campanhas_crm'
const N8N_WEBHOOK_URL_TAGS = 'https://n8n.advcrm.com.br/webhook/campanhas_crm_tags'

function getCampaignWebhookUrl(selectionMode?: string): string {
  // tags e origin usam o mesmo fluxo n8n (selected_lead_ids)
  if (selectionMode === 'tags' || selectionMode === 'origin') {
    return N8N_WEBHOOK_URL_TAGS
  }
  return N8N_WEBHOOK_URL_STAGE
}

function applyCampaignLeadSelectionFilter<T>(
  query: T,
  selectionMode: string,
  criteria: {
    from_stage_id?: string | null
    selected_tags?: string[] | null
    selected_origins?: string[] | null
  }
): T {
  const q = query as {
    eq: (column: string, value: string) => T
    overlaps: (column: string, value: string[]) => T
    in: (column: string, values: string[]) => T
  }

  if (selectionMode === 'stage' && criteria.from_stage_id) {
    return q.eq('stage_id', criteria.from_stage_id)
  }
  if (selectionMode === 'tags' && criteria.selected_tags && criteria.selected_tags.length > 0) {
    return q.overlaps('tags', criteria.selected_tags)
  }
  if (selectionMode === 'origin') {
    const origins = criteria.selected_origins?.length
      ? criteria.selected_origins
      : criteria.selected_tags
    if (origins && origins.length > 0) {
      return q.in('origin', origins)
    }
  }
  return query
}

/** Origens são persistidas em selected_tags até existir coluna dedicada no banco */
function normalizeCampaignFromDb(campaign: WhatsAppCampaign): WhatsAppCampaign {
  if (campaign.selection_mode !== 'origin' || !campaign.selected_tags?.length) {
    return campaign
  }

  return {
    ...campaign,
    selected_origins: campaign.selected_origins ?? campaign.selected_tags,
    selected_tags: undefined
  }
}

function buildSelectedTagsForDb(
  selectionMode: string,
  data: { selected_tags?: string[]; selected_origins?: string[] }
): string[] | null {
  if (selectionMode === 'tags') {
    return data.selected_tags ?? null
  }
  if (selectionMode === 'origin') {
    return data.selected_origins ?? null
  }
  return null
}

// ===========================================
// CRUD DE CAMPANHAS
// ===========================================

export async function listCampaigns(): Promise<WhatsAppCampaign[]> {
  try {
    const empresaId = await getUserEmpresaId()
    
    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .select(`
        *,
        created_user:profiles!created_by(full_name),
        responsible_user:profiles!responsible_uuid(full_name),
        pipeline:pipelines(name),
        from_stage:stages!whatsapp_campaigns_from_stage_id_fkey(name),
        to_stage:stages!whatsapp_campaigns_to_stage_id_fkey(name)
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
    
    if (error) {
      SecureLogger.error('Erro ao listar campanhas', { error })
      throw error
    }
    
    const campaigns = (data || []) as WhatsAppCampaign[]
    
    // Buscar estatísticas reais dos logs para todas as campanhas
    if (campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id)
      const statsMap = await getCampaignsMessageStats(campaignIds)
      
      // Enriquecer campanhas com estatísticas reais
      campaigns.forEach(campaign => {
        const stats = statsMap[campaign.id]
        if (stats) {
          campaign.messages_sent = stats.sent
          campaign.messages_failed = stats.failed
        }
      })
    }
    
    return campaigns.map(normalizeCampaignFromDb)
  } catch (error) {
    SecureLogger.error('Erro inesperado ao listar campanhas', { error })
    throw error
  }
}

/**
 * Busca estatísticas de mensagens para múltiplas campanhas a partir dos logs
 * Calcula quantas mensagens foram enviadas/falhadas baseado nos logs reais
 */
async function getCampaignsMessageStats(campaignIds: string[]): Promise<Record<string, { sent: number, failed: number }>> {
  try {
    const empresaId = await getUserEmpresaId()
    
    const { data: logs, error } = await supabase
      .from('whatsapp_campaign_logs')
      .select('campaign_id, event_type')
      .eq('empresa_id', empresaId)
      .in('campaign_id', campaignIds)
      .in('event_type', ['recipient_sent', 'recipient_failed'])
    
    if (error) {
      SecureLogger.error('Erro ao buscar estatísticas de logs', { error })
      return {}
    }
    
    // Agrupa os logs por campanha e conta os tipos
    const statsMap: Record<string, { sent: number, failed: number }> = {}
    
    campaignIds.forEach(id => {
      statsMap[id] = { sent: 0, failed: 0 }
    })
    
    logs?.forEach(log => {
      if (!statsMap[log.campaign_id]) {
        statsMap[log.campaign_id] = { sent: 0, failed: 0 }
      }
      
      if (log.event_type === 'recipient_sent') {
        statsMap[log.campaign_id].sent++
      } else if (log.event_type === 'recipient_failed') {
        statsMap[log.campaign_id].failed++
      }
    })
    
    return statsMap
  } catch (error) {
    SecureLogger.error('Erro ao calcular estatísticas de campanhas', { error })
    return {}
  }
}

export async function getCampaignById(id: string): Promise<WhatsAppCampaign | null> {
  try {
    const empresaId = await getUserEmpresaId()
    
    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .select(`
        *,
        created_user:profiles!created_by(full_name),
        responsible_user:profiles!responsible_uuid(full_name),
        pipeline:pipelines(name),
        from_stage:stages!whatsapp_campaigns_from_stage_id_fkey(name),
        to_stage:stages!whatsapp_campaigns_to_stage_id_fkey(name)
      `)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .single()
    
    if (error) {
      SecureLogger.error('Erro ao buscar campanha', { error, id })
      throw error
    }
    
    const campaign = data as WhatsAppCampaign
    
    // Buscar estatísticas reais dos logs
    if (campaign) {
      const statsMap = await getCampaignsMessageStats([campaign.id])
      const stats = statsMap[campaign.id]
      if (stats) {
        campaign.messages_sent = stats.sent
        campaign.messages_failed = stats.failed
      }
    }
    
    return normalizeCampaignFromDb(campaign)
  } catch (error) {
    SecureLogger.error('Erro inesperado ao buscar campanha', { error, id })
    throw error
  }
}

export async function createCampaign(data: CreateWhatsAppCampaignData): Promise<WhatsAppCampaign> {
  try {
    const empresaId = await getUserEmpresaId()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    
    // Determinar modo de seleção (padrão: stage)
    const selectionMode = data.selection_mode || 'stage'
    
    // Buscar quantidade de leads baseado no modo de seleção
    let totalRecipients = 0
    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .is('loss_reason_category', null)
        .is('sold_at', null)

      query = applyCampaignLeadSelectionFilter(query, selectionMode, {
        from_stage_id: data.from_stage_id,
        selected_tags: data.selected_tags,
        selected_origins: data.selected_origins
      })

      const { count, error: countError } = await query

      if (!countError && count !== null) {
        totalRecipients = count
      } else {
        SecureLogger.warn('Erro ao buscar contagem de leads', { 
          error: countError, 
          selection_mode: selectionMode,
          from_stage_id: data.from_stage_id,
          selected_tags: data.selected_tags,
          selected_origins: data.selected_origins
        })
      }
    } catch (error) {
      SecureLogger.warn('Erro ao buscar contagem de leads', { 
        error, 
        selection_mode: selectionMode,
        from_stage_id: data.from_stage_id,
        selected_tags: data.selected_tags,
        selected_origins: data.selected_origins
      })
      // Continua com 0 se houver erro
    }
    
    const payload = {
      empresa_id: empresaId,
      created_by: user.id,
      responsible_uuid: data.responsible_uuid || user.id,
      name: data.name,
      description: data.description || null,
      instance_id: data.instance_id,
      message_type: data.message_type,
      message_text: data.message_text,
      media_url: data.media_url || null,
      media_filename: data.media_filename || null,
      media_size_bytes: data.media_size_bytes || null,
      selection_mode: selectionMode,
      selected_tags: buildSelectedTagsForDb(selectionMode, data),
      selected_lead_ids: selectionMode === 'tags' || selectionMode === 'origin' ? data.selected_lead_ids : null,
      pipeline_id: data.pipeline_id,
      from_stage_id: selectionMode === 'stage' ? data.from_stage_id : null,
      to_stage_id: data.to_stage_id || null, // null = manter na atual
      scheduled_at: data.scheduled_at || null,
      messages_per_batch: data.messages_per_batch || 50,
      interval_min_minutes: data.interval_min_minutes || 5,
      interval_max_minutes: data.interval_max_minutes || 10,
      total_recipients: totalRecipients,
      messages_sent: 0,
      messages_failed: 0,
      status: 'draft'
    }
    
    const { data: campaign, error } = await supabase
      .from('whatsapp_campaigns')
      .insert([payload])
      .select()
      .single()
    
    if (error) {
      SecureLogger.error('Erro ao criar campanha', { error, payload })
      throw error
    }
    
    return normalizeCampaignFromDb(campaign as WhatsAppCampaign)
  } catch (error) {
    SecureLogger.error('Erro inesperado ao criar campanha', { error })
    throw error
  }
}

export async function updateCampaign(id: string, data: UpdateWhatsAppCampaignData): Promise<WhatsAppCampaign> {
  try {
    const empresaId = await getUserEmpresaId()
    
    const updateData: Record<string, unknown> = { ...data }
    
    const shouldRecalculate = 
      data.selection_mode !== undefined ||
      data.from_stage_id !== undefined ||
      data.selected_tags !== undefined ||
      data.selected_origins !== undefined
    
    if (shouldRecalculate) {
      if (data.selection_mode === 'tags') {
        updateData.from_stage_id = null
      }
      if (data.selection_mode === 'origin') {
        updateData.from_stage_id = null
        if (data.selected_origins) {
          updateData.selected_tags = data.selected_origins
        }
      }
      if (data.selection_mode === 'stage') {
        updateData.selected_tags = null
        updateData.selected_lead_ids = null
      }
      
      const selectionMode = data.selection_mode || 
        (data.selected_origins ? 'origin' : data.selected_tags ? 'tags' : 'stage')
      
      try {
        let query = supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .is('loss_reason_category', null)
          .is('sold_at', null)

        query = applyCampaignLeadSelectionFilter(query, selectionMode, {
          from_stage_id: data.from_stage_id,
          selected_tags: data.selected_tags,
          selected_origins: data.selected_origins ?? (selectionMode === 'origin' ? data.selected_tags : undefined)
        })

        const { count, error: countError } = await query

        if (!countError && count !== null) {
          updateData.total_recipients = count
        } else {
          SecureLogger.warn('Erro ao buscar contagem de leads na atualização', { 
            error: countError, 
            selection_mode: selectionMode,
            from_stage_id: data.from_stage_id,
            selected_tags: data.selected_tags,
            selected_origins: data.selected_origins
          })
        }
      } catch (error) {
        SecureLogger.warn('Erro ao buscar contagem de leads na atualização', { 
          error, 
          selection_mode: selectionMode,
          from_stage_id: data.from_stage_id,
          selected_tags: data.selected_tags,
          selected_origins: data.selected_origins
        })
      }
    }

    delete updateData.selected_origins
    if (data.selection_mode === 'origin' && data.selected_origins !== undefined) {
      updateData.selected_tags = data.selected_origins
    }
    
    const { data: campaign, error } = await supabase
      .from('whatsapp_campaigns')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single()
    
    if (error) {
      SecureLogger.error('Erro ao atualizar campanha', { error, id })
      throw error
    }
    
    return normalizeCampaignFromDb(campaign as WhatsAppCampaign)
  } catch (error) {
    SecureLogger.error('Erro inesperado ao atualizar campanha', { error, id })
    throw error
  }
}

export async function deleteCampaign(id: string): Promise<void> {
  try {
    const empresaId = await getUserEmpresaId()
    
    const { error } = await supabase
      .from('whatsapp_campaigns')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId)
    
    if (error) {
      SecureLogger.error('Erro ao deletar campanha', { error, id })
      throw error
    }
  } catch (error) {
    SecureLogger.error('Erro inesperado ao deletar campanha', { error, id })
    throw error
  }
}

// ===========================================
// VARIÁVEIS DINÂMICAS
// ===========================================

/**
 * Substitui variáveis no template da mensagem
 * Usado apenas para preview no frontend - n8n faz a substituição real
 */
export function replaceVariables(template: string, lead: Lead): string {
  let message = template
  
  message = message.replace(/\{\{nome\}\}/g, lead.name || '')
  message = message.replace(/\{\{empresa\}\}/g, lead.company || '')
  message = message.replace(/\{\{valor\}\}/g, lead.value ? `R$ ${lead.value.toFixed(2)}` : '')
  message = message.replace(/\{\{telefone\}\}/g, lead.phone || '')
  message = message.replace(/\{\{email\}\}/g, lead.email || '')
  
  return message
}

// ===========================================
// LOGS
// ===========================================

export async function createCampaignLog(data: CreateWhatsAppCampaignLogData): Promise<WhatsAppCampaignLog> {
  try {
    const empresaId = await getUserEmpresaId()
    
    const payload = {
      empresa_id: empresaId,
      campaign_id: data.campaign_id,
      event_type: data.event_type,
      message: data.message || null,
      metadata: data.metadata || {},
      recipient_id: data.recipient_id || null
    }
    
    const { data: log, error } = await supabase
      .from('whatsapp_campaign_logs')
      .insert([payload])
      .select()
      .single()
    
    if (error) {
      SecureLogger.error('Erro ao criar log', { error, payload })
      throw error
    }
    
    return log as WhatsAppCampaignLog
  } catch (error) {
    SecureLogger.error('Erro inesperado ao criar log', { error })
    throw error
  }
}

export async function getCampaignLogs(campaignId: string): Promise<WhatsAppCampaignLog[]> {
  try {
    const empresaId = await getUserEmpresaId()
    
    const { data, error } = await supabase
      .from('whatsapp_campaign_logs')
      .select(`
        *,
        lead:leads!lead_id(id, name, company, phone)
      `)
      .eq('campaign_id', campaignId)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
    
    if (error) {
      SecureLogger.error('Erro ao buscar logs', { error, campaignId })
      throw error
    }
    
    return (data || []) as WhatsAppCampaignLog[]
  } catch (error) {
    SecureLogger.error('Erro inesperado ao buscar logs', { error, campaignId })
    throw error
  }
}

// ===========================================
// EXECUÇÃO (APENAS CHAMA WEBHOOK)
// ===========================================

/**
 * Inicia campanha
 * 1. Atualiza status no banco para 'running'
 * 2. Cria log de 'started'
 * 3. Aciona webhook n8n
 * n8n faz o resto: buscar leads, enviar, mover, criar logs, etc.
 * 
 * Se a campanha estiver concluída, reseta estatísticas ao reativar.
 */
export async function startCampaign(campaignId: string): Promise<void> {
  let markedAsRunning = false

  try {
    const empresaId = await getUserEmpresaId()
    
    const campaign = await getCampaignById(campaignId)
    const isReactivation = campaign?.status === 'completed'
    const webhookUrl = getCampaignWebhookUrl(campaign?.selection_mode)
    
    const updateData: Record<string, unknown> = {
      status: 'running',
      started_at: new Date().toISOString()
    }
    
    if (isReactivation) {
      updateData.messages_sent = 0
      updateData.messages_failed = 0
      updateData.completed_at = null
      SecureLogger.info('Reativando campanha concluída - resetando estatísticas', { campaignId })
    }
    
    await updateCampaign(campaignId, updateData)
    markedAsRunning = true
    
    SecureLogger.info('Status da campanha atualizado para running', { campaignId, isReactivation })
    
    await createCampaignLog({
      campaign_id: campaignId,
      event_type: 'started',
      message: isReactivation 
        ? 'Campanha reativada pelo usuário' 
        : 'Campanha iniciada pelo usuário'
    })
    
    const payload = {
      empresa_id: empresaId,
      campaign_id: campaignId,
      selection_mode: campaign?.selection_mode || 'stage',
      timestamp: new Date().toISOString()
    }
    
    SecureLogger.info('Acionando webhook n8n', { 
      campaignId, 
      payload, 
      selectionMode: campaign?.selection_mode,
      webhookUrl 
    })
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      SecureLogger.error('Erro no webhook n8n', { 
        campaignId, 
        status: response.status, 
        errorText,
        webhookUrl
      })
      
      await updateCampaign(campaignId, { status: 'failed' })
      markedAsRunning = false
      
      throw new Error(`Webhook n8n retornou ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    SecureLogger.info('Webhook n8n acionado com sucesso', { campaignId, result, webhookUrl })
    
  } catch (error: unknown) {
    SecureLogger.error('Erro ao iniciar campanha', { error, campaignId })

    if (markedAsRunning) {
      try {
        await updateCampaign(campaignId, { status: 'failed' })
      } catch (revertError) {
        SecureLogger.error('Erro ao reverter status da campanha após falha no webhook', {
          error: revertError,
          campaignId
        })
      }
    }

    throw error
  }
}

/**
 * Pausa campanha
 * 1. Atualiza status no banco para 'paused'
 * 2. n8n detecta a mudança e para os envios
 * 3. n8n cria o log de 'paused'
 */
export async function pauseCampaign(campaignId: string): Promise<void> {
  try {
    // Apenas atualiza status - n8n criará o log quando detectar
    await updateCampaign(campaignId, {
      status: 'paused'
    })
    
    SecureLogger.info('Campanha pausada', { campaignId })
  } catch (error: any) {
    SecureLogger.error('Erro ao pausar campanha', { error, campaignId })
    throw error
  }
}

/**
 * Retoma campanha
 * 1. Atualiza status no banco para 'running'
 * 2. Cria log de 'resumed' (FRONTEND)
 * 3. Aciona webhook n8n para continuar os envios
 */
export async function resumeCampaign(campaignId: string): Promise<void> {
  try {
    const empresaId = await getUserEmpresaId()
    
    // Buscar campanha para determinar qual webhook usar
    const campaign = await getCampaignById(campaignId)
    const webhookUrl = getCampaignWebhookUrl(campaign?.selection_mode)
    
    // 1. Atualizar status
    await updateCampaign(campaignId, {
      status: 'running'
    })
    
    SecureLogger.info('Status da campanha atualizado para running (resumed)', { campaignId })
    
    // 2. Criar log de retomada (FRONTEND cria este log)
    await createCampaignLog({
      campaign_id: campaignId,
      event_type: 'resumed',
      message: 'Campanha retomada pelo usuário'
    })
    
    SecureLogger.info('Log de retomada criado', { campaignId })
    
    // 3. Acionar webhook n8n (URL baseada no modo de seleção)
    const payload = {
      empresa_id: empresaId,
      campaign_id: campaignId,
      selection_mode: campaign?.selection_mode || 'stage',
      timestamp: new Date().toISOString()
    }
    
    SecureLogger.info('Acionando webhook n8n para retomar campanha', { 
      campaignId, 
      payload,
      selectionMode: campaign?.selection_mode,
      webhookUrl
    })
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      SecureLogger.error('Erro no webhook n8n ao retomar', { 
        campaignId, 
        status: response.status, 
        errorText 
      })
      
      // Se webhook falhar, reverter status para paused
      await updateCampaign(campaignId, {
        status: 'paused'
      })
      
      throw new Error(`Webhook n8n retornou ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    SecureLogger.info('Webhook n8n acionado com sucesso para retomar campanha', { campaignId, result })
    
  } catch (error: any) {
    SecureLogger.error('Erro ao retomar campanha', { error, campaignId })
    throw error
  }
}

// ===========================================
// ESTATÍSTICAS
// ===========================================

export async function getCampaignStats(): Promise<WhatsAppCampaignStats> {
  try {
    const empresaId = await getUserEmpresaId()
    
    // Buscar campanhas
    const { data: campaigns, error } = await supabase
      .from('whatsapp_campaigns')
      .select('id, status')
      .eq('empresa_id', empresaId)
    
    if (error) {
      throw error
    }
    
    // Buscar estatísticas reais dos logs para todas as campanhas
    let totalSent = 0
    let totalFailed = 0
    
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id)
      const statsMap = await getCampaignsMessageStats(campaignIds)
      
      Object.values(statsMap).forEach(stats => {
        totalSent += stats.sent
        totalFailed += stats.failed
      })
    }
    
    const stats: WhatsAppCampaignStats = {
      total_campaigns: campaigns?.length || 0,
      active_campaigns: campaigns?.filter(c => c.status === 'running').length || 0,
      completed_campaigns: campaigns?.filter(c => c.status === 'completed').length || 0,
      total_messages_sent: totalSent,
      total_messages_failed: totalFailed,
      success_rate: 0
    }
    
    if (stats.total_messages_sent + stats.total_messages_failed > 0) {
      stats.success_rate = (stats.total_messages_sent / (stats.total_messages_sent + stats.total_messages_failed)) * 100
    }
    
    return stats
  } catch (error) {
    SecureLogger.error('Erro ao buscar estatísticas', { error })
    throw error
  }
}

