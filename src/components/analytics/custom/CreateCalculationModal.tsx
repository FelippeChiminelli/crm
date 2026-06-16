import { useState, useCallback, useEffect, useMemo } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type {
  AnalyticsPeriod,
  CalculationNode,
  CalculationResultFormat,
  AvailableMetric,
  CreateCalculationData,
  DashboardCalculation,
  DashboardVariable,
  UpdateVariableData,
  VariableFormat
} from '../../../types'
import { FormulaBuilder } from './FormulaBuilder'
import { FormulaPreview } from './FormulaPreview'
import { CalculationResultPreview } from './CalculationResultPreview'
import { validateFormula } from './widgets/calculationEngine'
import { previewCalculationResult } from './widgets/useWidgetData'
import { getDaysAgoLocalDateString, getTodayLocalDateString } from '../../../utils/dateHelpers'

interface CreateCalculationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateCalculationData) => Promise<void>
  availableMetrics: AvailableMetric[]
  saving?: boolean
  /** Se definido, o modal entra em modo de edição */
  editingCalculation?: DashboardCalculation | null
  /** Variáveis reutilizáveis disponíveis */
  variables?: DashboardVariable[]
  /** Callback para criar variável inline */
  onCreateVariable?: (name: string, value: number, format?: VariableFormat) => Promise<DashboardVariable | null>
  /** Callback para atualizar variável */
  onUpdateVariable?: (id: string, data: UpdateVariableData) => Promise<DashboardVariable | null>
  /** Callback para excluir variável */
  onDeleteVariable?: (id: string) => Promise<void>
  /** Opções de filtro para métricas na fórmula */
  responsibles?: Array<{ uuid: string; full_name?: string | null }>
  pipelines?: Array<{ id: string; name: string }>
  stages?: Array<{ id: string; name: string; pipeline_id?: string }>
  origins?: string[]
  instances?: Array<{ id: string; display_name?: string | null; name?: string | null }>
  /** Período do dashboard para preview do resultado */
  previewPeriod?: AnalyticsPeriod
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
  saving = false,
  editingCalculation = null,
  variables = [],
  onCreateVariable,
  onUpdateVariable,
  onDeleteVariable,
  responsibles = [],
  pipelines = [],
  stages = [],
  origins = [],
  instances = [],
  previewPeriod
}: CreateCalculationModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formula, setFormula] = useState<CalculationNode | null>(null)
  const [resultFormat, setResultFormat] = useState<CalculationResultFormat>('number')
  const [previewFormatted, setPreviewFormatted] = useState<string | null>(null)
  const [previewValue, setPreviewValue] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const activePeriod = useMemo<AnalyticsPeriod>(() => {
    if (previewPeriod?.start && previewPeriod?.end) return previewPeriod
    return {
      start: getDaysAgoLocalDateString(29),
      end: getTodayLocalDateString()
    }
  }, [previewPeriod])

  const isEditing = !!editingCalculation

  // Preencher dados quando editando
  useEffect(() => {
    if (editingCalculation && isOpen) {
      setName(editingCalculation.name)
      setDescription(editingCalculation.description || '')
      setFormula(editingCalculation.formula)
      setResultFormat(editingCalculation.result_format)
    }
  }, [editingCalculation, isOpen])

  const validation = formula ? validateFormula(formula) : { valid: false, error: 'Fórmula vazia' }
  const canSave = name.trim().length > 0 && validation.valid && !saving

  useEffect(() => {
    if (!isOpen || !formula || !validation.valid) {
      setPreviewFormatted(null)
      setPreviewValue(null)
      setPreviewError(null)
      setPreviewLoading(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true)
      setPreviewError(null)

      try {
        const result = await previewCalculationResult(formula, activePeriod, resultFormat)
        if (cancelled) return
        setPreviewFormatted(result.formatted)
        setPreviewValue(result.value)
      } catch {
        if (cancelled) return
        setPreviewFormatted(null)
        setPreviewValue(null)
        setPreviewError('Não foi possível calcular o preview')
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [isOpen, formula, resultFormat, activePeriod, validation.valid])

  const resetForm = useCallback(() => {
    setName('')
    setDescription('')
    setFormula(null)
    setResultFormat('number')
    setPreviewFormatted(null)
    setPreviewValue(null)
    setPreviewError(null)
    setPreviewLoading(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!canSave || !formula) return

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      formula,
      result_format: resultFormat
    })

    resetForm()
  }, [canSave, formula, name, description, resultFormat, onSave, resetForm])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Editar Cálculo' : 'Criar Cálculo'}
            </h2>
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
              variables={variables}
              onCreateVariable={onCreateVariable}
              onUpdateVariable={onUpdateVariable}
              onDeleteVariable={onDeleteVariable}
              responsibles={responsibles}
              pipelines={pipelines}
              stages={stages}
              origins={origins}
              instances={instances}
            />
          </div>

          {/* Resultado ao vivo */}
          <CalculationResultPreview
            formatted={previewFormatted}
            loading={previewLoading}
            error={previewError}
            period={activePeriod}
            isValid={validation.valid}
          />

          {/* Preview da fórmula */}
          {formula && (
            <FormulaPreview
              formula={formula}
              resultFormat={resultFormat}
              availableMetrics={availableMetrics}
              variables={variables}
              previewValue={previewValue}
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
            ) : isEditing ? (
              'Salvar Alterações'
            ) : (
              'Criar Cálculo'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
