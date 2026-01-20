/**
 * Utilitários para manipulação de tags
 * Funções reutilizáveis para extrair e gerenciar tags de leads, tasks e outros itens
 */

/**
 * Interface genérica para itens que possuem tags
 */
interface ItemWithTags {
  tags?: string[] | null
}

/**
 * Extrai todas as tags únicas de uma lista de itens
 * @param items - Array de itens que possuem campo tags
 * @returns Array de tags únicas, ordenadas alfabeticamente
 */
export function extractUniqueTags<T extends ItemWithTags>(items: T[]): string[] {
  const tagsSet = new Set<string>()
  
  items.forEach(item => {
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => {
        if (tag && typeof tag === 'string' && tag.trim()) {
          tagsSet.add(tag.trim())
        }
      })
    }
  })
  
  return Array.from(tagsSet).sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  )
}

/**
 * Filtra itens que possuem pelo menos uma das tags selecionadas (lógica OR)
 * @param items - Array de itens a filtrar
 * @param selectedTags - Array de tags para filtrar
 * @returns Itens filtrados que possuem pelo menos uma das tags
 */
export function filterByTags<T extends ItemWithTags>(
  items: T[], 
  selectedTags: string[]
): T[] {
  if (!selectedTags || selectedTags.length === 0) {
    return items
  }
  
  return items.filter(item => 
    item.tags?.some(tag => selectedTags.includes(tag))
  )
}

/**
 * Conta quantos itens possuem cada tag
 * @param items - Array de itens
 * @returns Objeto com contagem por tag
 */
export function countItemsByTag<T extends ItemWithTags>(
  items: T[]
): Record<string, number> {
  const counts: Record<string, number> = {}
  
  items.forEach(item => {
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => {
        if (tag && typeof tag === 'string' && tag.trim()) {
          const normalizedTag = tag.trim()
          counts[normalizedTag] = (counts[normalizedTag] || 0) + 1
        }
      })
    }
  })
  
  return counts
}
