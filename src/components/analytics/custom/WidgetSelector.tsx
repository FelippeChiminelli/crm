import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  XMarkIcon,
  ChartBarIcon,
  ChartBarSquareIcon,
  ArrowTrendingUpIcon,
  ChartPieIcon,
  TableCellsIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  CalculatorIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import type { DashboardWidgetType, MetricCategory, AvailableMetric, CustomFieldStatusFilter, DashboardWidgetConfig, DashboardWidget, CreateCalculationData, DashboardCalculation } from '../../../types'
import { 
  WIDGET_TYPES, 
  AVAILABLE_METRICS, 
  CATEGORY_LABELS,
  getAllMetricsWithAll,
  isCustomFieldMetric,
  isCalculationMetric,
  CUSTOM_FIELD_METRIC_PREFIX,
  CALCULATION_METRIC_PREFIX
} from './widgets/index'
import { getGlobalCustomFields } from '../../../services/customFieldAnalyticsService'
import { getCalculations, createCalculation, updateCalculation, deleteCalculation, getVariables, createVariable, updateVariable, deleteVariable } from '../../../services/calculationService'
import { CreateCalculationModal } from './CreateCalculationModal'
import type { DashboardVariable, UpdateVariableData } from '../../../types'

interface WidgetSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (metricKey: string, widgetType: DashboardWidgetType, title: string, config?: Partial<DashboardWidgetConfig>) => void
  /** Widget sendo editado (se definido, o modal entra em modo de edição) */
  editingWidget?: DashboardWidget | null
  onUpdate?: (widgetId: string, data: { metric_key: string; widget_type: DashboardWidgetType; title: string; config?: DashboardWidgetConfig }) => void
}

// Mapeamento de ícones para tipos de widget
const WIDGET_ICONS: Record<DashboardWidgetType, React.ComponentType<{ className?: string }>> = {
  kpi: ChartBarSquareIcon,
  bar_chart: ChartBarIcon,
  line_chart: ArrowTrendingUpIcon,
  pie_chart: ChartPieIcon,
  table: TableCellsIcon,
  funnel: FunnelIcon
}

// Cores das categorias para Tailwind
const CATEGORY_BG_COLORS: Record<MetricCategory, string> = {
  leads: 'bg-purple-100 text-purple-700 border-purple-200',
  sales: 'bg-green-100 text-green-700 border-green-200',
  losses: 'bg-red-100 text-red-700 border-red-200',
  chat: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  tasks: 'bg-orange-100 text-orange-700 border-orange-200',
  custom_fields: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  calculations: 'bg-amber-100 text-amber-700 border-amber-200'
}

// Labels de filtro de status
const STATUS_FILTER_LABELS: Record<CustomFieldStatusFilter, string> = {
  all: 'Todos os Leads',
  active: 'Leads Ativos',
  sold: 'Leads Vendidos',
  lost: 'Leads Perdidos'
}

export function WidgetSelector({ isOpen, onClose, onSelect, editingWidget, onUpdate }: WidgetSelectorProps) {
  const isEditing = !!editingWidget

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | 'all'>('all')
  const [selectedWidgetType, setSelectedWidgetType] = useState<DashboardWidgetType | 'all'>('all')
  const [step, setStep] = useState<'metric' | 'widget' | 'config'>('metric')
  const [selectedMetric, setSelectedMetric] = useState<AvailableMetric | null>(null)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<CustomFieldStatusFilter>('all')
  
  // Estado para métricas incluindo campos personalizados e cálculos
  const [allMetrics, setAllMetrics] = useState<AvailableMetric[]>(AVAILABLE_METRICS)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [isCreateCalcOpen, setIsCreateCalcOpen] = useState(false)
  const [savingCalc, setSavingCalc] = useState(false)
  const [editingCalc, setEditingCalc] = useState<DashboardCalculation | null>(null)
  const [loadedCalculations, setLoadedCalculations] = useState<DashboardCalculation[]>([])
  const [loadedVariables, setLoadedVariables] = useState<DashboardVariable[]>([])

  // Carregar campos personalizados, cálculos e variáveis quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadAllMetrics()
    }
  }, [isOpen])

  // Pré-selecionar métrica quando editando widget
  useEffect(() => {
    if (editingWidget && allMetrics.length > 0 && isOpen) {
      const metric = allMetrics.find(m => m.key === editingWidget.metric_key)
      if (metric) {
        setSelectedMetric(metric)
        setSelectedStatusFilter(editingWidget.config?.statusFilter || 'all')
        // Ir direto para seleção de tipo de widget
        setStep('widget')
      }
    }
  }, [editingWidget, allMetrics, isOpen])

  const loadAllMetrics = async () => {
    setLoadingMetrics(true)
    try {
      const [customFields, calculations, variables] = await Promise.all([
        getGlobalCustomFields(),
        getCalculations().catch(() => []),
        getVariables().catch(() => [] as DashboardVariable[])
      ])
      setLoadedCalculations(calculations)
      setLoadedVariables(variables)
      const metrics = getAllMetricsWithAll(customFields, calculations)
      setAllMetrics(metrics)
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
      setAllMetrics(AVAILABLE_METRICS)
      setLoadedCalculations([])
      setLoadedVariables([])
    } finally {
      setLoadingMetrics(false)
    }
  }

  // Criar ou editar cálculo
  const handleSaveCalculation = useCallback(async (data: CreateCalculationData) => {
    setSavingCalc(true)
    try {
      if (editingCalc) {
        await updateCalculation(editingCalc.id, data)
      } else {
        await createCalculation(data)
      }
      await loadAllMetrics()
      setIsCreateCalcOpen(false)
      setEditingCalc(null)
    } catch (error) {
      console.error('Erro ao salvar cálculo:', error)
    } finally {
      setSavingCalc(false)
    }
  }, [editingCalc])

  // Editar cálculo existente
  const handleEditCalculation = useCallback((metricKey: string) => {
    const calcId = metricKey.replace(CALCULATION_METRIC_PREFIX, '')
    const calc = loadedCalculations.find(c => c.id === calcId)
    if (calc) {
      setEditingCalc(calc)
      setIsCreateCalcOpen(true)
    }
  }, [loadedCalculations])

  // Criar variável inline
  const handleCreateVariable = useCallback(async (name: string, value: number): Promise<DashboardVariable | null> => {
    try {
      const created = await createVariable({ name, value })
      setLoadedVariables(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      return created
    } catch (error) {
      console.error('Erro ao criar variável:', error)
      return null
    }
  }, [])

  // Atualizar variável existente
  const handleUpdateVariable = useCallback(async (id: string, data: UpdateVariableData): Promise<DashboardVariable | null> => {
    try {
      const updated = await updateVariable(id, data)
      setLoadedVariables(prev =>
        prev.map(v => v.id === id ? updated : v).sort((a, b) => a.name.localeCompare(b.name))
      )
      return updated
    } catch (error) {
      console.error('Erro ao atualizar variável:', error)
      return null
    }
  }, [])

  // Excluir variável
  const handleDeleteVariable = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteVariable(id)
      setLoadedVariables(prev => prev.filter(v => v.id !== id))
    } catch (error) {
      console.error('Erro ao excluir variável:', error)
    }
  }, [])

  // Excluir cálculo
  const handleDeleteCalculation = useCallback(async (metricKey: string) => {
    const calcId = metricKey.replace(CALCULATION_METRIC_PREFIX, '')
    if (!confirm('Tem certeza que deseja excluir este cálculo?')) return
    try {
      await deleteCalculation(calcId)
      await loadAllMetrics()
    } catch (error) {
      console.error('Erro ao excluir cálculo:', error)
    }
  }, [])

  // Filtrar métricas
  const filteredMetrics = useMemo(() => {
    let metrics = allMetrics

    // Filtrar por categoria
    if (selectedCategory !== 'all') {
      metrics = metrics.filter(m => m.category === selectedCategory)
    }

    // Filtrar por tipo de widget
    if (selectedWidgetType !== 'all') {
      metrics = metrics.filter(m => m.supportedWidgets.includes(selectedWidgetType))
    }

    // Filtrar por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      metrics = metrics.filter(m => 
        m.label.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
      )
    }

    return metrics
  }, [allMetrics, selectedCategory, selectedWidgetType, searchQuery])

  // Agrupar por categoria
  const metricsByCategory = useMemo(() => {
    const grouped: Record<MetricCategory, AvailableMetric[]> = {
      leads: [],
      sales: [],
      losses: [],
      chat: [],
      tasks: [],
      custom_fields: [],
      calculations: []
    }

    filteredMetrics.forEach(metric => {
      grouped[metric.category].push(metric)
    })

    return grouped
  }, [filteredMetrics])

  // Finalizar seleção (criar ou atualizar widget)
  const finalizeSelection = (metricKey: string, widgetType: DashboardWidgetType, title: string, config?: Partial<DashboardWidgetConfig>) => {
    if (isEditing && editingWidget && onUpdate) {
      onUpdate(editingWidget.id, {
        metric_key: metricKey,
        widget_type: widgetType,
        title,
        config: (config || {}) as DashboardWidgetConfig
      })
    } else {
      onSelect(metricKey, widgetType, title, config)
    }
    handleClose()
  }

  const handleMetricSelect = (metric: AvailableMetric) => {
    setSelectedMetric(metric)
    setSelectedStatusFilter('all')
    
    const isCalc = isCalculationMetric(metric.key)
    const isCustom = isCustomFieldMetric(metric.key)
    
    // Se só tem um tipo de widget suportado
    if (metric.supportedWidgets.length === 1) {
      if (isCustom) {
        setStep('config')
      } else {
        const config: Partial<DashboardWidgetConfig> = {}
        if (isCalc) {
          config.calculationId = metric.key.replace(CALCULATION_METRIC_PREFIX, '')
        }
        finalizeSelection(metric.key, metric.supportedWidgets[0], metric.label, Object.keys(config).length > 0 ? config : undefined)
      }
    } else {
      setStep('widget')
    }
  }

  const handleWidgetTypeSelect = (widgetType: DashboardWidgetType) => {
    if (!selectedMetric) return
    
    if (isCustomFieldMetric(selectedMetric.key)) {
      setStep('config')
      setSelectedMetric({ ...selectedMetric, _selectedWidgetType: widgetType } as any)
    } else {
      const config: Partial<DashboardWidgetConfig> = {}
      if (isCalculationMetric(selectedMetric.key)) {
        config.calculationId = selectedMetric.key.replace(CALCULATION_METRIC_PREFIX, '')
      }
      finalizeSelection(selectedMetric.key, widgetType, selectedMetric.label, Object.keys(config).length > 0 ? config : undefined)
    }
  }

  const handleConfigConfirm = () => {
    if (!selectedMetric) return
    
    const widgetType = (selectedMetric as any)._selectedWidgetType || selectedMetric.supportedWidgets[0]
    const customFieldId = selectedMetric.key.replace(CUSTOM_FIELD_METRIC_PREFIX, '')
    
    const config: Partial<DashboardWidgetConfig> = {
      statusFilter: selectedStatusFilter,
      customFieldId
    }
    
    finalizeSelection(selectedMetric.key, widgetType, selectedMetric.label, config)
  }

  const handleClose = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedWidgetType('all')
    setStep('metric')
    setSelectedMetric(null)
    setSelectedStatusFilter('all')
    setIsCreateCalcOpen(false)
    setEditingCalc(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 'metric' && (isEditing ? 'Editar Widget' : 'Adicionar Widget')}
              {step === 'widget' && 'Escolher Visualização'}
              {step === 'config' && 'Configurar Widget'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'metric' && (isEditing ? 'Selecione a nova métrica para este widget' : 'Selecione a métrica que deseja visualizar')}
              {step === 'widget' && `Escolha como visualizar "${selectedMetric?.label}"`}
              {step === 'config' && 'Configure as opções do widget'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {step === 'metric' ? (
          <>
            {/* Filtros */}
            <div className="px-6 py-4 border-b border-gray-200 space-y-4">
              {/* Busca */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar métricas..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filtros de categoria e tipo */}
              <div className="flex flex-wrap gap-2">
                {/* Categorias */}
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-gray-500 mr-1">Categoria:</span>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todas
                  </button>
                  {(Object.keys(CATEGORY_LABELS) as MetricCategory[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        selectedCategory === cat
                          ? CATEGORY_BG_COLORS[cat]
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>

                {/* Tipos de widget */}
                <div className="flex gap-1 items-center ml-4">
                  <span className="text-xs text-gray-500 mr-1">Tipo:</span>
                  <button
                    onClick={() => setSelectedWidgetType('all')}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedWidgetType === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  {WIDGET_TYPES.map(type => {
                    const Icon = WIDGET_ICONS[type.type]
                    return (
                      <button
                        key={type.type}
                        onClick={() => setSelectedWidgetType(type.type)}
                        className={`px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                          selectedWidgetType === type.type
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={type.label}
                      >
                        <Icon className="w-3 h-3" />
                        {type.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Lista de métricas */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingMetrics ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-3">Carregando métricas...</p>
                </div>
              ) : filteredMetrics.length === 0 && selectedCategory !== 'all' && selectedCategory !== 'calculations' ? (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma métrica encontrada com os filtros aplicados
                </div>
              ) : (
                <div className="space-y-6">
                  {(Object.keys(CATEGORY_LABELS) as MetricCategory[]).map(category => {
                    const metrics = metricsByCategory[category]
                    const isCalcCategory = category === 'calculations'
                    
                    // Mostrar categoria de cálculos mesmo vazia (para o botão de criar)
                    if (metrics.length === 0 && !isCalcCategory) return null
                    // Mas não mostrar se está filtrando por outra categoria
                    if (metrics.length === 0 && isCalcCategory && selectedCategory !== 'all' && selectedCategory !== 'calculations') return null

                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`text-sm font-semibold ${
                            CATEGORY_BG_COLORS[category].split(' ')[1]
                          }`}>
                            {CATEGORY_LABELS[category]}
                          </h3>
                          {isCalcCategory && (
                            <button
                              onClick={() => setIsCreateCalcOpen(true)}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              <PlusIcon className="w-3.5 h-3.5" />
                              Criar Cálculo
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {metrics.map(metric => (
                            <MetricCard
                              key={metric.key}
                              metric={metric}
                              onClick={() => handleMetricSelect(metric)}
                              onEdit={isCalcCategory ? () => handleEditCalculation(metric.key) : undefined}
                              onDelete={isCalcCategory ? () => handleDeleteCalculation(metric.key) : undefined}
                            />
                          ))}
                          {isCalcCategory && metrics.length === 0 && (
                            <div className="col-span-2 text-center py-6 border-2 border-dashed border-amber-200 rounded-lg">
                              <CalculatorIcon className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Nenhum cálculo criado</p>
                              <button
                                onClick={() => setIsCreateCalcOpen(true)}
                                className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
                              >
                                Criar primeiro cálculo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : step === 'widget' ? (
          /* Step 2: Escolher tipo de widget */
          <div className="p-6">
            <button
              onClick={() => setStep('metric')}
              className="text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              ← Voltar para métricas
            </button>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {selectedMetric?.supportedWidgets.map(widgetType => {
                const typeDef = WIDGET_TYPES.find(t => t.type === widgetType)
                if (!typeDef) return null
                const Icon = WIDGET_ICONS[widgetType]

                return (
                  <button
                    key={widgetType}
                    onClick={() => handleWidgetTypeSelect(widgetType)}
                    className="p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
                  >
                    <Icon className="w-12 h-12 mx-auto text-gray-400 group-hover:text-blue-500 mb-3" />
                    <h4 className="font-medium text-gray-900">{typeDef.label}</h4>
                    <p className="text-xs text-gray-500 mt-1">{typeDef.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          /* Step 3: Configurar filtro de status (apenas para campos personalizados) */
          <div className="p-6">
            <button
              onClick={() => setStep(selectedMetric?.supportedWidgets.length === 1 ? 'metric' : 'widget')}
              className="text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              ← Voltar
            </button>

            <div className="space-y-6">
              {/* Info do campo selecionado */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <AdjustmentsHorizontalIcon className="w-6 h-6 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedMetric?.label}</h4>
                    <p className="text-sm text-gray-500">{selectedMetric?.description}</p>
                  </div>
                </div>
              </div>

              {/* Seletor de filtro de status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Filtrar por status do lead
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(STATUS_FILTER_LABELS) as CustomFieldStatusFilter[]).map(status => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatusFilter(status)}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        selectedStatusFilter === status
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`font-medium ${selectedStatusFilter === status ? 'text-blue-700' : 'text-gray-700'}`}>
                        {STATUS_FILTER_LABELS[status]}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {status === 'all' && 'Incluir todos os leads no cálculo'}
                        {status === 'active' && 'Apenas leads em andamento'}
                        {status === 'sold' && 'Apenas leads convertidos em venda'}
                        {status === 'lost' && 'Apenas leads marcados como perdidos'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Botão de confirmar */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleConfigConfirm}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Adicionar Widget
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de criação/edição de cálculo */}
      <CreateCalculationModal
        isOpen={isCreateCalcOpen}
        onClose={() => { setIsCreateCalcOpen(false); setEditingCalc(null) }}
        onSave={handleSaveCalculation}
        availableMetrics={allMetrics}
        saving={savingCalc}
        editingCalculation={editingCalc}
        variables={loadedVariables}
        onCreateVariable={handleCreateVariable}
        onUpdateVariable={handleUpdateVariable}
        onDeleteVariable={handleDeleteVariable}
      />
    </div>
  )
}

// =====================================================
// CARD DE MÉTRICA
// =====================================================

interface MetricCardProps {
  metric: AvailableMetric & { isCustomField?: boolean }
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}

function MetricCard({ metric, onClick, onEdit, onDelete }: MetricCardProps) {
  const isCustom = isCustomFieldMetric(metric.key)
  const isCalc = isCalculationMetric(metric.key)
  
  return (
    <div
      className={`relative flex items-start gap-3 p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group cursor-pointer ${
        isCalc ? 'border-amber-200 bg-amber-50/30' : isCustom ? 'border-cyan-200 bg-cyan-50/30' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 group-hover:text-blue-700">
            {metric.label}
          </h4>
          {isCustom && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-cyan-100 text-cyan-700 rounded">
              Campo Personalizado
            </span>
          )}
          {isCalc && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
              Cálculo
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">{metric.description}</p>
        
        {/* Tipos de widget suportados */}
        <div className="flex gap-1 mt-2">
          {metric.supportedWidgets.map(type => {
            const Icon = WIDGET_ICONS[type]
            return (
              <span
                key={type}
                className="p-1 bg-gray-100 rounded"
                title={WIDGET_TYPES.find(t => t.type === type)?.label}
              >
                <Icon className="w-3 h-3 text-gray-500" />
              </span>
            )
          })}
        </div>
      </div>

      {/* Botões de editar/excluir para cálculos */}
      {isCalc && (onEdit || onDelete) && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Editar cálculo"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Excluir cálculo"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
