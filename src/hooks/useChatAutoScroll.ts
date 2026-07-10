import { useCallback, useEffect, useRef } from 'react'

interface UseChatAutoScrollOptions {
  /** Lista de mensagens renderizadas. Mudanças acionam a avaliação de scroll. */
  messages: unknown[]
  /** Identificador da conversa ativa. Ao mudar, força scroll para o final. */
  conversationId?: string | null
  /** Distância (px) do final considerada "perto do fim". */
  nearBottomThreshold?: number
}

/**
 * Controla o auto-scroll da timeline de chat de forma não intrusiva.
 *
 * Regras:
 * - Troca de conversa: pula direto para o final (carga inicial).
 * - Nova atualização de mensagens: só rola para o fim se o usuário já estava
 *   perto do final. Se ele subiu para ler o histórico, a posição é preservada
 *   (evita o "puxão" para baixo causado pelo polling/realtime).
 *
 * O container é registrado via callback ref para que o listener de scroll seja
 * anexado no momento em que o elemento é montado no DOM (o container pode não
 * existir na primeira renderização, ex.: quando nenhuma conversa está aberta).
 */
export function useChatAutoScroll({
  messages,
  conversationId,
  nearBottomThreshold = 120,
}: UseChatAutoScrollOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef(true)
  const prevConversationIdRef = useRef<string | null | undefined>(conversationId)

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    isNearBottomRef.current = distanceFromBottom < nearBottomThreshold
  }, [nearBottomThreshold])

  const setScrollContainer = useCallback(
    (node: HTMLDivElement | null) => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', handleScroll)
      }
      containerRef.current = node
      if (node) {
        node.addEventListener('scroll', handleScroll, { passive: true })
      }
    },
    [handleScroll]
  )

  useEffect(() => {
    const conversationChanged = prevConversationIdRef.current !== conversationId

    if (conversationChanged) {
      prevConversationIdRef.current = conversationId
      isNearBottomRef.current = true
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      return
    }

    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, conversationId])

  return { setScrollContainer, messagesEndRef }
}
