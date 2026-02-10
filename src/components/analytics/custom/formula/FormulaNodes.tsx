import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { CalculationNode, CalculationOperator } from '../../../../types'

// =====================================================
// TIPOS
// =====================================================

export type NodePath = number[]

const OPERATORS: { value: CalculationOperator; label: string; symbol: string }[] = [
  { value: '+', label: 'Soma', symbol: '+' },
  { value: '-', label: 'Subtração', symbol: '-' },
  { value: '*', label: 'Multiplicação', symbol: '×' },
  { value: '/', label: 'Divisão', symbol: '÷' }
]

export { OPERATORS }

export interface NodeRendererProps {
  node: CalculationNode
  path: NodePath
  metricLabels: Record<string, string>
  onRemove: () => void
  onOpenMetricPicker: (path: NodePath) => void
  onSetConstant: (path: NodePath, val: number) => void
  onWrapWithOperation: (path: NodePath, operator: CalculationOperator) => void
  onSetOperator: (path: NodePath, operator: CalculationOperator) => void
}

// =====================================================
// NODE RENDERER
// =====================================================

export function NodeRenderer({
  node,
  path,
  metricLabels,
  onRemove,
  onOpenMetricPicker,
  onSetConstant,
  onWrapWithOperation,
  onSetOperator
}: NodeRendererProps) {
  if (node.type === 'operation') {
    return (
      <OperationNode
        node={node}
        path={path}
        metricLabels={metricLabels}
        onRemove={onRemove}
        onOpenMetricPicker={onOpenMetricPicker}
        onSetConstant={onSetConstant}
        onWrapWithOperation={onWrapWithOperation}
        onSetOperator={onSetOperator}
      />
    )
  }

  return (
    <ValueNode
      node={node}
      metricLabels={metricLabels}
      onRemove={onRemove}
    />
  )
}

// =====================================================
// VALUE NODE
// =====================================================

function ValueNode({
  node,
  metricLabels,
  onRemove
}: {
  node: CalculationNode
  metricLabels: Record<string, string>
  onRemove: () => void
}) {
  let label = ''
  let bgClass = ''

  switch (node.type) {
    case 'metric':
      label = metricLabels[node.metricKey || ''] || node.metricKey || '???'
      bgClass = 'bg-blue-100 text-blue-800 border-blue-200'
      break
    case 'custom_field':
      label = metricLabels[`custom_field_${node.customFieldId}`] || 'Campo personalizado'
      bgClass = 'bg-cyan-100 text-cyan-800 border-cyan-200'
      break
    case 'constant':
      label = String(node.value ?? 0)
      bgClass = 'bg-gray-100 text-gray-800 border-gray-300'
      break
  }

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium ${bgClass}`}>
      {label}
      <button
        onClick={onRemove}
        className="ml-1 hover:opacity-70"
        title="Remover"
      >
        <XMarkIcon className="w-3.5 h-3.5" />
      </button>
    </span>
  )
}

// =====================================================
// OPERATION NODE
// =====================================================

function OperationNode({
  node,
  path,
  metricLabels,
  onRemove,
  onOpenMetricPicker,
  onSetConstant,
  onWrapWithOperation,
  onSetOperator
}: NodeRendererProps & { node: CalculationNode }) {
  return (
    <div className="inline-flex items-center gap-2 p-2 bg-white border border-gray-300 rounded-xl shadow-sm flex-wrap">
      <span className="text-gray-400 text-lg font-light">(</span>

      {/* Lado esquerdo */}
      {node.left ? (
        <NodeRenderer
          node={node.left}
          path={[...path, 0]}
          metricLabels={metricLabels}
          onRemove={() => onOpenMetricPicker([...path, 0])}
          onOpenMetricPicker={onOpenMetricPicker}
          onSetConstant={onSetConstant}
          onWrapWithOperation={onWrapWithOperation}
          onSetOperator={onSetOperator}
        />
      ) : (
        <PlaceholderButton
          onClick={() => onOpenMetricPicker([...path, 0])}
          label="Valor"
        />
      )}

      {/* Operador */}
      <select
        value={node.operator || '+'}
        onChange={(e) => onSetOperator(path, e.target.value as CalculationOperator)}
        className="px-2 py-1 text-lg font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-lg cursor-pointer appearance-none text-center w-10"
      >
        {OPERATORS.map(op => (
          <option key={op.value} value={op.value}>{op.symbol}</option>
        ))}
      </select>

      {/* Lado direito */}
      {node.right ? (
        <NodeRenderer
          node={node.right}
          path={[...path, 1]}
          metricLabels={metricLabels}
          onRemove={() => onOpenMetricPicker([...path, 1])}
          onOpenMetricPicker={onOpenMetricPicker}
          onSetConstant={onSetConstant}
          onWrapWithOperation={onWrapWithOperation}
          onSetOperator={onSetOperator}
        />
      ) : (
        <PlaceholderButton
          onClick={() => onOpenMetricPicker([...path, 1])}
          label="Valor"
        />
      )}

      <span className="text-gray-400 text-lg font-light">)</span>

      {path.length === 0 && (
        <button
          onClick={onRemove}
          className="ml-1 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
          title="Remover operação"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// =====================================================
// PLACEHOLDER BUTTON
// =====================================================

export function PlaceholderButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-3 py-1.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors text-sm"
    >
      <PlusIcon className="w-4 h-4" />
      {label}
    </button>
  )
}

// =====================================================
// UTILS
// =====================================================

export function getNodeAtPath(root: CalculationNode, path: NodePath): CalculationNode | null {
  let current: CalculationNode | undefined = root
  for (const idx of path) {
    if (!current) return null
    current = idx === 0 ? current.left : current.right
  }
  return current || null
}
