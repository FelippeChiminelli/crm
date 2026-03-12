import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { EmpresaOriginOption } from '../types'

/**
 * Busca as origens permitidas (strings) para a empresa do usuário
 * Usado nos formulários de lead quando há restrição
 * Retorna [] quando não há restrição configurada
 */
export async function getAllowedOrigins(): Promise<string[]> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) return []

  const { data, error } = await supabase
    .from('empresa_origin_options')
    .select('name')
    .eq('empresa_id', empresaId)
    .order('position', { ascending: true })

  if (error) return []
  return (data || []).map((o) => o.name)
}

/**
 * Busca todos os registros de origens (admin)
 */
export async function getAllOriginOptions(): Promise<EmpresaOriginOption[]> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) return []

  const { data, error } = await supabase
    .from('empresa_origin_options')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('position', { ascending: true })

  if (error) return []
  return data || []
}

/**
 * Criar nova origem
 */
export async function createOriginOption(name: string) {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) return { data: null, error: { message: 'Empresa não identificada' } }

  const { data: existing } = await supabase
    .from('empresa_origin_options')
    .select('position')
    .eq('empresa_id', empresaId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (existing?.position ?? -1) + 1

  return supabase
    .from('empresa_origin_options')
    .insert([{ empresa_id: empresaId, name: name.trim(), position }])
    .select()
    .single()
}

/**
 * Atualizar origem
 */
export async function updateOriginOption(id: string, name: string) {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) return { data: null, error: { message: 'Empresa não identificada' } }

  const { data: existing, error: fetchError } = await supabase
    .from('empresa_origin_options')
    .select('id')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()

  if (fetchError || !existing) {
    return { data: null, error: { message: 'Origem não encontrada ou sem permissão' } }
  }

  const { error: updateError } = await supabase
    .from('empresa_origin_options')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('empresa_id', empresaId)

  if (updateError) return { data: null, error: updateError }

  const { data: updated, error: refetch } = await supabase
    .from('empresa_origin_options')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()

  return { data: updated, error: refetch }
}

/**
 * Excluir origem
 */
export async function deleteOriginOption(id: string) {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) return { data: null, error: { message: 'Empresa não identificada' } }

  const { data: existing, error: fetchError } = await supabase
    .from('empresa_origin_options')
    .select('id')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()

  if (fetchError || !existing) {
    return { data: null, error: { message: 'Origem não encontrada ou sem permissão' } }
  }

  const { error } = await supabase
    .from('empresa_origin_options')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)

  return error ? { data: null, error } : { data: { id }, error: null }
}

/**
 * Reordenar origens
 */
export async function reorderOriginOptions(orderedIds: string[]) {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) return { data: null, error: { message: 'Empresa não identificada' } }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('empresa_origin_options')
      .update({ position: index })
      .eq('id', id)
      .eq('empresa_id', empresaId)
  )

  const results = await Promise.all(updates)
  const firstError = results.find((r) => r.error)?.error

  return firstError ? { data: null, error: firstError } : { data: { success: true }, error: null }
}
