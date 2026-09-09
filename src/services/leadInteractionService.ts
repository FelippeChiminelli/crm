import { supabase } from './supabaseClient'
import type { LeadInteraction } from '../types'
import { getUserEmpresaId } from './authService'

// A entrada espelhada em lead_pipeline_history é criada/atualizada/removida pelo
// trigger sync_lead_interaction_history no banco. Nada aqui escreve no histórico.
//
// created_at (o momento da interação) também é carimbado pelo banco, então
// nenhuma data é enviada nos payloads abaixo.

const SELECT_WITH_AUTHOR = '*, created_by_user:profiles!created_by(full_name)'

export async function getInteractionsByLead(
  leadId: string | undefined
): Promise<LeadInteraction[]> {
  if (!leadId) return []

  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não identificada')

  const { data, error } = await supabase
    .from('lead_interactions')
    .select(SELECT_WITH_AUTHOR)
    .eq('lead_id', leadId)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as unknown as LeadInteraction[]) || []
}

export async function createLeadInteraction(
  leadId: string,
  description: string
): Promise<LeadInteraction> {
  const trimmed = description.trim()
  if (!trimmed) throw new Error('A anotação não pode ficar vazia.')

  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não identificada')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('lead_interactions')
    .insert({
      lead_id: leadId,
      empresa_id: empresaId,
      description: trimmed,
      created_by: user.id,
    })
    .select(SELECT_WITH_AUTHOR)
    .single()

  if (error) throw error
  return data as unknown as LeadInteraction
}

export async function updateLeadInteraction(
  interactionId: string,
  description: string
): Promise<LeadInteraction> {
  const trimmed = description.trim()
  if (!trimmed) throw new Error('A anotação não pode ficar vazia.')

  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não identificada')

  const { data, error } = await supabase
    .from('lead_interactions')
    .update({ description: trimmed })
    .eq('id', interactionId)
    .eq('empresa_id', empresaId)
    .select(SELECT_WITH_AUTHOR)
    .single()

  if (error) throw error
  return data as unknown as LeadInteraction
}

export async function deleteLeadInteraction(interactionId: string): Promise<void> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não identificada')

  const { error } = await supabase
    .from('lead_interactions')
    .delete()
    .eq('id', interactionId)
    .eq('empresa_id', empresaId)

  if (error) throw error
}
