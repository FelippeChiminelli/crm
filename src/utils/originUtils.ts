/**
 * Utilitários para normalização de origens (case-insensitive).
 * Evita fragmentação quando a mesma origem é registrada com variações: olx, Olx, OLX.
 */

export const ORIGIN_NAO_INFORMADO = 'Não informado'

/**
 * Retorna a chave normalizada para agrupamento (lowercase, trimmed).
 * Usada para consolidar origens com variação de case.
 */
export function normalizeOriginKey(origin: string | null | undefined): string {
  const s = (origin || ORIGIN_NAO_INFORMADO).trim()
  return s.toLowerCase()
}

/**
 * Verifica se duas origens são equivalentes (case-insensitive).
 */
export function originsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeOriginKey(a) === normalizeOriginKey(b)
}
