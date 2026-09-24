import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { tiptapToPdfMake, replaceVariables } from './tiptapToPdfMake'
import type { ContractPageSettings, ContractTemplate } from '../../types'

/** Monta o docDefinition e gera o PDF no navegador. */

// A4 em pontos (72pt = 1 polegada).
const PAGE_WIDTH = 595.28

const DEFAULT_SETTINGS: Required<ContractPageSettings> = {
  marginTop: 70,
  marginRight: 60,
  marginBottom: 70,
  marginLeft: 70,
  fontSize: 11,
  showPageNumbers: true,
}

/** Só o que o PDF precisa do modelo, para a prévia poder montar um objeto solto. */
export type ContractPdfTemplate = Pick<
  ContractTemplate,
  'body_json' | 'header_json' | 'footer_text' | 'page_settings'
>

export interface BuildContractPdfResult {
  blob: Blob
  unknownTokens: string[]
}

/**
 * pdfmake e as métricas da fonte passam de 1MB somados, então só entram por
 * import dinâmico: o custo é pago na primeira emissão, não no load do CRM.
 */
let pdfMakePromise: Promise<any> | null = null

async function loadPdfMake(): Promise<any> {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      const [pdfMakeModule, timesModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/standard-fonts/Times'),
      ])

      const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule
      const times = (timesModule as any).default ?? timesModule

      // Times é fonte padrão do PDF: serifada (convencional em contrato) e sem
      // embutir arquivo de fonte, ao contrário do vfs do Roboto.
      pdfMake.addVirtualFileSystem(times.vfs)
      pdfMake.setFonts(times.fonts)

      return pdfMake
    })()

    // Sem isso uma falha de rede no chunk ficaria em cache e nenhuma nova
    // tentativa de emissão voltaria a funcionar.
    pdfMakePromise.catch(() => {
      pdfMakePromise = null
    })
  }

  return pdfMakePromise
}

export function buildDocDefinition(
  template: ContractPdfTemplate,
  values: Record<string, string>
): { doc: TDocumentDefinitions; unknownTokens: string[] } {
  const settings = { ...DEFAULT_SETTINGS, ...(template.page_settings || {}) }
  const contentWidth = PAGE_WIDTH - settings.marginLeft - settings.marginRight

  const body = tiptapToPdfMake(template.body_json, { values, contentWidth })

  // O cabeçalho é texto formatado e passa pelo mesmo conversor do corpo.
  const header = template.header_json
    ? tiptapToPdfMake(template.header_json, { values, contentWidth })
    : null

  const unknownTokens = [
    ...new Set([...body.unknownTokens, ...(header?.unknownTokens || [])]),
  ]

  const footerText = template.footer_text
    ? replaceVariables(template.footer_text, values)
    : ''

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [
      settings.marginLeft,
      settings.marginTop,
      settings.marginRight,
      settings.marginBottom,
    ],
    defaultStyle: {
      font: 'Times',
      fontSize: settings.fontSize,
      lineHeight: 1.4,
    },
    styles: {
      h1: { fontSize: settings.fontSize + 6, bold: true, margin: [0, 0, 0, 10] },
      h2: { fontSize: settings.fontSize + 3, bold: true, margin: [0, 8, 0, 8] },
      h3: { fontSize: settings.fontSize + 1, bold: true, margin: [0, 6, 0, 6] },
    },
    content: body.content.length > 0 ? body.content : [{ text: '' }],
    ...(header
      ? {
          header: {
            stack: header.content,
            margin: [settings.marginLeft, 24, settings.marginRight, 0],
          } as Content,
        }
      : {}),
    footer: buildFooter(footerText, settings),
  }

  return { doc, unknownTokens }
}

function buildFooter(footerText: string, settings: Required<ContractPageSettings>) {
  if (!footerText && !settings.showPageNumbers) return undefined

  return (currentPage: number, pageCount: number): Content => {
    const columns: Content[] = []

    if (footerText) {
      columns.push({ text: footerText, alignment: 'left' })
    }

    if (settings.showPageNumbers) {
      columns.push({
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: footerText ? 'right' : 'center',
      })
    }

    return {
      columns,
      margin: [settings.marginLeft, 12, settings.marginRight, 0],
      fontSize: settings.fontSize - 2,
      color: '#555555',
    }
  }
}

export async function buildContractPdf(
  template: ContractPdfTemplate,
  values: Record<string, string>
): Promise<BuildContractPdfResult> {
  const { doc, unknownTokens } = buildDocDefinition(template, values)
  const pdfMake = await loadPdfMake()

  // No pdfmake 0.3 o getBlob é assíncrono e não recebe callback.
  const blob: Blob = await pdfMake.createPdf(doc).getBlob()

  return { blob, unknownTokens }
}
