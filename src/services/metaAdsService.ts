import { supabase } from './supabaseClient'
import type { MetaAd } from '../types'
import { getUserEmpresaId } from './authService'

/**
 * Anúncios Meta vinculados a um lead, do mais recente para o mais antigo.
 * Um lead pode ter mais de um registro: cada clique em anúncio gera uma linha,
 * formando o histórico de rastreamento.
 */
export async function getMetaAdsByLead(
  leadId: string | undefined
): Promise<MetaAd[]> {
  if (!leadId) return []

  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não identificada')

  const { data, error } = await supabase
    .from('meta_ads')
    .select('*')
    .eq('lead_id', leadId)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as MetaAd[]) || []
}
