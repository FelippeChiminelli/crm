import { 
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { KPICard } from '../KPICard'
import { BarChartWidget } from '../BarChartWidget'
import { LineChartWidget } from '../LineChartWidget'
import { DataTableWidget } from '../DataTableWidget'
import { AnalyticsViewHeader } from '../layout/AnalyticsViewHeader'
import { TaskFilterSelector } from '../TaskFilterSelector'
import type { TaskAnalyticsFilters } from '../../../types'

interface TasksViewProps {
  data: any
  filters: TaskAnalyticsFilters
  onFiltersChange: (filters: TaskAnalyticsFilters) => void
  formatPeriod: (start: string, end: string) => string
}

export function TasksView({ data, filters, onFiltersChange, formatPeriod }: TasksViewProps) {
  const { 
    loading, 
    tasksStats, 
    tasksByPriority, 
    tasksByStatus,
    productivityByUser,
    tasksOverTime,
    overdueTasks,
    avgCompletionTime
  } = data

  // Contar filtros ativos
  const activeFiltersCount = [
    filters.status?.length || 0,
    filters.priority?.length || 0,
    filters.assigned_to?.length || 0
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <AnalyticsViewHeader
        title="Tarefas"
        subtitle="Análise de produtividade e conclusão"
        period={formatPeriod(filters.period.start, filters.period.end)}
        filterComponent={
          <TaskFilterSelector
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        }
        activeFiltersCount={activeFiltersCount}
      />

      {/* Conteúdo */}
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total de Tarefas"
            value={tasksStats?.total_tasks || 0}
            subtitle="no período"
            icon={<ClipboardDocumentCheckIcon className="w-6 h-6" />}
            color="blue"
            loading={loading}
          />
          <KPICard
            title="Taxa de Conclusão"
            value={`${tasksStats?.completion_rate?.toFixed(1) || 0}%`}
            subtitle={`${tasksStats?.completed || 0}/${tasksStats?.total_tasks || 0} tarefas`}
            icon={<ChartBarIcon className="w-6 h-6" />}
            color="green"
            loading={loading}
          />
          <KPICard
            title="Tarefas Atrasadas"
            value={tasksStats?.overdue || 0}
            subtitle="ação necessária"
            icon={<ClockIcon className="w-6 h-6" />}
            color="red"
            loading={loading}
          />
          <KPICard
            title="Tempo Médio"
            value={avgCompletionTime?.formatted || '0h'}
            subtitle={`${avgCompletionTime?.total_completed || 0} tarefas`}
            icon={<ClockIcon className="w-6 h-6" />}
            color="purple"
            loading={loading}
          />
        </div>

        {/* Gráficos: Status e Prioridade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Tarefas por Status"
            data={tasksByStatus}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="status"
            color="#8B5CF6"
            loading={loading}
          />
          <BarChartWidget
            title="Tarefas por Prioridade"
            data={tasksByPriority}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="priority"
            color="#EC4899"
            loading={loading}
          />
        </div>

        {/* Evolução Temporal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LineChartWidget
            title="Tarefas Criadas ao Longo do Tempo"
            data={tasksOverTime}
            dataKey="created"
            dataKeyLabel="Criadas"
            xAxisKey="date"
            color="#3B82F6"
            loading={loading}
          />
          <LineChartWidget
            title="Tarefas Concluídas ao Longo do Tempo"
            data={tasksOverTime}
            dataKey="completed"
            dataKeyLabel="Concluídas"
            xAxisKey="date"
            color="#10B981"
            loading={loading}
          />
        </div>

        {/* Tabela: Produtividade por Usuário */}
        <DataTableWidget
          title="Produtividade por Usuário"
          data={productivityByUser}
          columns={[
            { 
              key: 'user_name', 
              label: 'Usuário'
            },
            { 
              key: 'total_tasks', 
              label: 'Total',
              render: (val) => val.toLocaleString('pt-BR')
            },
            { 
              key: 'completed_tasks', 
              label: 'Concluídas',
              render: (val) => val.toLocaleString('pt-BR')
            },
            { 
              key: 'in_progress_tasks', 
              label: 'Em Andamento',
              render: (val) => val.toLocaleString('pt-BR')
            },
            { 
              key: 'overdue_tasks', 
              label: 'Atrasadas',
              render: (val) => val.toLocaleString('pt-BR')
            },
            { 
              key: 'completion_rate', 
              label: 'Taxa (%)',
              render: (val) => val.toFixed(1) + '%'
            },
            { 
              key: 'avg_completion_time_hours', 
              label: 'Tempo Médio',
              render: (val) => {
                if (val < 1) return `${Math.round(val * 60)}min`
                if (val < 24) return `${Math.round(val)}h`
                const days = Math.floor(val / 24)
                const hours = Math.floor(val % 24)
                return hours > 0 ? `${days}d ${hours}h` : `${days}d`
              }
            }
          ]}
          loading={loading}
        />

        {/* Tabela: Tarefas Atrasadas */}
        {overdueTasks.length > 0 && (
          <DataTableWidget
            title="Tarefas Atrasadas (Detalhado)"
            data={overdueTasks}
            columns={[
              { 
                key: 'title', 
                label: 'Tarefa'
              },
              { 
                key: 'assigned_user_name', 
                label: 'Responsável'
              },
              { 
                key: 'due_date', 
                label: 'Vencimento',
                render: (val) => new Date(val).toLocaleDateString('pt-BR')
              },
              { 
                key: 'days_overdue', 
                label: 'Atraso',
                render: (val) => `${val} ${val === 1 ? 'dia' : 'dias'}`
              },
              { 
                key: 'priority', 
                label: 'Prioridade',
                render: (val) => {
                  const labels: any = {
                    'baixa': 'Baixa',
                    'media': 'Média',
                    'alta': 'Alta',
                    'urgente': 'Urgente'
                  }
                  return labels[val] || val
                }
              },
              { 
                key: 'status', 
                label: 'Status',
                render: (val) => {
                  const labels: any = {
                    'pendente': 'Pendente',
                    'em_andamento': 'Em Andamento'
                  }
                  return labels[val] || val
                }
              }
            ]}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}

