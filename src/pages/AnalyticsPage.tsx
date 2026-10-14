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
import { StockView } from '../components/analytics/views/StockView'
import { CustomView } from '../components/analytics/views/CustomView'
import { MetaAdsView } from '../components/analytics/views/MetaAdsView'
import { useAnalyticsData } from '../components/analytics/hooks/useAnalyticsData'
import { useAnalyticsFilters } from '../components/analytics/hooks/useAnalyticsFilters'
import { FiltersModal } from '../components/analytics/layout/FiltersModal'
import { OriginInvestmentModal } from '../components/analytics/OriginInvestmentModal'
import { getTodayLocalDateString } from '../utils/dateHelpers'
import { checkAnalyticsPermission } from '../services/savedReportsService'
import { useToastContext } from '../contexts/ToastContext'
import { BrandLoader } from '../components/ui/BrandLoader'
import { ds } from '../utils/designSystem'

export default function AnalyticsPage() {
  const { showError } = useToastContext()
  
  // Estados principais
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Navegação e UI
  const [activeView, setActiveView] = useState<AnalyticsView>('overview')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const filters = useAnalyticsFilters()
  const leadFilters = filters.lead.applied
  const chatFilters = filters.chat.applied
  const taskFilters = filters.task.applied
  const salesFilters = filters.sales.applied
  const stockFilters = filters.stock.applied

  // Modais
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [showInvestmentsModal, setShowInvestmentsModal] = useState(false)

  const applyFilters = () => {
    filters.applyFilters()
    setShowFiltersModal(false)
  }

  // Hook customizado que gerencia todos os dados
  const analyticsData = useAnalyticsData(leadFilters, chatFilters, taskFilters, salesFilters, stockFilters)

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
            <BrandLoader variant="inline" size="lg" text="Carregando analytics..." />
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

  // Handler para trocar view no mobile (fecha sidebar)
  const handleViewChange = (view: AnalyticsView) => {
    setActiveView(view)
    setIsMobileSidebarOpen(false)
  }

  // Render principal
  return (
    <MainLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Overlay Mobile */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar de Navegação */}
        <AnalyticsSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          onOpenInvestments={() => setShowInvestmentsModal(true)}
        />

        {/* Área de Conteúdo - Renderiza view ativa */}
        {activeView === 'overview' && (
          <OverviewView 
            data={analyticsData}
            filters={leadFilters}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenFilters={() => setShowFiltersModal(true)}
          />
        )}
        
        {activeView === 'pipeline' && (
          <PipelineView
            data={analyticsData}
            filters={leadFilters}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenFilters={() => setShowFiltersModal(true)}
          />
        )}
        
        {activeView === 'funnel' && (
          <FunnelView
            data={analyticsData}
            filters={leadFilters}
            formatPeriod={formatPeriodLabel}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenFilters={() => setShowFiltersModal(true)}
          />
        )}
        
        {activeView === 'sales' && (
          <SalesView
            data={analyticsData}
            filters={salesFilters}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenFilters={() => setShowFiltersModal(true)}
          />
        )}
        
        {activeView === 'losses' && (
          <LossesView
            data={analyticsData}
            filters={salesFilters}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenFilters={() => setShowFiltersModal(true)}
          />
        )}
        
        {activeView === 'chat' && (
          <ChatView
            data={analyticsData}
            filters={chatFilters}
            formatPeriod={formatPeriodLabel}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenFilters={() => setShowFiltersModal(true)}
          />
        )}
        
        {activeView === 'tasks' && (
          <TasksView
            data={analyticsData}
            filters={taskFilters}
            formatPeriod={formatPeriodLabel}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenFilters={() => setShowFiltersModal(true)}
          />
        )}

        {activeView === 'stock' && (
          <StockView
            data={analyticsData}
            filters={stockFilters}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenFilters={() => setShowFiltersModal(true)}
          />
        )}

        {activeView === 'meta_ads' && (
          <MetaAdsView
            filters={filters.metaAds.applied}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriodLabel}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenFilters={() => setShowFiltersModal(true)}
          />
        )}

        {activeView === 'custom' && (
          <div className="flex-1 overflow-auto bg-gray-50 p-4 lg:p-6">
            <CustomView />
          </div>
        )}
      </div>

      {/* Modal de Filtros */}
      <FiltersModal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        onApply={applyFilters}
        activeView={activeView}
        draftLeadFilters={filters.lead.draft}
        onLeadFiltersChange={filters.lead.setDraft}
        draftSalesFilters={filters.sales.draft}
        onSalesFiltersChange={filters.sales.setDraft}
        draftChatFilters={filters.chat.draft}
        onChatFiltersChange={filters.chat.setDraft}
        draftTaskFilters={filters.task.draft}
        onTaskFiltersChange={filters.task.setDraft}
        draftStockFilters={filters.stock.draft}
        onStockFiltersChange={filters.stock.setDraft}
        draftMetaAdsFilters={filters.metaAds.draft}
        onMetaAdsFiltersChange={filters.metaAds.setDraft}
      />

      <OriginInvestmentModal
        isOpen={showInvestmentsModal}
        onClose={() => setShowInvestmentsModal(false)}
        onInvestmentsChanged={analyticsData.reload}
      />
    </MainLayout>
  )
}
