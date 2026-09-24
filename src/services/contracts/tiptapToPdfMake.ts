import type { Content } from 'pdfmake/interfaces'
import type { TipTapDoc, TipTapNode } from '../../types'

/**
 * Converte o documento do editor TipTap em conteúdo do pdfmake.
 *
 * Trabalhamos sobre o JSON do editor (e não sobre HTML) porque o pdfmake
 * consome estrutura. Isso também gera PDF com texto real, selecionável e
 * pesquisável — diferente de html2pdf/jsPDF.html(), que rasterizam a página.
 */

const TOKEN_PATTERN = /\{\{([^}]+)\}\}/g

export interface ConvertOptions {
  values: Record<string, string>
  /** Largura útil da página, usada pela linha horizontal. */
  contentWidth: number
}

export interface ConvertResult {
  content: Content[]
  /** Tokens escritos no template que não correspondem a nenhuma variável. */
  unknownTokens: string[]
}

export function tiptapToPdfMake(doc: TipTapDoc, options: ConvertOptions): ConvertResult {
  const unknownTokens = new Set<string>()
  const content = (doc?.content || []).flatMap((node) =>
    convertBlock(node, options, unknownTokens)
  )
  return { content, unknownTokens: [...unknownTokens] }
}

function convertBlock(
  node: TipTapNode,
  options: ConvertOptions,
  unknown: Set<string>
): Content[] {
  switch (node.type) {
    case 'paragraph':
      return [
        {
          text: convertInline(node.content, options, unknown),
          alignment: alignmentOf(node),
          margin: [0, 0, 0, 8],
        },
      ]

    case 'heading': {
      const level = Number(node.attrs?.level) || 1
      return [
        {
          text: convertInline(node.content, options, unknown),
          style: `h${Math.min(level, 3)}`,
          alignment: alignmentOf(node),
        },
      ]
    }

    case 'bulletList':
      return [{ ul: convertListItems(node, options, unknown), margin: [0, 0, 0, 8] }]

    case 'orderedList':
      return [{ ol: convertListItems(node, options, unknown), margin: [0, 0, 0, 8] }]

    case 'blockquote':
      return [
        {
          stack: (node.content || []).flatMap((child) => convertBlock(child, options, unknown)),
          margin: [24, 0, 0, 8],
          italics: true,
        },
      ]

    case 'horizontalRule':
      return [
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: options.contentWidth,
              y2: 0,
              lineWidth: 0.5,
              lineColor: '#999999',
            },
          ],
          margin: [0, 6, 0, 12],
        },
      ]

    default:
      // Nó desconhecido: tenta descer nos filhos para não perder o texto.
      return (node.content || []).flatMap((child) => convertBlock(child, options, unknown))
  }
}

/**
 * Itens de lista. Cada listItem contém blocos; um item com um único parágrafo
 * vira um objeto simples, o que mantém o PDF mais enxuto.
 */
function convertListItems(
  node: TipTapNode,
  options: ConvertOptions,
  unknown: Set<string>
): Content[] {
  return (node.content || []).map((item) => {
    const blocks = (item.content || []).flatMap((child) => convertBlock(child, options, unknown))
    if (blocks.length === 1) return blocks[0]
    return { stack: blocks }
  })
}

function convertInline(
  nodes: TipTapNode[] | undefined,
  options: ConvertOptions,
  unknown: Set<string>
): Content[] {
  if (!nodes || nodes.length === 0) return ['']

  return nodes.map((node) => {
    if (node.type === 'hardBreak') return { text: '\n' }

    const text = replaceVariables(node.text || '', options.values, unknown)
    const marks = node.marks || []

    const segment: Record<string, any> = { text }

    for (const mark of marks) {
      if (mark.type === 'bold') segment.bold = true
      if (mark.type === 'italic') segment.italics = true
      if (mark.type === 'underline') segment.decoration = 'underline'
      if (mark.type === 'strike') segment.decoration = 'lineThrough'
      if (mark.type === 'link' && mark.attrs?.href) segment.link = mark.attrs.href
    }

    return segment as Content
  })
}

/**
 * Substitui os tokens `{{chave}}` pelos valores resolvidos.
 *
 * Limitação conhecida: um token só é reconhecido se estiver inteiro no mesmo nó
 * de texto. Formatar metade do token no editor (ex.: `{{lead.` em negrito)
 * impede a substituição — por isso o picker insere o token como texto simples.
 */
export function replaceVariables(
  text: string,
  values: Record<string, string>,
  unknown?: Set<string>
): string {
  if (!text.includes('{{')) return text

  return text.replace(TOKEN_PATTERN, (match, rawKey: string) => {
    const key = rawKey.trim()
    if (key in values) return values[key]
    unknown?.add(key)
    // Token desconhecido permanece visível para o autor perceber o erro de digitação.
    return match
  })
}

function alignmentOf(node: TipTapNode): 'left' | 'center' | 'right' | 'justify' | undefined {
  const align = node.attrs?.textAlign
  if (align === 'center' || align === 'right' || align === 'justify' || align === 'left') {
    return align
  }
  return undefined
}
