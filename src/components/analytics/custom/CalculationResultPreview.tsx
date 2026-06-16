import type { AnalyticsPeriod } from '../../../types'

interface CalculationResultPreviewProps {
  formatted: string | null
  loading: boolean
  error: string | null
  period: AnalyticsPeriod
  isValid: boolean
}

function formatPeriodLabel(period: AnalyticsPeriod): string {
  const fmt = (d: string) => d.split('-').reverse().join('/')
  return `${fmt(period.start)} – ${fmt(period.end)}`
}

export function CalculationResultPreview({
  formatted,
  loading,
  error,
  period,
  isValid
}: CalculationResultPreviewProps) {
  if (!isValid) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-center">
        <p className="text-sm text-amber-700">
          Complete a fórmula para visualizar o resultado
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Resultado do cálculo
        </p>
        <p className="text-xs text-blue-600/80">
          Período: {formatPeriodLabel(period)}
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-blue-700">Calculando...</span>
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600 text-center py-2">{error}</p>
      )}

      {!loading && !error && formatted !== null && (
        <p className="text-3xl font-bold text-gray-900 text-center tabular-nums">
          {formatted}
        </p>
      )}

      {!loading && !error && (
        <p className="text-xs text-blue-600/70 text-center mt-2">
          Valor estimado com base no período do dashboard
        </p>
      )}
    </div>
  )
}
