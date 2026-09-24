import extenso from 'extenso'

/** Formatações pt-BR usadas na substituição das variáveis do contrato. */

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return ''
  return currencyFormatter.format(value)
}

/**
 * Valor monetário por extenso. A lib espera o número no formato brasileiro
 * (vírgula como separador decimal) quando recebido em string, o que evita a
 * imprecisão de ponto flutuante do tipo `number`.
 */
export function formatCurrencyInWords(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return ''
  try {
    return extenso(value.toFixed(2).replace('.', ','), {
      mode: 'currency',
      currency: { type: 'BRL' },
    })
  } catch {
    return ''
  }
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(iso: string | null | undefined): string {
  const date = parseDate(iso)
  if (!date) return ''
  return date.toLocaleDateString('pt-BR')
}

/** Data no formato usado no fecho de contratos: "23 de setembro de 2026". */
export function formatLongDate(iso: string | null | undefined): string {
  const date = parseDate(iso)
  if (!date) return ''
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`
}

/** Número do contrato com zeros à esquerda, ex.: 42 -> "0042". */
export function formatContractNumber(value: number | null | undefined): string {
  if (value == null) return ''
  return String(value).padStart(4, '0')
}
