// ============================================================================
// UTILITÁRIOS DE PERFORMANCE E MONITORAMENTO
// ============================================================================

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 100 // Limite para evitar memory leaks

  // Medir tempo de execução de uma função
  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, success: true }
      })
      
      // Log se operação for lenta (>1s)
      if (duration > 1000) {
        console.warn(`🐌 Operação lenta detectada: ${name} (${duration.toFixed(2)}ms)`, metadata)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      })
      
      throw error
    }
  }

  // Medir tempo de execução de uma função síncrona
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const startTime = performance.now()
    
    try {
      const result = fn()
      const duration = performance.now() - startTime
      
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, success: true }
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      })
      
      throw error
    }
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Manter apenas as métricas mais recentes
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  // Obter estatísticas das métricas
  getStats(name?: string) {
    const filteredMetrics = name 
      ? this.metrics.filter(m => m.name === name)
      : this.metrics

    if (filteredMetrics.length === 0) {
      return null
    }

    const durations = filteredMetrics.map(m => m.duration)
    const successCount = filteredMetrics.filter(m => m.metadata?.success).length
    
    return {
      count: filteredMetrics.length,
      successRate: (successCount / filteredMetrics.length) * 100,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      medianDuration: this.calculateMedian(durations)
    }
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2
  }

  // Obter métricas recentes
  getRecentMetrics(limit = 10): PerformanceMetric[] {
    return this.metrics.slice(-limit)
  }

  // Limpar métricas
  clear() {
    this.metrics = []
  }

  // Exportar relatório
  generateReport(): string {
    const uniqueNames = [...new Set(this.metrics.map(m => m.name))]
    let report = '📊 RELATÓRIO DE PERFORMANCE\n\n'
    
    uniqueNames.forEach(name => {
      const stats = this.getStats(name)
      if (stats) {
        report += `🔍 ${name}:\n`
        report += `   • Execuções: ${stats.count}\n`
        report += `   • Taxa de sucesso: ${stats.successRate.toFixed(1)}%\n`
        report += `   • Tempo médio: ${stats.avgDuration.toFixed(2)}ms\n`
        report += `   • Tempo min/max: ${stats.minDuration.toFixed(2)}ms / ${stats.maxDuration.toFixed(2)}ms\n`
        report += `   • Mediana: ${stats.medianDuration.toFixed(2)}ms\n\n`
      }
    })
    
    return report
  }
}

// Instância global do monitor
export const performanceMonitor = new PerformanceMonitor()

// ============================================================================
// UTILITÁRIOS DE DEBOUNCE E THROTTLE
// ============================================================================

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// ============================================================================
// UTILITÁRIOS DE CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private cleanupInterval: NodeJS.Timeout

  constructor(cleanupIntervalMs = 60000) { // Cleanup a cada minuto
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, cleanupIntervalMs)
  }

  set<T>(key: string, data: T, ttlMs = 300000): void { // TTL padrão: 5 minutos
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Obter estatísticas do cache
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    
    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++
      } else {
        validEntries++
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: validEntries / this.cache.size * 100
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

export const memoryCache = new MemoryCache()

// ============================================================================
// UTILITÁRIOS DE LAZY LOADING
// ============================================================================

export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  _fallback?: React.ComponentType
) {
  return React.lazy(importFunction)
}

// ============================================================================
// UTILITÁRIOS DE BUNDLE ANALYSIS
// ============================================================================

export function logBundleInfo() {
  if (process.env.NODE_ENV === 'development') {
    console.group('📦 Bundle Info')
    console.log('React version:', React.version)
    console.log('Environment:', process.env.NODE_ENV)
    console.log('Build timestamp:', new Date().toISOString())
    
    // Informações sobre performance do navegador
    if ('performance' in window && 'navigation' in performance) {
      const navigation = performance.navigation as any
      console.log('Navigation type:', navigation.type === 0 ? 'Navigate' : navigation.type === 1 ? 'Reload' : 'Back/Forward')
    }
    
    console.groupEnd()
  }
}

// ============================================================================
// HOOK PARA MEDIÇÃO DE PERFORMANCE DE COMPONENTES
// ============================================================================

import { useEffect, useRef } from 'react'
import React from 'react'

export function useComponentPerformance(componentName: string) {
  const renderStartTime = useRef<number>(0)
  const mountTime = useRef<number>(0)

  // Medir tempo de renderização
  renderStartTime.current = performance.now()

  useEffect(() => {
    // Medir tempo de mount
    mountTime.current = performance.now()
    
    if (renderStartTime.current) {
      const renderDuration = mountTime.current - renderStartTime.current
      
      if (renderDuration > 16) { // >16ms pode causar jank
        console.warn(`🐌 Componente lento: ${componentName} (${renderDuration.toFixed(2)}ms)`)
      }
      
      performanceMonitor.measureSync(`${componentName}_render`, () => {
        return renderDuration
      }, { componentName })
    }

    // Cleanup
    return () => {
      if (mountTime.current) {
        const unmountTime = performance.now()
        const totalLifetime = unmountTime - mountTime.current
        
        performanceMonitor.measureSync(`${componentName}_lifetime`, () => {
          return totalLifetime
        }, { componentName })
      }
    }
  }, [componentName])
}

// ============================================================================
// FUNÇÕES DE DESENVOLVIMENTO
// ============================================================================

export function enablePerformanceDebugging() {
  if (process.env.NODE_ENV === 'development') {
    // Expor monitor globalmente para debug
    ;(window as any).performanceMonitor = performanceMonitor
    ;(window as any).memoryCache = memoryCache
    
    console.log('🔧 Performance debugging enabled')
    console.log('Use window.performanceMonitor.generateReport() para ver relatório')
    console.log('Use window.memoryCache.getStats() para ver estatísticas de cache')
  }
} 