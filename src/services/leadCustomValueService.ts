import { supabase } from './supabaseClient'
import type { LeadCustomValue } from '../types'

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
  return supabase.from('lead_custom_values').insert([data]).select().single()
}

export async function updateCustomValue(id: string, data: Partial<Omit<LeadCustomValue, 'id'>>) {
  return supabase.from('lead_custom_values').update(data).eq('id', id)
}

export async function deleteCustomValue(id: string) {
  return supabase.from('lead_custom_values').delete().eq('id', id)
} 