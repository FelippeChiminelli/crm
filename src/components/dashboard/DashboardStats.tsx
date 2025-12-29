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
      label: 'Total de Leads',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: CurrencyDollarIcon,
      value: `R$ ${stats.totalValue.toLocaleString('pt-BR')}`,
      label: 'Valor Total',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      value: stats.activeConversations.toLocaleString(),
      label: 'Conversas Ativas',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: ClipboardDocumentListIcon,
      value: (stats.pendingTasks + stats.inProgressTasks).toLocaleString(),
      label: 'Tarefas Ativas',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400"></div>
          
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${metric.bgColor} mb-2`}>
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                </div>
                <div className="text-base font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                <div className="text-[10px] text-gray-600">
                  {metric.label}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 