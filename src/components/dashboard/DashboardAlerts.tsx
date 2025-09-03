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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tudo em ordem!</h3>
            <p className="text-sm text-gray-500">
              Não há alertas pendentes no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert, index) => (
        <Card key={index} className={`border-l-4 ${alert.borderColor}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <alert.icon className={`w-5 h-5 ${alert.color} mt-0.5 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-medium text-sm ${alert.color}`}>
                    {alert.title}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${alert.bgColor} ${alert.color}`}>
                    {alert.type === 'error' ? 'Urgente' : alert.type === 'warning' ? 'Atenção' : 'Info'}
                  </span>
                </div>
                <p className={`text-sm ${alert.color} opacity-80 mb-3`}>
                  {alert.message}
                </p>
                <button className={`text-xs font-medium ${alert.color} hover:opacity-80 transition-opacity`}>
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