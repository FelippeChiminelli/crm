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

// URL do webhook n8n (fixo no sistema)
const N8N_WEBHOOK_URL = 'https://n8n.advcrm.com.br/webhook/campanhas_crm'

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
    
    return (data || []) as WhatsAppCampaign[]
  } catch (error) {
    SecureLogger.error('Erro inesperado ao listar campanhas', { error })
    throw error
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
    
    return data as WhatsAppCampaign
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
    
    // Buscar quantidade de leads no stage de origem
    let totalRecipients = 0
    if (data.from_stage_id) {
      try {
        const { count, error: countError } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('stage_id', data.from_stage_id)
          .eq('empresa_id', empresaId)
          .is('loss_reason_category', null) // Excluir leads perdidos
          .is('sold_at', null) // Excluir leads vendidos

        if (!countError && count !== null) {
          totalRecipients = count
        } else {
          SecureLogger.warn('Erro ao buscar contagem de leads', { error: countError, from_stage_id: data.from_stage_id })
        }
      } catch (error) {
        SecureLogger.warn('Erro ao buscar contagem de leads', { error, from_stage_id: data.from_stage_id })
        // Continua com 0 se houver erro
      }
    }
    
    const payload = {
      empresa_id: empresaId,
      created_by: user.id,
      responsible_uuid: data.responsible_uuid || user.id, // Se não informado, assume quem criou
      name: data.name,
      description: data.description || null,
      instance_id: data.instance_id,
      message_type: data.message_type,
      message_text: data.message_text,
      media_url: data.media_url || null,
      media_filename: data.media_filename || null,
      media_size_bytes: data.media_size_bytes || null,
      pipeline_id: data.pipeline_id,
      from_stage_id: data.from_stage_id,
      to_stage_id: data.to_stage_id,
      scheduled_at: data.scheduled_at || null,
      messages_per_batch: data.messages_per_batch || 50,
      interval_min_minutes: data.interval_min_minutes || 5,
      interval_max_minutes: data.interval_max_minutes || 10,
      total_recipients: totalRecipients, // Preencher com quantidade de leads do stage
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
    
    return campaign as WhatsAppCampaign
  } catch (error) {
    SecureLogger.error('Erro inesperado ao criar campanha', { error })
    throw error
  }
}

export async function updateCampaign(id: string, data: UpdateWhatsAppCampaignData): Promise<WhatsAppCampaign> {
  try {
    const empresaId = await getUserEmpresaId()
    
    // Se o stage de origem foi alterado, buscar nova quantidade de leads
    const updateData: any = { ...data }
    
    if (data.from_stage_id) {
      try {
        const { count, error: countError } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('stage_id', data.from_stage_id)
          .eq('empresa_id', empresaId)
          .is('loss_reason_category', null) // Excluir leads perdidos
          .is('sold_at', null) // Excluir leads vendidos

        if (!countError && count !== null) {
          updateData.total_recipients = count
        } else {
          SecureLogger.warn('Erro ao buscar contagem de leads na atualização', { error: countError, from_stage_id: data.from_stage_id })
        }
      } catch (error) {
        SecureLogger.warn('Erro ao buscar contagem de leads na atualização', { error, from_stage_id: data.from_stage_id })
        // Continua sem atualizar total_recipients se houver erro
      }
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
    
    return campaign as WhatsAppCampaign
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
  try {
    const empresaId = await getUserEmpresaId()
    
    // Verificar se é reativação de campanha concluída
    const campaign = await getCampaignById(campaignId)
    const isReactivation = campaign?.status === 'completed'
    
    // 1. Atualizar status da campanha no banco PRIMEIRO
    const updateData: any = {
      status: 'running',
      started_at: new Date().toISOString()
    }
    
    // Se for reativação, resetar estatísticas
    if (isReactivation) {
      updateData.messages_sent = 0
      updateData.messages_failed = 0
      updateData.completed_at = null
      SecureLogger.info('Reativando campanha concluída - resetando estatísticas', { campaignId })
    }
    
    await updateCampaign(campaignId, updateData)
    
    SecureLogger.info('Status da campanha atualizado para running', { campaignId, isReactivation })
    
    // 2. Criar log de início/reativação
    await createCampaignLog({
      campaign_id: campaignId,
      event_type: 'started',
      message: isReactivation 
        ? 'Campanha reativada pelo usuário' 
        : 'Campanha iniciada pelo usuário'
    })
    
    SecureLogger.info('Log de início criado', { campaignId })
    
    // 3. Acionar webhook n8n
    const payload = {
      empresa_id: empresaId,
      campaign_id: campaignId,
      timestamp: new Date().toISOString()
    }
    
    SecureLogger.info('Acionando webhook n8n', { campaignId, payload })
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      SecureLogger.error('Erro no webhook n8n', { 
        campaignId, 
        status: response.status, 
        errorText 
      })
      
      // Se webhook falhar, reverter status
      await updateCampaign(campaignId, {
        status: 'failed'
      })
      
      throw new Error(`Webhook n8n retornou ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    SecureLogger.info('Webhook n8n acionado com sucesso', { campaignId, result })
    
  } catch (error: any) {
    SecureLogger.error('Erro ao iniciar campanha', { error, campaignId })
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
    
    // 3. Acionar webhook n8n
    const payload = {
      empresa_id: empresaId,
      campaign_id: campaignId,
      timestamp: new Date().toISOString()
    }
    
    SecureLogger.info('Acionando webhook n8n para retomar campanha', { campaignId, payload })
    
    const response = await fetch(N8N_WEBHOOK_URL, {
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
    
    const { data: campaigns, error } = await supabase
      .from('whatsapp_campaigns')
      .select('status, messages_sent, messages_failed')
      .eq('empresa_id', empresaId)
    
    if (error) {
      throw error
    }
    
    const stats: WhatsAppCampaignStats = {
      total_campaigns: campaigns.length,
      active_campaigns: campaigns.filter(c => c.status === 'running').length,
      completed_campaigns: campaigns.filter(c => c.status === 'completed').length,
      total_messages_sent: campaigns.reduce((sum, c) => sum + (c.messages_sent || 0), 0),
      total_messages_failed: campaigns.reduce((sum, c) => sum + (c.messages_failed || 0), 0),
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

