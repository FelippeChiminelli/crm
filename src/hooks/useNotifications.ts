import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '../contexts/AuthContext'
import { useImpersonation } from '../contexts/ImpersonationContext'
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsReadByRef
} from '../services/notificationsService'

const POLL_INTERVAL_MS = 45 * 1000

const notificationKeys = {
  all: (userId: string | undefined) => ['notifications', userId] as const,
  unread: (userId: string | undefined) => ['notifications', userId, 'unread'] as const,
  list: (userId: string | undefined) => ['notifications', userId, 'list'] as const
}

/** Habilitado só para o usuário real (não durante impersonação). */
function useNotificationsUser() {
  const { user, isAuthenticated } = useAuthContext()
  const { isImpersonating } = useImpersonation()
  const userId = user?.id
  return { userId, enabled: Boolean(isAuthenticated && userId && !isImpersonating) }
}

/** Contador de não lidas com polling (pausa com a aba em segundo plano). */
export function useUnreadNotificationsCount() {
  const { userId, enabled } = useNotificationsUser()
  return useQuery({
    queryKey: notificationKeys.unread(userId),
    queryFn: countUnreadNotifications,
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 15 * 1000
  })
}

/** Lista das últimas notificações; só busca enquanto o painel está aberto. */
export function useNotificationsList(open: boolean) {
  const { userId, enabled } = useNotificationsUser()
  return useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: () => listNotifications(),
    enabled: enabled && open,
    refetchInterval: open ? POLL_INTERVAL_MS : false,
    staleTime: 0
  })
}

export function useNotificationActions() {
  const { userId } = useNotificationsUser()
  const queryClient = useQueryClient()
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: notificationKeys.all(userId) }),
    [queryClient, userId]
  )

  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate })
  const markAllRead = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate })
  const markRefRead = useMutation({ mutationFn: markNotificationsReadByRef, onSuccess: invalidate })

  return { markRead, markAllRead, markRefRead }
}

/** Ao abrir um lead, marca como lidas as notificações dele (libera o próximo push de mensagem). */
export function useMarkLeadNotificationsRead(leadId: string | undefined) {
  const { enabled } = useNotificationsUser()
  const { markRefRead } = useNotificationActions()
  const { mutate } = markRefRead

  useEffect(() => {
    if (enabled && leadId) mutate(leadId)
  }, [enabled, leadId, mutate])
}
