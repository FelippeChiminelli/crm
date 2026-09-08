/**
 * As origens são texto livre, então a mesma origem aparece gravada de formas
 * diferentes ("WhatsApp", "whatsapp", "Whatsapp "). Agrupamos por uma chave
 * normalizada para o usuário marcar a origem uma vez só.
 *
 * O grupo guarda todas as variantes brutas porque é isso que segue para o
 * banco: assim a comparação continua sendo igualdade simples sobre a coluna,
 * sem lower() que impediria o uso de índice.
 */
export interface OriginGroup {
  /** Chave normalizada, usada só para agrupar e identificar. */
  key: string
  /** Rótulo exibido: a variante de grafia mais "arrumada" do grupo. */
  label: string
  /** Todos os valores como estão gravados em leads.origin. */
  variants: string[]
}

function normalize(origin: string): string {
  return origin.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function groupOrigins(origins: string[]): OriginGroup[] {
  const byKey = new Map<string, string[]>()

  for (const origin of origins) {
    const key = normalize(origin)
    if (!key) continue
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(origin)
  }

  return Array.from(byKey.entries())
    .map(([key, variants]) => ({
      key,
      // Ordem case-sensitive coloca "WhatsApp" antes de "whatsapp", então a
      // primeira variante costuma ser a grafia com capitalização correta.
      label: [...variants].sort()[0],
      variants
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}

/** Um grupo está ativo quando qualquer uma de suas variantes foi selecionada. */
export function isGroupSelected(group: OriginGroup, selected?: string[]): boolean {
  if (!selected?.length) return false
  return group.variants.some(variant => selected.includes(variant))
}

/** Alterna o grupo inteiro, adicionando ou removendo todas as suas variantes. */
export function toggleGroup(group: OriginGroup, selected?: string[]): string[] {
  const current = selected || []

  if (isGroupSelected(group, current)) {
    return current.filter(variant => !group.variants.includes(variant))
  }

  return [...current, ...group.variants]
}
