import { useState, useEffect } from 'react'
import { MainLayout } from '../components'
import { FiltersModal } from '../components/analytics/FiltersModal'
import { KPICard } from '../components/analytics/KPICard'
import { BarChartWidget } from '../components/analytics/BarChartWidget'
import { LineChartWidget } from '../components/analytics/LineChartWidget'
import { DataTableWidget } from '../components/analytics/DataTableWidget'
import { FunnelChartWidget } from '../components/analytics/FunnelChartWidget'
import { 
  ChartBarIcon, 
  ChartPieIcon, 
  FunnelIcon,
  TableCellsIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import type { LeadAnalyticsFilters, ChatAnalyticsFilters } from '../types'
import {
  getLeadsByPipeline,
  getLeadsByStage,
  getLeadsByOrigin,
  getLeadsOverTime,
  getFunnelData,
  getAnalyticsStats,
  getTotalConversations,
  getConversationsByInstance,
  getAverageFirstResponseTime,
  getAverageFirstResponseTimeByInstance
} from '../services/analyticsService'
import { checkAnalyticsPermission } from '../services/savedReportsService'
import { useToastContext } from '../contexts/ToastContext'
import { ds } from '../utils/designSystem'

export default function AnalyticsPage() {
  const { showError } = useToastContext()
  
  // Estados principais
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  
  // Controle de seções expansíveis
  const [isPipelineSectionExpanded, setIsPipelineSectionExpanded] = useState(true)
  const [isChatSectionExpanded, setIsChatSectionExpanded] = useState(true)
  
  // Controle do modal de filtros
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)
  
  // Filtros separados para leads e chat
  const [leadFilters, setLeadFilters] = useState<LeadAnalyticsFilters>({
    period: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  })
  
  const [chatFilters, setChatFilters] = useState<ChatAnalyticsFilters>({
    period: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  })

  // Métricas selecionadas (comentado por enquanto - será usado para personalização futura)
  // const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
  //   'stats',
  //   'leads_by_pipeline',
  //   'leads_by_origin',
  //   'funnel'
  // ])

  // Dados
  const [stats, setStats] = useState<any>(null)
  const [leadsByPipeline, setLeadsByPipeline] = useState<any[]>([])
  const [leadsByStage, setLeadsByStage] = useState<any[]>([])
  const [leadsByOrigin, setLeadsByOrigin] = useState<any[]>([])
  const [leadsOverTime, setLeadsOverTime] = useState<any[]>([])
  const [funnelData, setFunnelData] = useState<any[]>([])
  
  // Dados de Chat
  const [totalConversations, setTotalConversations] = useState<number>(0)
  const [conversationsByInstance, setConversationsByInstance] = useState<any[]>([])
  const [firstResponseTime, setFirstResponseTime] = useState<any>(null)
  const [firstResponseByInstance, setFirstResponseByInstance] = useState<any[]>([])

  // Definir título da página
  useEffect(() => {
    document.title = 'Analytics | ADV-CRM'
  }, [])

  // Verificar permissão ao carregar
  useEffect(() => {
    checkPermission()
  }, [])

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    if (hasPermission) {
      loadAnalyticsData()
    }
  }, [leadFilters, chatFilters, hasPermission])

  const checkPermission = async () => {
    try {
      const permission = await checkAnalyticsPermission()
      setHasPermission(permission)
      
      if (!permission) {
        showError('Acesso Negado', 'Você não tem permissão para acessar analytics')
      }
    } catch (error) {
      console.error('Erro ao verificar permissão:', error)
      setHasPermission(false)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalyticsData = async () => {
    try {
      console.log('🔄 loadAnalyticsData: Iniciando carregamento...', { leadFilters, chatFilters })
      setLoadingData(true)

      // Carregar todas as métricas em paralelo (usando filtros separados)
      console.log('📊 loadAnalyticsData: Carregando métricas em paralelo...')
      const [
        statsData,
        pipelineData,
        stageData,
        originData,
        timeSeriesData,
        funnelDataResult,
        totalConv,
        convByInstance,
        firstRespTime,
        firstRespByInst
      ] = await Promise.all([
        getAnalyticsStats(leadFilters),
        getLeadsByPipeline(leadFilters),
        getLeadsByStage(leadFilters),
        getLeadsByOrigin(leadFilters),
        getLeadsOverTime(leadFilters, 'day'),
        getFunnelData(leadFilters),
        getTotalConversations(chatFilters),
        getConversationsByInstance(chatFilters),
        getAverageFirstResponseTime(chatFilters),
        getAverageFirstResponseTimeByInstance(chatFilters)
      ])

      console.log('✅ loadAnalyticsData: Métricas carregadas!', {
        totalConv,
        convByInstanceCount: convByInstance.length,
        firstRespTime
      })

      setStats(statsData)
      setLeadsByPipeline(pipelineData)
      setLeadsByStage(stageData)
      setLeadsByOrigin(originData)
      setLeadsOverTime(timeSeriesData)
      setFunnelData(funnelDataResult)
      setTotalConversations(totalConv)
      setConversationsByInstance(convByInstance)
      setFirstResponseTime(firstRespTime)
      setFirstResponseByInstance(firstRespByInst)
    } catch (error: any) {
      console.error('Erro ao carregar analytics:', error)
      showError('Erro', error.message || 'Erro ao carregar dados')
    } finally {
      setLoadingData(false)
    }
  }

  // Funções comentadas - serão usadas na próxima iteração
  // const handleToggleFavorite = async (reportId: string) => {
  //   try {
  //     await toggleFavorite(reportId)
  //     loadReports()
  //   } catch (error) {
  //     console.error('Erro ao favoritar:', error)
  //   }
  // }

  // const handleDeleteReport = async (reportId: string) => {
  //   if (!confirm('Deseja realmente excluir este relatório?')) return

  //   try {
  //     await deleteSavedReport(reportId)
  //     showSuccess('Sucesso', 'Relatório excluído')
  //     loadReports()
  //   } catch (error) {
  //     console.error('Erro ao excluir:', error)
  //     showError('Erro', 'Erro ao excluir relatório')
  //   }
  // }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!hasPermission) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Acesso Negado
            </h2>
            <p className="text-gray-600">
              Você não tem permissão para acessar a área de analytics.
              <br />
              Entre em contato com um administrador.
            </p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className={ds.page()}>
        <div className={`${ds.pageContent()} max-h-screen overflow-y-auto`}>
          {/* Cabeçalho */}
          <div className={`${ds.card()} mb-6`}>
            <div className={ds.header()}>
              <div>
                <h1 className={ds.headerTitle()}>📊 Análises e Relatórios BETA - (EM DESENVOLVIMENTO)</h1>
                <p className={ds.headerSubtitle()}>
                  Visualize e analise os dados do seu CRM
                </p>
              </div>
              <button
                onClick={() => setIsFiltersModalOpen(true)}
                className={ds.headerAction()}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
                Gerenciar Filtros
              </button>
            </div>
          </div>

          {/* Indicador de Filtros Ativos */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Filtros Ativos</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Período de Leads */}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      📊 Leads: {leadFilters.period.start} até {leadFilters.period.end}
                    </span>
                    
                    {/* Pipelines */}
                    {leadFilters.pipelines && leadFilters.pipelines.length > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {leadFilters.pipelines.length} pipeline(s)
                      </span>
                    )}
                    
                    {/* Período de Chat */}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      💬 Chat: {chatFilters.period.start} até {chatFilters.period.end}
                    </span>
                    
                    {/* Instâncias */}
                    {chatFilters.instances && chatFilters.instances.length > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        {chatFilters.instances.length} instância(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsFiltersModalOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                Alterar
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* ============================= */}
          {/* SEÇÃO: MÉTRICAS DE PIPELINE   */}
          {/* ============================= */}
          <div className="mb-6 bg-white border-2 border-blue-200 rounded-lg shadow-sm">
            {/* Header da Seção */}
            <button
              onClick={() => setIsPipelineSectionExpanded(!isPipelineSectionExpanded)}
              className="w-full flex items-center justify-between p-5 hover:bg-blue-50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FunnelIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">
                    📊 Métricas de Pipeline / Leads
                  </h2>
                  <p className="text-sm text-gray-600">
                    Análise de leads, conversão e origem
                  </p>
                </div>
              </div>
              {isPipelineSectionExpanded ? (
                <ChevronUpIcon className="w-6 h-6 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-6 h-6 text-gray-500" />
              )}
            </button>

            {/* Conteúdo da Seção */}
            {isPipelineSectionExpanded && (
              <div className="p-6 pt-4 border-t-2 border-blue-100">
                {/* KPIs */}
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <KPICard
                      title="Total de Leads"
                      value={stats.total_leads}
                      subtitle={`${stats.active_pipelines} pipelines ativos`}
                      icon={<ChartBarIcon className="w-6 h-6" />}
                      color="blue"
                      loading={loadingData}
                    />
                    <KPICard
                      title="Valor Total"
                      value={formatCurrency(stats.total_value)}
                      subtitle="Soma de todos os leads"
                      icon={<ChartPieIcon className="w-6 h-6" />}
                      color="green"
                      loading={loadingData}
                    />
                    <KPICard
                      title="Valor Médio"
                      value={formatCurrency(stats.average_value)}
                      subtitle="Por lead"
                      icon={<TableCellsIcon className="w-6 h-6" />}
                      color="purple"
                      loading={loadingData}
                    />
                    <KPICard
                      title="Usuários Ativos"
                      value={stats.active_users}
                      subtitle="Responsáveis por leads"
                      icon={<FunnelIcon className="w-6 h-6" />}
                      color="yellow"
                      loading={loadingData}
                    />
                  </div>
                )}

                {/* Gráficos */}
                <div className="mb-6">
                  <BarChartWidget
                    title="Leads por Pipeline"
                    data={leadsByPipeline}
                    dataKey="count"
                    xAxisKey="pipeline_name"
                    loading={loadingData}
                  />
                </div>

                {/* Leads por Origem - Gráfico + Tabela */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <BarChartWidget
                    title="Leads por Origem"
                    data={leadsByOrigin}
                    dataKey="count"
                    xAxisKey="origin"
                    color="#10B981"
                    loading={loadingData}
                  />
                  <DataTableWidget
                    title="Detalhes por Origem"
                    data={leadsByOrigin}
                    columns={[
                      { 
                        key: 'origin', 
                        label: 'Origem',
                        render: (val) => val || 'Não informado'
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
                      },
                      { 
                        key: 'total_value', 
                        label: 'Valor Total',
                        render: (val) => formatCurrency(val || 0)
                      }
                    ]}
                    loading={loadingData}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 mb-6">
                  <LineChartWidget
                    title="Evolução de Leads no Tempo"
                    data={leadsOverTime}
                    dataKey="value"
                    xAxisKey="date"
                    loading={loadingData}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FunnelChartWidget
                    title="Funil de Conversão"
                    data={funnelData}
                    loading={loadingData}
                  />
                  <DataTableWidget
                    title="Leads por Estágio"
                    data={leadsByStage}
                    columns={[
                      { key: 'stage_name', label: 'Estágio' },
                      { key: 'count', label: 'Quantidade' },
                      { 
                        key: 'percentage', 
                        label: 'Percentual',
                        render: (val) => `${val.toFixed(1)}%`
                      },
                      { 
                        key: 'average_value', 
                        label: 'Valor Médio',
                        render: (val) => formatCurrency(val)
                      }
                    ]}
                    loading={loadingData}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ============================= */}
          {/* SEÇÃO: MÉTRICAS DE CHAT       */}
          {/* ============================= */}
          <div className="mb-6 bg-white border-2 border-green-200 rounded-lg shadow-sm">
            {/* Header da Seção */}
            <button
              onClick={() => setIsChatSectionExpanded(!isChatSectionExpanded)}
              className="w-full flex items-center justify-between p-5 hover:bg-green-50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">
                    💬 Métricas de Chat / WhatsApp
                  </h2>
                  <p className="text-sm text-gray-600">
                    Análise de conversas e tempo de resposta
                  </p>
                </div>
              </div>
              {isChatSectionExpanded ? (
                <ChevronUpIcon className="w-6 h-6 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-6 h-6 text-gray-500" />
              )}
            </button>

            {/* Conteúdo da Seção */}
            {isChatSectionExpanded && (
              <div className="p-6 pt-4 border-t-2 border-green-100">

                {/* KPIs de Chat */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <KPICard
                    title="Total de Conversas"
                    value={totalConversations}
                    subtitle="No período selecionado"
                    icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
                    color="indigo"
                    loading={loadingData}
                  />
                  <KPICard
                    title="Tempo Médio 1ª Resposta"
                    value={firstResponseTime?.formatted || '0 min'}
                    subtitle={`${firstResponseTime?.total_conversations || 0} conversas analisadas`}
                    icon={<ClockIcon className="w-6 h-6" />}
                    color="amber"
                    loading={loadingData}
                  />
                  <KPICard
                    title="Instâncias Ativas"
                    value={conversationsByInstance.length}
                    subtitle="Com conversas no período"
                    icon={<ChartBarIcon className="w-6 h-6" />}
                    color="teal"
                    loading={loadingData}
                  />
                </div>

                {/* Conversas por Instância - Gráfico + Tabela */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <BarChartWidget
                    title="Conversas por Instância"
                    data={conversationsByInstance}
                    dataKey="count"
                    xAxisKey="instance_name"
                    color="#8B5CF6"
                    loading={loadingData}
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
                    loading={loadingData}
                  />
                </div>

                {/* Tempo de Primeira Resposta por Instância */}
                <div>
                  <DataTableWidget
                    title="Tempo de Primeira Resposta por Instância"
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
                    loading={loadingData}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Filtros */}
      <FiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        leadFilters={leadFilters}
        chatFilters={chatFilters}
        onLeadFiltersChange={setLeadFilters}
        onChatFiltersChange={setChatFilters}
      />
    </MainLayout>
  )
}

