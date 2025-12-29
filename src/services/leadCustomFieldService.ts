import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { LeadCustomField } from '../types'

export async function getCustomFieldsByPipeline(pipeline_id: string | null | undefined) {
  const empresaId = await getUserEmpresaId()
  
  // Se não há pipeline (null, undefined, ou 'null' como string), buscar apenas campos globais
  if (!pipeline_id || pipeline_id === 'null' || pipeline_id === 'undefined') {
    return supabase
      .from('lead_custom_fields')
      .select('*')
      .eq('empresa_id', empresaId)
      .is('pipeline_id', null)
      .order('position', { ascending: true })
  }
  
  // Se há pipeline válido, buscar campos globais (pipeline_id = null) + campos específicos do pipeline
  return supabase
    .from('lead_custom_fields')
    .select('*')
    .eq('empresa_id', empresaId)
    .or(`pipeline_id.is.null,pipeline_id.eq.${pipeline_id}`)
    .order('position', { ascending: true })
}

export async function getCustomFieldById(id: string) {
  return supabase.from('lead_custom_fields').select('*').eq('id', id).single()
}

export async function createCustomField(data: Omit<LeadCustomField, 'id' | 'created_at'>) {
  const empresaId = await getUserEmpresaId()
  return supabase
    .from('lead_custom_fields')
    .insert([{ ...data, empresa_id: empresaId }])
    .select()
    .single()
}

export async function updateCustomField(id: string, data: Partial<Omit<LeadCustomField, 'id' | 'created_at'>>) {
  const empresaId = await getUserEmpresaId()
  
  // Primeiro verificar se o campo existe e pertence à empresa
  const { data: existing, error: fetchError } = await supabase
    .from('lead_custom_fields')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (fetchError || !existing) {
    return { 
      data: null, 
      error: { message: 'Campo não encontrado ou sem permissão para editar' } 
    }
  }
  
  // Se existe, fazer o update SEM select
  const { error: updateError } = await supabase
    .from('lead_custom_fields')
    .update(data)
    .eq('id', id)
    .eq('empresa_id', empresaId)
  
  if (updateError) {
    return { data: null, error: updateError }
  }
  
  // Buscar os dados atualizados em uma query separada
  const { data: updatedData, error: refetchError } = await supabase
    .from('lead_custom_fields')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (refetchError) {
    return { data: null, error: refetchError }
  }
  
  return { data: updatedData, error: null }
}

export async function deleteCustomField(id: string) {
  const empresaId = await getUserEmpresaId()
  // Pré-checar existência e permissão
  const { data: existing, error: fetchError } = await supabase
    .from('lead_custom_fields')
    .select('id')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  if (fetchError || !existing) {
    return { data: null as any, error: { message: 'Registro não encontrado ou sem permissão para excluir' } }
  }

  // Excluir o campo primeiro (conforme solicitado)
  const { error } = await supabase
    .from('lead_custom_fields')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)

  if (error) {
    return { data: null as any, error }
  }

  // Em seguida, excluir os valores associados
  const { error: delValuesError } = await supabase
    .from('lead_custom_values')
    .delete()
    .eq('field_id', id)

  if (delValuesError) {
    // Campo removido; reportar que houve falha ao limpar valores vinculados
    return { data: { id }, error: delValuesError }
  }

  return { data: { id }, error: null }
} 