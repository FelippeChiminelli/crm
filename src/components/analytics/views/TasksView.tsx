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

interface TaskByTypeData {
  type_id: string
  type_name: string
  type_icon: string
  count: number
  percentage: number
  pending: number
  overdue: number
  completed: number
}

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
    tasksByType,
    productivityByUser,
    tasksOverTime,
    overdueTasks,
    avgCompletionTime
  } = data

  // Contar filtros ativos
  const activeFiltersCount = [
    filters.status?.length || 0,
    filters.priority?.length || 0,
    filters.assigned_to?.length || 0,
    filters.pipeline_id?.length || 0,
    filters.task_type_id?.length || 0
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

        {/* Tarefas por Status - Gráfico + Tabela */}
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
          <DataTableWidget
            title="Detalhes de Tarefas por Status"
            data={tasksByStatus}
            columns={[
              { 
                key: 'status', 
                label: 'Status',
                render: (val) => {
                  const labels: any = {
                    'pendente': 'Pendente',
                    'em_andamento': 'Em Andamento',
                    'concluida': 'Concluída',
                    'cancelada': 'Cancelada',
                    'atrasada': 'Atrasada'
                  }
                  return labels[val] || val
                }
              },
              { 
                key: 'count', 
                label: 'Quantidade',
                render: (val) => val.toLocaleString('pt-BR')
              },
              { 
                key: 'percentage', 
                label: 'Percentual',
                render: (val) => `${val.toFixed(1)}%`
              }
            ]}
            loading={loading}
          />
        </div>

        {/* Tarefas por Prioridade - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Tarefas por Prioridade"
            data={tasksByPriority}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="priority"
            color="#EC4899"
            loading={loading}
          />
          <DataTableWidget
            title="Detalhes de Tarefas por Prioridade"
            data={tasksByPriority}
            columns={[
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
                key: 'count', 
                label: 'Quantidade',
                render: (val) => val.toLocaleString('pt-BR')
              },
              { 
                key: 'percentage', 
                label: 'Percentual',
                render: (val) => `${val.toFixed(1)}%`
              }
            ]}
            loading={loading}
          />
        </div>

        {/* Tarefas por Tipo - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Tarefas por Tipo"
            data={tasksByType?.map((item: TaskByTypeData) => ({
              ...item,
              label: item.type_name
            })) || []}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="label"
            color="#10B981"
            loading={loading}
          />
          <DataTableWidget
            title="Detalhes de Tarefas por Tipo"
            data={tasksByType || []}
            columns={[
              { 
                key: 'type_name', 
                label: 'Tipo'
              },
              { 
                key: 'count', 
                label: 'Total',
                render: (val) => val.toLocaleString('pt-BR')
              },
              { 
                key: 'pending', 
                label: 'Pendentes',
                render: (val) => val.toLocaleString('pt-BR')
              },
              { 
                key: 'overdue', 
                label: 'Atrasadas',
                render: (val) => (
                  <span className={val > 0 ? 'text-red-600 font-medium' : ''}>
                    {val.toLocaleString('pt-BR')}
                  </span>
                )
              },
              { 
                key: 'completed', 
                label: 'Concluídas',
                render: (val) => (
                  <span className={val > 0 ? 'text-green-600 font-medium' : ''}>
                    {val.toLocaleString('pt-BR')}
                  </span>
                )
              },
              { 
                key: 'percentage', 
                label: '%',
                render: (val) => `${val.toFixed(1)}%`
              }
            ]}
            loading={loading}
          />
        </div>

        {/* Produtividade por Usuário - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Tarefas por Usuário"
            data={productivityByUser || []}
            dataKey="total_tasks"
            dataKeyLabel="Total de Tarefas"
            xAxisKey="user_name"
            color="#F59E0B"
            loading={loading}
          />
          <DataTableWidget
            title="Detalhes de Produtividade"
            data={productivityByUser || []}
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
                key: 'overdue_tasks', 
                label: 'Atrasadas',
                render: (val) => (
                  <span className={val > 0 ? 'text-red-600 font-medium' : ''}>
                    {val.toLocaleString('pt-BR')}
                  </span>
                )
              },
              { 
                key: 'completion_rate', 
                label: 'Taxa',
                render: (val) => `${val.toFixed(1)}%`
              }
            ]}
            loading={loading}
          />
        </div>

        {/* Evolução Temporal */}
        <LineChartWidget
          title="Evolução de Tarefas ao Longo do Tempo"
          data={tasksOverTime || []}
          dataKey="created"
          dataKeyLabel="Criadas"
          xAxisKey="date"
          color="#3B82F6"
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

