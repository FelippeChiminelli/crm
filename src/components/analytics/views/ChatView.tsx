import { 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { KPICard } from '../KPICard'
import { KPICardWithDetails } from '../KPICardWithDetails'
import { BarChartWidget } from '../BarChartWidget'
import { DataTableWidget } from '../DataTableWidget'
import { AnalyticsViewHeader } from '../layout/AnalyticsViewHeader'
import { ChatFilterSelector } from '../ChatFilterSelector'
import type { ChatAnalyticsFilters } from '../../../types'

interface ChatViewProps {
  data: any
  filters: ChatAnalyticsFilters
  onFiltersChange: (filters: ChatAnalyticsFilters) => void
  formatPeriod: (start: string, end: string) => string
}

export function ChatView({ data, filters, onFiltersChange, formatPeriod }: ChatViewProps) {
  const { 
    loading, 
    totalConversations, 
    conversationsByInstance,
    firstResponseTime,
    firstResponseByInstance,
    proactiveContactTime,
    proactiveContactByInstance
  } = data

  // Contar filtros ativos
  const activeFiltersCount = [
    filters.instances?.length || 0
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <AnalyticsViewHeader
        title="Chat / WhatsApp"
        subtitle="Análise de conversas e tempo de resposta"
        period={formatPeriod(filters.period.start, filters.period.end)}
        filterComponent={
          <ChatFilterSelector
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        }
        activeFiltersCount={activeFiltersCount}
      />

      {/* Conteúdo */}
      <div className="p-6 space-y-6">
        {/* KPIs de Chat */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total de Conversas"
            value={totalConversations}
            subtitle="No período selecionado"
            icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
            color="indigo"
            loading={loading}
          />
          <KPICardWithDetails
            title="Tempo Médio de Resposta"
            value={firstResponseTime?.formatted || '0h 0min 0seg'}
            subtitle={`${firstResponseTime?.total_conversations || 0} conversas analisadas`}
            icon={<ClockIcon className="w-6 h-6" />}
            color="amber"
            loading={loading}
            details={firstResponseTime?.details}
            detailsLabel="Detalhes de Tempo de Resposta"
          />
          <KPICardWithDetails
            title="Tempo Médio 1º Contato"
            value={proactiveContactTime?.formatted || '0h 0min 0seg'}
            subtitle={`${proactiveContactTime?.total_leads || 0} leads após transferência`}
            icon={<ClockIcon className="w-6 h-6" />}
            color="purple"
            loading={loading}
            details={proactiveContactTime?.details}
            detailsLabel="Detalhes de Tempo de Contato"
          />
          <KPICard
            title="Instâncias Ativas"
            value={conversationsByInstance.length}
            subtitle="Com conversas no período"
            icon={<ChartBarIcon className="w-6 h-6" />}
            color="teal"
            loading={loading}
          />
        </div>

        {/* Conversas por Instância - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Conversas por Instância"
            data={conversationsByInstance}
            dataKey="count"
            dataKeyLabel="Quantidade"
            xAxisKey="instance_name"
            color="#8B5CF6"
            loading={loading}
          />
          <DataTableWidget
            title="Detalhes por Instância"
            data={conversationsByInstance}
            columns={[
              { 
                key: 'instance_name', 
                label: 'Instância',
                render: (val) => val || 'Não informado'
              },
              { 
                key: 'count', 
                label: 'Conversas',
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

        {/* Tempo Médio de Resposta por Instância */}
        <DataTableWidget
          title="Tempo Médio de Resposta por Instância"
          data={firstResponseByInstance}
          columns={[
            { 
              key: 'instance_name', 
              label: 'Instância'
            },
            { 
              key: 'formatted', 
              label: 'Tempo Médio'
            },
            { 
              key: 'conversations_count', 
              label: 'Conversas Analisadas',
              render: (val) => val.toLocaleString('pt-BR')
            },
            { 
              key: 'average_minutes', 
              label: 'Minutos',
              render: (val) => Math.round(val).toLocaleString('pt-BR')
            }
          ]}
          loading={loading}
        />

        {/* Tempo de Primeiro Contato Humano por Instância */}
        <DataTableWidget
          title="Tempo de Primeiro Contato por Instância"
          data={proactiveContactByInstance}
          columns={[
            { 
              key: 'instance_name', 
              label: 'Instância/Vendedor'
            },
            { 
              key: 'formatted', 
              label: 'Tempo Médio'
            },
            { 
              key: 'leads_count', 
              label: 'Leads Contactados',
              render: (val) => val.toLocaleString('pt-BR')
            },
            { 
              key: 'average_minutes', 
              label: 'Minutos',
              render: (val) => Math.round(val).toLocaleString('pt-BR')
            }
          ]}
          loading={loading}
        />
      </div>
    </div>
  )
}

