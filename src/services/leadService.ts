import { supabase } from './supabaseClient'
import type { Lead } from '../types'

// Importar função centralizada
import { getUserEmpresaId } from './authService'

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

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`)
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
    console.error('Erro ao buscar leads:', error)
    throw error
  }
}

export async function getLeadsByPipeline(pipeline_id: string) {
  if (!pipeline_id?.trim()) {
    throw new Error('Pipeline ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  const LIMIT = 200
  
  const result = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('pipeline_id', pipeline_id)
    .eq('empresa_id', empresaId)
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
    console.error('❌ Erro ao buscar lead por ID:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function getLeadByPhone(phone: string) {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      console.error('❌ Empresa não identificada')
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
      console.error('❌ Erro na query:', error)
      throw error
    }
    
    return { data: data || null, error: null }
  } catch (error) {
    console.error('❌ Erro ao buscar lead por telefone:', error)
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
    status: data.status || 'quente'
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
  
  // Validar se o lead pertence à empresa do usuário
  const { data: existingLead, error: checkError } = await supabase
    .from('leads')
    .select('id')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (checkError || !existingLead) {
    throw new Error('Lead não encontrado ou não pertence à sua empresa')
  }
  
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
  
  if (data.pipeline_id !== undefined) {
    sanitizedData.pipeline_id = data.pipeline_id
  }
  
  if (data.stage_id !== undefined) {
    sanitizedData.stage_id = data.stage_id
  }
  
  return await supabase
    .from('leads')
    .update(sanitizedData)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()
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
    const result = await supabase
      .from('leads')
      .update({ stage_id: newStageId })
      .eq('id', leadId)
      .eq('empresa_id', empresaId)
      .select()
      .single()
    
    return result
  } catch (error) {
    console.error('Erro ao atualizar etapa do lead:', error)
    throw new Error('Erro ao atualizar etapa do lead')
  }
} 