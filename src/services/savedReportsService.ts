import { supabase } from './supabaseClient'
import type {
  SavedReport,
  CreateSavedReportData,
  UpdateSavedReportData,
  AnalyticsPermission,
  AnalyticsPermissionData
} from '../types'

/**
 * Obter empresa_id do usuário autenticado
 */
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

/**
 * Obter user_id do usuário autenticado
 */
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')
  return user.id
}

// =====================================================
// CRUD DE RELATÓRIOS SALVOS
// =====================================================

/**
 * Buscar todos os relatórios do usuário
 */
export async function getSavedReports(includeShared = true): Promise<SavedReport[]> {
  const userId = await getCurrentUserId()
  const empresaId = await getUserEmpresaId()

  let query = supabase
    .from('saved_reports')
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email)
    `)
    .order('updated_at', { ascending: false })

  if (includeShared) {
    query = query.or(`created_by.eq.${userId},and(is_shared.eq.true,empresa_id.eq.${empresaId})`)
  } else {
    query = query.eq('created_by', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar relatórios:', error)
    throw new Error('Erro ao buscar relatórios salvos')
  }

  return data || []
}

/**
 * Buscar apenas relatórios favoritos
 */
export async function getFavoriteReports(): Promise<SavedReport[]> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('saved_reports')
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email)
    `)
    .eq('created_by', userId)
    .eq('is_favorite', true)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar favoritos:', error)
    throw new Error('Erro ao buscar relatórios favoritos')
  }

  return data || []
}

/**
 * Buscar relatório por ID
 */
export async function getSavedReportById(id: string): Promise<SavedReport | null> {
  const { data, error } = await supabase
    .from('saved_reports')
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar relatório:', error)
    return null
  }

  // Atualizar last_viewed_at
  await supabase
    .from('saved_reports')
    .update({ last_viewed_at: new Date().toISOString() })
    .eq('id', id)

  return data
}

/**
 * Criar novo relatório
 */
export async function createSavedReport(
  data: CreateSavedReportData
): Promise<SavedReport> {
  const userId = await getCurrentUserId()
  const empresaId = await getUserEmpresaId()

  const reportData = {
    empresa_id: empresaId,
    created_by: userId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    config: data.config,
    is_favorite: data.is_favorite || false,
    is_shared: data.is_shared || false
  }

  const { data: newReport, error } = await supabase
    .from('saved_reports')
    .insert([reportData])
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email)
    `)
    .single()

  if (error) {
    console.error('Erro ao criar relatório:', error)
    throw new Error('Erro ao criar relatório')
  }

  return newReport
}

/**
 * Atualizar relatório existente
 */
export async function updateSavedReport(
  id: string,
  data: UpdateSavedReportData
): Promise<SavedReport> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.description !== undefined) updateData.description = data.description?.trim() || null
  if (data.config !== undefined) updateData.config = data.config
  if (data.is_favorite !== undefined) updateData.is_favorite = data.is_favorite
  if (data.is_shared !== undefined) updateData.is_shared = data.is_shared

  const { data: updatedReport, error } = await supabase
    .from('saved_reports')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email)
    `)
    .single()

  if (error) {
    console.error('Erro ao atualizar relatório:', error)
    throw new Error('Erro ao atualizar relatório')
  }

  return updatedReport
}

/**
 * Deletar relatório
 */
export async function deleteSavedReport(id: string): Promise<void> {
  const { error } = await supabase
    .from('saved_reports')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar relatório:', error)
    throw new Error('Erro ao deletar relatório')
  }
}

/**
 * Toggle favorito
 */
export async function toggleFavorite(id: string): Promise<SavedReport> {
  const report = await getSavedReportById(id)
  if (!report) throw new Error('Relatório não encontrado')

  return updateSavedReport(id, {
    is_favorite: !report.is_favorite
  })
}

/**
 * Toggle compartilhamento
 */
export async function toggleShared(id: string): Promise<SavedReport> {
  const report = await getSavedReportById(id)
  if (!report) throw new Error('Relatório não encontrado')

  return updateSavedReport(id, {
    is_shared: !report.is_shared
  })
}

/**
 * Duplicar relatório
 */
export async function duplicateSavedReport(id: string): Promise<SavedReport> {
  const original = await getSavedReportById(id)
  if (!original) throw new Error('Relatório não encontrado')

  return createSavedReport({
    name: `${original.name} (Cópia)`,
    description: original.description,
    config: original.config,
    is_favorite: false,
    is_shared: false
  })
}

// =====================================================
// GERENCIAMENTO DE PERMISSÕES
// =====================================================

/**
 * Verificar se usuário tem permissão de analytics
 */
export async function checkAnalyticsPermission(): Promise<boolean> {
  const userId = await getCurrentUserId()

  // Verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('uuid', userId)
    .single()

  if (profile?.is_admin) return true

  // Verificar permissão explícita
  const { data } = await supabase
    .from('analytics_permissions')
    .select('granted')
    .eq('user_id', userId)
    .single()

  return data?.granted || false
}

/**
 * Buscar todas as permissões da empresa
 */
export async function getAnalyticsPermissions(): Promise<AnalyticsPermission[]> {
  const empresaId = await getUserEmpresaId()

  const { data, error } = await supabase
    .from('analytics_permissions')
    .select(`
      *,
      user:profiles!user_id(uuid, full_name, email),
      granted_by_user:profiles!granted_by(uuid, full_name, email)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar permissões:', error)
    throw new Error('Erro ao buscar permissões de analytics')
  }

  return data || []
}

/**
 * Conceder ou revogar permissão de analytics
 */
export async function setAnalyticsPermission(
  data: AnalyticsPermissionData
): Promise<AnalyticsPermission> {
  const empresaId = await getUserEmpresaId()
  const grantedBy = await getCurrentUserId()

  // Verificar se já existe
  const { data: existing } = await supabase
    .from('analytics_permissions')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('user_id', data.user_id)
    .single()

  if (existing) {
    // Atualizar
    const { data: updated, error } = await supabase
      .from('analytics_permissions')
      .update({
        granted: data.granted,
        granted_by: grantedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select(`
        *,
        user:profiles!user_id(uuid, full_name, email),
        granted_by_user:profiles!granted_by(uuid, full_name, email)
      `)
      .single()

    if (error) throw new Error('Erro ao atualizar permissão')
    return updated
  } else {
    // Criar
    const { data: created, error } = await supabase
      .from('analytics_permissions')
      .insert([{
        empresa_id: empresaId,
        user_id: data.user_id,
        granted: data.granted,
        granted_by: grantedBy
      }])
      .select(`
        *,
        user:profiles!user_id(uuid, full_name, email),
        granted_by_user:profiles!granted_by(uuid, full_name, email)
      `)
      .single()

    if (error) throw new Error('Erro ao criar permissão')
    return created
  }
}

/**
 * Remover permissão de analytics
 */
export async function removeAnalyticsPermission(userId: string): Promise<void> {
  const empresaId = await getUserEmpresaId()

  const { error } = await supabase
    .from('analytics_permissions')
    .delete()
    .eq('empresa_id', empresaId)
    .eq('user_id', userId)

  if (error) {
    console.error('Erro ao remover permissão:', error)
    throw new Error('Erro ao remover permissão de analytics')
  }
}

/**
 * Buscar usuários da empresa sem permissão de analytics
 */
export async function getUsersWithoutAnalyticsPermission(): Promise<any[]> {
  const empresaId = await getUserEmpresaId()

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('uuid, full_name, email, is_admin')
    .eq('empresa_id', empresaId)

  const { data: withPermission } = await supabase
    .from('analytics_permissions')
    .select('user_id')
    .eq('empresa_id', empresaId)
    .eq('granted', true)

  const permissionIds = new Set(withPermission?.map(p => p.user_id) || [])

  return (allUsers || [])
    .filter(user => !user.is_admin && !permissionIds.has(user.uuid))
    .map(user => ({
      uuid: user.uuid,
      full_name: user.full_name,
      email: user.email
    }))
}

