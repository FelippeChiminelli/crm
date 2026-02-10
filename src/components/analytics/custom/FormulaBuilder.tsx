import { useState, useCallback, useMemo } from 'react'
import {
  XMarkIcon,
  CalculatorIcon,
  HashtagIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import type { CalculationNode, CalculationOperator, AvailableMetric, DashboardVariable, UpdateVariableData } from '../../../types'
import { validateFormula, formulaToText } from './widgets/calculationEngine'
import { isCustomFieldMetric } from './widgets/index'
import { NodeRenderer, getNodeAtPath, OPERATORS, type NodePath } from './formula/FormulaNodes'
import { MetricPickerModal } from './formula/MetricPickerModal'

// =====================================================
// TIPOS
// =====================================================

interface FormulaBuilderProps {
  value: CalculationNode | null
  onChange: (node: CalculationNode | null) => void
  availableMetrics: AvailableMetric[]
  variables?: DashboardVariable[]
  onCreateVariable?: (name: string, value: number) => Promise<DashboardVariable | null>
  onUpdateVariable?: (id: string, data: UpdateVariableData) => Promise<DashboardVariable | null>
  onDeleteVariable?: (id: string) => Promise<void>
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function FormulaBuilder({ value, onChange, availableMetrics, variables = [], onCreateVariable, onUpdateVariable, onDeleteVariable }: FormulaBuilderProps) {
  const [showMetricPicker, setShowMetricPicker] = useState<NodePath | null>(null)
  const [metricSearchQuery, setMetricSearchQuery] = useState('')

  // Labels das métricas para preview
  const metricLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    availableMetrics.forEach(m => { labels[m.key] = m.label })
    return labels
  }, [availableMetrics])

  // Nomes das variáveis para preview
  const variableNames = useMemo(() => {
    const names: Record<string, string> = {}
    variables.forEach(v => { names[v.id] = v.name })
    return names
  }, [variables])

  // Métricas filtradas (excluir cálculos para evitar referência circular)
  const selectableMetrics = useMemo(() => {
    return availableMetrics.filter(m => m.category !== 'calculations')
  }, [availableMetrics])

  // Métricas filtradas por busca
  const filteredMetrics = useMemo(() => {
    if (!metricSearchQuery) return selectableMetrics
    const q = metricSearchQuery.toLowerCase()
    return selectableMetrics.filter(m =>
      m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    )
  }, [selectableMetrics, metricSearchQuery])

  // Agrupar métricas por categoria
  const metricsByCategory = useMemo(() => {
    const grouped: Record<string, AvailableMetric[]> = {}
    filteredMetrics.forEach(m => {
      if (!grouped[m.category]) grouped[m.category] = []
      grouped[m.category].push(m)
    })
    return grouped
  }, [filteredMetrics])

  // Preview e validação
  const formulaText = useMemo(() => {
    if (!value) return 'Clique para começar a construir sua fórmula'
    return formulaToText(value, metricLabels, variableNames)
  }, [value, metricLabels, variableNames])

  const validation = useMemo(() => {
    if (!value) return { valid: false, error: 'Fórmula vazia' }
    return validateFormula(value)
  }, [value])

  // Funções para manipular a árvore
  const updateNode = useCallback((path: NodePath, newNode: CalculationNode | null) => {
    if (path.length === 0) {
      onChange(newNode)
      return
    }

    const updateAtPath = (current: CalculationNode, remainingPath: NodePath): CalculationNode => {
      if (remainingPath.length === 0) return newNode || current
      const [next, ...rest] = remainingPath

      // Nível final: definir o node diretamente (mesmo que left/right seja undefined)
      if (rest.length === 0) {
        if (next === 0) return { ...current, left: newNode || undefined }
        if (next === 1) return { ...current, right: newNode || undefined }
      }

      // Recursão: navegar para o child existente
      if (next === 0 && current.left) {
        return { ...current, left: updateAtPath(current.left, rest) }
      }
      if (next === 1 && current.right) {
        return { ...current, right: updateAtPath(current.right, rest) }
      }
      return current
    }

    if (value) {
      onChange(updateAtPath(value, path))
    }
  }, [value, onChange])

  const addOperation = useCallback((operator: CalculationOperator) => {
    if (!value) {
      onChange({ type: 'operation', operator, left: undefined, right: undefined })
    } else {
      onChange({ type: 'operation', operator, left: value, right: undefined })
    }
  }, [value, onChange])

  const selectMetric = useCallback((metric: AvailableMetric, path: NodePath) => {
    const isCustom = isCustomFieldMetric(metric.key)
    const node: CalculationNode = isCustom
      ? { type: 'custom_field', customFieldId: metric.key.replace('custom_field_', '') }
      : { type: 'metric', metricKey: metric.key }
    updateNode(path, node)
    setShowMetricPicker(null)
    setMetricSearchQuery('')
  }, [updateNode])

  const addConstant = useCallback((path: NodePath, val: number) => {
    updateNode(path, { type: 'constant', value: val })
  }, [updateNode])

  const selectVariable = useCallback((variable: DashboardVariable, path: NodePath) => {
    updateNode(path, { type: 'variable', variableId: variable.id })
    setShowMetricPicker(null)
    setMetricSearchQuery('')
  }, [updateNode])

  return (
    <div className="space-y-4">
      {/* Preview da fórmula */}
      <FormulaPreviewBar
        formulaText={formulaText}
        validation={validation}
        hasValue={!!value}
      />

      {/* Área de construção visual */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[120px]">
        {!value ? (
          <EmptyState
            onAddMetric={() => setShowMetricPicker([])}
            onAddConstant={(val) => addConstant([], val)}
          />
        ) : (
          <NodeRenderer
            node={value}
            path={[]}
            metricLabels={metricLabels}
            variableNames={variableNames}
            onRemove={() => onChange(null)}
            onOpenMetricPicker={(path) => { setShowMetricPicker(path); setMetricSearchQuery('') }}
            onSetConstant={addConstant}
            onWrapWithOperation={(path, operator) => { if (path.length === 0) addOperation(operator) }}
            onSetOperator={(path, operator) => {
              const node = getNodeAtPath(value, path)
              if (node && node.type === 'operation') updateNode(path, { ...node, operator })
            }}
          />
        )}
      </div>

      {/* Barra de ações rápidas */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500 self-center mr-1">Operadores:</span>
        {OPERATORS.map(op => (
          <button
            key={op.value}
            onClick={() => addOperation(op.value)}
            className="px-3 py-1.5 text-sm font-bold bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            title={op.label}
          >
            {op.symbol}
          </button>
        ))}
        <div className="border-l border-gray-300 mx-1" />
        <button
          onClick={() => onChange(null)}
          className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
        >
          Limpar
        </button>
      </div>

      {/* Modal de seleção de métrica */}
      {showMetricPicker !== null && (
        <MetricPickerModal
          metricsByCategory={metricsByCategory}
          searchQuery={metricSearchQuery}
          onSearchChange={setMetricSearchQuery}
          onSelect={(metric) => selectMetric(metric, showMetricPicker)}
          onAddConstant={(val) => { addConstant(showMetricPicker, val); setShowMetricPicker(null) }}
          variables={variables}
          onSelectVariable={(v) => selectVariable(v, showMetricPicker)}
          onCreateVariable={onCreateVariable}
          onUpdateVariable={onUpdateVariable}
          onDeleteVariable={onDeleteVariable}
          onClose={() => { setShowMetricPicker(null); setMetricSearchQuery('') }}
        />
      )}
    </div>
  )
}

// =====================================================
// SUB-COMPONENTES
// =====================================================

function FormulaPreviewBar({
  formulaText,
  validation,
  hasValue
}: {
  formulaText: string
  validation: { valid: boolean; error?: string }
  hasValue: boolean
}) {
  return (
    <div className={`p-4 rounded-lg border-2 ${
      validation.valid
        ? 'bg-green-50 border-green-200'
        : hasValue ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <CalculatorIcon className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-500">Fórmula</span>
      </div>
      <p className={`text-lg font-mono ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>
        {formulaText}
      </p>
      {!validation.valid && hasValue && (
        <p className="text-xs text-amber-600 mt-1">{validation.error}</p>
      )}
    </div>
  )
}

function EmptyState({
  onAddMetric,
  onAddConstant
}: {
  onAddMetric: () => void
  onAddConstant: (val: number) => void
}) {
  const [showInput, setShowInput] = useState(false)
  const [inputVal, setInputVal] = useState('')

  return (
    <div className="flex flex-col items-center justify-center py-6 gap-3">
      <p className="text-sm text-gray-500">Escolha o primeiro elemento da fórmula</p>
      <div className="flex gap-2">
        <button
          onClick={onAddMetric}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <CubeIcon className="w-4 h-4" />
          Métrica
        </button>
        {showInput ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Valor"
              className="w-24 px-2 py-2 text-sm border border-gray-300 rounded-md"
              autoFocus
            />
            <button
              onClick={() => {
                const val = parseFloat(inputVal)
                if (!isNaN(val)) { onAddConstant(val); setShowInput(false); setInputVal('') }
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
            >
              OK
            </button>
            <button
              onClick={() => { setShowInput(false); setInputVal('') }}
              className="px-2 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <HashtagIcon className="w-4 h-4" />
            Número
          </button>
        )}
      </div>
    </div>
  )
}
