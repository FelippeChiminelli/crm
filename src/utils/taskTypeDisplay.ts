/**
 * Nome técnico no banco (ASCII) → rótulo exibido no front.
 */
const STORAGE_TO_LABEL: Record<string, string> = {
  cobranca: 'Cobrança',
}

/** Normaliza nome vindo da tabela `task_types` para comparação (ex.: "Cobrança" legado vs "cobranca"). */
export function normalizedTaskTypeStorageName(name: string | null | undefined): string {
  if (name == null) return ''
  return name.normalize('NFKD').trim().replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Indica se o registro no banco representa o tipo cobrança (slug `cobranca` ou variações com acento). */
export function isCobrancaTaskTypeStorageName(name: string | null | undefined): boolean {
  return normalizedTaskTypeStorageName(name) === 'cobranca'
}

/** Rótulo para UI; mantém outros tipos como estão no banco (ex.: Ligação). */
export function formatTaskTypeName(name: string | null | undefined): string {
  if (name == null || name === '') return ''
  const key = normalizedTaskTypeStorageName(name)
  return STORAGE_TO_LABEL[key] ?? name.trim()
}
