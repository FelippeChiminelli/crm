import { useState, useEffect } from 'react'
import { MainLayout } from '../components'
import { AnalyticsSidebar, type AnalyticsView } from '../components/analytics/layout/AnalyticsSidebar'
import { OverviewView } from '../components/analytics/views/OverviewView'
import { PipelineView } from '../components/analytics/views/PipelineView'
import { FunnelView } from '../components/analytics/views/FunnelView'
import { SalesView } from '../components/analytics/views/SalesView'
import { LossesView } from '../components/analytics/views/LossesView'
import { ChatView } from '../components/analytics/views/ChatView'
import { TasksView } from '../components/analytics/views/TasksView'
import { useAnalyticsData } from '../components/analytics/hooks/useAnalyticsData'
import type { LeadAnalyticsFilters, ChatAnalyticsFilters, TaskAnalyticsFilters, SalesAnalyticsFilters } from '../types'
import { getDaysAgoLocalDateString, getTodayLocalDateString } from '../utils/dateHelpers'
import { checkAnalyticsPermission } from '../services/savedReportsService'
import { useToastContext } from '../contexts/ToastContext'
import { ds } from '../utils/designSystem'

export default function AnalyticsPage() {
  const { showError } = useToastContext()
  
  // Estados principais
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Navegação e UI
  const [activeView, setActiveView] = useState<AnalyticsView>('overview')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Filtros separados (usando hora LOCAL, não UTC)
  const defaultPeriod = {
    start: getDaysAgoLocalDateString(6),
    end: getTodayLocalDateString()
  }

  const [leadFilters, setLeadFilters] = useState<LeadAnalyticsFilters>({ period: defaultPeriod })
  const [chatFilters, setChatFilters] = useState<ChatAnalyticsFilters>({ period: defaultPeriod })
  const [taskFilters, setTaskFilters] = useState<TaskAnalyticsFilters>({ period: defaultPeriod })
  const [salesFilters, setSalesFilters] = useState<SalesAnalyticsFilters>({ period: defaultPeriod })

  // Hook customizado que gerencia todos os dados
  const analyticsData = useAnalyticsData(leadFilters, chatFilters, taskFilters, salesFilters)

  // Função para formatar período de forma amigável
  const formatPeriodLabel = (startDate: string, endDate: string): string => {
    const today = getTodayLocalDateString()
    
    const formatDateBR = (dateStr: string): string => {
      const [year, month, day] = dateStr.split('-')
      return `${day}/${month}/${year}`
    }
    
    if (endDate !== today) {
      return `${formatDateBR(startDate)} até ${formatDateBR(endDate)}`
    }
    
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    const totalDays = diffDays + 1
    
    if (totalDays === 1) {
      return 'Hoje'
    }
    
    return `Últimos ${totalDays} dias`
  }

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Definir título da página
  useEffect(() => {
    document.title = 'Analytics | Aucta CRM'
  }, [])

  // Verificar permissão ao carregar
  useEffect(() => {
    checkPermission()
  }, [])

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

  // Loading state
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

  // Sem permissão
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

  // Render principal
  return (
    <MainLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar de Navegação */}
        <AnalyticsSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Área de Conteúdo - Renderiza view ativa */}
        {activeView === 'overview' && (
          <OverviewView 
            data={analyticsData}
            filters={leadFilters}
            onFiltersChange={setLeadFilters}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
          />
        )}
        
        {activeView === 'pipeline' && (
          <PipelineView
            data={analyticsData}
            filters={leadFilters}
            onFiltersChange={setLeadFilters}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
          />
        )}
        
        {activeView === 'funnel' && (
          <FunnelView
            data={analyticsData}
            filters={leadFilters}
            onFiltersChange={setLeadFilters}
            formatPeriod={formatPeriodLabel}
          />
        )}
        
        {activeView === 'sales' && (
          <SalesView
            data={analyticsData}
            filters={salesFilters}
            onFiltersChange={setSalesFilters}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
          />
        )}
        
        {activeView === 'losses' && (
          <LossesView
            data={analyticsData}
            filters={salesFilters}
            onFiltersChange={setSalesFilters}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
          />
        )}
        
        {activeView === 'chat' && (
          <ChatView
            data={analyticsData}
            filters={chatFilters}
            onFiltersChange={setChatFilters}
            formatPeriod={formatPeriodLabel}
          />
        )}
        
        {activeView === 'tasks' && (
          <TasksView
            data={analyticsData}
            filters={taskFilters}
            onFiltersChange={setTaskFilters}
            formatPeriod={formatPeriodLabel}
          />
        )}
      </div>
    </MainLayout>
  )
}
