import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { 
  BellAlertIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import type { DashboardNotificationItem } from '../../types/dashboard'
import { NotificationCard } from './NotificationCard'

interface DashboardAlertsProps {
  notifications: DashboardNotificationItem[]
}

const severityStyles: Record<DashboardNotificationItem['severity'], { color: string; bgColor: string; leftBorder: string; chip: string }> = {
  critical: {
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    leftBorder: 'border-l-red-500',
    chip: 'Crítica'
  },
  warning: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    leftBorder: 'border-l-red-400',
    chip: 'Atenção'
  },
  info: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    leftBorder: 'border-l-blue-500',
    chip: 'Info'
  },
  success: {
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    leftBorder: 'border-l-green-500',
    chip: 'Novo'
  }
}

const sourceIcons: Record<DashboardNotificationItem['source'], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  tasks: ClipboardDocumentListIcon,
  leads: UserGroupIcon,
  chat: ChatBubbleLeftRightIcon
}

export function DashboardAlerts({ notifications }: DashboardAlertsProps) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader className="p-2 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
            <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            Central de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 lg:p-6 pt-0">
          <div className="text-center py-4 sm:py-8">
            <CheckCircleIcon className="w-8 h-8 sm:w-12 sm:h-12 text-green-500 mx-auto mb-2 sm:mb-4" />
            <h3 className="text-xs sm:text-base font-medium text-gray-900 mb-1 sm:mb-2">Tudo em ordem!</h3>
            <p className="text-[10px] sm:text-xs text-gray-500">
              Nenhum alerta pendente.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          Icon={sourceIcons[notification.source] || BellAlertIcon}
          style={severityStyles[notification.severity]}
        />
      ))}
    </div>
  )
}

