import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { 
  ExclamationTriangleIcon,
  ClockIcon,
  FireIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface DashboardAlertsProps {
  stats: {
    overdueTasks: number
    upcomingTasks: number
    hotLeads: number
    activeConversations: number
  }
}

export function DashboardAlerts({ stats }: DashboardAlertsProps) {
  const alerts = []

  // Alerta para tarefas atrasadas
  if (stats.overdueTasks > 0) {
    alerts.push({
      type: 'error',
      icon: ExclamationTriangleIcon,
      title: 'Tarefas Atrasadas',
      message: `${stats.overdueTasks} tarefa${stats.overdueTasks !== 1 ? 's' : ''} atrasada${stats.overdueTasks !== 1 ? 's' : ''}`,
      action: 'Ver tarefas',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    })
  }

  // Alerta para tarefas vencendo
  if (stats.upcomingTasks > 0) {
    alerts.push({
      type: 'warning',
      icon: ClockIcon,
      title: 'Tarefas Vencendo',
      message: `${stats.upcomingTasks} tarefa${stats.upcomingTasks !== 1 ? 's' : ''} vencendo esta semana`,
      action: 'Ver agenda',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    })
  }

  // Alerta para leads quentes
  if (stats.hotLeads > 0) {
    alerts.push({
      type: 'info',
      icon: FireIcon,
      title: 'Leads Quentes',
      message: `${stats.hotLeads} lead${stats.hotLeads !== 1 ? 's' : ''} quente${stats.hotLeads !== 1 ? 's' : ''} precisam de atenção`,
      action: 'Ver leads',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    })
  }

  // Alerta para conversas ativas
  if (stats.activeConversations > 0) {
    alerts.push({
      type: 'info',
      icon: ChatBubbleLeftRightIcon,
      title: 'Conversas Ativas',
      message: `${stats.activeConversations} conversa${stats.activeConversations !== 1 ? 's' : ''} ativa${stats.activeConversations !== 1 ? 's' : ''} no WhatsApp`,
      action: 'Ver chat',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    })
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="p-2 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
            <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            Status
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
    <div className="space-y-2 sm:space-y-4">
      {alerts.map((alert, index) => (
        <Card key={index} className={`border-l-4 ${alert.borderColor}`}>
          <CardContent className="p-2 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <alert.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${alert.color} mt-0.5 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5 sm:mb-1 gap-2">
                  <h4 className={`font-medium text-[10px] sm:text-xs ${alert.color} truncate`}>
                    {alert.title}
                  </h4>
                  <span className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${alert.bgColor} ${alert.color} flex-shrink-0`}>
                    {alert.type === 'error' ? 'Urgente' : alert.type === 'warning' ? 'Atenção' : 'Info'}
                  </span>
                </div>
                <p className={`text-[10px] sm:text-xs ${alert.color} opacity-80 mb-1.5 sm:mb-3`}>
                  {alert.message}
                </p>
                <button className={`text-[9px] sm:text-[10px] font-medium ${alert.color} hover:opacity-80 transition-opacity`}>
                  {alert.action} →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 