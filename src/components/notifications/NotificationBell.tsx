import { useState } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { useUnreadNotificationsCount } from '../../hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'

interface NotificationBellProps {
  /** `sidebar`: item da barra lateral escura; `header`: ícone do cabeçalho mobile. */
  variant: 'sidebar' | 'header'
  /** Barra lateral recolhida: mostra só o ícone. */
  collapsed?: boolean
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function NotificationBell({ variant, collapsed = false }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const { data: unread = 0 } = useUnreadNotificationsCount()
  const label = unread > 0 ? `Notificações (${unread} não lidas)` : 'Notificações'

  const button =
    variant === 'header' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
        aria-label={label}
      >
        <BellIcon className="h-6 w-6" />
        <UnreadBadge count={unread} />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center text-xs text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-300 relative ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'}`}
        title={label}
        aria-label={label}
      >
        <span className={`relative flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}>
          <BellIcon className="h-5 w-5" />
          <UnreadBadge count={unread} />
        </span>
        {!collapsed && <span>Notificações</span>}
      </button>
    )

  return (
    <>
      {button}
      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </>
  )
}
