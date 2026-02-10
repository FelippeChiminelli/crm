import { useState, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type {
  CalculationNode,
  CalculationResultFormat,
  AvailableMetric,
  CreateCalculationData
} from '../../../types'
import { FormulaBuilder } from './FormulaBuilder'
import { FormulaPreview } from './FormulaPreview'
import { validateFormula } from './widgets/calculationEngine'

interface CreateCalculationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateCalculationData) => Promise<void>
  availableMetrics: AvailableMetric[]
  saving?: boolean
}

const RESULT_FORMATS: { value: CalculationResultFormat; label: string; description: string }[] = [
  { value: 'number', label: 'Número', description: 'Exibe como número inteiro ou decimal' },
  { value: 'currency', label: 'Moeda (R$)', description: 'Exibe como valor monetário' },
  { value: 'percentage', label: 'Percentual (%)', description: 'Exibe como percentual' }
]

export function CreateCalculationModal({
  isOpen,
  onClose,
  onSave,
  availableMetrics,
  saving = false
}: CreateCalculationModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formula, setFormula] = useState<CalculationNode | null>(null)
  const [resultFormat, setResultFormat] = useState<CalculationResultFormat>('number')

  const validation = formula ? validateFormula(formula) : { valid: false, error: 'Fórmula vazia' }
  const canSave = name.trim().length > 0 && validation.valid && !saving

  const handleSave = useCallback(async () => {
    if (!canSave || !formula) return

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      formula,
      result_format: resultFormat
    })

    // Reset
    setName('')
    setDescription('')
    setFormula(null)
    setResultFormat('number')
  }, [canSave, formula, name, description, resultFormat, onSave])

  const handleClose = useCallback(() => {
    setName('')
    setDescription('')
    setFormula(null)
    setResultFormat('number')
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Criar Cálculo</h2>
            <p className="text-sm text-gray-500 mt-1">
              Monte uma fórmula combinando métricas, campos e valores
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Nome e descrição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do cálculo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Taxa de Conversão"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Vendas dividido por leads vezes 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={200}
              />
            </div>
          </div>

          {/* Formato do resultado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formato do resultado
            </label>
            <div className="grid grid-cols-3 gap-3">
              {RESULT_FORMATS.map(fmt => (
                <button
                  key={fmt.value}
                  onClick={() => setResultFormat(fmt.value)}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    resultFormat === fmt.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    resultFormat === fmt.value ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {fmt.label}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">{fmt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Formula Builder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fórmula *
            </label>
            <FormulaBuilder
              value={formula}
              onChange={setFormula}
              availableMetrics={availableMetrics}
            />
          </div>

          {/* Preview */}
          {formula && (
            <FormulaPreview
              formula={formula}
              resultFormat={resultFormat}
              availableMetrics={availableMetrics}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              canSave
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Salvando...
              </span>
            ) : (
              'Criar Cálculo'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
