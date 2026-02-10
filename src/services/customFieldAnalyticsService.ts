import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { LeadCustomField, AnalyticsPeriod } from '../types'

// Tipos de filtro de status
export type StatusFilter = 'all' | 'active' | 'sold' | 'lost'

// Resultado de distribuição
export interface DistributionResult {
  name: string
  value: number
  percentage: number
}

// Resultado de estatísticas numéricas
export interface NumericStatsResult {
  total: number
  average: number
  min: number
  max: number
  count: number
}

// Resultado de evolução temporal
export interface TimeSeriesResult {
  date: string
  value: number
  count: number
}

// Resultado de tabela
export interface TableResult {
  lead_id: string
  lead_name: string
  lead_status: string
  field_value: string
  created_at: string
}

/**
 * Buscar campos personalizados globais (pipeline_id = null)
 */
export async function getGlobalCustomFields(): Promise<LeadCustomField[]> {
  const empresaId = await getUserEmpresaId()

  const { data, error } = await supabase
    .from('lead_custom_fields')
    .select('*')
    .eq('empresa_id', empresaId)
    .is('pipeline_id', null)
    .order('position', { ascending: true })

  if (error) {
    console.error('Erro ao buscar campos personalizados:', error)
    return []
  }

  return data || []
}

/**
 * Buscar leads com valores de campo personalizado
 * @param fieldType - Quando 'date', o filtro de período usa o valor do campo em vez do created_at
 */
async function getLeadsWithCustomFieldValues(
  fieldId: string,
  period: AnalyticsPeriod,
  statusFilter: StatusFilter = 'all',
  fieldType?: string
): Promise<Array<{
  lead_id: string
  lead_name: string
  lead_status: string
  lead_created_at: string
  field_value: string
}>> {
  const empresaId = await getUserEmpresaId()

  // Construir timestamps em UTC explícito para comparação correta
  const startUtc = new Date(`${period.start}T00:00:00Z`).getTime()
  const endUtc = new Date(`${period.end}T23:59:59.999Z`).getTime()

  // Buscar valores do campo com informações do lead
  const { data, error } = await supabase
    .from('lead_custom_values')
    .select(`
      value,
      lead:leads!inner(
        id,
        name,
        status,
        created_at,
        empresa_id
      )
    `)
    .eq('field_id', fieldId)

  if (error) {
    console.error('Erro ao buscar valores do campo:', error)
    return []
  }

  const isDateField = fieldType === 'date'

  // Filtrar por empresa, período e status
  const filtered = (data || [])
    .filter((item: any) => {
      const lead = item.lead
      if (!lead || lead.empresa_id !== empresaId) return false

      // Filtro de período
      if (isDateField) {
        // Para campos do tipo data, filtrar pelo valor do campo
        const fieldValueMs = new Date(item.value).getTime()
        if (isNaN(fieldValueMs)) return true // Se não for data válida, incluir
        if (fieldValueMs < startUtc || fieldValueMs > endUtc) return false
      } else {
        // Para outros campos, filtrar pelo created_at do lead
        const createdAtMs = new Date(lead.created_at).getTime()
        if (createdAtMs < startUtc || createdAtMs > endUtc) return false
      }

      // Filtro de status
      if (statusFilter === 'sold' && lead.status !== 'venda_confirmada') return false
      if (statusFilter === 'lost' && lead.status !== 'perdido') return false
      if (statusFilter === 'active' && (lead.status === 'venda_confirmada' || lead.status === 'perdido')) return false

      return true
    })
    .map((item: any) => ({
      lead_id: item.lead.id,
      lead_name: item.lead.name,
      lead_status: item.lead.status,
      lead_created_at: item.lead.created_at,
      field_value: item.value
    }))

  return filtered
}

/**
 * Distribuição de valores para campos select/multiselect
 */
export async function getCustomFieldDistribution(
  fieldId: string,
  period: AnalyticsPeriod,
  statusFilter: StatusFilter = 'all',
  fieldType?: string
): Promise<DistributionResult[]> {
  const values = await getLeadsWithCustomFieldValues(fieldId, period, statusFilter, fieldType)

  // Contar ocorrências de cada valor
  const counts: Record<string, number> = {}
  
  values.forEach(item => {
    // Para multiselect, o valor pode ser um JSON array
    let fieldValues: string[] = []
    try {
      const parsed = JSON.parse(item.field_value)
      if (Array.isArray(parsed)) {
        fieldValues = parsed
      } else {
        fieldValues = [item.field_value]
      }
    } catch {
      fieldValues = [item.field_value]
    }

    fieldValues.forEach(val => {
      const trimmedVal = val.trim()
      if (trimmedVal) {
        counts[trimmedVal] = (counts[trimmedVal] || 0) + 1
      }
    })
  })

  // Calcular total e percentuais
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

  const results: DistributionResult[] = Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)

  return results
}

/**
 * Estatísticas para campos numéricos
 */
export async function getCustomFieldStats(
  fieldId: string,
  period: AnalyticsPeriod,
  statusFilter: StatusFilter = 'all',
  fieldType?: string
): Promise<NumericStatsResult> {
  const values = await getLeadsWithCustomFieldValues(fieldId, period, statusFilter, fieldType)

  // Converter valores para números
  const numbers = values
    .map(item => parseFloat(item.field_value))
    .filter(num => !isNaN(num))

  if (numbers.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0, count: 0 }
  }

  const total = numbers.reduce((sum, num) => sum + num, 0)
  const average = total / numbers.length
  const min = Math.min(...numbers)
  const max = Math.max(...numbers)

  return {
    total,
    average,
    min,
    max,
    count: numbers.length
  }
}

/**
 * Evolução temporal para campos de data ou numéricos
 */
export async function getCustomFieldOverTime(
  fieldId: string,
  period: AnalyticsPeriod,
  statusFilter: StatusFilter = 'all',
  fieldType: 'date' | 'number' = 'number'
): Promise<TimeSeriesResult[]> {
  const values = await getLeadsWithCustomFieldValues(fieldId, period, statusFilter, fieldType)

  // Agrupar por data de criação do lead
  const byDate: Record<string, { sum: number; count: number }> = {}

  values.forEach(item => {
    const date = item.lead_created_at.split('T')[0] // YYYY-MM-DD

    if (!byDate[date]) {
      byDate[date] = { sum: 0, count: 0 }
    }

    if (fieldType === 'number') {
      const num = parseFloat(item.field_value)
      if (!isNaN(num)) {
        byDate[date].sum += num
        byDate[date].count += 1
      }
    } else {
      // Para campos date, apenas contar
      byDate[date].count += 1
    }
  })

  // Converter para array ordenado
  const results: TimeSeriesResult[] = Object.entries(byDate)
    .map(([date, data]) => ({
      date,
      value: fieldType === 'number' ? data.sum : data.count,
      count: data.count
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return results
}

/**
 * Tabela detalhada de valores
 */
export async function getCustomFieldTable(
  fieldId: string,
  period: AnalyticsPeriod,
  statusFilter: StatusFilter = 'all',
  fieldType?: string
): Promise<TableResult[]> {
  const values = await getLeadsWithCustomFieldValues(fieldId, period, statusFilter, fieldType)

  return values.map(item => ({
    lead_id: item.lead_id,
    lead_name: item.lead_name,
    lead_status: item.lead_status,
    field_value: item.field_value,
    created_at: item.lead_created_at
  }))
}

/**
 * Obter informações de um campo específico
 */
export async function getCustomFieldById(fieldId: string): Promise<LeadCustomField | null> {
  const { data, error } = await supabase
    .from('lead_custom_fields')
    .select('*')
    .eq('id', fieldId)
    .single()

  if (error) {
    console.error('Erro ao buscar campo:', error)
    return null
  }

  return data
}
