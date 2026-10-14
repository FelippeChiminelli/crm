import { supabase } from './supabaseClient'

const IA_ATENDIMENTO_URL = import.meta.env.VITE_IA_ATENDIMENTO_URL as string | undefined

export type TokensTeste = {
  entrada: number
  saida: number
  total: number
}

export type RespostaTurnoTeste = {
  mensagens: string[]
  finalizado: boolean
  lead: Record<string, unknown>
  pendentes: string[]
  relatorio: string | null
  tokens_turno: TokensTeste
  tokens_sessao: TokensTeste
  versao: number
  status: 'draft' | 'published'
}

function urlBase(): string {
  if (!IA_ATENDIMENTO_URL) {
    throw new Error('VITE_IA_ATENDIMENTO_URL não está definida. Configure a URL do serviço ia_atendimento.')
  }
  return IA_ATENDIMENTO_URL.replace(/\/$/, '')
}

async function cabecalhos(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Entre novamente.')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function erroDaResposta(resposta: Response): Promise<Error> {
  try {
    const corpo = await resposta.json()
    if (typeof corpo?.detail === 'string') return new Error(corpo.detail)
  } catch {
    // resposta sem corpo JSON
  }
  return new Error(`Erro ${resposta.status} ao falar com o serviço do agente`)
}

export function novaSessaoTeste(): string {
  return crypto.randomUUID()
}

export async function enviarMensagemTeste(
  agentId: string,
  sessaoId: string,
  mensagem: string
): Promise<RespostaTurnoTeste> {
  const resposta = await fetch(`${urlBase()}/v1/teste/turno`, {
    method: 'POST',
    headers: await cabecalhos(),
    body: JSON.stringify({ agent_id: agentId, sessao_id: sessaoId, mensagem }),
  })
  if (!resposta.ok) throw await erroDaResposta(resposta)
  return resposta.json() as Promise<RespostaTurnoTeste>
}

export async function reiniciarSessaoTeste(sessaoId: string): Promise<void> {
  const resposta = await fetch(`${urlBase()}/v1/teste/sessao/${sessaoId}`, {
    method: 'DELETE',
    headers: await cabecalhos(),
  })
  if (!resposta.ok && resposta.status !== 404) throw await erroDaResposta(resposta)
}
