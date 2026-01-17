import { useDashboardLogic } from '../hooks/useDashboardLogic'
import { DashboardStats, DashboardChart, DashboardAlerts } from '../components'
import { MainLayout } from '../components/layout/MainLayout'
import { ds, statusColors } from '../utils/designSystem'
import { 
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const { stats, allLeads, loading, error } = useDashboardLogic()

  if (loading) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className="w-full max-w-full overflow-x-hidden">
            <div className="w-full p-1.5 sm:p-1.5 lg:p-1.5">
              {/* Cabeçalho */}
              <div className={`${ds.card()} mb-3`}>
                <div className={ds.header()}>
                  <div>
                    <h1 className={ds.headerTitle()}>Dashboard</h1>
                    <p className={ds.headerSubtitle()}>Visão geral do seu CRM</p>
                  </div>
                </div>
              </div>

              {/* Cards de Estatísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>

              {/* Gráficos */}
              <div className="space-y-4 mb-4">
                <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
                <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>

              {/* Alertas */}
              <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className="w-full max-w-full overflow-x-hidden">
            <div className="w-full p-1.5 sm:p-1.5 lg:p-1.5">
              <div className="h-full flex items-center justify-center">
                <div className="text-center px-4">
                  <div className={`${statusColors.error.bg} ${statusColors.error.border} border rounded-lg p-6`}>
                    <ExclamationTriangleIcon className={`w-12 h-12 ${statusColors.error.icon} mx-auto mb-4`} />
                    <p className={`${statusColors.error.text} mb-4 text-sm sm:text-base font-medium`}>
                      Erro ao carregar dashboard: {error}
                    </p>
                    <button 
                      onClick={() => window.location.reload()}
                      className={ds.button('primary')}
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className={ds.page()}>
        <div className="w-full max-w-full overflow-x-hidden">
          <div className="w-full p-2 sm:p-3 lg:p-4">
            {/* Cabeçalho */}
            <div className={`${ds.card()} mb-2 sm:mb-3`}>
              <div className="p-2 sm:p-3 lg:p-4">
                <div>
                  <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600 hidden sm:block">Visão geral do seu CRM</p>
                </div>
              </div>
            </div>

            {/* Estatísticas Principais */}
            <div className="mb-2 sm:mb-4">
              <DashboardStats stats={stats} />
            </div>

            {/* Gráficos */}
            <div className="mb-2 sm:mb-4">
              <DashboardChart stats={stats} allLeads={allLeads} />
            </div>

            {/* Alertas */}
            <div className="mb-2 sm:mb-4">
              <DashboardAlerts stats={stats} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 