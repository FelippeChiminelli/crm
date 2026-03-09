import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { OriginInvestment, CreateOriginInvestmentData, UpdateOriginInvestmentData } from '../types'
import SecureLogger from '../utils/logger'

export async function getOriginInvestments(): Promise<OriginInvestment[]> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) return []

    const { data, error } = await supabase
      .from('origin_investments')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('origin', { ascending: true })
      .order('start_date', { ascending: true })

    if (error) {
      SecureLogger.error('Erro ao buscar investimentos por origem:', error)
      return []
    }

    return data || []
  } catch (error) {
    SecureLogger.error('Erro ao buscar investimentos por origem:', error)
    return []
  }
}

export async function getOriginInvestmentsByOrigin(origin: string): Promise<OriginInvestment[]> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) return []

    const { data, error } = await supabase
      .from('origin_investments')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('origin', origin)
      .order('start_date', { ascending: true })

    if (error) {
      SecureLogger.error('Erro ao buscar investimentos da origem:', error)
      return []
    }

    return data || []
  } catch (error) {
    SecureLogger.error('Erro ao buscar investimentos da origem:', error)
    return []
  }
}

export async function createOriginInvestment(
  investmentData: CreateOriginInvestmentData
): Promise<OriginInvestment | null> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('origin_investments')
      .insert({
        empresa_id: empresaId,
        origin: investmentData.origin.trim(),
        start_date: investmentData.start_date,
        end_date: investmentData.end_date,
        value: investmentData.value,
        notes: investmentData.notes?.trim() || null,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      SecureLogger.error('Erro ao criar investimento por origem:', error)
      return null
    }

    return data
  } catch (error) {
    SecureLogger.error('Erro ao criar investimento por origem:', error)
    return null
  }
}

export async function updateOriginInvestment(
  id: string,
  updates: UpdateOriginInvestmentData
): Promise<OriginInvestment | null> {
  try {
    const sanitized: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (updates.origin !== undefined) sanitized.origin = updates.origin.trim()
    if (updates.start_date !== undefined) sanitized.start_date = updates.start_date
    if (updates.end_date !== undefined) sanitized.end_date = updates.end_date
    if (updates.value !== undefined) sanitized.value = updates.value
    if (updates.notes !== undefined) sanitized.notes = updates.notes?.trim() || null

    const { data, error } = await supabase
      .from('origin_investments')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      SecureLogger.error('Erro ao atualizar investimento por origem:', error)
      return null
    }

    return data
  } catch (error) {
    SecureLogger.error('Erro ao atualizar investimento por origem:', error)
    return null
  }
}

export async function deleteOriginInvestment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('origin_investments')
      .delete()
      .eq('id', id)

    if (error) {
      SecureLogger.error('Erro ao excluir investimento por origem:', error)
      return false
    }

    return true
  } catch (error) {
    SecureLogger.error('Erro ao excluir investimento por origem:', error)
    return false
  }
}

function diffDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const ms = end.getTime() - start.getTime()
  return Math.max(Math.round(ms / (1000 * 60 * 60 * 24)) + 1, 1)
}

export async function getInvestmentsByPeriod(
  filterStart: string,
  filterEnd: string
): Promise<Map<string, number>> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) return new Map()

    const { data, error } = await supabase
      .from('origin_investments')
      .select('origin, start_date, end_date, value')
      .eq('empresa_id', empresaId)
      .lte('start_date', filterEnd)
      .gte('end_date', filterStart)

    if (error) {
      SecureLogger.error('Erro ao buscar investimentos por período:', error)
      return new Map()
    }

    const investmentMap = new Map<string, number>()

    for (const inv of data || []) {
      const periodDays = diffDays(inv.start_date, inv.end_date)
      const overlapStart = inv.start_date > filterStart ? inv.start_date : filterStart
      const overlapEnd = inv.end_date < filterEnd ? inv.end_date : filterEnd
      const overlapDays = diffDays(overlapStart, overlapEnd)
      const proportionalValue = (overlapDays / periodDays) * Number(inv.value)

      const current = investmentMap.get(inv.origin) || 0
      investmentMap.set(inv.origin, current + proportionalValue)
    }

    return investmentMap
  } catch (error) {
    SecureLogger.error('Erro ao buscar investimentos por período:', error)
    return new Map()
  }
}
