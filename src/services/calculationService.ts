import { supabase } from './supabaseClient'
import type {
  DashboardCalculation,
  CreateCalculationData,
  UpdateCalculationData,
  DashboardVariable,
  CreateVariableData,
  UpdateVariableData
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
