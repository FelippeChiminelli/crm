import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { LeadCustomField } from '../types'

export async function getCustomFieldsByPipeline(pipeline_id: string) {
  const empresaId = await getUserEmpresaId()
  if (pipeline_id === 'null') {
    // Se não há pipeline, buscar apenas campos globais da empresa
    return supabase
      .from('lead_custom_fields')
      .select('*')
      .eq('empresa_id', empresaId)
      .is('pipeline_id', null)
      .order('position', { ascending: true })
  }
  
  // Se há pipeline, buscar campos globais (pipeline_id = null) + campos específicos do pipeline da mesma empresa
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
  return supabase
    .from('lead_custom_fields')
    .update(data)
    .eq('id', id)
    .eq('empresa_id', empresaId)
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