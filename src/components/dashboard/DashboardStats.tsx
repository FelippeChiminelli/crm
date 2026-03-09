import { Card, CardContent } from '../../components/ui/Card'
import { 
  BellAlertIcon,
  UserPlusIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import type { DashboardCentralData } from '../../types/dashboard'

interface DashboardStatsProps {
  centralData: DashboardCentralData
}

export function DashboardStats({ centralData }: DashboardStatsProps) {
  const metrics = [
    {
      icon: BellAlertIcon,
      value: centralData.totalNotifications.toLocaleString(),
      label: 'Alertas',
      fullLabel: 'Total de Alertas',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: ExclamationTriangleIcon,
      value: centralData.overdueTasks.toLocaleString(),
      label: 'Atrasadas',
      fullLabel: 'Tarefas Atrasadas',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: CalendarIcon,
      value: centralData.tasksDueToday.toLocaleString(),
      label: 'Vencendo',
      fullLabel: 'Vencendo Hoje',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: UserPlusIcon,
      value: centralData.newLeadsToday.toLocaleString(),
      label: 'Leads',
      fullLabel: 'Novos Leads Hoje',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: ClipboardDocumentListIcon,
      value: centralData.newTasksToday.toLocaleString(),
      label: 'Tarefas',
      fullLabel: 'Novas Tarefas Hoje',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      value: centralData.unreadConversations.toLocaleString(),
      label: 'Chat',
      fullLabel: 'Msgs Não Lidas',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ]

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {metrics.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400"></div>
          
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-2 sm:block">
              <div className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${metric.bgColor} sm:mb-2 flex-shrink-0`}>
                <metric.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${metric.color}`} />
              </div>
              <div className="min-w-0 flex-1 sm:flex-none">
                <div className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {metric.value}
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-600 truncate">
                  <span className="sm:hidden">{metric.label}</span>
                  <span className="hidden sm:inline">{metric.fullLabel}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
