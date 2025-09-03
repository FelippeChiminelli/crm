import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { getUserTaskStats } from '../services/taskService'
import type { TaskStats } from '../types'

/**
 * Hook para gerenciar estatísticas de tarefas
 * Separado do useTasksLogic para melhor organização
 */

export function useTaskStats() {
  const { user } = useAuthContext()
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar estatísticas
  const loadStats = useCallback(async (userId?: string) => {
    if (!user && !userId) return

    setLoading(true)
    setError(null)

    try {
      const userIdToUse = userId || user?.id
      if (!userIdToUse) throw new Error('Usuário não identificado')

      const statsData = await getUserTaskStats(userIdToUse)
      setStats(statsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estatísticas'
      setError(errorMessage)
      console.error('❌ Erro ao carregar estatísticas:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Atualizar estatísticas automaticamente
  const refreshStats = useCallback(async () => {
    await loadStats()
  }, [loadStats])

  // Calcular métricas derivadas
  const getStatsMetrics = useCallback(() => {
    if (!stats) return null

    const total = stats.total || 0
    const completed = stats.concluida || 0
    const pending = stats.pendente || 0
    const inProgress = stats.em_andamento || 0
    const overdue = stats.atrasada || 0

    const completionRate = total > 0 ? (completed / total) * 100 : 0
    const overdueRate = total > 0 ? (overdue / total) * 100 : 0
    const activeTasksCount = pending + inProgress

    return {
      ...stats,
      completionRate: Math.round(completionRate * 100) / 100,
      overdueRate: Math.round(overdueRate * 100) / 100,
      activeTasksCount,
      totalTasks: total
    }
  }, [stats])

  // Verificar se há tarefas em atraso
  const hasOverdueTasks = useCallback(() => {
    return (stats?.atrasada || 0) > 0
  }, [stats])

  // Obter status de produtividade
  const getProductivityStatus = useCallback(() => {
    const metrics = getStatsMetrics()
    if (!metrics) return 'unknown'

    const { completionRate, overdueRate } = metrics

    if (completionRate >= 80 && overdueRate <= 10) {
      return 'excellent' // Excelente
    } else if (completionRate >= 60 && overdueRate <= 20) {
      return 'good' // Bom
    } else if (completionRate >= 40 && overdueRate <= 30) {
      return 'average' // Médio
    } else {
      return 'poor' // Precisa melhorar
    }
  }, [getStatsMetrics])

  // Obter recomendações baseadas nas estatísticas
  const getRecommendations = useCallback(() => {
    const metrics = getStatsMetrics()
    if (!metrics) return []

    const recommendations: string[] = []

    if (metrics.atrasada > 0) {
      recommendations.push('Priorize tarefas em atraso')
    }

    if (metrics.overdueRate > 20) {
      recommendations.push('Revise prazos e planejamento')
    }

    if (metrics.em_andamento > metrics.pendente * 2) {
      recommendations.push('Foque em finalizar tarefas em andamento')
    }

    if (metrics.completionRate < 50) {
      recommendations.push('Aumente o foco na conclusão de tarefas')
    }

    if (metrics.activeTasksCount > 20) {
      recommendations.push('Considere delegar ou reagendar tarefas')
    }

    return recommendations
  }, [getStatsMetrics])

  // Carregar stats quando o usuário muda
  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user, loadStats])

  return {
    // Estado
    stats,
    loading,
    error,

    // Operações
    loadStats,
    refreshStats,

    // Métricas calculadas
    getStatsMetrics,
    hasOverdueTasks,
    getProductivityStatus,
    getRecommendations,

    // Estado derivado
    isLoaded: stats !== null,
    hasStats: stats !== null && stats.total > 0
  }
}
