import { useMemo } from 'react'
import { CalculatorIcon } from '@heroicons/react/24/outline'
import type { CalculationNode, CalculationResultFormat, AvailableMetric, DashboardVariable } from '../../../types'
import { formulaToText, validateFormula, formatCalculationResult } from './widgets/calculationEngine'

interface FormulaPreviewProps {
  formula: CalculationNode | null
  resultFormat: CalculationResultFormat
  availableMetrics: AvailableMetric[]
  /** Valor preview se disponível (calculado externamente) */
  previewValue?: number | null
  /** Variáveis para exibir nomes no preview */
  variables?: DashboardVariable[]
}

export function FormulaPreview({
  formula,
  resultFormat,
  availableMetrics,
  previewValue,
  variables = []
}: FormulaPreviewProps) {
  // Labels das métricas
  const metricLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    availableMetrics.forEach(m => {
      labels[m.key] = m.label
    })
    return labels
  }, [availableMetrics])

  // Nomes das variáveis
  const variableNames = useMemo(() => {
    const names: Record<string, string> = {}
    variables.forEach(v => { names[v.id] = v.name })
    return names
  }, [variables])

  // Texto da fórmula
  const formulaText = useMemo(() => {
    if (!formula) return null
    return formulaToText(formula, metricLabels, variableNames)
  }, [formula, metricLabels, variableNames])

  // Validação
  const validation = useMemo(() => {
    if (!formula) return { valid: false, error: 'Fórmula vazia' }
    return validateFormula(formula)
  }, [formula])

  // Formato do resultado
  const formatLabel = {
    number: 'Número',
    currency: 'Moeda (R$)',
    percentage: 'Percentual (%)'
  }[resultFormat]

  if (!formula) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <p className="text-sm text-gray-500">Nenhuma fórmula definida</p>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-lg border ${
      validation.valid ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        <CalculatorIcon className={`w-5 h-5 mt-0.5 ${
          validation.valid ? 'text-green-600' : 'text-amber-600'
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 font-mono break-words">
            {formulaText}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500">
              Formato: <span className="font-medium">{formatLabel}</span>
            </span>

            {previewValue !== undefined && previewValue !== null && validation.valid && (
              <span className="text-xs text-gray-500">
                Resultado: <span className="font-bold text-gray-900">
                  {formatCalculationResult(previewValue, resultFormat)}
                </span>
              </span>
            )}
          </div>

          {!validation.valid && (
            <p className="text-xs text-amber-600 mt-1">{validation.error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
