import { supabase } from './supabaseClient'
import type { Lead } from '../types'
import SecureLogger from '../utils/logger'

// Importar função centralizada
import { getUserEmpresaId } from './authService'
import { getUserPipelinePermissions } from './pipelinePermissionService'

// Tipo para criação de lead
export interface CreateLeadData {
  pipeline_id: string
  stage_id: string
  responsible_uuid?: string
  name: string
  company?: string
  value?: number
  phone?: string
  email?: string
  origin?: string
  status?: string
  notes?: string
  tags?: string[]
  // Campos de motivo de perda
  loss_reason_category?: 'negociacao' | 'concorrencia' | 'timing' | 'sem_budget' | 
                         'financiamento_nao_aprovado' | 'sem_interesse' | 'nao_qualificado' | 'sem_resposta' | 'outro'
  loss_reason_notes?: string
  lost_at?: string
  // Campos de venda concluída
  sold_at?: string
  sold_value?: number
  sale_notes?: string
}

// Função helper para validar email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Função helper para validar telefone brasileiro
// Valida se o telefone segue o formato: 55 + DDD (2 dígitos) + número (8-9 dígitos)
// Exemplos válidos: 5511999999999, 551199999999, 55119999999999
function isValidBrazilianPhone(phone: string): boolean {
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Verifica se tem pelo menos 10 dígitos (DDD + número)
  if (cleanPhone.length < 10) {
    return false
  }
  
  // Verifica se começa com 55 (código do Brasil)
  if (!cleanPhone.startsWith('55')) {
    return false
  }
  
  // Verifica se tem o formato correto: 55 + DDD (2 dígitos) + número (8-9 dígitos)
  const ddd = cleanPhone.substring(2, 4)
  const number = cleanPhone.substring(4)
  
  // DDD deve estar entre 11 e 99
  const dddNum = parseInt(ddd)
  if (dddNum < 11 || dddNum > 99) {
    return false
  }
  
  // Número deve ter 8 ou 9 dígitos
  if (number.length < 8 || number.length > 9) {
    return false
  }
  
  return true
}

// Função para formatar telefone brasileiro
// Adiciona 55 no início se não estiver presente
// Remove caracteres especiais e formata para o padrão brasileiro
function formatBrazilianPhone(phone: string): string {
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Se não começa com 55, adiciona
  if (!cleanPhone.startsWith('55')) {
    return `55${cleanPhone}`
  }
  
  return cleanPhone
}

// Validação de dados de lead
function validateLeadData(data: Omit<Lead, 'id' | 'created_at'>): void {
  if (!data.name?.trim()) {
    throw new Error('Nome do lead é obrigatório')
  }
  
  if (data.name.length > 100) {
    throw new Error('Nome do lead não pode ter mais de 100 caracteres')
  }
  
  if (!data.pipeline_id) {
    throw new Error('Pipeline é obrigatório')
  }
  
  if (!data.stage_id) {
    throw new Error('Etapa é obrigatória')
  }
  
  if (data.email && !isValidEmail(data.email)) {
    throw new Error('Email inválido')
  }
  
  if (data.phone) {
    const formattedPhone = formatBrazilianPhone(data.phone)
    if (!isValidBrazilianPhone(formattedPhone)) {
      throw new Error('Telefone inválido. Deve seguir o formato brasileiro: 55 + DDD + número (ex: 5511999999999)')
    }
  }
  
  if (data.company && data.company.length > 100) {
    throw new Error('Nome da empresa não pode ter mais de 100 caracteres')
  }
  
  if (data.value && data.value < 0) {
    throw new Error('Valor do lead não pode ser negativo')
  }
  
  if (data.notes && data.notes.length > 1000) {
    throw new Error('Notas não podem ter mais de 1000 caracteres')
  }
}

export interface GetLeadsParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  pipeline_id?: string
  stage_id?: string
  created_at?: string
}

export async function getLeads(params: GetLeadsParams = {}) {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      return { data: [], error: null, total: 0 }
    }

    // Identificar usuário e se é admin
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('uuid', user?.id || '')
      .single()
    const isAdmin = !!profile?.is_admin

    const { 
      page = 1, 
      limit = 25, 
      search, 
      status, 
      pipeline_id, 
      stage_id,
      created_at
    } = params

    let query = supabase
      .from('leads')
      .select(`
        *,
        responsible:profiles!leads_responsible_uuid_fkey(full_name),
        pipeline:pipelines!leads_pipeline_id_fkey(name),
        stage:stages!leads_stage_id_fkey(name, color)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)

    // Restringir por pipelines permitidos para não-admin
    if (!isAdmin) {
      const { data: allowedPipelineIds } = await getUserPipelinePermissions(user!.id)
      if (!allowedPipelineIds || allowedPipelineIds.length === 0) {
        // Sem permissão para nenhum pipeline → retornar vazio
        return { data: [], error: null, total: 0 }
      }
      query = query.in('pipeline_id', allowedPipelineIds)
    }

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (pipeline_id) {
      query = query.eq('pipeline_id', pipeline_id)
    }
    
    if (stage_id) {
      query = query.eq('stage_id', stage_id)
    }
    
    if (created_at) {
      // Filtrar por data de criação (formato YYYY-MM-DD)
      // Converter a data para UTC considerando o fuso horário local (UTC-3)
      const localDate = new Date(created_at + 'T00:00:00')
      
      // Criar range de 24 horas para cobrir o dia inteiro no fuso horário local
      const startOfDayUTC = new Date(localDate.getTime() - (3 * 60 * 60 * 1000)) // -3 horas para UTC
      const endOfDayUTC = new Date(localDate.getTime() + (21 * 60 * 60 * 1000)) // +21 horas para UTC
      

      
      // Usar range de datas para cobrir o dia inteiro
      query = query.gte('created_at', startOfDayUTC.toISOString())
                   .lt('created_at', endOfDayUTC.toISOString())
    }

    // Aplicar paginação
    const offset = (page - 1) * limit
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const result = await query

    return {
      data: result.data || [],
      error: result.error,
      total: result.count || 0
    }
  } catch (error) {
    SecureLogger.error('Erro ao buscar leads:', error)
    throw error
  }
}

export interface PipelineFilters {
  status?: string[]
  showLostLeads?: boolean
  showSoldLeads?: boolean
  dateFrom?: string
  dateTo?: string
  search?: string
}

export async function getLeadsByPipeline(pipeline_id: string, filters?: PipelineFilters) {
  if (!pipeline_id?.trim()) {
    throw new Error('Pipeline ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  const LIMIT = 200
  
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('pipeline_id', pipeline_id)
    .eq('empresa_id', empresaId)

  // Aplicar filtros
  if (filters) {
    // Filtro de perdidos
    if (!filters.showLostLeads) {
      query = query.is('loss_reason_category', null)
    }

    // Filtro de vendidos
    if (!filters.showSoldLeads) {
      query = query.is('sold_at', null)
    }

    // Filtro de status
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    // Filtro de busca textual
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim()
      query = query.or(`name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    }

    // Filtro de data inicial
    if (filters.dateFrom) {
      // Assumindo que dateFrom vem como YYYY-MM-DD, adicionamos hora zerada
      // Ajuste de fuso horário simplificado (considerando input local)
      const fromDate = filters.dateFrom.includes('T') ? filters.dateFrom : `${filters.dateFrom}T00:00:00`
      query = query.gte('created_at', fromDate)
    }

    // Filtro de data final
    if (filters.dateTo) {
      // Assumindo que dateTo vem como YYYY-MM-DD, queremos até o final desse dia
      const toDate = filters.dateTo.includes('T') ? filters.dateTo : `${filters.dateTo}T23:59:59.999`
      query = query.lte('created_at', toDate)
    }
  }

  const result = await query
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  // Adiciona campo extra para indicar se atingiu o limite
  const total = result.count || 0
  const reachedLimit = total > LIMIT
  return { ...result, reachedLimit, total }
}

export async function getLeadsByStage(stage_id: string) {
  if (!stage_id?.trim()) {
    throw new Error('Stage ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  return supabase
    .from('leads')
    .select('*')
    .eq('stage_id', stage_id)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
}

export async function getLeadById(id: string) {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        responsible:profiles!leads_responsible_uuid_fkey(full_name),
        pipeline:pipelines!leads_pipeline_id_fkey(name),
        stage:stages!leads_stage_id_fkey(name, color)
      `)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    SecureLogger.error('❌ Erro ao buscar lead por ID:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function getLeadByPhone(phone: string) {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      SecureLogger.error('❌ Empresa não identificada')
      throw new Error('Empresa não identificada')
    }

    // Normalizar o telefone removendo caracteres especiais
    const normalizedPhone = phone.replace(/\D/g, '')

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        responsible:profiles!leads_responsible_uuid_fkey(full_name),
        pipeline:pipelines!leads_pipeline_id_fkey(name),
        stage:stages!leads_stage_id_fkey(name, color)
      `)
      .eq('empresa_id', empresaId)
      .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${phone}%`)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      SecureLogger.error('❌ Erro na query:', error)
      throw error
    }
    
    return { data: data || null, error: null }
  } catch (error) {
    SecureLogger.error('❌ Erro ao buscar lead por telefone:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function createLead(data: CreateLeadData) {
  validateLeadData(data)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuário não autenticado')
  }
  
  const empresaId = await getUserEmpresaId()
  
  const normalizedStatus = typeof data.status === 'string' && data.status.trim() !== ''
    ? data.status.trim()
    : null

  const leadData = {
    ...data,
    empresa_id: empresaId,
    responsible_uuid: data.responsible_uuid || user.id,
    // Sanitizar dados de entrada
    name: data.name.trim(),
    company: data.company?.trim() || null,
    email: data.email?.trim() || null,
    phone: data.phone ? formatBrazilianPhone(data.phone) : null, // Formatar telefone
    origin: data.origin?.trim() || null,
    notes: data.notes?.trim() || null,
    status: normalizedStatus
  }
  
  const result = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single()
  
  return result
}

export async function updateLead(id: string, data: Partial<CreateLeadData>) {
  if (!id?.trim()) {
    throw new Error('Lead ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  // Validar se o lead pertence à empresa do usuário e buscar etapa atual
  const { data: existingLead, error: checkError } = await supabase
    .from('leads')
    .select('id, stage_id')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (checkError || !existingLead) {
    throw new Error('Lead não encontrado ou não pertence à sua empresa')
  }
  
  // Guardar stage_id anterior para verificar mudança
  const previousStageId = existingLead.stage_id
  
  // Sanitizar dados de entrada
  const sanitizedData: any = {}
  
  if (data.name !== undefined) {
    if (!data.name?.trim()) {
      throw new Error('Nome do lead é obrigatório')
    }
    sanitizedData.name = data.name.trim()
  }
  
  if (data.company !== undefined) {
    sanitizedData.company = data.company?.trim() || null
  }
  
  if (data.email !== undefined) {
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new Error('Email inválido')
      }
      sanitizedData.email = data.email.trim()
    } else {
      sanitizedData.email = null
    }
  }
  
  if (data.phone !== undefined) {
    if (data.phone && data.phone.trim()) {
      const formattedPhone = formatBrazilianPhone(data.phone)
      if (!isValidBrazilianPhone(formattedPhone)) {
        throw new Error('Telefone inválido. Deve seguir o formato brasileiro: 55 + DDD + número (ex: 5511999999999)')
      }
      sanitizedData.phone = formattedPhone
    } else {
      sanitizedData.phone = null
    }
  }
  
  if (data.origin !== undefined) {
    sanitizedData.origin = data.origin?.trim() || null
  }
  
  if (data.notes !== undefined) {
    sanitizedData.notes = data.notes?.trim() || null
  }
  
  if (data.value !== undefined) {
    if (data.value < 0) {
      throw new Error('Valor não pode ser negativo')
    }
    sanitizedData.value = data.value
  }
  
  if (data.status !== undefined) {
    sanitizedData.status = data.status
  }
  
  if (data.tags !== undefined) {
    sanitizedData.tags = data.tags
  }
  
  if (data.pipeline_id !== undefined) {
    sanitizedData.pipeline_id = data.pipeline_id
  }
  
  if (data.stage_id !== undefined) {
    sanitizedData.stage_id = data.stage_id
  }
  
  // Campos de motivo de perda
  if (data.loss_reason_category !== undefined) {
    sanitizedData.loss_reason_category = data.loss_reason_category
  }
  
  if (data.loss_reason_notes !== undefined) {
    sanitizedData.loss_reason_notes = data.loss_reason_notes?.trim() || null
  }
  
  if (data.lost_at !== undefined) {
    sanitizedData.lost_at = data.lost_at
  }
  
  // Campos de venda concluída
  if (data.sold_at !== undefined) {
    sanitizedData.sold_at = data.sold_at
  }
  
  if (data.sold_value !== undefined) {
    sanitizedData.sold_value = data.sold_value
  }
  
  if (data.sale_notes !== undefined) {
    sanitizedData.sale_notes = data.sale_notes?.trim() || null
  }
  
  const result = await supabase
    .from('leads')
    .update(sanitizedData)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()
  
  // Disparar automações se a etapa mudou
  if (data.stage_id !== undefined && previousStageId !== data.stage_id && result.data) {
    try {
      const { evaluateAutomationsForLeadStageChanged } = await import('./automationService')
      await evaluateAutomationsForLeadStageChanged({
        type: 'lead_stage_changed',
        lead: result.data as unknown as import('../types').Lead,
        previous_stage_id: previousStageId,
        new_stage_id: data.stage_id
      })
    } catch (engineErr) {
      SecureLogger.error('Erro ao avaliar automações (updateLead):', engineErr)
    }
  }
  
  return result
}

export async function deleteLead(id: string) {
  if (!id?.trim()) {
    throw new Error('Lead ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  return supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)
}

export async function updateLeadStage(leadId: string, newStageId: string) {
  if (!leadId?.trim()) {
    throw new Error('Lead ID é obrigatório')
  }
  
  if (!newStageId?.trim()) {
    throw new Error('Stage ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  // Validar se o lead pertence à empresa do usuário
  const { data: existingLead, error: checkError } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('empresa_id', empresaId)
    .single()
  
  if (checkError || !existingLead) {
    throw new Error('Lead não encontrado ou não pertence à sua empresa')
  }
  
  // Validar se a nova etapa pertence à empresa do usuário
  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id')
    .eq('id', newStageId)
    .eq('empresa_id', empresaId)
    .single()
  
  if (stageError || !stage) {
    throw new Error('Etapa não encontrada ou não pertence à sua empresa')
  }
  
  try {
    // Buscar lead atual para obter pipeline/stage antigos e dados para engine
    const { data: beforeLead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('empresa_id', empresaId)
      .single()

    const previousStageId = beforeLead?.stage_id

    const result = await supabase
      .from('leads')
      .update({ stage_id: newStageId })
      .eq('id', leadId)
      .eq('empresa_id', empresaId)
      .select()
      .single()

    // Disparar automações se a etapa realmente mudou
    if (previousStageId && previousStageId !== newStageId && result.data) {
      try {
        const { evaluateAutomationsForLeadStageChanged } = await import('./automationService')
        await evaluateAutomationsForLeadStageChanged({
          type: 'lead_stage_changed',
          lead: result.data as unknown as import('../types').Lead,
          previous_stage_id: previousStageId,
          new_stage_id: newStageId
        })
      } catch (engineErr) {
        SecureLogger.error('Erro ao avaliar automações (lead_stage_changed):', engineErr)
      }
    }

    return result
  } catch (error) {
    SecureLogger.error('Erro ao atualizar etapa do lead:', error)
    throw new Error('Erro ao atualizar etapa do lead')
  }
}

// Buscar histórico de alterações do lead
export async function getLeadHistory(leadId: string) {
  try {
    if (!leadId?.trim()) {
      throw new Error('Lead ID é obrigatório')
    }
    
    const empresaId = await getUserEmpresaId()
    
    // Buscar histórico básico
    const { data: historyData, error: historyError } = await supabase
      .from('lead_pipeline_history')
      .select('*')
      .eq('lead_id', leadId)
      .eq('empresa_id', empresaId)
      .order('changed_at', { ascending: false })
    
    if (historyError) throw historyError
    if (!historyData || historyData.length === 0) {
      return { data: [], error: null }
    }
    
    // Coletar IDs únicos para buscar relacionamentos
    const userIds = new Set<string>()
    const pipelineIds = new Set<string>()
    const stageIds = new Set<string>()
    
    historyData.forEach((entry: any) => {
      if (entry.changed_by) userIds.add(entry.changed_by)
      if (entry.pipeline_id) pipelineIds.add(entry.pipeline_id)
      if (entry.stage_id) stageIds.add(entry.stage_id)
      if (entry.previous_pipeline_id) pipelineIds.add(entry.previous_pipeline_id)
      if (entry.previous_stage_id) stageIds.add(entry.previous_stage_id)
    })
    
    // Buscar usuários
    const usersMap = new Map()
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('uuid, full_name')
        .in('uuid', Array.from(userIds))
      
      users?.forEach((user: any) => {
        usersMap.set(user.uuid, { full_name: user.full_name })
      })
    }
    
    // Buscar pipelines
    const pipelinesMap = new Map()
    if (pipelineIds.size > 0) {
      const { data: pipelines } = await supabase
        .from('pipelines')
        .select('id, name')
        .in('id', Array.from(pipelineIds))
      
      pipelines?.forEach((pipeline: any) => {
        pipelinesMap.set(pipeline.id, { name: pipeline.name })
      })
    }
    
    // Buscar stages
    const stagesMap = new Map()
    if (stageIds.size > 0) {
      const { data: stages } = await supabase
        .from('stages')
        .select('id, name')
        .in('id', Array.from(stageIds))
      
      stages?.forEach((stage: any) => {
        stagesMap.set(stage.id, { name: stage.name })
      })
    }
    
    // Enriquecer dados do histórico
    const enrichedData = historyData.map((entry: any) => ({
      ...entry,
      changed_by_user: entry.changed_by ? usersMap.get(entry.changed_by) : null,
      pipeline: entry.pipeline_id ? pipelinesMap.get(entry.pipeline_id) : null,
      stage: entry.stage_id ? stagesMap.get(entry.stage_id) : null,
      previous_pipeline: entry.previous_pipeline_id ? pipelinesMap.get(entry.previous_pipeline_id) : null,
      previous_stage: entry.previous_stage_id ? stagesMap.get(entry.previous_stage_id) : null
    }))
    
    return { data: enrichedData, error: null }
  } catch (error) {
    SecureLogger.error('❌ Erro ao buscar histórico do lead:', error)
    return { data: [], error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// Função para criar entrada no histórico do lead
async function createLeadHistoryEntry(
  leadId: string,
  changeType: 'created' | 'pipeline_changed' | 'stage_changed' | 'both_changed' | 'marked_as_lost' | 'reactivated' | 'marked_as_sold' | 'sale_unmarked',
  notes?: string,
  pipelineId?: string | null,
  stageId?: string | null,
  previousPipelineId?: string | null,
  previousStageId?: string | null
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    
    const empresaId = await getUserEmpresaId()
    
    const historyEntry = {
      lead_id: leadId,
      empresa_id: empresaId,
      changed_by: user.id,
      changed_at: new Date().toISOString(),
      change_type: changeType,
      notes: notes || null,
      pipeline_id: pipelineId || null,
      stage_id: stageId || null,
      previous_pipeline_id: previousPipelineId || null,
      previous_stage_id: previousStageId || null
    }
    
    const { data, error } = await supabase
      .from('lead_pipeline_history')
      .insert([historyEntry])
      .select()
      .single()
    
    if (error) {
      SecureLogger.error('❌ Erro ao criar entrada no histórico:', error)
      throw error
    }
    
    return { data, error: null }
  } catch (error) {
    SecureLogger.error('❌ Erro ao criar entrada no histórico:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// Função para marcar um lead como perdido
export async function markLeadAsLost(
  leadId: string, 
  lossReasonCategory: string,
  lossReasonNotes?: string
) {
  if (!leadId?.trim()) {
    throw new Error('Lead ID é obrigatório')
  }
  
  if (!lossReasonCategory?.trim()) {
    throw new Error('Categoria do motivo de perda é obrigatória')
  }
  
  // Validar categoria
  const validCategories = [
    'negociacao', 
    'concorrencia', 
    'timing', 
    'sem_budget', 
    'financiamento_nao_aprovado',
    'sem_interesse', 
    'nao_qualificado', 
    'sem_resposta', 
    'outro'
  ]
  
  if (!validCategories.includes(lossReasonCategory)) {
    throw new Error('Categoria de motivo de perda inválida')
  }
  
  // Se a categoria for "outro", a nota é obrigatória
  if (lossReasonCategory === 'outro' && !lossReasonNotes?.trim()) {
    throw new Error('Para a categoria "Outro motivo", é obrigatório informar os detalhes')
  }
  
  // Buscar lead atual para obter pipeline e stage antes da marcação
  const empresaId = await getUserEmpresaId()
  const { data: currentLead } = await supabase
    .from('leads')
    .select('pipeline_id, stage_id')
    .eq('id', leadId)
    .eq('empresa_id', empresaId)
    .single()
  
  // Atualizar o lead
  const result = await updateLead(leadId, {
    loss_reason_category: lossReasonCategory as any,
    loss_reason_notes: lossReasonNotes,
    lost_at: new Date().toISOString(),
    status: 'perdido'
  })
  
  // Criar entrada no histórico
  if (result.data) {
    const { LOSS_REASON_MAP } = await import('../utils/constants')
    const reasonText = LOSS_REASON_MAP[lossReasonCategory as keyof typeof LOSS_REASON_MAP] || lossReasonCategory
    const historyNotes = lossReasonNotes 
      ? `Lead marcado como perdido. Motivo: ${reasonText} - ${lossReasonNotes}`
      : `Lead marcado como perdido. Motivo: ${reasonText}`
    
    await createLeadHistoryEntry(
      leadId,
      'marked_as_lost',
      historyNotes,
      currentLead?.pipeline_id,
      currentLead?.stage_id
    )
  }
  
  return result
}

// Função para reativar um lead (remover status de perdido)
export async function reactivateLead(leadId: string, reactivationNotes?: string) {
  if (!leadId?.trim()) {
    throw new Error('Lead ID é obrigatório')
  }
  
  // Buscar lead atual para verificar se está perdido e obter dados para histórico
  const empresaId = await getUserEmpresaId()
  const { data: currentLead, error: fetchError } = await supabase
    .from('leads')
    .select('loss_reason_category, loss_reason_notes, lost_at, pipeline_id, stage_id')
    .eq('id', leadId)
    .eq('empresa_id', empresaId)
    .single()
  
  if (fetchError || !currentLead) {
    throw new Error('Lead não encontrado')
  }
  
  // Verificar se o lead está realmente marcado como perdido
  if (!currentLead.loss_reason_category && !currentLead.lost_at) {
    throw new Error('Este lead não está marcado como perdido')
  }
  
  // Guardar informações da perda para o histórico
  const { LOSS_REASON_MAP } = await import('../utils/constants')
  const previousReasonText = currentLead.loss_reason_category 
    ? LOSS_REASON_MAP[currentLead.loss_reason_category as keyof typeof LOSS_REASON_MAP] || currentLead.loss_reason_category
    : 'Motivo não especificado'
  
  // Limpar campos de perda e restaurar status para morno
  const result = await updateLead(leadId, {
    loss_reason_category: null as any,
    loss_reason_notes: undefined,
    lost_at: null as any,
    status: 'morno'
  })
  
  // Criar entrada no histórico
  if (result.data) {
    let historyNotes = `Lead reativado. Motivo anterior da perda: ${previousReasonText}`
    
    if (currentLead.loss_reason_notes) {
      historyNotes += ` - ${currentLead.loss_reason_notes}`
    }
    
    if (reactivationNotes?.trim()) {
      historyNotes += `\nMotivo da reativação: ${reactivationNotes}`
    }
    
    await createLeadHistoryEntry(
      leadId,
      'reactivated',
      historyNotes,
      currentLead.pipeline_id,
      currentLead.stage_id
    )
  }
  
  return result
}

// Função para marcar um lead como venda concluída
export async function markLeadAsSold(
  leadId: string,
  soldValue: number,
  saleNotes?: string
) {
  if (!leadId?.trim()) {
    throw new Error('Lead ID é obrigatório')
  }
  
  if (soldValue === undefined || soldValue === null) {
    throw new Error('Valor da venda é obrigatório')
  }
  
  if (soldValue < 0) {
    throw new Error('Valor da venda não pode ser negativo')
  }
  
  // Buscar lead atual para obter pipeline e stage antes da marcação
  const empresaId = await getUserEmpresaId()
  const { data: currentLead, error: fetchError } = await supabase
    .from('leads')
    .select('pipeline_id, stage_id, value, name')
    .eq('id', leadId)
    .eq('empresa_id', empresaId)
    .single()
  
  if (fetchError || !currentLead) {
    throw new Error('Lead não encontrado')
  }
  
  // Atualizar o lead
  const result = await updateLead(leadId, {
    sold_value: soldValue,
    sale_notes: saleNotes,
    sold_at: new Date().toISOString(),
    status: 'venda_confirmada'
  })
  
  // Criar entrada no histórico
  if (result.data) {
    const valueEstimated = currentLead.value || 0
    const valueFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(soldValue)
    
    let historyNotes = `Lead marcado como venda concluída. Valor final: ${valueFormatted}`
    
    if (valueEstimated > 0 && valueEstimated !== soldValue) {
      const estimatedFormatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valueEstimated)
      historyNotes += ` (valor estimado: ${estimatedFormatted})`
    }
    
    if (saleNotes?.trim()) {
      historyNotes += `\nObservações: ${saleNotes}`
    }
    
    await createLeadHistoryEntry(
      leadId,
      'marked_as_sold',
      historyNotes,
      currentLead.pipeline_id,
      currentLead.stage_id
    )
  }
  
  return result
}

// Função para desmarcar venda concluída (voltar lead para negociação)
export async function unmarkSale(leadId: string, unmarkNotes?: string) {
  if (!leadId?.trim()) {
    throw new Error('Lead ID é obrigatório')
  }
  
  // Buscar lead atual para verificar se está vendido e obter dados para histórico
  const empresaId = await getUserEmpresaId()
  const { data: currentLead, error: fetchError } = await supabase
    .from('leads')
    .select('sold_at, sold_value, sale_notes, pipeline_id, stage_id')
    .eq('id', leadId)
    .eq('empresa_id', empresaId)
    .single()
  
  if (fetchError || !currentLead) {
    throw new Error('Lead não encontrado')
  }
  
  // Verificar se o lead está realmente marcado como vendido
  if (!currentLead.sold_at) {
    throw new Error('Este lead não está marcado como venda concluída')
  }
  
  // Guardar informações da venda para o histórico
  const previousValue = currentLead.sold_value || 0
  const valueFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(previousValue)
  
  // Limpar campos de venda e restaurar status para morno
  const result = await updateLead(leadId, {
    sold_at: null as any,
    sold_value: null as any,
    sale_notes: undefined,
    status: 'morno'
  })
  
  // Criar entrada no histórico
  if (result.data) {
    let historyNotes = `Venda desmarcada. Valor anterior: ${valueFormatted}`
    
    if (currentLead.sale_notes) {
      historyNotes += `\nObservações da venda: ${currentLead.sale_notes}`
    }
    
    if (unmarkNotes?.trim()) {
      historyNotes += `\nMotivo da desmarcação: ${unmarkNotes}`
    }
    
    await createLeadHistoryEntry(
      leadId,
      'sale_unmarked',
      historyNotes,
      currentLead.pipeline_id,
      currentLead.stage_id
    )
  }
  
  return result
} 