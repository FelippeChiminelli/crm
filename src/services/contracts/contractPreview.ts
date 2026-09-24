import { buildContractPdf } from './contractPdfBuilder'
import type { ContractPdfTemplate } from './contractPdfBuilder'
import { buildContractVariableCatalog } from './contractVariableCatalog'
import type { LeadCustomField } from '../../types'

/**
 * Pré-visualização do modelo com valores de exemplo, só para conferir layout.
 * Nada disso é persistido nem anexado a um lead.
 */

export function buildExampleValues(customFields: LeadCustomField[]): Record<string, string> {
  const catalog = buildContractVariableCatalog(customFields)
  return Object.fromEntries(catalog.map((variable) => [variable.key, variable.example]))
}

export async function buildContractPreview(
  template: ContractPdfTemplate,
  customFields: LeadCustomField[]
): Promise<Blob> {
  const { blob } = await buildContractPdf(template, buildExampleValues(customFields))
  return blob
}

/**
 * Abre o PDF em nova aba. A geração é assíncrona, então o gesto do usuário já
 * expirou quando chegamos aqui e o bloqueador de pop-up pode barrar a aba —
 * nesse caso cai para download, que não é bloqueado. Retorna o que aconteceu
 * para a tela poder avisar.
 */
export function openPdfInNewTab(blob: Blob, fileName = 'contrato.pdf'): 'tab' | 'download' {
  const url = URL.createObjectURL(blob)
  const revoke = () => setTimeout(() => URL.revokeObjectURL(url), 60_000)

  const tab = window.open(url, '_blank')
  if (tab) {
    revoke()
    return 'tab'
  }

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  revoke()
  return 'download'
}
