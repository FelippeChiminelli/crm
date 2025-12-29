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
  return supabase
    .from('lead_custom_values')
    .select('*')
    .in('lead_id', leadIds)
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