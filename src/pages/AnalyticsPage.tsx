import { useState, useEffect } from 'react'
import { MainLayout } from '../components'
import { FiltersModal } from '../components/analytics/FiltersModal'
import { KPICard } from '../components/analytics/KPICard'
import { KPICardWithDetails } from '../components/analytics/KPICardWithDetails'
import { BarChartWidget } from '../components/analytics/BarChartWidget'
import { LineChartWidget } from '../components/analytics/LineChartWidget'
import { DataTableWidget } from '../components/analytics/DataTableWidget'
import { ConversionRateWidget } from '../components/analytics/ConversionRateWidget'
import { 
  ChartBarIcon, 
  ChartPieIcon, 
  FunnelIcon,
  TableCellsIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AdjustmentsHorizontalIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'
import type { LeadAnalyticsFilters, ChatAnalyticsFilters, TaskAnalyticsFilters } from '../types'
import { getDaysAgoLocalDateString, getTodayLocalDateString } from '../utils/dateHelpers'
import {
  getLeadsByPipeline,
  getLeadsByOrigin,
  getLeadsOverTime,
  getAnalyticsStats,
  getTotalConversations,
  getConversationsByInstance,
  getAverageFirstResponseTime,
  getAverageFirstResponseTimeByInstance,
  getAverageTimeToFirstProactiveContact,
  getAverageTimeToFirstProactiveContactByInstance,
  getDetailedConversionRates,
  getStageTimeMetrics,
  invalidateLeadsCache,
  invalidateChatCache
} from '../services/analyticsService'
import {
  getTasksStats,
  getTasksByPriority,
  getTasksByStatus,
  getProductivityByUser,
  getTasksOverTime,
  getOverdueTasks,
  getAverageCompletionTime,
  invalidateTasksCache
} from '../services/taskAnalyticsService'
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
  const [isTaskSectionExpanded, setIsTaskSectionExpanded] = useState(true)
  
  // Controle do modal de filtros
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)

  // Filtros separados para leads e chat (usando hora LOCAL, não UTC)
  // IMPORTANTE: "Últimos 7 dias" = hoje + 6 dias atrás (total de 7 dias)
  const [leadFilters, setLeadFilters] = useState<LeadAnalyticsFilters>({
    period: {
      start: getDaysAgoLocalDateString(6), // Corrigido: 6 dias atrás + hoje = 7 dias
      end: getTodayLocalDateString()
    }
  })
  
  const [chatFilters, setChatFilters] = useState<ChatAnalyticsFilters>({
    period: {
      start: getDaysAgoLocalDateString(6), // Corrigido: 6 dias atrás + hoje = 7 dias
      end: getTodayLocalDateString()
    }
  })
  
  const [taskFilters, setTaskFilters] = useState<TaskAnalyticsFilters>({
    period: {
      start: getDaysAgoLocalDateString(6), // Corrigido: 6 dias atrás + hoje = 7 dias
      end: getTodayLocalDateString()
    }
  })

  // Função para formatar período de forma amigável
  const formatPeriodLabel = (startDate: string, endDate: string): string => {
    // Obter data de hoje no formato YYYY-MM-DD (hora LOCAL, não UTC)
    const today = getTodayLocalDateString()
    
    // Função auxiliar para formatar data no padrão brasileiro (DD/MM/YYYY)
    const formatDateBR = (dateStr: string): string => {
      const [year, month, day] = dateStr.split('-')
      return `${day}/${month}/${year}`
    }
    
    // Verificar se o end date é hoje
    if (endDate !== today) {
      // Se não for hoje, mostrar as datas completas no formato brasileiro
      return `${formatDateBR(startDate)} até ${formatDateBR(endDate)}`
    }
    
    // Calcular diferença em dias usando as strings diretamente
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    
    // Adicionar 1 para incluir o dia atual (diffDays = diferença, mas queremos total de dias)
    const totalDays = diffDays + 1
    
    // Se for apenas hoje
    if (totalDays === 1) {
      return 'Hoje'
    }
    
    // Para qualquer período que termine hoje, mostrar "Últimos X dias"
    return `Últimos ${totalDays} dias`
  }

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
  const [leadsByOrigin, setLeadsByOrigin] = useState<any[]>([])
  const [leadsOverTime, setLeadsOverTime] = useState<any[]>([])
  const [detailedConversionRates, setDetailedConversionRates] = useState<any[]>([])
  const [stageTimeMetrics, setStageTimeMetrics] = useState<any[]>([])
  
  // Dados de Chat
  const [totalConversations, setTotalConversations] = useState<number>(0)
  const [conversationsByInstance, setConversationsByInstance] = useState<any[]>([])
  const [firstResponseTime, setFirstResponseTime] = useState<any>(null)
  const [firstResponseByInstance, setFirstResponseByInstance] = useState<any[]>([])
  const [proactiveContactTime, setProactiveContactTime] = useState<any>(null)
  const [proactiveContactByInstance, setProactiveContactByInstance] = useState<any[]>([])
  
  // Estados de dados de tarefas
  const [tasksStats, setTasksStats] = useState<any>(null)
  const [tasksByPriority, setTasksByPriority] = useState<any[]>([])
  const [tasksByStatus, setTasksByStatus] = useState<any[]>([])
  const [productivityByUser, setProductivityByUser] = useState<any[]>([])
  const [tasksOverTime, setTasksOverTime] = useState<any[]>([])
  const [overdueTasks, setOverdueTasks] = useState<any[]>([])
  const [avgCompletionTime, setAvgCompletionTime] = useState<any>(null)

  // Definir título da página
  useEffect(() => {
    document.title = 'Analytics | Aucta CRM'
  }, [])

  // Verificar permissão ao carregar
  useEffect(() => {
    checkPermission()
  }, [])

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    if (hasPermission) {
      // Invalidar cache ao mudar filtros para garantir dados atualizados
      console.log('🔄 Filtros mudaram, invalidando cache e recarregando...')
      invalidateLeadsCache()
      invalidateChatCache()
      invalidateTasksCache()
      loadAnalyticsData()
    }
  }, [leadFilters, chatFilters, taskFilters, hasPermission])

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
      setLoadingData(true)

      // Debug: Verificar filtros aplicados
      console.log('🔍 Carregando analytics com filtros:')
      console.log('  📅 Período Leads:', leadFilters.period)
      console.log('  📅 Período Chat:', chatFilters.period)
      console.log('  📅 Período Tarefas:', taskFilters.period)
      console.log('  🔍 Pipelines filtrados:', leadFilters.pipelines?.length || 'todos')
      console.log('  🔍 Instâncias filtradas:', chatFilters.instances?.length || 'todas')
      console.log('  🔍 Status de tarefas filtradas:', taskFilters.status?.length || 'todos')

      // Carregar todas as métricas em paralelo (usando filtros separados)
      const [
        statsData,
        pipelineData,
        originData,
        timeSeriesData,
        conversionRatesData,
        stageTimeData,
        totalConv,
        convByInstance,
        firstRespTime,
        firstRespByInst,
        proactiveTime,
        proactiveByInst,
        tasksStatsData,
        tasksPriorityData,
        tasksStatusData,
        productivityData,
        tasksTimeData,
        overdueTasksData,
        avgCompletionData
      ] = await Promise.all([
        getAnalyticsStats(leadFilters),
        getLeadsByPipeline(leadFilters),
        getLeadsByOrigin(leadFilters),
        getLeadsOverTime(leadFilters, 'day'),
        getDetailedConversionRates(leadFilters),
        getStageTimeMetrics(leadFilters),
        getTotalConversations(chatFilters),
        getConversationsByInstance(chatFilters),
        getAverageFirstResponseTime(chatFilters),
        getAverageFirstResponseTimeByInstance(chatFilters),
        getAverageTimeToFirstProactiveContact(chatFilters),
        getAverageTimeToFirstProactiveContactByInstance(chatFilters),
        getTasksStats(taskFilters),
        getTasksByPriority(taskFilters),
        getTasksByStatus(taskFilters),
        getProductivityByUser(taskFilters),
        getTasksOverTime(taskFilters),
        getOverdueTasks(taskFilters),
        getAverageCompletionTime(taskFilters)
      ])

      setStats(statsData)
      setLeadsByPipeline(pipelineData)
      setLeadsByOrigin(originData)
      setLeadsOverTime(timeSeriesData)
      setDetailedConversionRates(conversionRatesData)
      setStageTimeMetrics(stageTimeData)
      setTotalConversations(totalConv)
      setConversationsByInstance(convByInstance)
      setFirstResponseTime(firstRespTime)
      setFirstResponseByInstance(firstRespByInst)
      setProactiveContactTime(proactiveTime)
      setProactiveContactByInstance(proactiveByInst)
      setTasksStats(tasksStatsData)
      setTasksByPriority(tasksPriorityData)
      setTasksByStatus(tasksStatusData)
      setProductivityByUser(productivityData)
      setTasksOverTime(tasksTimeData)
      setOverdueTasks(overdueTasksData)
      setAvgCompletionTime(avgCompletionData)

      // Debug: Ver o que foi carregado
      console.log('✅ Dados carregados:')
      console.log('  📊 Stats:', statsData)
      console.log('  📈 Taxa de Conversão:', conversionRatesData?.length, 'transições')
      console.log('  ⏱️ Tempo por Estágio:', stageTimeData?.length, 'estágios')
      console.log('  📊 Total de Leads:', statsData?.total_leads)
      console.log('  ✅ Total de Tarefas:', tasksStatsData?.total_tasks)
      console.log('  📋 Taxa de Conclusão:', tasksStatsData?.completion_rate?.toFixed(1), '%')
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
                <h1 className={ds.headerTitle()}>Análises e Relatórios - Beta</h1>
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
                      📊 Leads: {formatPeriodLabel(leadFilters.period.start, leadFilters.period.end)}
                    </span>
                    
                    {/* Pipelines */}
                    {leadFilters.pipelines && leadFilters.pipelines.length > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {leadFilters.pipelines.length} pipeline(s)
                      </span>
                    )}
                    
                    {/* Período de Chat */}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      💬 Chat: {formatPeriodLabel(chatFilters.period.start, chatFilters.period.end)}
                    </span>
                    
                    {/* Instâncias */}
                    {chatFilters.instances && chatFilters.instances.length > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        {chatFilters.instances.length} instância(s)
                      </span>
                    )}
                    
                    {/* Período de Tarefas */}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      ✅ Tarefas: {formatPeriodLabel(taskFilters.period.start, taskFilters.period.end)}
                    </span>
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
                    Métricas de Pipeline / Leads
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
                    dataKeyLabel="Quantidade"
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
                    dataKeyLabel="Quantidade"
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
                    dataKeyLabel="Quantidade de Leads"
                    xAxisKey="date"
                    loading={loadingData}
                  />
                </div>

                {/* Métricas Avançadas */}
                <div className="space-y-6">
                  <ConversionRateWidget
                    title="Taxa de Conversão Detalhada entre Estágios"
                    data={detailedConversionRates}
                    stageTimeData={stageTimeMetrics}
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
                    Métricas de Chat / WhatsApp
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <KPICard
                    title="Total de Conversas"
                    value={totalConversations}
                    subtitle="No período selecionado"
                    icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
                    color="indigo"
                    loading={loadingData}
                  />
                  <KPICardWithDetails
                    title="Tempo Médio de Resposta"
                    value={firstResponseTime?.formatted || '0h 0min 0seg'}
                    subtitle={`${firstResponseTime?.total_conversations || 0} conversas analisadas`}
                    icon={<ClockIcon className="w-6 h-6" />}
                    color="amber"
                    loading={loadingData}
                    details={firstResponseTime?.details}
                    detailsLabel="Detalhes de Tempo de Resposta"
                  />
                  <KPICardWithDetails
                    title="Tempo Médio 1º Contato"
                    value={proactiveContactTime?.formatted || '0h 0min 0seg'}
                    subtitle={`${proactiveContactTime?.total_leads || 0} leads após transferência`}
                    icon={<ClockIcon className="w-6 h-6" />}
                    color="purple"
                    loading={loadingData}
                    details={proactiveContactTime?.details}
                    detailsLabel="Detalhes de Tempo de Contato"
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
                    dataKeyLabel="Quantidade"
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

                {/* Tempo Médio de Resposta por Instância */}
                <div>
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
                    loading={loadingData}
                  />
                </div>

                {/* Tempo de Primeiro Contato Humano por Instância */}
                <div>
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
                    loading={loadingData}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ============================= */}
          {/* SEÇÃO: MÉTRICAS DE TAREFAS    */}
          {/* ============================= */}
          <div className="mb-6 bg-white border-2 border-purple-200 rounded-lg shadow-sm">
            {/* Header da Seção */}
            <button
              onClick={() => setIsTaskSectionExpanded(!isTaskSectionExpanded)}
              className="w-full flex items-center justify-between p-5 hover:bg-purple-50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ClipboardDocumentCheckIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">
                    Métricas de Tarefas
                  </h2>
                  <p className="text-sm text-gray-600">
                    Análise de produtividade e conclusão
                  </p>
                </div>
              </div>
              {isTaskSectionExpanded ? (
                <ChevronUpIcon className="w-6 h-6 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-6 h-6 text-gray-500" />
              )}
            </button>

            {/* Conteúdo da Seção */}
            {isTaskSectionExpanded && (
              <div className="p-6 pt-4 border-t-2 border-purple-100">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard
                    title="Total de Tarefas"
                    value={tasksStats?.total_tasks || 0}
                    subtitle="no período"
                    icon={<ClipboardDocumentCheckIcon className="w-6 h-6" />}
                    color="blue"
                    loading={loadingData}
                  />
                  <KPICard
                    title="Taxa de Conclusão"
                    value={`${tasksStats?.completion_rate?.toFixed(1) || 0}%`}
                    subtitle={`${tasksStats?.completed || 0}/${tasksStats?.total_tasks || 0} tarefas`}
                    icon={<ChartBarIcon className="w-6 h-6" />}
                    color="green"
                    loading={loadingData}
                  />
                  <KPICard
                    title="Tarefas Atrasadas"
                    value={tasksStats?.overdue || 0}
                    subtitle="ação necessária"
                    icon={<ClockIcon className="w-6 h-6" />}
                    color="red"
                    loading={loadingData}
                  />
                  <KPICard
                    title="Tempo Médio"
                    value={avgCompletionTime?.formatted || '0h'}
                    subtitle={`${avgCompletionTime?.total_completed || 0} tarefas`}
                    icon={<ClockIcon className="w-6 h-6" />}
                    color="purple"
                    loading={loadingData}
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
                    loading={loadingData}
                  />
                  <BarChartWidget
                    title="Tarefas por Prioridade"
                    data={tasksByPriority}
                    dataKey="count"
                    dataKeyLabel="Quantidade"
                    xAxisKey="priority"
                    color="#EC4899"
                    loading={loadingData}
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
                    loading={loadingData}
                  />
                  <LineChartWidget
                    title="Tarefas Concluídas ao Longo do Tempo"
                    data={tasksOverTime}
                    dataKey="completed"
                    dataKeyLabel="Concluídas"
                    xAxisKey="date"
                    color="#10B981"
                    loading={loadingData}
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
                  loading={loadingData}
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
                    loading={loadingData}
                  />
                )}
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
        taskFilters={taskFilters}
        onLeadFiltersChange={setLeadFilters}
        onChatFiltersChange={setChatFilters}
        onTaskFiltersChange={setTaskFilters}
      />
    </MainLayout>
  )
}

