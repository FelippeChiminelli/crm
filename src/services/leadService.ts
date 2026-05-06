import { supabase } from './supabaseClient'
import type { Lead } from '../types'
import SecureLogger from '../utils/logger'

// Importar função centralizada
import { getUserEmpresaId } from './authService'
import { getLeadsVisibilityContext, applyLeadVisibilityFilter } from './leadVisibilityService'

import { markMultipleVehiclesAsSold, markMultipleVehiclesAsAvailable } from './vehicleService'
import { markMultipleProductsAsSold, markMultipleProductsAsAvailable } from './productSaleService'

// Tamanho do lote para queries que precisam trazer todos os dados (filtros)
// O Supabase limita a 1000 linhas por query; usamos paginação para contornar
const FILTER_OPTIONS_BATCH_SIZE = 1000

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
  loss_reason_category?: string | null // Pode ser UUID (novo) ou valor antigo (ex: 'negociacao')
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

// Interface para filtros de campos personalizados
export interface CustomFieldFilter {
  field_id: string
  value: string
}

export interface GetLeadsParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  pipeline_id?: string
  stage_id?: string
  /** @deprecated Use dateFrom/dateTo para intervalo. Mantido para compatibilidade. */
  created_at?: string
  /** Data inicial do intervalo (YYYY-MM-DD). Inclui o dia inteiro. */
  dateFrom?: string
  /** Data final do intervalo (YYYY-MM-DD). Inclui o dia inteiro. */
  dateTo?: string
  responsible_uuid?: string
  tags?: string[] // Filtrar leads que contém qualquer uma das tags
  origin?: string // Filtrar leads por origem
  customFieldFilters?: CustomFieldFilter[] // Filtrar leads por campos personalizados
  /** Incluir leads perdidos na listagem (padrão: false = ocultar) */
  showLostLeads?: boolean
  /** Incluir leads vendidos na listagem (padrão: false = ocultar) */
  showSoldLeads?: boolean
  /** Quando showLostLeads=true, filtrar por estes motivos de perda */
  selectedLossReasons?: string[]
  /** Campo pelo qual ordenar os resultados (padrão: created_at) */
  sortBy?: 'name' | 'responsible_uuid' | 'origin' | 'created_at'
  /** Direção da ordenação (padrão: desc) */
  sortOrder?: 'asc' | 'desc'
}

export async function getLeads(params: GetLeadsParams = {}) {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      return { data: [], error: null, total: 0 }
    }

    const visibility = await getLeadsVisibilityContext()
    if (!visibility) {
      return { data: [], error: null, total: 0 }
    }

    const { 
      page = 1, 
      limit = 25, 
      search, 
      status, 
      pipeline_id, 
      stage_id,
      created_at,
      dateFrom,
      dateTo,
      responsible_uuid,
      tags,
      origin,
      customFieldFilters,
      showLostLeads,
      showSoldLeads,
      selectedLossReasons,
      sortBy = 'created_at',
      sortOrder = 'desc'
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

    // Aplica regra de visibilidade (admin vê tudo; vendedor vê próprios + sem responsável em pipelines permitidos)
    query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })

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

    // Filtros de visibilidade: leads perdidos e vendidos (aplicados no backend para paginação correta)
    if (status === 'perdido') {
      if (selectedLossReasons && selectedLossReasons.length > 0) {
        query = query.in('loss_reason_category', selectedLossReasons)
      }
    } else if (status !== 'venda_confirmada') {
      if (!showLostLeads) {
        query = query.is('loss_reason_category', null)
      } else if (selectedLossReasons && selectedLossReasons.length > 0) {
        query = query.in('loss_reason_category', selectedLossReasons)
      }
      if (!showSoldLeads) {
        query = query.is('sold_at', null)
      }
    }

    // Filtro por data: prioriza dateFrom/dateTo (intervalo), fallback para created_at (dia único)
    if (dateFrom || dateTo) {
      if (dateFrom) {
        const fromVal = dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00`
        query = query.gte('created_at', fromVal)
      }
      if (dateTo) {
        const toVal = dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59.999`
        query = query.lte('created_at', toVal)
      }
    } else if (created_at) {
      // Compatibilidade: dia único (formato YYYY-MM-DD)
      const fromVal = `${created_at}T00:00:00`
      const toVal = `${created_at}T23:59:59.999`
      query = query.gte('created_at', fromVal).lte('created_at', toVal)
    }

    if (responsible_uuid) {
      console.log('🔍 Filtrando leads (página) por responsável:', responsible_uuid)
      query = query.eq('responsible_uuid', responsible_uuid)
    }

    // Filtrar por tags (leads que contém qualquer uma das tags selecionadas)
    if (tags && tags.length > 0) {
      console.log('🏷️ Filtrando leads por tags:', tags)
      query = query.overlaps('tags', tags)
    }

    // Filtrar por origem
    if (origin) {
      query = query.eq('origin', origin)
    }

    // Filtrar por campos personalizados
    // Para cada filtro de campo personalizado, buscar os lead_ids que correspondem
    if (customFieldFilters && customFieldFilters.length > 0) {
      for (const filter of customFieldFilters) {
        // Buscar IDs de leads que têm o valor do campo personalizado
        const { data: matchingValues } = await supabase
          .from('lead_custom_values')
          .select('lead_id')
          .eq('field_id', filter.field_id)
          .ilike('value', `%${filter.value}%`)
        
        if (matchingValues && matchingValues.length > 0) {
          const leadIds = matchingValues.map(v => v.lead_id)
          query = query.in('id', leadIds)
        } else {
          // Se não há leads com esse valor, retornar vazio
          return { data: [], error: null, total: 0 }
        }
      }
    }

    // Aplicar ordenação e paginação
    const offset = (page - 1) * limit
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
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

export async function getFilteredLeadIds(params: Omit<GetLeadsParams, 'page' | 'limit'> = {}): Promise<string[]> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) return []

    const visibility = await getLeadsVisibilityContext()
    if (!visibility) return []

    const { search, status, pipeline_id, stage_id, created_at, dateFrom, dateTo, responsible_uuid, tags, origin, customFieldFilters, showLostLeads, showSoldLeads, selectedLossReasons } = params

    let query = supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('empresa_id', empresaId)

    query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })

    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    if (status) query = query.eq('status', status)
    if (pipeline_id) query = query.eq('pipeline_id', pipeline_id)
    if (stage_id) query = query.eq('stage_id', stage_id)

    if (status === 'perdido') {
      if (selectedLossReasons && selectedLossReasons.length > 0) {
        query = query.in('loss_reason_category', selectedLossReasons)
      }
    } else if (status !== 'venda_confirmada') {
      if (!showLostLeads) query = query.is('loss_reason_category', null)
      else if (selectedLossReasons && selectedLossReasons.length > 0) {
        query = query.in('loss_reason_category', selectedLossReasons)
      }
      if (!showSoldLeads) query = query.is('sold_at', null)
    }

    if (dateFrom || dateTo) {
      if (dateFrom) {
        const fromVal = dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00`
        query = query.gte('created_at', fromVal)
      }
      if (dateTo) {
        const toVal = dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59.999`
        query = query.lte('created_at', toVal)
      }
    } else if (created_at) {
      const fromVal = `${created_at}T00:00:00`
      const toVal = `${created_at}T23:59:59.999`
      query = query.gte('created_at', fromVal).lte('created_at', toVal)
    }

    if (responsible_uuid) query = query.eq('responsible_uuid', responsible_uuid)
    if (tags && tags.length > 0) query = query.overlaps('tags', tags)
    if (origin) query = query.eq('origin', origin)

    if (customFieldFilters && customFieldFilters.length > 0) {
      for (const filter of customFieldFilters) {
        const { data: matchingValues } = await supabase
          .from('lead_custom_values')
          .select('lead_id')
          .eq('field_id', filter.field_id)
          .ilike('value', `%${filter.value}%`)

        if (matchingValues && matchingValues.length > 0) {
          query = query.in('id', matchingValues.map(v => v.lead_id))
        } else {
          return []
        }
      }
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return (data || []).map((row: { id: string }) => row.id)
  } catch (error) {
    SecureLogger.error('Erro ao buscar IDs filtrados de leads:', error)
    throw error
  }
}

export interface BulkMoveResult {
  success: number
  failed: number
  errors: string[]
}

export async function bulkMoveLeads(
  leadIds: string[],
  targetPipelineId: string,
  targetStageId: string,
  onProgress?: (current: number, total: number) => void
): Promise<BulkMoveResult> {
  const result: BulkMoveResult = { success: 0, failed: 0, errors: [] }
  const total = leadIds.length

  for (let i = 0; i < total; i++) {
    try {
      await updateLead(leadIds[i], {
        pipeline_id: targetPipelineId,
        stage_id: targetStageId
      })
      result.success++
    } catch (err) {
      result.failed++
      result.errors.push(`Lead ${leadIds[i]}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
    onProgress?.(i + 1, total)
  }

  return result
}

export interface BulkTagsResult {
  success: number
  failed: number
  errors: string[]
}

export async function bulkAddTags(
  leadIds: string[],
  tags: string[],
  onProgress?: (current: number, total: number) => void
): Promise<BulkTagsResult> {
  const result: BulkTagsResult = { success: 0, failed: 0, errors: [] }
  const total = leadIds.length

  if (tags.length === 0 || total === 0) return result

  const empresaId = await getUserEmpresaId()

  const { data: leadsData, error: fetchError } = await supabase
    .from('leads')
    .select('id, tags')
    .in('id', leadIds)
    .eq('empresa_id', empresaId)

  if (fetchError) throw new Error('Erro ao buscar tags dos leads: ' + fetchError.message)

  const tagsMap = new Map<string, string[]>()
  for (const lead of leadsData || []) {
    tagsMap.set(lead.id, lead.tags || [])
  }

  for (let i = 0; i < total; i++) {
    const leadId = leadIds[i]
    const currentTags = tagsMap.get(leadId) || []
    const mergedTags = [...new Set([...currentTags, ...tags])]

    try {
      const { error } = await supabase
        .from('leads')
        .update({ tags: mergedTags })
        .eq('id', leadId)
        .eq('empresa_id', empresaId)

      if (error) throw error
      result.success++
    } catch (err) {
      result.failed++
      result.errors.push(`Lead ${leadId}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
    onProgress?.(i + 1, total)
  }

  return result
}

export interface BulkOriginResult {
  success: number
  failed: number
  errors: string[]
}

export async function bulkUpdateOrigin(
  leadIds: string[],
  origin: string,
  onProgress?: (current: number, total: number) => void
): Promise<BulkOriginResult> {
  const result: BulkOriginResult = { success: 0, failed: 0, errors: [] }
  const total = leadIds.length

  if (!origin.trim() || total === 0) return result

  const empresaId = await getUserEmpresaId()

  for (let i = 0; i < total; i++) {
    const leadId = leadIds[i]
    try {
      const { error } = await supabase
        .from('leads')
        .update({ origin: origin.trim() })
        .eq('id', leadId)
        .eq('empresa_id', empresaId)

      if (error) throw error
      result.success++
    } catch (err) {
      result.failed++
      result.errors.push(`Lead ${leadId}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
    onProgress?.(i + 1, total)
  }

  return result
}

export interface BulkResponsibleResult {
  success: number
  failed: number
  errors: string[]
}

export async function bulkUpdateResponsible(
  leadIds: string[],
  responsibleUuid: string | null,
  onProgress?: (current: number, total: number) => void
): Promise<BulkResponsibleResult> {
  const result: BulkResponsibleResult = { success: 0, failed: 0, errors: [] }
  const total = leadIds.length

  if (total === 0) return result

  const empresaId = await getUserEmpresaId()

  for (let i = 0; i < total; i++) {
    const leadId = leadIds[i]
    try {
      const { error } = await supabase
        .from('leads')
        .update({ responsible_uuid: responsibleUuid })
        .eq('id', leadId)
        .eq('empresa_id', empresaId)

      if (error) throw error
      result.success++
    } catch (err) {
      result.failed++
      result.errors.push(`Lead ${leadId}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
    onProgress?.(i + 1, total)
  }

  return result
}

export interface BulkDeleteResult {
  success: number
  failed: number
  errors: string[]
}

export async function bulkDeleteLeads(
  leadIds: string[],
  onProgress?: (current: number, total: number) => void
): Promise<BulkDeleteResult> {
  const result: BulkDeleteResult = { success: 0, failed: 0, errors: [] }
  const total = leadIds.length

  if (total === 0) return result

  for (let i = 0; i < total; i++) {
    try {
      const { error } = await deleteLead(leadIds[i])
      if (error) throw error
      result.success++
    } catch (err) {
      result.failed++
      result.errors.push(`Lead ${leadIds[i]}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
    onProgress?.(i + 1, total)
  }

  return result
}

export type KanbanSortField = 'created_at' | 'value' | 'name' | 'last_contact_at'
export type KanbanSortDirection = 'asc' | 'desc'

export interface KanbanSort {
  field: KanbanSortField
  direction: KanbanSortDirection
}

export const DEFAULT_KANBAN_SORT: KanbanSort = {
  field: 'created_at',
  direction: 'desc'
}

export interface PipelineFilters {
  status?: string[]
  showLostLeads?: boolean
  showSoldLeads?: boolean
  dateFrom?: string
  dateTo?: string
  search?: string
  responsible_uuid?: string
  tags?: string[]
  origin?: string
  customFieldFilters?: CustomFieldFilter[]
  selectedLossReasons?: string[]
}

export async function getLeadsByPipeline(pipeline_id: string, filters?: PipelineFilters) {
  if (!pipeline_id?.trim()) {
    throw new Error('Pipeline ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  const visibility = await getLeadsVisibilityContext()
  if (!visibility) {
    return { data: [], error: null, reachedLimit: false, total: 0 }
  }
  
  // Verificar se há filtros ativos
  const hasActiveFilters = !!(
    filters?.showLostLeads ||
    filters?.showSoldLeads ||
    (filters?.status && filters.status.length > 0) ||
    filters?.search?.trim() ||
    filters?.dateFrom ||
    filters?.dateTo ||
    (filters?.selectedLossReasons && filters.selectedLossReasons.length > 0)
  )
  
  // Se há filtros, usar limite maior; caso contrário, buscar por estágio
  const LIMIT_WITH_FILTERS = 500 // Limite maior quando filtros estão ativos
  const LIMIT_PER_STAGE = 50 // Limite por estágio quando não há filtros
  
  // Se há filtros ativos, usar a abordagem tradicional com limite maior
  if (hasActiveFilters && filters) {
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('pipeline_id', pipeline_id)
      .eq('empresa_id', empresaId)

    query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })

    // Aplicar filtros
    if (!filters.showLostLeads) {
      query = query.is('loss_reason_category', null)
    } else if (filters.selectedLossReasons && filters.selectedLossReasons.length > 0) {
      query = query.in('loss_reason_category', filters.selectedLossReasons)
    }

    if (!filters.showSoldLeads) {
      query = query.is('sold_at', null)
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim()
      query = query.or(
        `name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,origin.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`
      )
    }

    if (filters.dateFrom) {
      const fromDate = filters.dateFrom.includes('T') ? filters.dateFrom : `${filters.dateFrom}T00:00:00`
      query = query.gte('created_at', fromDate)
    }

    if (filters.dateTo) {
      const toDate = filters.dateTo.includes('T') ? filters.dateTo : `${filters.dateTo}T23:59:59.999`
      query = query.lte('created_at', toDate)
    }

    if (filters.responsible_uuid) {
      console.log('🔍 Filtrando leads por responsável:', filters.responsible_uuid)
      query = query.eq('responsible_uuid', filters.responsible_uuid)
    }

    if (filters.tags && filters.tags.length > 0) {
      console.log('🏷️ Filtrando leads por tags:', filters.tags)
      query = query.overlaps('tags', filters.tags)
    }

    // Filtrar por origem
    if (filters.origin) {
      query = query.eq('origin', filters.origin)
    }

    // Filtrar por campos personalizados
    if (filters.customFieldFilters && filters.customFieldFilters.length > 0) {
      for (const filter of filters.customFieldFilters) {
        // Buscar IDs de leads que têm o valor do campo personalizado
        const { data: matchingValues } = await supabase
          .from('lead_custom_values')
          .select('lead_id')
          .eq('field_id', filter.field_id)
          .ilike('value', `%${filter.value}%`)
        
        if (matchingValues && matchingValues.length > 0) {
          const leadIds = matchingValues.map(v => v.lead_id)
          query = query.in('id', leadIds)
        } else {
          // Se não há leads com esse valor, retornar vazio
          return { data: [], error: null, reachedLimit: false, total: 0 }
        }
      }
    }

    const result = await query
      .order('created_at', { ascending: false })
      .limit(LIMIT_WITH_FILTERS)

    const total = result.count || 0
    const reachedLimit = total > LIMIT_WITH_FILTERS
    return { ...result, reachedLimit, total }
  }
  
  // Sem filtros: buscar leads distribuídos por estágio para garantir representação
  try {
    // Primeiro, buscar todos os estágios deste pipeline
    const { data: stages, error: stagesError } = await supabase
      .from('stages')
      .select('id')
      .eq('pipeline_id', pipeline_id)
      .eq('empresa_id', empresaId)
      .order('position', { ascending: true })
    
    if (stagesError) {
      SecureLogger.error('❌ Erro ao buscar stages, usando fallback:', stagesError)
      // Fallback: usar abordagem tradicional
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('pipeline_id', pipeline_id)
        .eq('empresa_id', empresaId)

      query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })
      
      if (filters) {
        if (!filters.showLostLeads) {
          query = query.is('loss_reason_category', null)
        } else if (filters.selectedLossReasons && filters.selectedLossReasons.length > 0) {
          query = query.in('loss_reason_category', filters.selectedLossReasons)
        }
        if (!filters.showSoldLeads) {
          query = query.is('sold_at', null)
        }
      }
      
      const result = await query
        .order('created_at', { ascending: false })
        .limit(LIMIT_PER_STAGE * 4) // 200 leads no total como fallback
      
      const total = result.count || 0
      const reachedLimit = total > (LIMIT_PER_STAGE * 4)
      return { ...result, reachedLimit, total }
    }
    
    if (!stages || stages.length === 0) {
      return { data: [], error: null, reachedLimit: false, total: 0 }
    }
    
    // Buscar leads de cada estágio em paralelo com limite por estágio
    const leadsPromises = stages.map(stage => {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('pipeline_id', pipeline_id)
        .eq('stage_id', stage.id)
        .eq('empresa_id', empresaId)

      query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })
      
      // Aplicar filtros padrão (perdidos e vendidos)
      if (filters) {
        if (!filters.showLostLeads) {
          query = query.is('loss_reason_category', null)
        } else if (filters.selectedLossReasons && filters.selectedLossReasons.length > 0) {
          query = query.in('loss_reason_category', filters.selectedLossReasons)
        }
        if (!filters.showSoldLeads) {
          query = query.is('sold_at', null)
        }
      }
      
      return query
        .order('created_at', { ascending: false })
        .limit(LIMIT_PER_STAGE)
    })
    
    const results = await Promise.all(leadsPromises)
    
    // Combinar todos os leads
    const allLeads: Lead[] = []
    let totalCount = 0
    let anyStageReachedLimit = false
    
    results.forEach((result) => {
      if (result.data) {
        allLeads.push(...result.data)
      }
      if (result.count) {
        totalCount += result.count
        // Verificar se algum estágio atingiu o limite
        if (result.count > LIMIT_PER_STAGE) {
          anyStageReachedLimit = true
        }
      }
    })
    
    SecureLogger.log(`📊 Leads carregados: ${allLeads.length} de ${totalCount} total (${stages.length} estágios)`)
    
    return {
      data: allLeads,
      error: null,
      reachedLimit: anyStageReachedLimit,
      total: totalCount
    }
  } catch (error) {
    SecureLogger.error('❌ Erro inesperado ao buscar leads por estágio:', error)
    // Fallback final em caso de erro inesperado
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('pipeline_id', pipeline_id)
      .eq('empresa_id', empresaId)

    query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })
    
    if (filters) {
      if (!filters.showLostLeads) {
        query = query.is('loss_reason_category', null)
      } else if (filters.selectedLossReasons && filters.selectedLossReasons.length > 0) {
        query = query.in('loss_reason_category', filters.selectedLossReasons)
      }
      if (!filters.showSoldLeads) {
        query = query.is('sold_at', null)
      }
    }
    
    const result = await query
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_STAGE * 4)
    
    const total = result.count || 0
    const reachedLimit = total > (LIMIT_PER_STAGE * 4)
    return { ...result, reachedLimit, total }
  }
}

export async function getLeadsByPipelineForKanban(pipeline_id: string, filters?: PipelineFilters) {
  if (!pipeline_id?.trim()) {
    throw new Error('Pipeline ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  const visibility = await getLeadsVisibilityContext()
  if (!visibility) {
    return { data: [], error: null, reachedLimit: false, total: 0, countsByStage: {} }
  }
  
  // Verificar se há filtros de busca/seleção ativos (exclui showLostLeads/showSoldLeads que são visibilidade)
  // showLostLeads e showSoldLeads são aplicados em ambos os fluxos; quando são os únicos "ativos",
  // usamos a busca por estágio para garantir contagens corretas (evita truncar por limite 500)
  const hasActiveFilters = !!(
    (filters?.status && filters.status.length > 0) ||
    filters?.search?.trim() ||
    filters?.dateFrom ||
    filters?.dateTo ||
    filters?.responsible_uuid ||
    (filters?.tags && filters.tags.length > 0) ||
    filters?.origin ||
    (filters?.customFieldFilters && filters.customFieldFilters.length > 0) ||
    (filters?.selectedLossReasons && filters.selectedLossReasons.length > 0)
  )
  
  // Se há filtros, usar limite maior; caso contrário, buscar por estágio
  const LIMIT_WITH_FILTERS = 500 // Limite maior quando filtros estão ativos
  const LIMIT_PER_STAGE = 50 // Limite por estágio quando não há filtros
  
  // SELECT otimizado apenas com campos necessários para o Kanban
  // Inclui campos de venda (sold_at, sold_value, sale_notes) e perda (lost_at, loss_reason_category, loss_reason_notes)
  const SELECT_FIELDS = 'id, name, company, value, phone, email, status, origin, created_at, stage_id, loss_reason_category, loss_reason_notes, lost_at, sold_at, sold_value, sale_notes, tags, notes, last_contact_at, pipeline_id, responsible_uuid'
  
  // Se há filtros ativos, usar a abordagem tradicional com limite maior
  if (hasActiveFilters && filters) {
    let query = supabase
      .from('leads')
      .select(SELECT_FIELDS, { count: 'exact' })
      .eq('pipeline_id', pipeline_id)
      .eq('empresa_id', empresaId)

    query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })

    // Aplicar filtros
    if (!filters.showLostLeads) {
      query = query.is('loss_reason_category', null)
    } else if (filters.selectedLossReasons && filters.selectedLossReasons.length > 0) {
      query = query.in('loss_reason_category', filters.selectedLossReasons)
    }

    if (!filters.showSoldLeads) {
      query = query.is('sold_at', null)
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim()
      query = query.or(
        `name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,origin.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`
      )
    }

    if (filters.dateFrom) {
      const fromDate = filters.dateFrom.includes('T') ? filters.dateFrom : `${filters.dateFrom}T00:00:00`
      query = query.gte('created_at', fromDate)
    }

    if (filters.dateTo) {
      const toDate = filters.dateTo.includes('T') ? filters.dateTo : `${filters.dateTo}T23:59:59.999`
      query = query.lte('created_at', toDate)
    }

    if (filters.responsible_uuid) {
      console.log('🔍 Filtrando leads por responsável:', filters.responsible_uuid)
      query = query.eq('responsible_uuid', filters.responsible_uuid)
    }

    if (filters.tags && filters.tags.length > 0) {
      console.log('🏷️ Filtrando leads por tags:', filters.tags)
      query = query.overlaps('tags', filters.tags)
    }

    // Filtrar por origem
    if (filters.origin) {
      query = query.eq('origin', filters.origin)
    }

    // Filtrar por campos personalizados
    if (filters.customFieldFilters && filters.customFieldFilters.length > 0) {
      for (const filter of filters.customFieldFilters) {
        // Buscar IDs de leads que têm o valor do campo personalizado
        const { data: matchingValues } = await supabase
          .from('lead_custom_values')
          .select('lead_id')
          .eq('field_id', filter.field_id)
          .ilike('value', `%${filter.value}%`)
        
        if (matchingValues && matchingValues.length > 0) {
          const leadIds = matchingValues.map(v => v.lead_id)
          query = query.in('id', leadIds)
        } else {
          // Se não há leads com esse valor, retornar vazio
          return { data: [], error: null, reachedLimit: false, total: 0, countsByStage: {} }
        }
      }
    }

    const result = await query
      .order('created_at', { ascending: false })
      .limit(LIMIT_WITH_FILTERS)

    const total = result.count || 0
    const reachedLimit = total > LIMIT_WITH_FILTERS
    
    // Calcular contagens por estágio a partir dos leads retornados
    const countsByStage: { [stageId: string]: number } = {}
    if (result.data) {
      result.data.forEach((lead: any) => {
        if (lead.stage_id) {
          countsByStage[lead.stage_id] = (countsByStage[lead.stage_id] || 0) + 1
        }
      })
    }
    
    return { ...result, reachedLimit, total, countsByStage }
  }
  
  // Sem filtros: buscar leads distribuídos por estágio para garantir representação
  try {
    // Primeiro, buscar todos os estágios deste pipeline
    const { data: stages, error: stagesError } = await supabase
      .from('stages')
      .select('id')
      .eq('pipeline_id', pipeline_id)
      .eq('empresa_id', empresaId)
      .order('position', { ascending: true })
    
    if (stagesError) {
      SecureLogger.error('❌ Erro ao buscar stages, usando fallback:', stagesError)
      // Fallback: usar abordagem tradicional
      let query = supabase
        .from('leads')
        .select(SELECT_FIELDS, { count: 'exact' })
        .eq('pipeline_id', pipeline_id)
        .eq('empresa_id', empresaId)

      query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })
      
      if (filters) {
        if (!filters.showLostLeads) {
          query = query.is('loss_reason_category', null)
        } else if (filters.selectedLossReasons && filters.selectedLossReasons.length > 0) {
          query = query.in('loss_reason_category', filters.selectedLossReasons)
        }
        if (!filters.showSoldLeads) {
          query = query.is('sold_at', null)
        }
      }
      
      const result = await query
        .order('created_at', { ascending: false })
        .limit(LIMIT_PER_STAGE * 4) // 200 leads no total como fallback
      
      const total = result.count || 0
      const reachedLimit = total > (LIMIT_PER_STAGE * 4)
      
      // Calcular contagens por estágio a partir dos leads retornados
      const countsByStage: { [stageId: string]: number } = {}
      if (result.data) {
        result.data.forEach((lead: any) => {
          if (lead.stage_id) {
            countsByStage[lead.stage_id] = (countsByStage[lead.stage_id] || 0) + 1
          }
        })
      }
      
      return { ...result, reachedLimit, total, countsByStage }
    }
    
    if (!stages || stages.length === 0) {
      return { data: [], error: null, reachedLimit: false, total: 0, countsByStage: {} }
    }
    
    // Buscar leads de cada estágio em paralelo com limite por estágio
    const leadsPromises = stages.map(stage => {
      let query = supabase
        .from('leads')
        .select(SELECT_FIELDS, { count: 'exact' })
        .eq('pipeline_id', pipeline_id)
        .eq('stage_id', stage.id)
        .eq('empresa_id', empresaId)

      query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })
      
      // Aplicar filtros padrão (perdidos e vendidos)
      if (filters) {
        if (!filters.showLostLeads) {
          query = query.is('loss_reason_category', null)
        } else if (filters.selectedLossReasons && filters.selectedLossReasons.length > 0) {
          query = query.in('loss_reason_category', filters.selectedLossReasons)
        }
        if (!filters.showSoldLeads) {
          query = query.is('sold_at', null)
        }
      }
      
      return query
        .order('created_at', { ascending: false })
        .limit(LIMIT_PER_STAGE)
        .then(result => ({ ...result, stageId: stage.id }))
    })
    
    const results = await Promise.all(leadsPromises)
    
    // Combinar todos os leads
    const allLeads: Lead[] = []
    let totalCount = 0
    let anyStageReachedLimit = false
    const countsByStage: { [stageId: string]: number } = {}
    
    results.forEach((result) => {
      if (result.data) {
        allLeads.push(...result.data)
      }
      if (result.count !== null && result.count !== undefined) {
        totalCount += result.count
        // Armazenar contagem por estágio
        countsByStage[result.stageId] = result.count
        // Verificar se algum estágio atingiu o limite
        if (result.count > LIMIT_PER_STAGE) {
          anyStageReachedLimit = true
        }
      }
    })
    
    SecureLogger.log(`📊 Leads carregados (Kanban otimizado): ${allLeads.length} de ${totalCount} total (${stages.length} estágios)`)
    
    return {
      data: allLeads,
      error: null,
      reachedLimit: anyStageReachedLimit,
      total: totalCount,
      countsByStage
    }
  } catch (error) {
    SecureLogger.error('❌ Erro inesperado ao buscar leads por estágio (Kanban):', error)
    // Fallback final em caso de erro inesperado
    let query = supabase
      .from('leads')
      .select(SELECT_FIELDS, { count: 'exact' })
      .eq('pipeline_id', pipeline_id)
      .eq('empresa_id', empresaId)

    query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })
    
    if (filters) {
      if (!filters.showLostLeads) {
        query = query.is('loss_reason_category', null)
      } else if (filters.selectedLossReasons && filters.selectedLossReasons.length > 0) {
        query = query.in('loss_reason_category', filters.selectedLossReasons)
      }
      if (!filters.showSoldLeads) {
        query = query.is('sold_at', null)
      }
    }
    
    const result = await query
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_STAGE * 4)
    
    const total = result.count || 0
    const reachedLimit = total > (LIMIT_PER_STAGE * 4)
    
    // Calcular contagens por estágio a partir dos leads retornados
    const countsByStage: { [stageId: string]: number } = {}
    if (result.data) {
      result.data.forEach((lead: any) => {
        if (lead.stage_id) {
          countsByStage[lead.stage_id] = (countsByStage[lead.stage_id] || 0) + 1
        }
      })
    }
    
    return { ...result, reachedLimit, total, countsByStage }
  }
}

export interface StageLeadsFetchOptions {
  sort?: KanbanSort
  offset?: number
  limit?: number
  filters?: PipelineFilters
}

/**
 * Busca leads de um único estágio com suporte a ordenação, offset e filtros.
 * Usado para re-ordenar um estágio individual e para paginação ("carregar mais").
 */
export async function getLeadsByStageForKanban(
  pipeline_id: string,
  stage_id: string,
  options: StageLeadsFetchOptions = {}
): Promise<{ data: Lead[]; total: number }> {
  const empresaId = await getUserEmpresaId()
  const visibility = await getLeadsVisibilityContext()
  if (!visibility) {
    return { data: [], total: 0 }
  }
  const { sort = DEFAULT_KANBAN_SORT, offset = 0, limit: fetchLimit = 50, filters } = options

  const SELECT_FIELDS = 'id, name, company, value, phone, email, status, origin, created_at, stage_id, loss_reason_category, loss_reason_notes, lost_at, sold_at, sold_value, sale_notes, tags, notes, last_contact_at, pipeline_id, responsible_uuid'

  let query = supabase
    .from('leads')
    .select(SELECT_FIELDS, { count: 'exact' })
    .eq('pipeline_id', pipeline_id)
    .eq('stage_id', stage_id)
    .eq('empresa_id', empresaId)

  query = applyLeadVisibilityFilter(query, visibility, { pipelineId: pipeline_id })

  if (filters) {
    if (!filters.showLostLeads) {
      query = query.is('loss_reason_category', null)
    } else if (filters.selectedLossReasons && filters.selectedLossReasons.length > 0) {
      query = query.in('loss_reason_category', filters.selectedLossReasons)
    }
    if (!filters.showSoldLeads) {
      query = query.is('sold_at', null)
    }
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }
    if (filters.search?.trim()) {
      const s = filters.search.trim()
      query = query.or(`name.ilike.%${s}%,company.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,origin.ilike.%${s}%,status.ilike.%${s}%`)
    }
    if (filters.dateFrom) {
      const d = filters.dateFrom.includes('T') ? filters.dateFrom : `${filters.dateFrom}T00:00:00`
      query = query.gte('created_at', d)
    }
    if (filters.dateTo) {
      const d = filters.dateTo.includes('T') ? filters.dateTo : `${filters.dateTo}T23:59:59.999`
      query = query.lte('created_at', d)
    }
    if (filters.responsible_uuid) query = query.eq('responsible_uuid', filters.responsible_uuid)
    if (filters.tags && filters.tags.length > 0) query = query.overlaps('tags', filters.tags)
    if (filters.origin) query = query.eq('origin', filters.origin)
    if (filters.customFieldFilters && filters.customFieldFilters.length > 0) {
      for (const f of filters.customFieldFilters) {
        const { data: matchingValues } = await supabase
          .from('lead_custom_values').select('lead_id').eq('field_id', f.field_id).ilike('value', `%${f.value}%`)
        if (matchingValues && matchingValues.length > 0) {
          query = query.in('id', matchingValues.map(v => v.lead_id))
        } else {
          return { data: [], total: 0 }
        }
      }
    }
  }

  const ascending = sort.direction === 'asc'
  if (sort.field === 'value' || sort.field === 'last_contact_at') {
    query = query.order(sort.field, { ascending, nullsFirst: false })
  } else {
    query = query.order(sort.field, { ascending })
  }
  query = query.order('id', { ascending: true })

  const result = await query.range(offset, offset + fetchLimit - 1)
  return { data: (result.data as Lead[]) || [], total: result.count || 0 }
}

export async function getLeadsByStage(stage_id: string) {
  if (!stage_id?.trim()) {
    throw new Error('Stage ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  const visibility = await getLeadsVisibilityContext()
  if (!visibility) {
    return { data: [], error: null, count: 0 }
  }

  let query = supabase
    .from('leads')
    .select('*')
    .eq('stage_id', stage_id)
    .eq('empresa_id', empresaId)

  query = applyLeadVisibilityFilter(query, visibility)

  return query.order('created_at', { ascending: false })
}

/**
 * Busca todas as tags únicas dos leads da empresa
 * Usado para popular o filtro de tags com todas as opções disponíveis
 * Usa paginação para contornar o limite de 1000 linhas do Supabase
 */
export async function getAllLeadTags(): Promise<string[]> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) return []

    const allTags: string[] = []
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from('leads')
        .select('tags')
        .eq('empresa_id', empresaId)
        .not('tags', 'is', null)
        .is('loss_reason_category', null) // Excluir leads perdidos
        .is('sold_at', null) // Excluir leads vendidos
        .order('id', { ascending: true })
        .range(offset, offset + FILTER_OPTIONS_BATCH_SIZE - 1)

      if (error) {
        SecureLogger.error('Erro ao buscar tags dos leads:', error)
        return []
      }

      const batch = data?.flatMap(lead => lead.tags || []) || []
      allTags.push(...batch)

      if (!data || data.length < FILTER_OPTIONS_BATCH_SIZE) break
      offset += FILTER_OPTIONS_BATCH_SIZE
    }

    const uniqueTags = [...new Set(allTags)].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )

    return uniqueTags
  } catch (error) {
    SecureLogger.error('Erro ao buscar tags dos leads:', error)
    return []
  }
}

/**
 * Busca todas as tags únicas dos leads de uma pipeline específica
 * Usado no Kanban para mostrar apenas tags relevantes à pipeline selecionada
 * Usa paginação para contornar o limite de 1000 linhas do Supabase
 */
export async function getLeadTagsByPipeline(pipelineId: string): Promise<string[]> {
  try {
    if (!pipelineId) return []

    const empresaId = await getUserEmpresaId()
    if (!empresaId) return []

    const allTags: string[] = []
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from('leads')
        .select('tags')
        .eq('empresa_id', empresaId)
        .eq('pipeline_id', pipelineId)
        .not('tags', 'is', null)
        .is('loss_reason_category', null) // Excluir leads perdidos
        .is('sold_at', null) // Excluir leads vendidos
        .order('id', { ascending: true })
        .range(offset, offset + FILTER_OPTIONS_BATCH_SIZE - 1)

      if (error) {
        SecureLogger.error('Erro ao buscar tags da pipeline:', error)
        return []
      }

      const batch = data?.flatMap(lead => lead.tags || []) || []
      allTags.push(...batch)

      if (!data || data.length < FILTER_OPTIONS_BATCH_SIZE) break
      offset += FILTER_OPTIONS_BATCH_SIZE
    }

    const uniqueTags = [...new Set(allTags)].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )

    return uniqueTags
  } catch (error) {
    SecureLogger.error('Erro ao buscar tags da pipeline:', error)
    return []
  }
}

/**
 * Busca todas as origens únicas dos leads da empresa
 * Usado nos filtros para permitir filtrar por origem
 * Usa paginação para contornar o limite de 1000 linhas do Supabase
 */
export async function getAllLeadOrigins(): Promise<string[]> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) return []

    const allOrigins: string[] = []
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from('leads')
        .select('origin')
        .eq('empresa_id', empresaId)
        .not('origin', 'is', null)
        .neq('origin', '')
        .order('id', { ascending: true })
        .range(offset, offset + FILTER_OPTIONS_BATCH_SIZE - 1)

      if (error) {
        SecureLogger.error('Erro ao buscar origens dos leads:', error)
        return []
      }

      const batch = data?.map(lead => lead.origin).filter(Boolean) || []
      allOrigins.push(...batch)

      if (!data || data.length < FILTER_OPTIONS_BATCH_SIZE) break
      offset += FILTER_OPTIONS_BATCH_SIZE
    }

    const uniqueOrigins = [...new Set(allOrigins)].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )

    return uniqueOrigins
  } catch (error) {
    SecureLogger.error('Erro ao buscar origens dos leads:', error)
    return []
  }
}

/**
 * Busca todas as origens únicas dos leads de uma pipeline específica
 * Usado no Kanban para mostrar apenas origens relevantes à pipeline selecionada
 * Usa paginação para contornar o limite de 1000 linhas do Supabase
 */
export async function getLeadOriginsByPipeline(pipelineId: string): Promise<string[]> {
  try {
    if (!pipelineId) return []

    const empresaId = await getUserEmpresaId()
    if (!empresaId) return []

    const allOrigins: string[] = []
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from('leads')
        .select('origin')
        .eq('empresa_id', empresaId)
        .eq('pipeline_id', pipelineId)
        .not('origin', 'is', null)
        .neq('origin', '')
        .order('id', { ascending: true })
        .range(offset, offset + FILTER_OPTIONS_BATCH_SIZE - 1)

      if (error) {
        SecureLogger.error('Erro ao buscar origens da pipeline:', error)
        return []
      }

      const batch = data?.map(lead => lead.origin).filter(Boolean) || []
      allOrigins.push(...batch)

      if (!data || data.length < FILTER_OPTIONS_BATCH_SIZE) break
      offset += FILTER_OPTIONS_BATCH_SIZE
    }

    const uniqueOrigins = [...new Set(allOrigins)].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )

    return uniqueOrigins
  } catch (error) {
    SecureLogger.error('Erro ao buscar origens da pipeline:', error)
    return []
  }
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
    responsible_uuid: data.responsible_uuid && data.responsible_uuid.trim() !== '' ? data.responsible_uuid : user.id,
    // Sanitizar dados de entrada
    name: data.name.trim(),
    company: data.company?.trim() || null,
    email: data.email?.trim() || null,
    phone: data.phone ? formatBrazilianPhone(data.phone) : null, // Formatar telefone
    origin: data.origin?.trim() || null,
    notes: data.notes?.trim() || null,
    status: normalizedStatus
  }
  
  console.log('📝 createLead: Criando lead com responsible_uuid:', leadData.responsible_uuid)
  
  const result = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single()
  
  if (result.data) {
    console.log('✅ createLead: Lead criado com responsible_uuid:', result.data.responsible_uuid)
    try {
      await createLeadHistoryEntry(
        result.data.id,
        'created',
        'Lead criado',
        result.data.pipeline_id,
        result.data.stage_id,
        null,
        null
      )
    } catch (historyErr) {
      SecureLogger.error('Erro ao criar histórico de criação:', historyErr)
    }
  }
  
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
    .select('id, stage_id, pipeline_id, responsible_uuid')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (checkError || !existingLead) {
    throw new Error('Lead não encontrado ou não pertence à sua empresa')
  }
  
  const previousStageId = existingLead.stage_id
  const previousPipelineId = (existingLead as any).pipeline_id as string | null
  
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
  
  if (data.responsible_uuid !== undefined) {
    sanitizedData.responsible_uuid = data.responsible_uuid
    console.log('🔄 updateLead: Atualizando responsible_uuid para:', data.responsible_uuid)
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
  
  console.log('📤 updateLead: Enviando sanitizedData:', sanitizedData)
  const result = await supabase
    .from('leads')
    .update(sanitizedData)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()
  
  if (result.data) {
    console.log('✅ updateLead: Lead atualizado com responsible_uuid:', result.data.responsible_uuid)
    
    const stageChanged = data.stage_id !== undefined && previousStageId !== data.stage_id
    const pipelineChanged = data.pipeline_id !== undefined && previousPipelineId !== data.pipeline_id
    
    if (stageChanged || pipelineChanged) {
      const changeType: 'stage_changed' | 'pipeline_changed' | 'both_changed' =
        stageChanged && pipelineChanged ? 'both_changed'
        : pipelineChanged ? 'pipeline_changed' : 'stage_changed'
      
      try {
        await createLeadHistoryEntry(
          id,
          changeType,
          undefined,
          result.data.pipeline_id,
          result.data.stage_id,
          previousPipelineId,
          previousStageId
        )
      } catch (historyErr) {
        SecureLogger.error('Erro ao criar histórico (updateLead):', historyErr)
      }
    }
  }
  
  // Sincronizar assigned_user_id das conversas vinculadas ao lead
  if (data.responsible_uuid !== undefined && result.data) {
    try {
      const { syncConversationAssignment } = await import('./chatService')
      await syncConversationAssignment(id)
    } catch (syncErr) {
      SecureLogger.error('Erro ao sincronizar assigned_user_id das conversas:', syncErr)
    }
  }
  
  // Disparar automações se a etapa mudou
  // O trigger do banco só executa para mudanças externas (n8n, API).
  // Quando vem do frontend (usuário autenticado), roda aqui para suportar ações com modal.
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

  // Disparar automações quando o responsável for alterado
  const newResponsibleUuid = (result.data as any)?.responsible_uuid as string | null | undefined
  const previousResponsibleUuid = (existingLead as any)?.responsible_uuid as string | null
  const responsibleChanged = data.responsible_uuid !== undefined && newResponsibleUuid && previousResponsibleUuid !== newResponsibleUuid
  if (responsibleChanged && result.data) {
    try {
      const { evaluateAutomationsForLeadResponsibleAssigned } = await import('./automationService')
      await evaluateAutomationsForLeadResponsibleAssigned({
        type: 'lead_responsible_assigned',
        lead: result.data as unknown as import('../types').Lead,
        previous_responsible_uuid: previousResponsibleUuid,
        new_responsible_uuid: newResponsibleUuid
      })
    } catch (engineErr) {
      SecureLogger.error('Erro ao avaliar automações (responsável atribuído):', engineErr)
    }
  }
  
  return result
}

export async function deleteLead(id: string) {
  if (!id?.trim()) {
    throw new Error('Lead ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  if (!empresaId) {
    throw new Error('Empresa ID não encontrado')
  }

  return supabase.rpc('delete_lead_cascade', {
    p_lead_id: id,
    p_empresa_id: empresaId
  })
}

export async function updateLeadStage(leadId: string, newStageId: string, stageChangeNotes?: string) {
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
      // Criar entrada no histórico com notas (se fornecidas)
      try {
        await createLeadHistoryEntry(
          leadId,
          'stage_changed',
          stageChangeNotes || undefined,
          beforeLead?.pipeline_id,
          newStageId,
          beforeLead?.pipeline_id,
          previousStageId
        )
      } catch (historyErr) {
        SecureLogger.error('Erro ao criar histórico de mudança de estágio:', historyErr)
      }

      // Trigger do banco só executa para mudanças externas (n8n, API).
      // Quando vem do frontend (usuário autenticado), roda aqui para suportar modais.
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
// skipAutomations: se true, não dispara automações (usado quando chamado de dentro de uma automação)
export async function markLeadAsLost(
  leadId: string, 
  lossReasonCategory: string,
  lossReasonNotes?: string,
  skipAutomations?: boolean
) {
  if (!leadId?.trim()) {
    throw new Error('Lead ID é obrigatório')
  }
  
  if (!lossReasonCategory?.trim()) {
    throw new Error('Categoria do motivo de perda é obrigatória')
  }
  
  // Verificar se é valor antigo "outro" e se tem notas
  // Para novos motivos (UUIDs), não validamos se é "outro" pois não há mais essa distinção
  if (lossReasonCategory === 'outro' && !lossReasonNotes?.trim()) {
    throw new Error('Para a categoria "Outro motivo", é obrigatório informar os detalhes')
  }
  
  // Buscar lead atual para obter pipeline e stage antes da marcação
  const empresaId = await getUserEmpresaId()
  const { data: currentLead } = await supabase
    .from('leads')
    .select('id, name, pipeline_id, stage_id, responsible_uuid')
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
    // Buscar nome do motivo (pode ser UUID novo ou valor antigo)
    const { getLossReasonLabel } = await import('../utils/constants')
    const { getLossReasons } = await import('./lossReasonService')
    
    // Tentar buscar motivos do banco para obter o nome
    let reasonText = lossReasonCategory
    try {
      const { data: lossReasons } = await getLossReasons(currentLead?.pipeline_id || null)
      reasonText = getLossReasonLabel(lossReasonCategory, lossReasons || [])
    } catch (error) {
      // Se falhar, usar helper que faz fallback para mapeamento antigo
      reasonText = getLossReasonLabel(lossReasonCategory, [])
    }
    
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

    // Disparar automações para o evento lead_marked_lost (se não estiver sendo pulado)
    if (!skipAutomations && currentLead) {
      try {
        const { evaluateAutomationsForLeadMarkedLost } = await import('./automationService')
        await evaluateAutomationsForLeadMarkedLost({
          type: 'lead_marked_lost',
          lead: currentLead as Lead,
          lossReasonCategory,
          lossReasonNotes
        })
      } catch (autoErr) {
        console.error('[leadService] Erro ao avaliar automações para lead_marked_lost:', autoErr)
        // Não falhar a operação principal por erro de automação
      }
    }
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

/**
 * Busca IDs de itens vinculados a um lead via campos customizados de um tipo específico.
 * Genérico para reaproveitar a mesma lógica entre veículos ('vehicle') e produtos ('product').
 */
async function getLinkedItemIdsByCustomFieldType(
  leadId: string,
  empresaId: string,
  fieldType: 'vehicle' | 'product'
): Promise<string[]> {
  try {
    const { data: fields } = await supabase
      .from('lead_custom_fields')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('type', fieldType)

    if (!fields || fields.length === 0) return []

    const fieldIds = fields.map(f => f.id)

    const { data: customValues } = await supabase
      .from('lead_custom_values')
      .select('value')
      .eq('lead_id', leadId)
      .in('field_id', fieldIds)

    if (!customValues || customValues.length === 0) return []

    return customValues
      .flatMap(cv => (cv.value || '').split(','))
      .map(id => id.trim())
      .filter(Boolean)
  } catch (error) {
    console.error(`[leadService] Erro ao buscar itens (${fieldType}) vinculados ao lead:`, error)
    return []
  }
}

/**
 * Busca IDs de veículos vinculados a um lead via campos customizados do tipo 'vehicle'
 */
async function getLinkedVehicleIds(leadId: string, empresaId: string): Promise<string[]> {
  return getLinkedItemIdsByCustomFieldType(leadId, empresaId, 'vehicle')
}

/**
 * Busca IDs de produtos vinculados a um lead via campos customizados do tipo 'product'
 */
async function getLinkedProductIds(leadId: string, empresaId: string): Promise<string[]> {
  return getLinkedItemIdsByCustomFieldType(leadId, empresaId, 'product')
}

// Função para marcar um lead como venda concluída
// skipAutomations: se true, não dispara automações (usado quando chamado de dentro de uma automação)
export async function markLeadAsSold(
  leadId: string,
  soldValue: number,
  saleNotes?: string,
  skipAutomations?: boolean,
  soldAt?: string,
  responsibleUuid?: string
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
    .select('id, name, pipeline_id, stage_id, value, responsible_uuid')
    .eq('id', leadId)
    .eq('empresa_id', empresaId)
    .single()
  
  if (fetchError || !currentLead) {
    throw new Error('Lead não encontrado')
  }

  // Determinar se o responsável precisa ser atualizado para o usuário escolhido na venda
  const responsibleChanged = Boolean(
    responsibleUuid && responsibleUuid !== currentLead.responsible_uuid
  )

  // Atualizar o lead
  const updatePayload: Partial<Lead> = {
    sold_value: soldValue,
    sale_notes: saleNotes,
    sold_at: soldAt || new Date().toISOString(),
    status: 'venda_confirmada'
  }
  if (responsibleChanged) {
    updatePayload.responsible_uuid = responsibleUuid
  }
  const result = await updateLead(leadId, updatePayload)
  
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

    if (responsibleChanged && responsibleUuid) {
      try {
        const { data: responsibleProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('uuid', responsibleUuid)
          .single()
        const responsibleName = responsibleProfile?.full_name || responsibleUuid
        historyNotes += `\nResponsável da venda: ${responsibleName}`
      } catch (profileErr) {
        console.error('[leadService] Erro ao buscar nome do responsável da venda:', profileErr)
        historyNotes += `\nResponsável da venda: ${responsibleUuid}`
      }
    }

    await createLeadHistoryEntry(
      leadId,
      'marked_as_sold',
      historyNotes,
      currentLead.pipeline_id,
      currentLead.stage_id
    )

    // Marcar veículos vinculados como vendidos
    if (empresaId) {
      try {
        const vehicleIds = await getLinkedVehicleIds(leadId, empresaId)
        if (vehicleIds.length > 0) {
          await markMultipleVehiclesAsSold(vehicleIds, empresaId)
        }
      } catch (vehicleErr) {
        console.error('[leadService] Erro ao marcar veículos como vendidos:', vehicleErr)
      }

      // Marcar produtos/serviços vinculados como vendidos
      try {
        const productIds = await getLinkedProductIds(leadId, empresaId)
        if (productIds.length > 0) {
          await markMultipleProductsAsSold(productIds, empresaId)
        }
      } catch (productErr) {
        console.error('[leadService] Erro ao marcar produtos como vendidos:', productErr)
      }
    }

    // Disparar automações para o evento lead_marked_sold (se não estiver sendo pulado)
    if (!skipAutomations) {
      try {
        const { evaluateAutomationsForLeadMarkedSold } = await import('./automationService')
        await evaluateAutomationsForLeadMarkedSold({
          type: 'lead_marked_sold',
          lead: currentLead as Lead,
          soldValue,
          saleNotes
        })
      } catch (autoErr) {
        console.error('[leadService] Erro ao avaliar automações para lead_marked_sold:', autoErr)
        // Não falhar a operação principal por erro de automação
      }
    }
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

    // Recolocar veículos vinculados como disponíveis
    if (empresaId) {
      try {
        const vehicleIds = await getLinkedVehicleIds(leadId, empresaId)
        if (vehicleIds.length > 0) {
          await markMultipleVehiclesAsAvailable(vehicleIds, empresaId)
        }
      } catch (vehicleErr) {
        console.error('[leadService] Erro ao recolocar veículos como disponíveis:', vehicleErr)
      }

      // Recolocar produtos/serviços vinculados como disponíveis
      try {
        const productIds = await getLinkedProductIds(leadId, empresaId)
        if (productIds.length > 0) {
          await markMultipleProductsAsAvailable(productIds, empresaId)
        }
      } catch (productErr) {
        console.error('[leadService] Erro ao recolocar produtos como disponíveis:', productErr)
      }
    }
  }
  
  return result
}

export async function getLeadsStageAge(leadIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (leadIds.length === 0) return result

  const batchSize = 200
  const needsHistoryFallback: string[] = []

  for (let i = 0; i < leadIds.length; i += batchSize) {
    const batch = leadIds.slice(i, i + batchSize)
    const { data, error } = await supabase
      .from('leads')
      .select('id, current_stage_since')
      .in('id', batch)

    if (error) {
      SecureLogger.warn('Erro ao buscar current_stage_since:', error.message)
      needsHistoryFallback.push(...batch)
      continue
    }

    for (const row of (data || [])) {
      if (row.current_stage_since) {
        result.set(row.id, row.current_stage_since)
      } else {
        needsHistoryFallback.push(row.id)
      }
    }
  }

  for (let i = 0; i < needsHistoryFallback.length; i += batchSize) {
    const batch = needsHistoryFallback.slice(i, i + batchSize)
    const { data, error } = await supabase
      .from('lead_pipeline_history')
      .select('lead_id, changed_at')
      .in('lead_id', batch)
      .in('change_type', ['stage_changed', 'both_changed', 'created'])
      .order('changed_at', { ascending: false })

    if (error) {
      SecureLogger.warn('Erro ao buscar stage age do histórico:', error.message)
      continue
    }

    if (data) {
      for (const row of data) {
        if (!result.has(row.lead_id)) {
          result.set(row.lead_id, row.changed_at)
        }
      }
    }
  }

  return result
}