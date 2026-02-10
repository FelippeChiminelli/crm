import { useState, useCallback } from 'react'
import { 
  CalendarIcon, 
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useCustomDashboard } from '../hooks/useCustomDashboard'
import { DashboardList, CreateDashboardModal } from '../custom/DashboardList'
import { DashboardGrid } from '../custom/DashboardGrid'
import { WidgetSelector } from '../custom/WidgetSelector'
import { ShareDashboardModal } from '../custom/ShareDashboardModal'
import type { CustomDashboard, DashboardWidget, DashboardWidgetType, DashboardWidgetConfig } from '../../../types'
import { getWidgetTypeDefinition } from '../custom/widgets/index'
import { getDaysAgoLocalDateString, getTodayLocalDateString } from '../../../utils/dateHelpers'

export function CustomView() {
  // Estado do hook principal
  const {
    dashboards,
    activeDashboard,
    loading,
    saving,
    selectDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    setAsDefault,
    addWidget,
    updateWidget,
    removeWidget,
    updateWidgetLayout,
    shareWithUser,
    shareWithAll,
    updateSharePermission,
    removeShare,
    removeShareAll,
    canEdit,
    isOwner,
    period,
    setPeriod
  } = useCustomDashboard()

  // Estados de modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingDashboard, setEditingDashboard] = useState<CustomDashboard | null>(null)
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false)
  const [editingWidgetData, setEditingWidgetData] = useState<DashboardWidget | null>(null)
  const [sharingDashboard, setSharingDashboard] = useState<CustomDashboard | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Handler de refresh
  const handleRefresh = useCallback(async () => {
    if (refreshing || !activeDashboard) return
    setRefreshing(true)
    try {
      await selectDashboard(activeDashboard.id)
    } finally {
      setRefreshing(false)
    }
  }, [refreshing, activeDashboard, selectDashboard])

  // Handlers de Período
  const handleQuickPeriod = useCallback((days: number) => {
    const end = getTodayLocalDateString()
    const start = getDaysAgoLocalDateString(days - 1)
    setPeriod({ start, end })
    setShowDatePicker(false)
  }, [setPeriod])

  const handleCustomPeriod = useCallback((start: string, end: string) => {
    // Ignorar se alguma data estiver vazia (campo sendo limpo/digitado)
    if (!start || !end) return
    setPeriod({ start, end })
  }, [setPeriod])

  // Handlers de Dashboard
  const handleCreateDashboard = useCallback(async (data: { name: string; description?: string }) => {
    await createDashboard(data)
    setIsCreateModalOpen(false)
  }, [createDashboard])

  const handleEditDashboard = useCallback((dashboard: CustomDashboard) => {
    setEditingDashboard(dashboard)
    setIsCreateModalOpen(true)
  }, [])

  const handleUpdateDashboard = useCallback(async (data: { name: string; description?: string }) => {
    if (!editingDashboard) return
    await updateDashboard(editingDashboard.id, data)
    setEditingDashboard(null)
    setIsCreateModalOpen(false)
  }, [editingDashboard, updateDashboard])

  const handleDeleteDashboard = useCallback(async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este dashboard?')) {
      await deleteDashboard(id)
    }
  }, [deleteDashboard])

  // Handlers de Widget
  const handleAddWidget = useCallback(async (
    metricKey: string, 
    widgetType: DashboardWidgetType,
    title: string,
    config?: Partial<DashboardWidgetConfig>
  ) => {
    const typeDef = getWidgetTypeDefinition(widgetType)
    if (!typeDef) return

    await addWidget({
      widget_type: widgetType,
      metric_key: metricKey,
      title,
      width: typeDef.defaultWidth,
      height: typeDef.defaultHeight,
      config: config || {}
    })
    setIsWidgetSelectorOpen(false)
  }, [addWidget])

  const handleEditWidget = useCallback((widget: DashboardWidget) => {
    setEditingWidgetData(widget)
    setIsWidgetSelectorOpen(true)
  }, [])

  const handleUpdateWidget = useCallback(async (
    widgetId: string,
    data: { metric_key: string; widget_type: DashboardWidgetType; title: string; config?: DashboardWidgetConfig }
  ) => {
    await updateWidget(widgetId, data)
    setEditingWidgetData(null)
    setIsWidgetSelectorOpen(false)
  }, [updateWidget])

  const handleDeleteWidget = useCallback(async (widgetId: string) => {
    if (confirm('Tem certeza que deseja excluir este widget?')) {
      await removeWidget(widgetId)
    }
  }, [removeWidget])

  // Handler de compartilhamento
  const handleShare = useCallback((dashboard: CustomDashboard) => {
    setSharingDashboard(dashboard)
  }, [])

  // Período
  const formatPeriod = () => {
    const start = new Date(period.start)
    const end = new Date(period.end)
    return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`
  }

  // Se está carregando inicialmente
  if (loading && dashboards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Carregando dashboards...</p>
        </div>
      </div>
    )
  }

  // Se não tem dashboards
  if (!activeDashboard && dashboards.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Header vazio */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboards Personalizados</h2>
            <p className="text-gray-500 mt-1">Crie visualizações customizadas das suas métricas</p>
          </div>
        </div>

        {/* Estado vazio */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <SparklesIcon className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhum dashboard criado
          </h3>
          <p className="text-gray-500 mb-6 max-w-md text-center">
            Crie seu primeiro dashboard personalizado para visualizar as métricas que mais importam para você.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Criar Meu Primeiro Dashboard
          </button>
        </div>

        {/* Modal de criar */}
        <CreateDashboardModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setEditingDashboard(null)
          }}
          onSave={handleCreateDashboard}
          saving={saving}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Seletor de dashboard */}
          <DashboardList
            dashboards={dashboards}
            activeDashboard={activeDashboard}
            loading={loading}
            onSelect={selectDashboard}
            onCreate={() => {
              setEditingDashboard(null)
              setIsCreateModalOpen(true)
            }}
            onEdit={handleEditDashboard}
            onDelete={handleDeleteDashboard}
            onDuplicate={duplicateDashboard}
            onSetDefault={setAsDefault}
            onShare={handleShare}
          />
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3">
          {/* Filtros rápidos de período */}
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <button
              onClick={() => handleQuickPeriod(7)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                formatPeriod() === `${new Date(getDaysAgoLocalDateString(6)).toLocaleDateString('pt-BR')} - ${new Date(getTodayLocalDateString()).toLocaleDateString('pt-BR')}`
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => handleQuickPeriod(15)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors hidden sm:block ${
                formatPeriod() === `${new Date(getDaysAgoLocalDateString(14)).toLocaleDateString('pt-BR')} - ${new Date(getTodayLocalDateString()).toLocaleDateString('pt-BR')}`
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              15d
            </button>
            <button
              onClick={() => handleQuickPeriod(30)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                formatPeriod() === `${new Date(getDaysAgoLocalDateString(29)).toLocaleDateString('pt-BR')} - ${new Date(getTodayLocalDateString()).toLocaleDateString('pt-BR')}`
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Custom
            </button>
          </div>

          {/* Botão de reload */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || !activeDashboard}
            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40"
            title="Atualizar dados"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Botão adicionar widget */}
          {canEdit && (
            <button
              onClick={() => setIsWidgetSelectorOpen(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              + Adicionar Widget
            </button>
          )}
        </div>
      </div>

      {/* Date Picker Customizado */}
      {showDatePicker && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={period.start}
                onChange={(e) => handleCustomPeriod(e.target.value, period.end)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={period.end}
                onChange={(e) => handleCustomPeriod(period.start, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setShowDatePicker(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Info do dashboard */}
      {activeDashboard?.description && (
        <p className="text-sm text-gray-500 mb-4">{activeDashboard.description}</p>
      )}

      {/* Indicadores de permissão/compartilhamento */}
      <div className="flex items-center gap-2 mb-4">
        {!isOwner && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            {canEdit ? 'Você pode editar' : 'Somente visualização'}
          </span>
        )}
        {activeDashboard?.shares && activeDashboard.shares.length > 0 && isOwner && (
          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
            Compartilhado com {activeDashboard.shares.length} {activeDashboard.shares.length === 1 ? 'pessoa' : 'pessoas'}
          </span>
        )}
      </div>

      {/* Grid de widgets */}
      <div className="flex-1 overflow-auto">
        <DashboardGrid
          widgets={activeDashboard?.widgets || []}
          period={period}
          canEdit={canEdit}
          onAddWidget={() => setIsWidgetSelectorOpen(true)}
          onEditWidget={handleEditWidget}
          onDeleteWidget={handleDeleteWidget}
          onLayoutChange={updateWidgetLayout}
        />
      </div>

      {/* Modais */}
      <CreateDashboardModal
        isOpen={isCreateModalOpen}
        editingDashboard={editingDashboard}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingDashboard(null)
        }}
        onSave={editingDashboard ? handleUpdateDashboard : handleCreateDashboard}
        saving={saving}
      />

      <WidgetSelector
        isOpen={isWidgetSelectorOpen}
        onClose={() => { setIsWidgetSelectorOpen(false); setEditingWidgetData(null) }}
        onSelect={handleAddWidget}
        editingWidget={editingWidgetData}
        onUpdate={handleUpdateWidget}
      />

      <ShareDashboardModal
        isOpen={!!sharingDashboard}
        dashboard={sharingDashboard}
        onClose={() => setSharingDashboard(null)}
        onShareWithUser={shareWithUser}
        onShareWithAll={shareWithAll}
        onUpdatePermission={updateSharePermission}
        onRemoveShare={removeShare}
        onRemoveShareAll={removeShareAll}
      />

      {/* Indicador de salvamento */}
      {saving && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg flex items-center gap-2 z-50">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span className="text-sm">Salvando...</span>
        </div>
      )}
    </div>
  )
}
