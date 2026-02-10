import type {
  CalculationNode,
  CalculationResultFormat,
  AnalyticsPeriod,
  DashboardCalculation
} from '../../../../types'
import { getCalculationById, getVariableById } from '../../../../services/calculationService'
import { getLocalDateString } from '../../../../utils/dateHelpers'

// =====================================================
// RESOLUÇÃO DE FÓRMULAS
// =====================================================

/**
 * Resolver uma fórmula de cálculo, retornando o valor numérico
 */
export async function resolveCalculation(
  node: CalculationNode,
  fetchValue: (metricKey: string) => Promise<number>
): Promise<number> {
  switch (node.type) {
    case 'constant':
      return node.value ?? 0

    case 'variable': {
      if (!node.variableId) return 0
      const variable = await getVariableById(node.variableId)
      return variable ? Number(variable.value) : 0
    }

    case 'metric':
      if (!node.metricKey) return 0
      return fetchValue(node.metricKey)

    case 'custom_field':
      if (!node.customFieldId) return 0
      return fetchValue(`custom_field_${node.customFieldId}`)

    case 'operation': {
      if (!node.left || !node.right || !node.operator) return 0

      const [left, right] = await Promise.all([
        resolveCalculation(node.left, fetchValue),
        resolveCalculation(node.right, fetchValue)
      ])

      return applyOperator(left, right, node.operator)
    }

    default:
      return 0
  }
}

/**
 * Aplicar operador matemático com tratamento de edge cases
 */
function applyOperator(left: number, right: number, operator: string): number {
  switch (operator) {
    case '+': return left + right
    case '-': return left - right
    case '*': return left * right
    case '/': return right !== 0 ? left / right : 0
    default: return 0
  }
}

// =====================================================
// RESOLUÇÃO TEMPORAL (GRÁFICO DE LINHA)
// =====================================================

/**
 * Resolver fórmula para cada dia do período, gerando série temporal
 */
export async function resolveCalculationOverTime(
  node: CalculationNode,
  period: AnalyticsPeriod,
  fetchValueForDay: (metricKey: string, dayPeriod: AnalyticsPeriod) => Promise<number>
): Promise<Array<{ date: string; value: number }>> {
  const days = getDaysInPeriod(period)
  const results: Array<{ date: string; value: number }> = []

  // Resolver para cada dia (em lotes para performance)
  const batchSize = 7
  for (let i = 0; i < days.length; i += batchSize) {
    const batch = days.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (day) => {
        const dayPeriod: AnalyticsPeriod = { start: day, end: day }
        const fetchForDay = (metricKey: string) => fetchValueForDay(metricKey, dayPeriod)
        const value = await resolveCalculation(node, fetchForDay)
        return { date: day, value }
      })
    )
    results.push(...batchResults)
  }

  return results
}

/**
 * Gerar lista de datas (YYYY-MM-DD) entre start e end
 */
function getDaysInPeriod(period: AnalyticsPeriod): string[] {
  const days: string[] = []
  const current = new Date(period.start + 'T00:00:00')
  const end = new Date(period.end + 'T00:00:00')

  while (current <= end) {
    days.push(getLocalDateString(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

// =====================================================
// FORMATAÇÃO DE RESULTADOS
// =====================================================

/**
 * Formatar valor de acordo com o formato definido
 */
export function formatCalculationResult(value: number, format: CalculationResultFormat): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)

    case 'percentage':
      return `${value.toFixed(1)}%`

    case 'number':
    default:
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  }
}

// =====================================================
// BUSCA E RESOLUÇÃO COMPLETA
// =====================================================

/**
 * Buscar cálculo por ID e resolver para KPI
 */
export async function resolveCalculationById(
  calculationId: string,
  fetchValue: (metricKey: string) => Promise<number>
): Promise<{ calculation: DashboardCalculation; value: number; formatted: string } | null> {
  const calculation = await getCalculationById(calculationId)
  if (!calculation) return null

  const value = await resolveCalculation(calculation.formula, fetchValue)
  const formatted = formatCalculationResult(value, calculation.result_format)

  return { calculation, value, formatted }
}

// =====================================================
// VALIDAÇÃO DE FÓRMULAS
// =====================================================

/**
 * Validar se uma fórmula é estruturalmente válida
 */
export function validateFormula(node: CalculationNode | null): { valid: boolean; error?: string } {
  if (!node) {
    return { valid: false, error: 'Fórmula vazia' }
  }

  switch (node.type) {
    case 'constant':
      if (node.value === undefined || node.value === null) {
        return { valid: false, error: 'Valor constante não definido' }
      }
      return { valid: true }

    case 'metric':
      if (!node.metricKey) {
        return { valid: false, error: 'Métrica não selecionada' }
      }
      return { valid: true }

    case 'custom_field':
      if (!node.customFieldId) {
        return { valid: false, error: 'Campo personalizado não selecionado' }
      }
      return { valid: true }

    case 'variable':
      if (!node.variableId) {
        return { valid: false, error: 'Variável não selecionada' }
      }
      return { valid: true }

    case 'operation': {
      if (!node.operator) {
        return { valid: false, error: 'Operador não definido' }
      }
      if (!node.left) {
        return { valid: false, error: 'Lado esquerdo da operação está vazio' }
      }
      if (!node.right) {
        return { valid: false, error: 'Lado direito da operação está vazio' }
      }

      const leftResult = validateFormula(node.left)
      if (!leftResult.valid) return leftResult

      const rightResult = validateFormula(node.right)
      if (!rightResult.valid) return rightResult

      return { valid: true }
    }

    default:
      return { valid: false, error: 'Tipo de node desconhecido' }
  }
}

/**
 * Converter fórmula em texto legível
 */
export function formulaToText(
  node: CalculationNode,
  metricLabels: Record<string, string>,
  variableNames?: Record<string, string>
): string {
  switch (node.type) {
    case 'constant':
      return String(node.value ?? 0)

    case 'variable':
      return variableNames?.[node.variableId || ''] || 'Variável'

    case 'metric':
      return metricLabels[node.metricKey || ''] || node.metricKey || '???'

    case 'custom_field':
      return metricLabels[`custom_field_${node.customFieldId}`] || 'Campo personalizado'

    case 'operation': {
      if (!node.left || !node.right) return '???'
      const left = formulaToText(node.left, metricLabels, variableNames)
      const right = formulaToText(node.right, metricLabels, variableNames)
      const op = node.operator || '?'

      // Adicionar parênteses se operação aninhada
      const needsParens = (child: CalculationNode) =>
        child.type === 'operation' &&
        (op === '*' || op === '/') &&
        (child.operator === '+' || child.operator === '-')

      const leftStr = needsParens(node.left) ? `(${left})` : left
      const rightStr = needsParens(node.right) ? `(${right})` : right

      const opMap: Record<string, string> = { '+': '+', '-': '-', '*': '×', '/': '÷' }
      const opSymbol = opMap[op] || op
      return `${leftStr} ${opSymbol} ${rightStr}`
    }

    default:
      return '???'
  }
}
