import { useState } from 'react'
import { XMarkIcon, HashtagIcon } from '@heroicons/react/24/outline'
import type { AvailableMetric } from '../../../../types'
import { CATEGORY_LABELS } from '../widgets/index'

interface MetricPickerModalProps {
  metricsByCategory: Record<string, AvailableMetric[]>
  searchQuery: string
  onSearchChange: (q: string) => void
  onSelect: (metric: AvailableMetric) => void
  onAddConstant: (val: number) => void
  onClose: () => void
}

export function MetricPickerModal({
  metricsByCategory,
  searchQuery,
  onSearchChange,
  onSelect,
  onAddConstant,
  onClose
}: MetricPickerModalProps) {
  const [showConstantInput, setShowConstantInput] = useState(false)
  const [constantValue, setConstantValue] = useState('')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Selecionar Valor</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Busca */}
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar métricas..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Opção de constante */}
        <div className="px-4 py-2 border-b border-gray-100">
          {showConstantInput ? (
            <ConstantInput
              value={constantValue}
              onChange={setConstantValue}
              onConfirm={() => {
                const val = parseFloat(constantValue)
                if (!isNaN(val)) {
                  onAddConstant(val)
                  setShowConstantInput(false)
                }
              }}
              onCancel={() => setShowConstantInput(false)}
            />
          ) : (
            <button
              onClick={() => setShowConstantInput(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <HashtagIcon className="w-4 h-4" />
              Usar valor numérico constante
            </button>
          )}
        </div>

        {/* Lista de métricas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(metricsByCategory).map(([category, metrics]) => {
            if (metrics.length === 0) return null
            return (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
                </h4>
                <div className="space-y-1">
                  {metrics.map(metric => (
                    <button
                      key={metric.key}
                      onClick={() => onSelect(metric)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <div className="text-sm font-medium">{metric.label}</div>
                      <div className="text-xs text-gray-500">{metric.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ConstantInput({
  value,
  onChange,
  onConfirm,
  onCancel
}: {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <HashtagIcon className="w-4 h-4 text-gray-400" />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite um número..."
        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
        autoFocus
      />
      <button
        onClick={onConfirm}
        className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
      >
        OK
      </button>
      <button
        onClick={onCancel}
        className="text-gray-400 hover:text-gray-600"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
