import { supabase } from './supabaseClient'
import type { LeadCustomValue } from '../types'
import { logCustomFieldChange } from './leadHistoryService'

// Resolve o nome legível de um campo personalizado pelo field_id
async function getCustomFieldName(fieldId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('lead_custom_fields')
      .select('name')
      .eq('id', fieldId)
      .single()
    return data?.name || 'Campo personalizado'
  } catch {
    return 'Campo personalizado'
  }
}

export async function getCustomValuesByLead(lead_id: string | undefined) {
  // Se lead_id for undefined, retornar array vazio ao invés de fazer query inválida
  if (!lead_id) {
    return { data: [], error: null }
  }
  return supabase.from('lead_custom_values').select('*').eq('lead_id', lead_id)
}

export async function getCustomValuesByLeads(leadIds: string[]) {
  if (!leadIds || leadIds.length === 0) {
    return { data: [], error: null }
  }

  // Supabase/PostgREST tem limite padrão de 1000 linhas por query
  // e limite de URL para o operador .in(). Dividimos em chunks para
  // garantir que TODOS os custom values sejam retornados.
  const CHUNK_SIZE = 100 // IDs por chunk (evita URL muito longa)
  const ROW_LIMIT = 5000 // Limite de linhas por query individual

  const allData: LeadCustomValue[] = []

  for (let i = 0; i < leadIds.length; i += CHUNK_SIZE) {
    const chunk = leadIds.slice(i, i + CHUNK_SIZE)
    const { data, error } = await supabase
      .from('lead_custom_values')
      .select('*')
      .in('lead_id', chunk)
      .limit(ROW_LIMIT)

    if (error) {
      console.error('Erro ao buscar custom values (chunk):', error)
      continue
    }

    if (data) {
      allData.push(...data)
    }
  }

  return { data: allData, error: null }
}

export async function getCustomValueById(id: string) {
  return supabase.from('lead_custom_values').select('*').eq('id', id).single()
}

export async function createCustomValue(data: Omit<LeadCustomValue, 'id'>) {
  const result = await supabase.from('lead_custom_values').insert([data]).select().single()

  if (!result.error && data.lead_id && data.field_id) {
    try {
      const fieldName = await getCustomFieldName(data.field_id)
      await logCustomFieldChange(data.lead_id, fieldName, null, data.value ?? null)
    } catch (historyErr) {
      console.error('Erro ao registrar histórico de campo personalizado criado:', historyErr)
    }
  }

  return result
}

export async function updateCustomValue(id: string, data: Partial<Omit<LeadCustomValue, 'id'>>) {
  // Buscar valor anterior para registrar a alteração no histórico
  const { data: previous } = await supabase
    .from('lead_custom_values')
    .select('lead_id, field_id, value')
    .eq('id', id)
    .single()

  const result = await supabase.from('lead_custom_values').update(data).eq('id', id)

  if (!result.error && previous?.lead_id && previous.value !== (data.value ?? previous.value)) {
    try {
      const fieldName = await getCustomFieldName(previous.field_id)
      await logCustomFieldChange(previous.lead_id, fieldName, previous.value ?? null, data.value ?? null)
    } catch (historyErr) {
      console.error('Erro ao registrar histórico de campo personalizado alterado:', historyErr)
    }
  }

  return result
}

export async function deleteCustomValue(id: string) {
  return supabase.from('lead_custom_values').delete().eq('id', id)
} 