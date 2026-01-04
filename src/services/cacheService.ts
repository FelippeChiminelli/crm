/**
 * Serviço de Cache para Analytics
 * 
 * Implementa cache em memória com TTL (Time To Live) para otimizar
 * consultas repetidas de analytics que são custosas.
 * 
 * Features:
 * - TTL configurável por tipo de cache
 * - Invalidação automática
 * - Limpeza de cache expirado
 * - Estatísticas de hit/miss
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // em milissegundos
}

interface CacheStats {
  hits: number
  misses: number
  entries: number
  hitRate: number
}

// TTLs padrão para diferentes tipos de dados (em minutos)
const DEFAULT_TTLS = {
  analytics_stats: 5,          // Estatísticas gerais - 5 minutos
  analytics_pipeline: 10,      // Leads por pipeline - 10 minutos
  analytics_stage: 10,         // Leads por estágio - 10 minutos
  analytics_origin: 15,        // Leads por origem - 15 minutos
  analytics_timeseries: 15,    // Séries temporais - 15 minutos
  analytics_funnel: 10,        // Funil de conversão - 10 minutos
  analytics_pipeline_funnel: 10, // Funil de conversão por pipeline - 10 minutos
  analytics_chat: 3,           // Métricas de chat - 3 minutos
  analytics_chat_response: 5,  // Tempo de resposta - 5 minutos
  analytics_chat_proactive: 10, // Tempo de contato proativo - 10 minutos
  analytics_conversion_detailed: 10, // Taxa de conversão detalhada - 10 minutos
  analytics_stage_time: 10     // Tempo por estágio - 10 minutos
}

class CacheService {
  private cache: Map<string, CacheEntry<any>>
  private stats: { hits: number; misses: number }
  private cleanupInterval: number | null = null

  constructor() {
    this.cache = new Map()
    this.stats = { hits: 0, misses: 0 }
    
    // Iniciar limpeza automática a cada 5 minutos
    this.startAutoCleanup()
  }

  /**
   * Gerar chave de cache baseada em tipo e filtros
   */
  private generateKey(type: string, filters?: any): string {
    if (!filters) return type
    
    // Serializar filtros de forma consistente
    const sortedFilters = JSON.stringify(filters, Object.keys(filters).sort())
    return `${type}:${sortedFilters}`
  }

  /**
   * Verificar se entrada do cache ainda é válida
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now()
    return (now - entry.timestamp) < entry.ttl
  }

  /**
   * Buscar no cache
   */
  get<T>(type: string, filters?: any): T | null {
    const key = this.generateKey(type, filters)
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    if (!this.isValid(entry)) {
      // Cache expirado, remover
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return entry.data as T
  }

  /**
   * Salvar no cache
   */
  set<T>(type: string, data: T, filters?: any, customTTL?: number): void {
    const key = this.generateKey(type, filters)
    
    // Obter TTL padrão ou usar customizado
    const ttlMinutes = customTTL || DEFAULT_TTLS[type as keyof typeof DEFAULT_TTLS] || 10
    const ttl = ttlMinutes * 60 * 1000 // Converter para milissegundos

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }

    this.cache.set(key, entry)
  }

  /**
   * Invalidar cache específico
   */
  invalidate(type: string, filters?: any): void {
    const key = this.generateKey(type, filters)
    this.cache.delete(key)
  }

  /**
   * Invalidar todos os caches de um tipo
   */
  invalidateType(type: string): void {
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(type)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Invalidar todo o cache de analytics
   */
  invalidateAllAnalytics(): void {
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (key.startsWith('analytics_')) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Limpar entradas expiradas
   */
  cleanup(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= entry.ttl) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }

  /**
   * Iniciar limpeza automática periódica
   */
  private startAutoCleanup(): void {
    // Limpar cache expirado a cada 5 minutos
    this.cleanupInterval = window.setInterval(() => {
      const removed = this.cleanup()
      if (removed > 0) {
        console.log(`[Cache] Limpeza automática: ${removed} entradas removidas`)
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Parar limpeza automática
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    }
  }

  /**
   * Resetar estatísticas
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Obter tamanho aproximado do cache em bytes
   */
  getSize(): number {
    let size = 0
    
    for (const entry of this.cache.values()) {
      // Estimativa aproximada do tamanho do objeto em bytes
      size += JSON.stringify(entry.data).length
    }

    return size
  }

  /**
   * Obter tamanho formatado
   */
  getFormattedSize(): string {
    const bytes = this.getSize()
    
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}

// Exportar instância singleton
export const cacheService = new CacheService()

// Exportar classe para testes
export { CacheService }

// Exportar tipos
export type { CacheStats }

/**
 * Hook para usar cache em funções de analytics
 * 
 * @example
 * const cachedData = useCachedQuery('analytics_stats', filters, async () => {
 *   return await getAnalyticsStats(filters)
 * })
 */
export async function useCachedQuery<T>(
  type: string,
  filters: any,
  queryFn: () => Promise<T>
): Promise<T> {
  // Tentar buscar do cache primeiro
  const cached = cacheService.get<T>(type, filters)
  
  if (cached !== null) {
    return cached
  }

  // Se não encontrou, executar query
  const result = await queryFn()
  
  // Salvar no cache
  cacheService.set(type, result, filters)
  
  return result
}

