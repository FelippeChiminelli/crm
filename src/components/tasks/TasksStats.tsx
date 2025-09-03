import {
  ClockIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline'
import type { Task } from '../../types'
import { ds } from '../../utils/designSystem'

interface TasksStatsProps {
  tasks: Task[]
}

export function TasksStats({ tasks }: TasksStatsProps) {
  // Calcular estatísticas
  const stats = {
    total: tasks.length,
    pendente: tasks.filter(task => task.status === 'pendente').length,
    em_andamento: tasks.filter(task => task.status === 'em_andamento').length,
    concluida: tasks.filter(task => task.status === 'concluida').length,
    atrasada: tasks.filter(task => task.status === 'atrasada').length,
  }

  const statsData = [
    {
      icon: ListBulletIcon,
      label: 'Total',
      value: stats.total,
      color: 'bg-gray-100 text-gray-600',
      description: 'Todas as tarefas'
    },
    {
      icon: ClockIcon,
      label: 'Pendentes',
      value: stats.pendente,
      color: 'bg-yellow-100 text-yellow-600',
      description: 'Aguardando início'
    },
    {
      icon: PlayIcon,
      label: 'Em Andamento',
      value: stats.em_andamento,
      color: 'bg-blue-100 text-blue-600',
      description: 'Sendo executadas'
    },
    {
      icon: CheckCircleIcon,
      label: 'Concluídas',
      value: stats.concluida,
      color: 'bg-green-100 text-green-600',
      description: 'Finalizadas'
    },
    {
      icon: ExclamationTriangleIcon,
      label: 'Atrasadas',
      value: stats.atrasada,
      color: 'bg-red-100 text-red-600',
      description: 'Vencidas'
    }
  ]

  return (
    <div className={ds.stats.container()}>
      {statsData.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div key={index} className={ds.stats.card()}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`${ds.stats.icon(stat.color)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={ds.stats.label()}>{stat.label}</span>
                </div>
                <div className={ds.stats.value()}>{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
