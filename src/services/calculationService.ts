import { supabase } from './supabaseClient'
import type {
  DashboardCalculation,
  CreateCalculationData,
  UpdateCalculationData,
  DashboardVariable,
  CreateVariableData,
  UpdateVariableData,
  VariablePeriod
} from '../types'

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

async function getUserEmpresaId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('uuid', user.id)
    .single()

  if (!profile?.empresa_id) throw new Error('Empresa não encontrada')
  return profile.empresa_id
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')
  return user.id
}

// =====================================================
// CRUD DE CÁLCULOS
// =====================================================

/**
 * Listar todos os cálculos da empresa
 */
export async function getCalculations(): Promise<DashboardCalculation[]> {
  const empresaId = await getUserEmpresaId()

  const { data, error } = await supabase
    .from('dashboard_calculations')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar cálculos:', error)
    throw new Error('Erro ao buscar cálculos personalizados')
  }

  return data || []
}

/**
 * Obter cálculo por ID
 */
export async function getCalculationById(id: string): Promise<DashboardCalculation | null> {
  const { data, error } = await supabase
    .from('dashboard_calculations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Erro ao buscar cálculo:', error)
    throw new Error('Erro ao buscar cálculo')
  }

  return data
}

/**
 * Criar novo cálculo
 */
export async function createCalculation(data: CreateCalculationData): Promise<DashboardCalculation> {
  const empresaId = await getUserEmpresaId()
  const userId = await getCurrentUserId()

  const { data: created, error } = await supabase
    .from('dashboard_calculations')
    .insert({
      empresa_id: empresaId,
      created_by: userId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      formula: data.formula,
      result_format: data.result_format
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar cálculo:', error)
    throw new Error('Erro ao criar cálculo')
  }

  return created
}

/**
 * Atualizar cálculo existente
 */
export async function updateCalculation(
  id: string,
  data: UpdateCalculationData
): Promise<DashboardCalculation> {
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.description !== undefined) updateData.description = data.description?.trim() || null
  if (data.formula !== undefined) updateData.formula = data.formula
  if (data.result_format !== undefined) updateData.result_format = data.result_format

  const { data: updated, error } = await supabase
    .from('dashboard_calculations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar cálculo:', error)
    throw new Error('Erro ao atualizar cálculo')
  }

  return updated
}

/**
 * Deletar cálculo
 */
export async function deleteCalculation(id: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_calculations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar cálculo:', error)
    throw new Error('Erro ao deletar cálculo')
  }
}

// =====================================================
// CRUD DE VARIÁVEIS REUTILIZÁVEIS
// =====================================================

/**
 * Listar todas as variáveis da empresa
 */
export async function getVariables(): Promise<DashboardVariable[]> {
  const empresaId = await getUserEmpresaId()

  const { data, error } = await supabase
    .from('dashboard_variables')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar variáveis:', error)
    throw new Error('Erro ao buscar variáveis')
  }

  return data || []
}

/**
 * Obter variável por ID
 */
export async function getVariableById(id: string): Promise<DashboardVariable | null> {
  const { data, error } = await supabase
    .from('dashboard_variables')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Erro ao buscar variável:', error)
    throw new Error('Erro ao buscar variável')
  }

  return data
}

/**
 * Criar nova variável
 */
export async function createVariable(data: CreateVariableData): Promise<DashboardVariable> {
  const empresaId = await getUserEmpresaId()
  const userId = await getCurrentUserId()

  const { data: created, error } = await supabase
    .from('dashboard_variables')
    .insert({
      empresa_id: empresaId,
      created_by: userId,
      name: data.name.trim(),
      value: data.value,
      format: data.format || 'number',
      value_type: data.value_type || 'fixed',
      description: data.description?.trim() || null
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar variável:', error)
    throw new Error('Erro ao criar variável')
  }

  return created
}

/**
 * Atualizar variável existente
 */
export async function updateVariable(
  id: string,
  data: UpdateVariableData
): Promise<DashboardVariable> {
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.value !== undefined) updateData.value = data.value
  if (data.format !== undefined) updateData.format = data.format
  if (data.value_type !== undefined) updateData.value_type = data.value_type
  if (data.description !== undefined) updateData.description = data.description?.trim() || null

  const { data: updated, error } = await supabase
    .from('dashboard_variables')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar variável:', error)
    throw new Error('Erro ao atualizar variável')
  }

  return updated
}

/**
 * Deletar variável
 */
export async function deleteVariable(id: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_variables')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar variável:', error)
    throw new Error('Erro ao deletar variável')
  }
}

// =====================================================
// CRUD DE PERÍODOS DE VARIÁVEIS
// =====================================================

/**
 * Listar períodos de uma variável
 */
export async function getVariablePeriods(variableId: string): Promise<VariablePeriod[]> {
  const { data, error } = await supabase
    .from('dashboard_variable_periods')
    .select('*')
    .eq('variable_id', variableId)
    .order('start_date', { ascending: true })

  if (error) {
    console.error('Erro ao buscar períodos:', error)
    throw new Error('Erro ao buscar períodos da variável')
  }

  return data || []
}

/**
 * Criar ou atualizar período de variável
 */
export async function upsertVariablePeriod(
  variableId: string,
  data: { start_date: string; end_date: string; value: number },
  periodId?: string
): Promise<VariablePeriod> {
  if (periodId) {
    // Atualizar existente
    const { data: updated, error } = await supabase
      .from('dashboard_variable_periods')
      .update({
        start_date: data.start_date,
        end_date: data.end_date,
        value: data.value
      })
      .eq('id', periodId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar período:', error)
      throw new Error('Erro ao atualizar período')
    }
    return updated
  }

  // Criar novo
  const { data: created, error } = await supabase
    .from('dashboard_variable_periods')
    .insert({
      variable_id: variableId,
      start_date: data.start_date,
      end_date: data.end_date,
      value: data.value
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar período:', error)
    throw new Error('Erro ao criar período')
  }

  return created
}

/**
 * Deletar período de variável
 */
export async function deleteVariablePeriod(periodId: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_variable_periods')
    .delete()
    .eq('id', periodId)

  if (error) {
    console.error('Erro ao deletar período:', error)
    throw new Error('Erro ao deletar período')
  }
}

// =====================================================
// RESOLUÇÃO DE VALOR DE VARIÁVEL (FIXA OU PERIÓDICA)
// =====================================================

/** Retorna a diferença em dias entre duas datas (YYYY-MM-DD) */
function diffDays(a: string, b: string): number {
  const dateA = new Date(a + 'T00:00:00')
  const dateB = new Date(b + 'T00:00:00')
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24))
}

/** Adiciona N dias a uma data string YYYY-MM-DD */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Resolver o valor de uma variável considerando o período do filtro.
 * 
 * - Variável fixa: retorna variable.value diretamente
 * - Variável periódica: calcula proporcional ao número de dias no filtro
 *   - Para cada dia no filtro, busca o período correspondente
 *   - dailyValue = period.value / dias_do_período
 *   - Se não há período definido para um dia, esse dia contribui 0 ao total
 */
export async function resolveVariableValue(
  variable: DashboardVariable,
  filterStart: string,
  filterEnd: string
): Promise<number> {
  // Variável fixa: retorna valor direto
  if (variable.value_type !== 'periodic') {
    return Number(variable.value)
  }

  const periods = await getVariablePeriods(variable.id)
  const totalFilterDays = diffDays(filterStart, filterEnd) + 1

  if (totalFilterDays <= 0) return 0

  let totalValue = 0
  let currentDate = filterStart

  for (let i = 0; i < totalFilterDays; i++) {
    // Encontrar período que cobre este dia
    const matchingPeriod = periods.find(
      p => currentDate >= p.start_date && currentDate <= p.end_date
    )

    if (matchingPeriod) {
      const periodDays = diffDays(matchingPeriod.start_date, matchingPeriod.end_date) + 1
      totalValue += Number(matchingPeriod.value) / periodDays
    }
    // Dias sem período definido contribuem 0

    currentDate = addDays(currentDate, 1)
  }

  return totalValue
}
