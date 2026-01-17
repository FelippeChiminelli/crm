import { Card, CardContent } from '../../components/ui/Card'
import { 
  UserGroupIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'

interface DashboardStatsProps {
  stats: {
    totalLeads: number
    totalValue: number
    activeConversations: number
    pendingTasks: number
    inProgressTasks: number
    hotLeads: number
    warmLeads: number
    coldLeads: number
    completedTasks: number
    overdueTasks: number
    upcomingTasks: number
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const metrics = [
    {
      icon: UserGroupIcon,
      value: stats.totalLeads.toLocaleString(),
      label: 'Leads',
      fullLabel: 'Total de Leads',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: CurrencyDollarIcon,
      value: `R$ ${stats.totalValue.toLocaleString('pt-BR')}`,
      label: 'Valor',
      fullLabel: 'Valor Total',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      value: stats.activeConversations.toLocaleString(),
      label: 'Conversas',
      fullLabel: 'Conversas Ativas',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: ClipboardDocumentListIcon,
      value: (stats.pendingTasks + stats.inProgressTasks).toLocaleString(),
      label: 'Tarefas',
      fullLabel: 'Tarefas Ativas',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {metrics.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden">
          {/* Background gradient */}
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