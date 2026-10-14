export type TipoPergunta = 'str' | 'int' | 'float' | 'bool' | 'enum'

export type PerguntaAgente = {
  objetivo?: string
  exemplos?: string[]
  reformulacao?: string[]
  evitar?: string[]
  texto_literal?: string
  abordagem?: string
}

export type PerguntaSalva = {
  campo: string
  tipo: TipoPergunta
  valores: string[]
  descricao: string
  objetivo: string | null
  abordagem: string | null
  exemplos: string[]
  reformulacao: string[]
  evitar: string[]
  ordem: number
  condicao: { se: string; igual: string | string[] } | null
  final: boolean
  texto_literal: string | null
  rotulo: string
}

export type PerguntaItemForm = {
  id: string
  rotulo: string
  campo: string
  campoManual: boolean
  tipo: TipoPergunta
  valores: string
  descricao: string
  objetivo: string
  abordagem: string
  exemplos: string
  reformulacao: string
  evitar: string
  condicaoAtiva: boolean
  condicaoSe: string
  condicaoIgual: string
  final: boolean
  textoLiteral: string
}

const ROTULOS: Record<string, string> = {
  nome: 'Nome',
  carro_interesse: 'Carro de interesse',
  cidade: 'Cidade',
  forma_aquisicao: 'Forma de aquisição',
  carro_troca: 'Carro na troca',
}

const SNAKE = /^[a-z][a-z0-9_]*$/

export const TIPOS_PERGUNTA: { valor: TipoPergunta; rotulo: string }[] = [
  { valor: 'str', rotulo: 'Texto' },
  { valor: 'int', rotulo: 'Número inteiro' },
  { valor: 'float', rotulo: 'Número decimal' },
  { valor: 'bool', rotulo: 'Sim/não' },
  { valor: 'enum', rotulo: 'Lista de valores' },
]

export function linhas(texto: string): string[] {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
}

export function juntar(valores: string[] | undefined): string {
  return (valores || []).join('\n')
}

export function campoDeRotulo(rotulo: string): string {
  const base = rotulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!base) return ''
  return SNAKE.test(base) ? base : `c_${base.replace(/^_+/, '')}`
}

function item(parcial: Partial<PerguntaItemForm> & Pick<PerguntaItemForm, 'rotulo' | 'campo'>): PerguntaItemForm {
  return {
    id: crypto.randomUUID(),
    campoManual: true,
    tipo: 'str',
    valores: '',
    descricao: '',
    objetivo: '',
    abordagem: '',
    exemplos: '',
    reformulacao: '',
    evitar: '',
    condicaoAtiva: false,
    condicaoSe: '',
    condicaoIgual: '',
    final: false,
    textoLiteral: '',
    ...parcial,
  }
}

export function perguntasPadrao(): PerguntaItemForm[] {
  return [
    item({
      rotulo: 'Nome',
      campo: 'nome',
      objetivo: 'Descobrir o nome do cliente',
      exemplos: 'Como você se chama?',
      reformulacao: 'Qual seu nome, pra eu te chamar certinho?',
    }),
    item({
      rotulo: 'Carro de interesse',
      campo: 'carro_interesse',
      objetivo: 'Descobrir qual carro o cliente procura',
      exemplos: 'Qual carro você tá procurando?',
      reformulacao: 'Tem algum modelo em mente?',
      evitar: 'É esse mesmo?\nConfirma o modelo?',
    }),
    item({
      rotulo: 'Cidade',
      campo: 'cidade',
      objetivo: 'Descobrir a cidade do cliente',
      exemplos: 'Você é daqui mesmo?',
      reformulacao: 'Você mora por aqui perto?',
    }),
    item({
      rotulo: 'Forma de aquisição',
      campo: 'forma_aquisicao',
      final: true,
      textoLiteral:
        'Você tem interesse em adquirir esse veiculo, se sim você pretende fazer avista, financiar ou possui algum veiculo para dar na troca ?',
    }),
    item({
      rotulo: 'Carro na troca',
      campo: 'carro_troca',
      objetivo: 'Descobrir modelo e ano do carro da troca',
      exemplos: 'Qual o modelo e ano do seu carro?',
      condicaoAtiva: true,
      condicaoSe: 'forma_aquisicao',
      condicaoIgual: 'troca',
    }),
  ]
}

export function perguntaNova(existentes: string[]): PerguntaItemForm {
  let campo = 'nova_pergunta'
  let indice = 2
  while (existentes.includes(campo)) {
    campo = `nova_pergunta_${indice}`
    indice += 1
  }
  return item({ rotulo: 'Nova pergunta', campo, campoManual: false })
}

function igualEmTexto(igual: string | string[] | undefined): string {
  if (Array.isArray(igual)) return igual.join('\n')
  return igual || ''
}

function daLista(perguntas: PerguntaSalva[]): PerguntaItemForm[] {
  return [...perguntas]
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((entrada) =>
      item({
        rotulo: entrada.rotulo || ROTULOS[entrada.campo] || entrada.campo,
        campo: entrada.campo,
        tipo: entrada.tipo || 'str',
        valores: juntar(entrada.valores),
        descricao: entrada.descricao || '',
        objetivo: entrada.objetivo || '',
        abordagem: entrada.abordagem || '',
        exemplos: juntar(entrada.exemplos),
        reformulacao: juntar(entrada.reformulacao),
        evitar: juntar(entrada.evitar),
        condicaoAtiva: Boolean(entrada.condicao),
        condicaoSe: entrada.condicao?.se || '',
        condicaoIgual: igualEmTexto(entrada.condicao?.igual),
        final: Boolean(entrada.final) || Boolean(entrada.texto_literal),
        textoLiteral: entrada.texto_literal || '',
      })
    )
}

type ConfigPerguntas = {
  checklist?: string[]
  perguntas_finais?: string[]
  condicionais?: Record<string, { se: string; igual: string | string[] }>
  campos?: { nome: string; tipo?: TipoPergunta; valores?: string[]; descricao?: string }[]
  perguntas?: Record<string, PerguntaAgente> | PerguntaSalva[]
}

export function perguntasDaConfig(config: ConfigPerguntas): PerguntaItemForm[] {
  const perguntas = config.perguntas
  if (Array.isArray(perguntas)) return daLista(perguntas)
  if (!perguntas) return perguntasPadrao()

  const ordem = config.checklist?.length ? config.checklist : Object.keys(perguntas)
  const campos = Object.fromEntries((config.campos || []).map((campo) => [campo.nome, campo]))
  const finais = new Set(config.perguntas_finais || [])
  const condicionais = config.condicionais || {}

  return ordem
    .filter((nome) => perguntas[nome])
    .map((nome) => {
      const guia = perguntas[nome]
      const campo = campos[nome]
      const condicao = condicionais[nome]
      return item({
        rotulo: ROTULOS[nome] || nome,
        campo: nome,
        tipo: campo?.tipo || 'str',
        valores: juntar(campo?.valores),
        descricao: campo?.descricao || guia.objetivo || '',
        objetivo: guia.objetivo || '',
        abordagem: guia.abordagem || '',
        exemplos: juntar(guia.exemplos),
        reformulacao: juntar(guia.reformulacao),
        evitar: juntar(guia.evitar),
        condicaoAtiva: Boolean(condicao),
        condicaoSe: condicao?.se || '',
        condicaoIgual: igualEmTexto(condicao?.igual),
        final: finais.has(nome) || Boolean(guia.texto_literal),
        textoLiteral: guia.texto_literal || '',
      })
    })
}

export function perguntasParaSalvar(itens: PerguntaItemForm[]): PerguntaSalva[] {
  return itens.map((entrada, ordem) => {
    const iguais = linhas(entrada.condicaoIgual)
    const igual = iguais.length > 1 ? iguais : iguais[0] || ''
    return {
      campo: entrada.campo.trim(),
      tipo: entrada.tipo,
      valores: entrada.tipo === 'enum' ? linhas(entrada.valores) : [],
      descricao: entrada.descricao.trim() || entrada.objetivo.trim() || entrada.campo.trim(),
      objetivo: entrada.objetivo.trim() || null,
      abordagem: entrada.abordagem.trim() || null,
      exemplos: linhas(entrada.exemplos),
      reformulacao: linhas(entrada.reformulacao),
      evitar: linhas(entrada.evitar),
      ordem,
      condicao: entrada.condicaoAtiva ? { se: entrada.condicaoSe, igual } : null,
      final: entrada.final,
      texto_literal: entrada.final && entrada.textoLiteral.trim() ? entrada.textoLiteral.trim() : null,
      rotulo: entrada.rotulo.trim() || entrada.campo.trim(),
    }
  })
}

export function erroDasPerguntas(itens: PerguntaItemForm[]): string | null {
  if (itens.length === 0) return 'Inclua ao menos uma pergunta.'
  const campos = itens.map((entrada) => entrada.campo.trim())
  const vistos = new Set<string>()
  for (const entrada of itens) {
    const nome = entrada.campo.trim() || entrada.rotulo.trim() || 'pergunta'
    if (!SNAKE.test(entrada.campo.trim())) return `O identificador "${nome}" precisa estar em snake_case.`
    if (vistos.has(entrada.campo.trim())) return `O identificador "${entrada.campo.trim()}" está repetido.`
    vistos.add(entrada.campo.trim())
    if (entrada.tipo === 'enum' && linhas(entrada.valores).length === 0) {
      return `A pergunta "${nome}" é uma lista e precisa de valores.`
    }
    if (entrada.textoLiteral.trim() && !entrada.final) {
      return `Texto fixo só vale na pergunta final: "${nome}".`
    }
    if (!entrada.condicaoAtiva) continue
    if (!entrada.condicaoSe || !campos.includes(entrada.condicaoSe)) {
      return `A condição de "${nome}" aponta para um campo que não existe.`
    }
    if (!entrada.condicaoIgual.trim()) return `Informe o valor da condição de "${nome}".`
  }
  return null
}
