import { format } from 'date-fns'
import { formatBrazilianPhone } from './validations'
import type { LeadSemContato } from '../services/leadsSemContatoService'

/** Quem mandou a última mensagem; os rótulos são os mesmos do filtro "Situação". */
export const DIRECAO_LABELS: Record<NonNullable<LeadSemContato['ultima_direcao']>, string> = {
  inbound: 'Aguardando resposta',
  outbound: 'Sem retorno'
}

export function formatTelefone(telefone: string | null): string {
  return telefone ? formatBrazilianPhone(telefone) : 'Sem telefone'
}

export function formatUltimoContato(row: LeadSemContato): string {
  if (row.nunca_contatado || !row.ultimo_contato) return 'Nunca contatado'
  return format(new Date(row.ultimo_contato), 'dd/MM/yyyy HH:mm')
}

export function formatFunil(row: LeadSemContato): string {
  if (!row.pipeline) return 'Sem funil'
  return row.etapa ? `${row.pipeline} · ${row.etapa}` : row.pipeline
}

export function formatSituacao(row: LeadSemContato): string {
  if (row.nunca_contatado) return 'Nunca contatado'
  return row.ultima_direcao ? DIRECAO_LABELS[row.ultima_direcao] : ''
}
