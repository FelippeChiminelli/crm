import { useCallback, useEffect, useRef, useState } from 'react'
import { getChatEngagementSummary } from '../../../services/chatEngagementService'
import type { ChatAnalyticsFilters, ChatEngagementSummary } from '../../../types'

/**
 * Carrega o estágio do atendimento das conversas.
 *
 * Fica fora do useAnalyticsData de propósito: aquele hook dispara todas as
 * métricas num único Promise.all a cada mudança de filtro, mesmo em abas que
 * não as usam. Como esta consulta varre todas as mensagens do período, ela só
 * roda a partir da aba Chat, que é montada sob demanda pela AnalyticsPage.
 */
export function useChatEngagement(filters: ChatAnalyticsFilters, enabled = true) {
  const [summary, setSummary] = useState<ChatEngagementSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const loadSummary = useCallback(async () => {
    const thisRequestId = ++requestIdRef.current

    try {
      setLoading(true)
      setError(null)

      const data = await getChatEngagementSummary(filters)

      // Descarta respostas de requisições antigas
      if (thisRequestId !== requestIdRef.current) return
      setSummary(data)
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return
      console.error('Erro ao carregar estágio do atendimento:', err)
      setError('Não foi possível carregar o estágio do atendimento.')
      setSummary([])
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [filters])

  useEffect(() => {
    if (!enabled) return
    loadSummary()
  }, [enabled, loadSummary])

  return { summary, loading, error, reload: loadSummary }
}
