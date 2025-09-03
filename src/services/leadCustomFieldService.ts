import { supabase } from './supabaseClient'
import type { LeadCustomField } from '../types'

export async function getCustomFieldsByPipeline(pipeline_id: string) {
  if (pipeline_id === 'null') {
    // Se não há pipeline, buscar apenas campos globais
    return supabase.from('lead_custom_fields').select('*').is('pipeline_id', null).order('position', { ascending: true })
  }
  
  // Se há pipeline, buscar campos globais (pipeline_id = null) + campos específicos do pipeline
  return supabase
    .from('lead_custom_fields')
    .select('*')
    .or(`pipeline_id.is.null,pipeline_id.eq.${pipeline_id}`)
    .order('position', { ascending: true })
}

export async function getCustomFieldById(id: string) {
  return supabase.from('lead_custom_fields').select('*').eq('id', id).single()
}

export async function createCustomField(data: Omit<LeadCustomField, 'id' | 'created_at'>) {
  return supabase.from('lead_custom_fields').insert([data]).select().single()
}

export async function updateCustomField(id: string, data: Partial<Omit<LeadCustomField, 'id' | 'created_at'>>) {
  return supabase.from('lead_custom_fields').update(data).eq('id', id)
}

export async function deleteCustomField(id: string) {
  return supabase.from('lead_custom_fields').delete().eq('id', id)
} 