import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import { LOSS_REASONS } from '../utils/constants'

export interface CreateLossReasonData {
  name: string
  pipeline_id?: string | null
  position?: number
  is_active?: boolean
}

export interface UpdateLossReasonData extends Partial<CreateLossReasonData> {}

/**
 * Buscar motivos de perda ativos de uma empresa
 * @param pipelineId Opcional - se fornecido, busca motivos globais + específicos do pipeline
 */
export async function getLossReasons(pipelineId?: string | null) {
  const empresaId = await getUserEmpresaId()
  
  let query = supabase
    .from('loss_reasons')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('is_active', true)
    .order('position', { ascending: true })
  
  // Se há pipeline, buscar motivos globais (pipeline_id = null) + específicos do pipeline
  if (pipelineId) {
    query = query.or(`pipeline_id.is.null,pipeline_id.eq.${pipelineId}`)
  } else {
    // Se não há pipeline, buscar apenas motivos globais
    query = query.is('pipeline_id', null)
  }
  
  return query
}

/**
 * Buscar todos os motivos (incluindo inativos) - para admin
 */
export async function getAllLossReasons(pipelineId?: string | null) {
  const empresaId = await getUserEmpresaId()
  
  let query = supabase
    .from('loss_reasons')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('position', { ascending: true })
  
  if (pipelineId) {
    query = query.or(`pipeline_id.is.null,pipeline_id.eq.${pipelineId}`)
  } else {
    query = query.is('pipeline_id', null)
  }
  
  return query
}

/**
 * Buscar motivo por ID
 */
export async function getLossReasonById(id: string) {
  const empresaId = await getUserEmpresaId()
  return supabase
    .from('loss_reasons')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
}

/**
 * Criar novo motivo de perda
 */
export async function createLossReason(data: CreateLossReasonData) {
  const empresaId = await getUserEmpresaId()
  
  // Se não especificou position, buscar a última
  if (data.position === undefined) {
    const { data: existing } = await supabase
      .from('loss_reasons')
      .select('position')
      .eq('empresa_id', empresaId)
      .order('position', { ascending: false })
      .limit(1)
      .single()
    
    data.position = existing?.position !== undefined ? existing.position + 1 : 0
  }
  
  return supabase
    .from('loss_reasons')
    .insert([{ ...data, empresa_id: empresaId }])
    .select()
    .single()
}

/**
 * Atualizar motivo de perda
 */
export async function updateLossReason(id: string, data: UpdateLossReasonData) {
  const empresaId = await getUserEmpresaId()
  
  // Verificar se o motivo existe e pertence à empresa
  const { data: existing, error: fetchError } = await supabase
    .from('loss_reasons')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (fetchError || !existing) {
    return { 
      data: null, 
      error: { message: 'Motivo não encontrado ou sem permissão para editar' } 
    }
  }
  
  // Atualizar
  const { error: updateError } = await supabase
    .from('loss_reasons')
    .update(data)
    .eq('id', id)
    .eq('empresa_id', empresaId)
  
  if (updateError) {
    return { data: null, error: updateError }
  }
  
  // Buscar dados atualizados
  const { data: updatedData, error: refetchError } = await supabase
    .from('loss_reasons')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (refetchError) {
    return { data: null, error: refetchError }
  }
  
  return { data: updatedData, error: null }
}

/**
 * Deletar motivo (soft delete - marca como inativo)
 */
export async function deleteLossReason(id: string) {
  const empresaId = await getUserEmpresaId()
  
  // Verificar se existe
  const { data: existing, error: fetchError } = await supabase
    .from('loss_reasons')
    .select('id')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (fetchError || !existing) {
    return { data: null, error: { message: 'Motivo não encontrado ou sem permissão para excluir' } }
  }
  
  // Soft delete
  const { error } = await supabase
    .from('loss_reasons')
    .update({ is_active: false })
    .eq('id', id)
    .eq('empresa_id', empresaId)
  
  if (error) {
    return { data: null, error }
  }
  
  return { data: { id }, error: null }
}

/**
 * Reordenar motivos
 */
export async function reorderLossReasons(ids: string[]) {
  const empresaId = await getUserEmpresaId()
  
  // Atualizar positions
  const updates = ids.map((id, index) => 
    supabase
      .from('loss_reasons')
      .update({ position: index })
      .eq('id', id)
      .eq('empresa_id', empresaId)
  )
  
  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)
  
  if (errors.length > 0) {
    return { data: null, error: errors[0].error }
  }
  
  return { data: { success: true }, error: null }
}

/**
 * Migrar motivos padrão para a tabela loss_reasons
 * Cria os 9 motivos padrão para a empresa atual
 */
export async function migrateDefaultReasons() {
  const empresaId = await getUserEmpresaId()
  
  // Verificar se já existem motivos para esta empresa
  const { data: existing, error: checkError } = await supabase
    .from('loss_reasons')
    .select('id')
    .eq('empresa_id', empresaId)
    .limit(1)
  
  if (checkError) {
    return { data: null, error: checkError }
  }
  
  // Se já existem motivos, não criar novamente
  if (existing && existing.length > 0) {
    return { data: { message: 'Motivos padrão já foram criados anteriormente' }, error: null }
  }
  
  // Criar motivos padrão
  const defaultReasons = LOSS_REASONS.map((reason, index) => ({
    empresa_id: empresaId,
    name: reason.label,
    pipeline_id: null, // Globais
    position: index,
    is_active: true
  }))
  
  const { data, error } = await supabase
    .from('loss_reasons')
    .insert(defaultReasons)
    .select()
  
  if (error) {
    return { data: null, error }
  }
  
  return { data, error: null }
}

