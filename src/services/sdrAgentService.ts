import { supabase } from './supabaseClient'
import {
  erroDasPerguntas,
  juntar,
  linhas,
  perguntasDaConfig,
  perguntasPadrao,
  perguntasParaSalvar,
  type PerguntaItemForm,
  type PerguntaSalva,
} from './sdrPerguntas'

export type { PerguntaItemForm, PerguntaSalva } from './sdrPerguntas'
export { erroDasPerguntas, perguntaNova, TIPOS_PERGUNTA } from './sdrPerguntas'

export type ConfigAgenteSdr = {
  modelo_redacao?: string
  modelo_extracao?: string
  persona?: {
    nome?: string
    empresa?: string
    vendedor?: string
    cidade_loja?: string
    endereco?: string
    tom?: string
    objetivo?: string
    informacoes_adicionais?: string
    emoji_max?: number
  }
  checklist?: string[]
  perguntas_finais?: string[]
  condicionais?: Record<string, { se: string; igual: string | string[] }>
  campos?: { nome: string; tipo?: PerguntaSalva['tipo']; valores?: string[]; descricao?: string }[]
  perguntas?:
    | Record<
        string,
        {
          objetivo?: string
          exemplos?: string[]
          reformulacao?: string[]
          evitar?: string[]
          texto_literal?: string
          abordagem?: string
        }
      >
    | PerguntaSalva[]
  prompt_cliente?: string
  o_que_faz?: string
  servicos?: string
  publico_alvo?: string
  regras_gerais?: string
  funil?: string
  sinais?: unknown
  saudacao?: string
  duvidas_veiculo?: { acolhimentos?: string[]; encaminhamentos?: string[] }
  resposta_valores?: string
  texto_encerramento?: string
  proibido?: string[]
  memoria?: { janela_msgs: number; reformulacoes_max: number }
  webhook_finalizacao?: string
  skills?: unknown
  pular_se?: Record<string, string>
  reabrir_apos_horas?: number
}

export type AgenteSdrSalvo = {
  version: number
  status: 'draft' | 'published'
  config: ConfigAgenteSdr
}

export type FormAgenteSdr = {
  nome: string
  empresa: string
  cidadeLoja: string
  endereco: string
  tom: string
  objetivo: string
  informacoesAdicionais: string
  saudacao: string
  oQueFaz: string
  servicos: string
  publicoAlvo: string
  regrasGerais: string
  funil: string
  perguntas: PerguntaItemForm[]
  acolhimentos: string
  encaminhamentos: string
  respostaValores: string
  textoEncerramento: string
  webhook: string
  proibido: string
}

export function formularioVazio(): FormAgenteSdr {
  return {
    nome: '',
    empresa: '',
    cidadeLoja: '',
    endereco: '',
    tom: 'informal, frases curtas como alguém digitando no celular',
    objetivo: '',
    informacoesAdicionais: '',
    saudacao: 'Oi{nome_opcional}, tudo bem? Aqui é a {persona.nome}, da {persona.empresa}.',
    oQueFaz: '',
    servicos: '',
    publicoAlvo: '',
    regrasGerais: '',
    funil: '',
    perguntas: perguntasPadrao(),
    acolhimentos: 'Claro!\nPerfeito!\nBoa pergunta!',
    encaminhamentos: 'o vendedor te manda tudo certinho já já.',
    respostaValores: 'O vendedor te passa as condições certinho.',
    textoEncerramento:
      'Prontinho, já passei suas informações para o vendedor, ele já vai dar continuidade no atendimento',
    webhook: '',
    proibido:
      'perguntar valor de parcela, entrada ou quanto o cliente pode pagar\ninventar km, cor, ano, preço ou disponibilidade',
  }
}

export function formularioDeConfig(config: ConfigAgenteSdr): FormAgenteSdr {
  const base = formularioVazio()
  return {
    ...base,
    nome: config.persona?.nome || '',
    empresa: config.persona?.empresa || '',
    cidadeLoja: config.persona?.cidade_loja || '',
    endereco: config.persona?.endereco || '',
    tom: config.persona?.tom || base.tom,
    objetivo: config.persona?.objetivo || '',
    informacoesAdicionais: config.persona?.informacoes_adicionais || '',
    saudacao: config.saudacao || base.saudacao,
    oQueFaz: config.o_que_faz || '',
    servicos: config.servicos || '',
    publicoAlvo: config.publico_alvo || '',
    regrasGerais: config.regras_gerais || config.prompt_cliente || '',
    funil: config.funil || '',
    perguntas: perguntasDaConfig(config),
    acolhimentos: juntar(config.duvidas_veiculo?.acolhimentos),
    encaminhamentos: juntar(config.duvidas_veiculo?.encaminhamentos),
    respostaValores: config.resposta_valores || '',
    textoEncerramento: config.texto_encerramento || '',
    webhook: config.webhook_finalizacao || '',
    proibido: juntar(config.proibido),
  }
}

export function configDeFormulario(form: FormAgenteSdr, base: ConfigAgenteSdr | null = null): ConfigAgenteSdr {
  const {
    checklist: _checklist,
    campos: _campos,
    perguntas_finais: _finais,
    condicionais: _condicionais,
    ...resto
  } = base || {}
  return {
    modelo_redacao: 'openai:gpt-4.1-mini',
    modelo_extracao: 'openai:gpt-4.1-mini',
    memoria: { janela_msgs: 8, reformulacoes_max: 1 },
    skills: [],
    ...resto,
    persona: {
      nome: form.nome.trim(),
      empresa: form.empresa.trim(),
      vendedor: '',
      cidade_loja: form.cidadeLoja.trim(),
      endereco: form.endereco.trim(),
      tom: form.tom.trim(),
      objetivo: form.objetivo.trim(),
      informacoes_adicionais: form.informacoesAdicionais.trim(),
      emoji_max: base?.persona?.emoji_max ?? 1,
    },
    prompt_cliente: '',
    o_que_faz: form.oQueFaz.trim(),
    servicos: form.servicos.trim(),
    publico_alvo: form.publicoAlvo.trim(),
    regras_gerais: form.regrasGerais.trim(),
    funil: form.funil.trim(),
    perguntas: perguntasParaSalvar(form.perguntas),
    saudacao: form.saudacao.trim(),
    duvidas_veiculo: {
      acolhimentos: linhas(form.acolhimentos),
      encaminhamentos: linhas(form.encaminhamentos),
    },
    resposta_valores: form.respostaValores.trim(),
    texto_encerramento: form.textoEncerramento.trim(),
    proibido: linhas(form.proibido),
    webhook_finalizacao: form.webhook.trim(),
  }
}

export function erroDoFormulario(form: FormAgenteSdr): string | null {
  if (form.oQueFaz.length > 1000 || form.servicos.length > 1000 || form.publicoAlvo.length > 1000) {
    return 'O que faz, serviços e público-alvo aceitam até 1000 caracteres.'
  }
  if (form.objetivo.length > 1000 || form.informacoesAdicionais.length > 2000) {
    return 'Objetivo aceita até 1000 caracteres e informações adicionais até 2000.'
  }
  if (form.regrasGerais.length > 4000 || form.funil.length > 4000) {
    return 'Regras gerais e funil aceitam até 4000 caracteres.'
  }
  return erroDasPerguntas(form.perguntas)
}

export type AgenteResumo = {
  agent_id: string
  version: number
  status: 'draft' | 'published'
  nome: string | null
}

const IDENTIFICADOR = /^[a-z][a-z0-9_]{0,40}$/

export function identificadorAgenteValido(agentId: string): boolean {
  return IDENTIFICADOR.test(agentId)
}

function erroDoRpc(erro: { code?: string; message?: string }): Error {
  if (erro.code === 'PGRST202') {
    return new Error('Rode ia_atendimento/migrations/003_agentes_por_empresa.sql no Supabase.')
  }
  return new Error(erro.message || 'Erro ao falar com o Supabase')
}

export async function listarAgentesSdr(): Promise<AgenteResumo[]> {
  const { data, error } = await supabase.rpc('listar_agentes_sdr')
  if (error) throw erroDoRpc(error)
  return (data || []) as AgenteResumo[]
}

export async function obterAgenteSdr(agentId: string): Promise<AgenteSdrSalvo | null> {
  const { data, error } = await supabase.rpc('obter_agente_sdr', { p_agent_id: agentId })
  if (error) throw erroDoRpc(error)
  if (!data) return null
  return data as AgenteSdrSalvo
}

export async function salvarAgenteSdr(
  config: ConfigAgenteSdr,
  status: 'draft' | 'published',
  agentId: string
): Promise<{ version: number; status: string }> {
  const { data, error } = await supabase.rpc('salvar_agente_sdr', {
    p_config: config,
    p_status: status,
    p_agent_id: agentId,
  })
  if (error) throw erroDoRpc(error)
  return data as { version: number; status: string }
}

export async function arquivarAgenteSdr(agentId: string): Promise<void> {
  const { error } = await supabase.rpc('arquivar_agente_sdr', { p_agent_id: agentId })
  if (error) throw erroDoRpc(error)
}
