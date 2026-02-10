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
  TrashIcon,
  CubeTransparentIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import type { DashboardWidgetType, MetricCategory, AvailableMetric, CustomFieldStatusFilter, DashboardWidgetConfig, DashboardWidget, CreateCalculationData, DashboardCalculation, VariableFormat, VariableValueType, VariablePeriod } from '../../../types'
import { 
  WIDGET_TYPES, 
  AVAILABLE_METRICS, 
  CATEGORY_LABELS,
  getAllMetricsWithAll,
  isCustomFieldMetric,
  isCalculationMetric,
  CUSTOM_FIELD_METRIC_PREFIX,
  CALCULATION_METRIC_PREFIX,
  VARIABLE_METRIC_PREFIX
} from './widgets/index'
import { getGlobalCustomFields } from '../../../services/customFieldAnalyticsService'
import { getCalculations, createCalculation, updateCalculation, deleteCalculation, getVariables, createVariable, updateVariable, deleteVariable, getVariablePeriods } from '../../../services/calculationService'
import { CreateCalculationModal } from './CreateCalculationModal'
import { PeriodsManager } from './PeriodsManager'
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
  calculations: 'bg-amber-100 text-amber-700 border-amber-200',
  variables: 'bg-violet-100 text-violet-700 border-violet-200'
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
  const [step, setStep] = useState<'metric' | 'widget' | 'config' | 'kpiColor'>('metric')
  const [selectedKpiColor, setSelectedKpiColor] = useState<string>('')
  const [pendingWidgetType, setPendingWidgetType] = useState<DashboardWidgetType | null>(null)
  const [pendingConfig, setPendingConfig] = useState<Partial<DashboardWidgetConfig> | undefined>(undefined)
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
  
  // Estado para CRUD de variáveis na seção de categorias
  const [varFormOpen, setVarFormOpen] = useState(false)
  const [editingVarId, setEditingVarId] = useState<string | null>(null)
  const [varFormName, setVarFormName] = useState('')
  const [varFormValue, setVarFormValue] = useState('')
  const [varFormDesc, setVarFormDesc] = useState('')
  const [varFormFormat, setVarFormFormat] = useState<VariableFormat>('number')
  const [varFormValueType, setVarFormValueType] = useState<VariableValueType>('fixed')
  const [varFormPeriods, setVarFormPeriods] = useState<VariablePeriod[]>([])
  const [savingVar, setSavingVar] = useState(false)

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
        setSelectedKpiColor(editingWidget.config?.kpiColor as string || '')
        // Manter no step de métrica para o usuário ver o modal completo
        setStep('metric')
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
      const metrics = getAllMetricsWithAll(customFields, calculations, variables)
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
  const handleCreateVariable = useCallback(async (name: string, value: number, format?: VariableFormat, value_type?: VariableValueType): Promise<DashboardVariable | null> => {
    try {
      const created = await createVariable({ name, value, format: format || 'number', value_type: value_type || 'fixed' })
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
    if (!confirm('Tem certeza que deseja excluir esta variável?')) return
    try {
      await deleteVariable(id)
      setLoadedVariables(prev => prev.filter(v => v.id !== id))
    } catch (error) {
      console.error('Erro ao excluir variável:', error)
    }
  }, [])

  // Abrir form para criar variável
  const openCreateVarForm = useCallback(() => {
    setEditingVarId(null)
    setVarFormName('')
    setVarFormValue('')
    setVarFormDesc('')
    setVarFormFormat('number')
    setVarFormValueType('fixed')
    setVarFormPeriods([])
    setVarFormOpen(true)
  }, [])

  // Abrir form para editar variável
  const openEditVarForm = useCallback(async (v: DashboardVariable) => {
    setEditingVarId(v.id)
    setVarFormName(v.name)
    setVarFormValue(String(v.value))
    setVarFormDesc(v.description || '')
    setVarFormFormat(v.format || 'number')
    setVarFormValueType(v.value_type || 'fixed')
    setVarFormOpen(true)
    // Carregar períodos se for periódica
    if (v.value_type === 'periodic') {
      try {
        const periods = await getVariablePeriods(v.id)
        setVarFormPeriods(periods)
      } catch {
        setVarFormPeriods([])
      }
    } else {
      setVarFormPeriods([])
    }
  }, [])

  // Fechar form de variável
  const closeVarForm = useCallback(() => {
    setVarFormOpen(false)
    setEditingVarId(null)
    setVarFormName('')
    setVarFormValue('')
    setVarFormDesc('')
    setVarFormFormat('number')
    setVarFormValueType('fixed')
    setVarFormPeriods([])
  }, [])

  // Salvar variável (criar ou editar)
  const handleSaveVarForm = useCallback(async () => {
    if (!varFormName.trim()) return
    // Para variáveis fixas, valor é obrigatório
    if (varFormValueType === 'fixed' && (!varFormValue || isNaN(parseFloat(varFormValue)))) return
    const val = varFormValue ? parseFloat(varFormValue) : 0

    setSavingVar(true)
    try {
      if (editingVarId) {
        await handleUpdateVariable(editingVarId, {
          name: varFormName.trim(),
          value: val,
          format: varFormFormat,
          value_type: varFormValueType,
          description: varFormDesc.trim() || undefined
        })
      } else {
        await handleCreateVariable(varFormName.trim(), val, varFormFormat, varFormValueType)
      }
      closeVarForm()
    } finally {
      setSavingVar(false)
    }
  }, [varFormName, varFormValue, varFormDesc, varFormFormat, varFormValueType, editingVarId, handleUpdateVariable, handleCreateVariable, closeVarForm])

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

  // Duplicar cálculo
  const handleDuplicateCalculation = useCallback(async (metricKey: string) => {
    const calcId = metricKey.replace(CALCULATION_METRIC_PREFIX, '')
    const calc = loadedCalculations.find(c => c.id === calcId)
    if (!calc) return
    try {
      await createCalculation({
        name: `${calc.name} (cópia)`,
        description: calc.description || '',
        formula: calc.formula,
        result_format: calc.result_format
      })
      await loadAllMetrics()
    } catch (error) {
      console.error('Erro ao duplicar cálculo:', error)
    }
  }, [loadedCalculations])

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
      calculations: [],
      variables: []
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
      const widgetType = metric.supportedWidgets[0]
      if (isCustom) {
        setStep('config')
      } else if (widgetType === 'kpi') {
        // KPI vai para step de seleção de cor
        const config: Partial<DashboardWidgetConfig> = {}
        if (isCalc) config.calculationId = metric.key.replace(CALCULATION_METRIC_PREFIX, '')
        setPendingWidgetType('kpi')
        setPendingConfig(Object.keys(config).length > 0 ? config : undefined)
        setStep('kpiColor')
      } else {
        const config: Partial<DashboardWidgetConfig> = {}
        if (isCalc) config.calculationId = metric.key.replace(CALCULATION_METRIC_PREFIX, '')
        finalizeSelection(metric.key, widgetType, metric.label, Object.keys(config).length > 0 ? config : undefined)
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
    } else if (widgetType === 'kpi') {
      // KPI vai para step de seleção de cor
      const config: Partial<DashboardWidgetConfig> = {}
      if (isCalculationMetric(selectedMetric.key)) {
        config.calculationId = selectedMetric.key.replace(CALCULATION_METRIC_PREFIX, '')
      }
      setPendingWidgetType('kpi')
      setPendingConfig(Object.keys(config).length > 0 ? config : undefined)
      setStep('kpiColor')
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
    
    if (widgetType === 'kpi') {
      setPendingWidgetType('kpi')
      setPendingConfig(config)
      setStep('kpiColor')
    } else {
      finalizeSelection(selectedMetric.key, widgetType, selectedMetric.label, config)
    }
  }

  // Confirmar cor do KPI e finalizar
  const handleKpiColorConfirm = () => {
    if (!selectedMetric || !pendingWidgetType) return
    const config: Partial<DashboardWidgetConfig> = {
      ...pendingConfig,
      kpiColor: selectedKpiColor || undefined
    }
    finalizeSelection(selectedMetric.key, pendingWidgetType, selectedMetric.label, Object.keys(config).length > 0 ? config : undefined)
  }

  const handleClose = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedWidgetType('all')
    setStep('metric')
    setSelectedMetric(null)
    setSelectedStatusFilter('all')
    setSelectedKpiColor('')
    setPendingWidgetType(null)
    setPendingConfig(undefined)
    setIsCreateCalcOpen(false)
    setEditingCalc(null)
    closeVarForm()
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
              {step === 'kpiColor' && 'Cor do Card KPI'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'metric' && (isEditing ? 'Selecione a nova métrica para este widget' : 'Selecione a métrica que deseja visualizar')}
              {step === 'widget' && `Escolha como visualizar "${selectedMetric?.label}"`}
              {step === 'config' && 'Configure as opções do widget'}
              {step === 'kpiColor' && 'Escolha uma cor para o card (opcional)'}
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
              ) : filteredMetrics.length === 0 && selectedCategory !== 'all' && selectedCategory !== 'calculations' && selectedCategory !== 'variables' ? (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma métrica encontrada com os filtros aplicados
                </div>
              ) : (
                <div className="space-y-6">
                  {(Object.keys(CATEGORY_LABELS) as MetricCategory[]).map(category => {
                    const metrics = metricsByCategory[category]
                    const isCalcCategory = category === 'calculations'
                    const isVarCategory = category === 'variables'
                    
                    // Categorias especiais sempre aparecem (para botão de criar)
                    const isSpecialCategory = isCalcCategory || isVarCategory
                    if (metrics.length === 0 && !isSpecialCategory) return null
                    // Mas não mostrar se está filtrando por outra categoria
                    if (metrics.length === 0 && isCalcCategory && selectedCategory !== 'all' && selectedCategory !== 'calculations') return null
                    if (isVarCategory && selectedCategory !== 'all' && selectedCategory !== 'variables') return null

                    // Seção de variáveis - renderização própria
                    if (isVarCategory) {
                      return (
                        <VariablesSection
                          key={category}
                          variables={loadedVariables}
                          varFormOpen={varFormOpen}
                          editingVarId={editingVarId}
                          varFormName={varFormName}
                          varFormValue={varFormValue}
                          varFormDesc={varFormDesc}
                          varFormFormat={varFormFormat}
                          varFormValueType={varFormValueType}
                          varFormPeriods={varFormPeriods}
                          savingVar={savingVar}
                          onOpenCreate={openCreateVarForm}
                          onOpenEdit={openEditVarForm}
                          onDelete={handleDeleteVariable}
                          onAddAsKpi={(v) => {
                            const metricKey = `${VARIABLE_METRIC_PREFIX}${v.id}`
                            finalizeSelection(metricKey, 'kpi', v.name)
                          }}
                          onFormNameChange={setVarFormName}
                          onFormValueChange={setVarFormValue}
                          onFormDescChange={setVarFormDesc}
                          onFormFormatChange={setVarFormFormat}
                          onFormValueTypeChange={setVarFormValueType}
                          onFormPeriodsChange={setVarFormPeriods}
                          onFormSave={handleSaveVarForm}
                          onFormCancel={closeVarForm}
                        />
                      )
                    }

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
                              onDuplicate={isCalcCategory ? () => handleDuplicateCalculation(metric.key) : undefined}
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
        ) : step === 'config' ? (
          /* Step 3: Configurar filtro de status (apenas para campos personalizados) */
          <div className="p-6">
            <button
              onClick={() => setStep(selectedMetric?.supportedWidgets.length === 1 ? 'metric' : 'widget')}
              className="text-sm text-orange-600 hover:text-orange-700 mb-4"
            >
              ← Voltar
            </button>

            <div className="space-y-6">
              {/* Info do campo selecionado */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-center gap-3">
                  <AdjustmentsHorizontalIcon className="w-6 h-6 text-orange-600" />
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
                          ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`font-medium ${selectedStatusFilter === status ? 'text-orange-700' : 'text-gray-700'}`}>
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
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  Adicionar Widget
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 4: Escolher cor do KPI */
          <KpiColorPicker
            selectedColor={selectedKpiColor}
            onSelectColor={setSelectedKpiColor}
            onBack={() => {
              const hasMultipleWidgets = selectedMetric && selectedMetric.supportedWidgets.length > 1
              setStep(hasMultipleWidgets ? 'widget' : 'metric')
            }}
            onConfirm={handleKpiColorConfirm}
            metricLabel={selectedMetric?.label || ''}
          />
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
// SELETOR DE COR DO KPI
// =====================================================

const KPI_COLOR_OPTIONS = [
  { value: '', label: 'Padrão (branco)', bg: 'bg-white', border: 'border-gray-300', text: 'text-gray-900' },
  { value: '#3B82F6', label: 'Azul', bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-white' },
  { value: '#10B981', label: 'Verde', bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-white' },
  { value: '#F97316', label: 'Laranja', bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-white' },
  { value: '#EF4444', label: 'Vermelho', bg: 'bg-red-500', border: 'border-red-500', text: 'text-white' },
  { value: '#8B5CF6', label: 'Roxo', bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-white' },
  { value: '#EC4899', label: 'Rosa', bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-white' },
  { value: '#06B6D4', label: 'Ciano', bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-white' },
  { value: '#F59E0B', label: 'Amarelo', bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-white' },
  { value: '#6366F1', label: 'Indigo', bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-white' },
  { value: '#64748B', label: 'Cinza', bg: 'bg-slate-500', border: 'border-slate-500', text: 'text-white' },
  { value: '#1E293B', label: 'Escuro', bg: 'bg-slate-800', border: 'border-slate-800', text: 'text-white' },
]

interface KpiColorPickerProps {
  selectedColor: string
  onSelectColor: (color: string) => void
  onBack: () => void
  onConfirm: () => void
  metricLabel: string
}

function KpiColorPicker({ selectedColor, onSelectColor, onBack, onConfirm, metricLabel }: KpiColorPickerProps) {
  const activeOption = KPI_COLOR_OPTIONS.find(o => o.value === selectedColor) || KPI_COLOR_OPTIONS[0]

  return (
    <div className="p-6">
      <button
        onClick={onBack}
        className="text-sm text-orange-600 hover:text-orange-700 mb-4"
      >
        ← Voltar
      </button>

      <div className="space-y-6">
        {/* Preview */}
        <div
          className="rounded-lg border-2 overflow-hidden transition-all"
          style={{ borderColor: activeOption.value || '#e5e7eb' }}
        >
          {/* Header colorido */}
          <div
            className="px-4 py-3"
            style={{ backgroundColor: activeOption.value || '#f9fafb' }}
          >
            <p className="text-sm font-semibold" style={{ color: activeOption.value ? '#ffffff' : '#111827' }}>
              {metricLabel}
            </p>
          </div>
          {/* Conteúdo branco */}
          <div className="px-4 py-4 bg-white">
            <p className="text-3xl font-bold text-gray-900">1.234</p>
            <p className="text-sm mt-1 text-gray-400">Preview do card</p>
          </div>
        </div>

        {/* Grade de cores */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Selecione a cor
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {KPI_COLOR_OPTIONS.map(option => (
              <button
                key={option.value || 'default'}
                onClick={() => onSelectColor(option.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                  selectedColor === option.value
                    ? 'ring-2 ring-orange-400 ring-offset-2 border-orange-400'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full border"
                  style={{
                    backgroundColor: option.value || '#ffffff',
                    borderColor: option.value || '#d1d5db'
                  }}
                />
                <span className="text-[10px] font-medium text-gray-600">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Confirmar */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Adicionar Widget
          </button>
        </div>
      </div>
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
  onDuplicate?: () => void
  onDelete?: () => void
}

// =====================================================
// SEÇÃO DE VARIÁVEIS
// =====================================================

const VARIABLE_FORMAT_LABELS: Record<VariableFormat, string> = {
  number: 'Número',
  currency: 'Moeda (R$)',
  percentage: 'Percentual (%)'
}

interface VariablesSectionProps {
  variables: DashboardVariable[]
  varFormOpen: boolean
  editingVarId: string | null
  varFormName: string
  varFormValue: string
  varFormDesc: string
  varFormFormat: VariableFormat
  varFormValueType: VariableValueType
  varFormPeriods: VariablePeriod[]
  savingVar: boolean
  onOpenCreate: () => void
  onOpenEdit: (v: DashboardVariable) => void
  onDelete: (id: string) => void
  onAddAsKpi: (v: DashboardVariable) => void
  onFormNameChange: (v: string) => void
  onFormValueChange: (v: string) => void
  onFormDescChange: (v: string) => void
  onFormFormatChange: (v: VariableFormat) => void
  onFormValueTypeChange: (v: VariableValueType) => void
  onFormPeriodsChange: (periods: VariablePeriod[]) => void
  onFormSave: () => void
  onFormCancel: () => void
}

function VariablesSection({
  variables,
  varFormOpen,
  editingVarId,
  varFormName,
  varFormValue,
  varFormDesc,
  varFormFormat,
  varFormValueType,
  varFormPeriods,
  savingVar,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onAddAsKpi,
  onFormNameChange,
  onFormValueChange,
  onFormDescChange,
  onFormFormatChange,
  onFormValueTypeChange,
  onFormPeriodsChange,
  onFormSave,
  onFormCancel
}: VariablesSectionProps) {
  const canSave = varFormName.trim().length > 0 && (
    varFormValueType === 'periodic' || (varFormValue.length > 0 && !isNaN(parseFloat(varFormValue)))
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-violet-700">Variáveis</h3>
        <button
          onClick={onOpenCreate}
          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Criar Variável
        </button>
      </div>

      {/* Formulário inline de criar/editar */}
      {varFormOpen && (
        <div className="mb-3 p-4 bg-violet-50 border border-violet-200 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-violet-700">
            {editingVarId ? 'Editar Variável' : 'Nova Variável'}
          </p>

          {/* Nome e tipo de valor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              value={varFormName}
              onChange={(e) => onFormNameChange(e.target.value)}
              placeholder="Nome (ex: Meta Mensal)"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              autoFocus
            />
            <select
              value={varFormValueType}
              onChange={(e) => onFormValueTypeChange(e.target.value as VariableValueType)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
            >
              <option value="fixed">Valor Fixo</option>
              <option value="periodic">Valor por Período</option>
            </select>
          </div>

          {/* Valor e formato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {varFormValueType === 'fixed' ? (
              <input
                type="number"
                value={varFormValue}
                onChange={(e) => onFormValueChange(e.target.value)}
                placeholder="Valor (ex: 100)"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            ) : (
              <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-400">
                Valor definido nos períodos
              </div>
            )}
            <select
              value={varFormFormat}
              onChange={(e) => onFormFormatChange(e.target.value as VariableFormat)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
            >
              {Object.entries(VARIABLE_FORMAT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <input
            type="text"
            value={varFormDesc}
            onChange={(e) => onFormDescChange(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />

          {/* Gerenciador de períodos (apenas para variáveis periódicas já salvas) */}
          {varFormValueType === 'periodic' && editingVarId && (
            <PeriodsManager
              variableId={editingVarId}
              periods={varFormPeriods}
              onPeriodsChange={onFormPeriodsChange}
            />
          )}

          {varFormValueType === 'periodic' && !editingVarId && (
            <p className="text-[10px] text-gray-500 bg-white px-3 py-2 rounded border border-gray-200">
              Salve a variável primeiro para adicionar períodos.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onFormCancel}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
              disabled={savingVar}
            >
              Cancelar
            </button>
            <button
              onClick={onFormSave}
              disabled={!canSave || savingVar}
              className="px-4 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {savingVar ? 'Salvando...' : editingVarId ? 'Salvar Alterações' : 'Criar Variável'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de variáveis */}
      {variables.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {variables.map(v => (
            <VariableCard
              key={v.id}
              variable={v}
              isEditing={editingVarId === v.id}
              onEdit={() => onOpenEdit(v)}
              onDelete={() => onDelete(v.id)}
              onAddAsKpi={() => onAddAsKpi(v)}
            />
          ))}
        </div>
      ) : !varFormOpen && (
        <div className="text-center py-6 border-2 border-dashed border-violet-200 rounded-lg">
          <CubeTransparentIcon className="w-8 h-8 text-violet-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nenhuma variável criada</p>
          <button
            onClick={onOpenCreate}
            className="mt-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            Criar primeira variável
          </button>
        </div>
      )}
    </div>
  )
}

// =====================================================
// CARD DE VARIÁVEL
// =====================================================

function formatVariableValue(value: number, format: VariableFormat): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    case 'percentage':
      return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
    default:
      return value.toLocaleString('pt-BR')
  }
}

function VariableCard({
  variable,
  isEditing,
  onEdit,
  onDelete,
  onAddAsKpi
}: {
  variable: DashboardVariable
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
  onAddAsKpi: () => void
}) {
  const format = variable.format || 'number'
  const isPeriodic = variable.value_type === 'periodic'
  const formattedValue = isPeriodic ? 'Por período' : formatVariableValue(Number(variable.value), format)

  return (
    <div
      className={`relative flex items-start gap-3 p-4 border rounded-lg transition-all group cursor-pointer ${
        isEditing ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-violet-200 bg-violet-50/30 hover:border-blue-500 hover:bg-blue-50'
      }`}
      onClick={onAddAsKpi}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 group-hover:text-blue-700">{variable.name}</h4>
          <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-violet-100 text-violet-700 rounded">
            {formattedValue}
          </span>
        </div>
        {variable.description && (
          <p className="text-sm text-gray-500 mt-1">{variable.description}</p>
        )}
        {/* Indicadores: formato + tipo widget + tipo valor */}
        <div className="flex items-center gap-2 mt-2">
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
            {VARIABLE_FORMAT_LABELS[format]}
          </span>
          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
            variable.value_type === 'periodic'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {variable.value_type === 'periodic' ? 'Periódica' : 'Fixa'}
          </span>
          <span className="p-1 bg-gray-100 rounded" title="KPI Card">
            <ChartBarSquareIcon className="w-3 h-3 text-gray-500" />
          </span>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-100 rounded-md transition-colors"
          title="Editar variável"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Excluir variável"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// =====================================================
// CARD DE MÉTRICA
// =====================================================

function MetricCard({ metric, onClick, onEdit, onDuplicate, onDelete }: MetricCardProps) {
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

      {/* Botões de editar/duplicar/excluir para cálculos */}
      {isCalc && (onEdit || onDuplicate || onDelete) && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
              title="Editar cálculo"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate() }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Duplicar cálculo"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
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
