import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useNotificationActions, useNotificationsList } from '../../hooks/useNotifications'
import type { AppNotification } from '../../services/notificationsService'

interface NotificationPanelProps {
  onClose: () => void
}

function NotificationItem({ notification, onOpen }: { notification: AppNotification; onOpen: () => void }) {
  const unread = !notification.lida_em
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors ${unread ? 'bg-orange-50/60' : ''}`}
      >
        <span
          className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${unread ? 'bg-orange-500' : 'bg-transparent'}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm truncate ${unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {notification.titulo}
          </span>
          {notification.corpo && (
            <span className="block text-xs text-gray-600 line-clamp-2">{notification.corpo}</span>
          )}
          <span className="block text-[11px] text-gray-400 mt-0.5">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </span>
      </button>
    </li>
  )
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const navigate = useNavigate()
  const { data: notifications = [], isLoading, isError } = useNotificationsList(true)
  const { markRead, markAllRead } = useNotificationActions()
  const hasUnread = notifications.some((n) => !n.lida_em)

  const handleOpen = (notification: AppNotification) => {
    if (!notification.lida_em) markRead.mutate(notification.id)
    onClose()
    if (notification.url) navigate(notification.url)
  }

  return (
    <>
      <div className="fixed inset-0 z-[9990]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label="Notificações"
        className="fixed z-[9991] top-14 inset-x-2 lg:inset-x-auto lg:top-4 lg:right-4 lg:w-96 max-h-[75vh] flex flex-col bg-white rounded-xl shadow-2xl border border-gray-200"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
              >
                Marcar todas como lidas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label="Fechar"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar">
          {isLoading && <p className="px-4 py-6 text-sm text-gray-500 text-center">Carregando...</p>}
          {isError && <p className="px-4 py-6 text-sm text-red-600 text-center">Erro ao carregar notificações.</p>}
          {!isLoading && !isError && notifications.length === 0 && (
            <p className="px-4 py-8 text-sm text-gray-500 text-center">Nenhuma notificação por aqui.</p>
          )}
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onOpen={() => handleOpen(n)} />
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
