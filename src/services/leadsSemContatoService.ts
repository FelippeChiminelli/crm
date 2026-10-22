import { supabase } from './supabaseClient'

/**
 * Leads abertos sem contato real (mensagem de WhatsApp em qualquer direção).
 * A regra roda na RPC `get_leads_sem_contato`, a mesma usada pelo relatório
 * do n8n, então os números da tela e da mensagem sempre batem.
 * A RPC deriva a empresa e a visibilidade do usuário autenticado.
 */

/** Valor do filtro de vendedor para leads sem responsável. */
export const SEM_RESPONSAVEL = 'sem'

export interface LeadsSemContatoFilters {
  diasParado: number
  maxDiasParado: number | null
  /** uuid do vendedor, SEM_RESPONSAVEL ou null para todos */
  vendedor: string | null
}

export interface LeadSemContato {
  lead_id: string
  nome: string
  telefone: string | null
  responsavel_id: string | null
  responsavel: string
  ultimo_contato: string | null
  nunca_contatado: boolean
  dias_parado: number
}

export interface LeadsSemContatoPage {
  rows: LeadSemContato[]
  total: number
}

export async function getLeadsSemContato(
  filters: LeadsSemContatoFilters,
  page: number,
  pageSize: number
): Promise<LeadsSemContatoPage> {
  const semResponsavel = filters.vendedor === SEM_RESPONSAVEL
  const { data, error } = await supabase.rpc('get_leads_sem_contato', {
    p_dias_parado: filters.diasParado,
    p_max_dias_parado: filters.maxDiasParado,
    p_responsavel: semResponsavel ? null : filters.vendedor,
    p_somente_sem_responsavel: semResponsavel,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize
  })

  if (error) {
    console.error('Erro ao buscar leads sem contato:', error)
    throw error
  }

  const rows = (data || []) as Array<LeadSemContato & { total_count: number | string }>
  return {
    // total_count vem repetido em todas as linhas (count(*) over ())
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    rows: rows.map(({ total_count: _total, ...row }) => row)
  }
}
