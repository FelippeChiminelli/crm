import { useState } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { useUnreadNotificationsCount } from '../../hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const { data: unread = 0 } = useUnreadNotificationsCount()
  const label = unread > 0 ? `Notificações (${unread} não lidas)` : 'Notificações'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0 ${className}`}
        title={label}
        aria-label={label}
      >
        <BellIcon className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </>
  )
}
