import { supabase } from './supabaseClient'

/**
 * Leads abertos sem contato real (mensagem de WhatsApp em qualquer direção).
 * A regra roda em `_leads_sem_contato`, a mesma usada pelo relatório do n8n,
 * então os números da tela e da mensagem sempre batem. A tela usa a RPC
 * `get_leads_sem_contato_filtrado`, que acrescenta os filtros extras e deriva
 * a empresa e a visibilidade do usuário autenticado.
 */

/** Valor do filtro de vendedor para leads sem responsável. */
export const SEM_RESPONSAVEL = 'sem'

export const SITUACOES_CONTATO = [
  { value: 'nunca', label: 'Nunca contatado' },
  { value: 'aguardando', label: 'Cliente aguardando resposta' },
  { value: 'sem_retorno', label: 'Cliente sem retorno' }
] as const

export type SituacaoContato = typeof SITUACOES_CONTATO[number]['value']

export interface LeadsSemContatoFilters {
  diasParado: number
  maxDiasParado: number | null
  /** uuids de vendedores; SEM_RESPONSAVEL pode vir junto */
  vendedores: string[]
  pipelines: string[]
  etapas: string[]
  origens: string[]
  situacoes: SituacaoContato[]
}

export interface LeadSemContato {
  lead_id: string
  nome: string
  telefone: string | null
  responsavel_id: string | null
  responsavel: string
  pipeline: string | null
  etapa: string | null
  origem: string | null
  ultimo_contato: string | null
  nunca_contatado: boolean
  ultima_direcao: 'inbound' | 'outbound' | null
  dias_parado: number
}

export interface LeadsSemContatoPage {
  rows: LeadSemContato[]
  total: number
}

const orNull = <T>(list: T[]): T[] | null => (list.length > 0 ? list : null)

export async function getLeadsSemContato(
  filters: LeadsSemContatoFilters,
  page: number,
  pageSize: number
): Promise<LeadsSemContatoPage> {
  const vendedores = filters.vendedores.filter(v => v !== SEM_RESPONSAVEL)
  const { data, error } = await supabase.rpc('get_leads_sem_contato_filtrado', {
    p_dias_parado: filters.diasParado,
    p_max_dias_parado: filters.maxDiasParado,
    p_responsaveis: orNull(vendedores),
    p_incluir_sem_responsavel: filters.vendedores.includes(SEM_RESPONSAVEL),
    p_pipelines: orNull(filters.pipelines),
    p_etapas: orNull(filters.etapas),
    p_origens: orNull(filters.origens),
    p_situacoes: orNull(filters.situacoes),
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
