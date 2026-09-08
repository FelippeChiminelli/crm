import { useState } from 'react'
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
import { EngagementCards } from './chat/EngagementCards'
import { EngagementDrilldownModal } from './chat/EngagementDrilldownModal'
import { OriginNotice } from './chat/OriginNotice'
import { groupOrigins } from '../chatFilters/originGrouping'
import { useChatEngagement } from '../hooks/useChatEngagement'
import type { ChatAnalyticsFilters, ChatEngagementCategory } from '../../../types'

interface ChatViewProps {
  data: any
  filters: ChatAnalyticsFilters
  formatPeriod: (start: string, end: string) => string
  onOpenMobileMenu?: () => void
  onOpenFilters: () => void
}

export function ChatView({ data, filters, formatPeriod, onOpenMobileMenu, onOpenFilters }: ChatViewProps) {
  const { 
    loading, 
    totalConversations, 
    conversationsByInstance,
    firstResponseTime,
    firstResponseByInstance,
    proactiveContactTime,
    proactiveContactByInstance
  } = data

  const [drilldownCategory, setDrilldownCategory] = useState<ChatEngagementCategory | null>(null)
  const engagement = useChatEngagement(filters)

  // As variantes de grafia contam como uma origem só para o usuário
  const selectedOriginGroups = groupOrigins(filters.origins || []).length

  // Contar filtros ativos
  const activeFiltersCount = [
    filters.instances?.length || 0,
    selectedOriginGroups
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <AnalyticsViewHeader
        title="Chat / WhatsApp"
        subtitle="Conversas e tempo de resposta"
        period={formatPeriod(filters.period.start, filters.period.end)}
        activeFiltersCount={activeFiltersCount}
        onOpenMobileMenu={onOpenMobileMenu}
        onOpenFilters={onOpenFilters}
      />

      {/* Conteúdo */}
      <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
        <OriginNotice
          selectedGroups={selectedOriginGroups}
          excludedNoLead={engagement.summary[0]?.excluded_no_lead || 0}
          hasResults={engagement.loading || engagement.summary.length > 0}
        />

        {/* Estágio do Atendimento */}
        <EngagementCards
          summary={engagement.summary}
          loading={engagement.loading}
          error={engagement.error}
          inactiveHours={filters.inactiveHours}
          onSelectCategory={setDrilldownCategory}
        />

        {/* KPIs de Chat */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm lg:text-base font-semibold text-gray-900">
              Volume e Tempos de Resposta
            </h3>
            <span className="text-xs text-gray-500">
              {filters.timeRange
                ? `Horário: ${filters.timeRange.start} às ${filters.timeRange.end}`
                : 'Horário: dia todo'}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
          <KPICard
            title="Conversas"
            value={totalConversations}
            subtitle="No período"
            icon={<ChatBubbleLeftRightIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="indigo"
            loading={loading}
          />
          <KPICardWithDetails
            title="Tempo Resposta"
            value={firstResponseTime?.formatted || '-'}
            subtitle={`${firstResponseTime?.total_conversations || 0} conversas`}
            icon={<ClockIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="amber"
            loading={loading}
            details={firstResponseTime?.details}
            detailsLabel="Detalhes"
          />
          <KPICardWithDetails
            title="1º Contato"
            value={proactiveContactTime?.formatted || '-'}
            subtitle={`${proactiveContactTime?.total_leads || 0} leads`}
            icon={<ClockIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="purple"
            loading={loading}
            details={proactiveContactTime?.details}
            detailsLabel="Detalhes"
          />
          <KPICard
            title="Instâncias"
            value={conversationsByInstance.length}
            subtitle="Ativas"
            icon={<ChartBarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="teal"
            loading={loading}
          />
          </div>
        </div>

        {/* Conversas por Instância - Gráfico + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
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

      <EngagementDrilldownModal
        category={drilldownCategory}
        filters={filters}
        onClose={() => setDrilldownCategory(null)}
      />
    </div>
  )
}

