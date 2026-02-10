import { supabase } from './supabaseClient'
import type {
  CustomDashboard,
  CreateCustomDashboardData,
  UpdateCustomDashboardData,
  DashboardWidget,
  CreateDashboardWidgetData,
  UpdateDashboardWidgetData,
  DashboardShare,
  CreateDashboardShareData,
  UpdateDashboardShareData,
  Profile
} from '../types'

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Ordenar widgets por posição (position_y, depois position_x)
 * Garante que a ordem de renderização corresponda à posição salva
 */
function sortWidgetsByPosition<T extends { position_y: number; position_x: number }>(widgets: T[]): T[] {
  return [...widgets].sort((a, b) => {
    if (a.position_y !== b.position_y) return a.position_y - b.position_y
    return a.position_x - b.position_x
  })
}

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
// CRUD DE DASHBOARDS
// =====================================================

/**
 * Buscar todos os dashboards do usuário (próprios + compartilhados)
 */
export async function getCustomDashboards(): Promise<CustomDashboard[]> {
  const userId = await getCurrentUserId()
  const empresaId = await getUserEmpresaId()

  // Buscar dashboards onde o usuário é criador ou tem compartilhamento
  const { data, error } = await supabase
    .from('custom_dashboards')
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email),
      widgets:dashboard_widgets(*),
      shares:dashboard_shares(
        *,
        shared_with_user:profiles!shared_with_user_id(uuid, full_name, email)
      )
    `)
    .eq('empresa_id', empresaId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar dashboards:', error)
    throw new Error('Erro ao buscar dashboards personalizados')
  }

  // Filtrar e adicionar permissão do usuário atual
  const dashboards = (data || []).map(dashboard => {
    let userPermission: 'owner' | 'view' | 'edit' = 'view'
    
    if (dashboard.created_by === userId) {
      userPermission = 'owner'
    } else {
      // Verificar compartilhamento
      const share = dashboard.shares?.find(
        (s: DashboardShare) => s.shared_with_user_id === userId || s.shared_with_all
      )
      if (share) {
        userPermission = share.permission
      }
    }

    return {
      ...dashboard,
      widgets: dashboard.widgets ? sortWidgetsByPosition(dashboard.widgets) : [],
      user_permission: userPermission
    }
  }).filter(dashboard => {
    // Filtrar apenas dashboards que o usuário pode ver
    if (dashboard.created_by === userId) return true
    return dashboard.shares?.some(
      (s: DashboardShare) => s.shared_with_user_id === userId || s.shared_with_all
    )
  })

  return dashboards
}

/**
 * Buscar dashboard por ID
 */
export async function getCustomDashboardById(id: string): Promise<CustomDashboard | null> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('custom_dashboards')
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email),
      widgets:dashboard_widgets(*),
      shares:dashboard_shares(
        *,
        shared_with_user:profiles!shared_with_user_id(uuid, full_name, email)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar dashboard:', error)
    return null
  }

  // Determinar permissão do usuário
  let userPermission: 'owner' | 'view' | 'edit' = 'view'
  
  if (data.created_by === userId) {
    userPermission = 'owner'
  } else {
    const share = data.shares?.find(
      (s: DashboardShare) => s.shared_with_user_id === userId || s.shared_with_all
    )
    if (share) {
      userPermission = share.permission
    }
  }

  return {
    ...data,
    widgets: data.widgets ? sortWidgetsByPosition(data.widgets) : [],
    user_permission: userPermission
  }
}

/**
 * Criar novo dashboard
 */
export async function createCustomDashboard(
  data: CreateCustomDashboardData
): Promise<CustomDashboard> {
  const userId = await getCurrentUserId()
  const empresaId = await getUserEmpresaId()

  // Se is_default, remover default de outros dashboards
  if (data.is_default) {
    await supabase
      .from('custom_dashboards')
      .update({ is_default: false })
      .eq('created_by', userId)
      .eq('is_default', true)
  }

  const dashboardData = {
    empresa_id: empresaId,
    created_by: userId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    is_default: data.is_default || false
  }

  const { data: newDashboard, error } = await supabase
    .from('custom_dashboards')
    .insert([dashboardData])
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email)
    `)
    .single()

  if (error) {
    console.error('Erro ao criar dashboard:', error)
    throw new Error('Erro ao criar dashboard')
  }

  return {
    ...newDashboard,
    widgets: [],
    shares: [],
    user_permission: 'owner'
  }
}

/**
 * Atualizar dashboard
 */
export async function updateCustomDashboard(
  id: string,
  data: UpdateCustomDashboardData
): Promise<CustomDashboard> {
  const userId = await getCurrentUserId()

  // Se is_default, remover default de outros dashboards
  if (data.is_default) {
    await supabase
      .from('custom_dashboards')
      .update({ is_default: false })
      .eq('created_by', userId)
      .eq('is_default', true)
      .neq('id', id)
  }

  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.description !== undefined) updateData.description = data.description?.trim() || null
  if (data.is_default !== undefined) updateData.is_default = data.is_default

  const { data: updated, error } = await supabase
    .from('custom_dashboards')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email),
      widgets:dashboard_widgets(*),
      shares:dashboard_shares(
        *,
        shared_with_user:profiles!shared_with_user_id(uuid, full_name, email)
      )
    `)
    .single()

  if (error) {
    console.error('Erro ao atualizar dashboard:', error)
    throw new Error('Erro ao atualizar dashboard')
  }

  return {
    ...updated,
    widgets: updated.widgets ? sortWidgetsByPosition(updated.widgets) : [],
    user_permission: updated.created_by === userId ? 'owner' : 'edit'
  }
}

/**
 * Deletar dashboard
 */
export async function deleteCustomDashboard(id: string): Promise<void> {
  const { error } = await supabase
    .from('custom_dashboards')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar dashboard:', error)
    throw new Error('Erro ao deletar dashboard')
  }
}

/**
 * Duplicar dashboard
 */
export async function duplicateCustomDashboard(id: string): Promise<CustomDashboard> {
  const original = await getCustomDashboardById(id)
  if (!original) throw new Error('Dashboard não encontrado')

  // Criar novo dashboard
  const newDashboard = await createCustomDashboard({
    name: `${original.name} (Cópia)`,
    description: original.description,
    is_default: false
  })

  // Copiar widgets
  if (original.widgets && original.widgets.length > 0) {
    const widgetsToCreate = original.widgets.map(widget => ({
      dashboard_id: newDashboard.id,
      widget_type: widget.widget_type,
      metric_key: widget.metric_key,
      title: widget.title,
      config: widget.config,
      position_x: widget.position_x,
      position_y: widget.position_y,
      width: widget.width,
      height: widget.height
    }))

    await supabase
      .from('dashboard_widgets')
      .insert(widgetsToCreate)
  }

  // Buscar dashboard atualizado com widgets
  return (await getCustomDashboardById(newDashboard.id))!
}

// =====================================================
// CRUD DE WIDGETS
// =====================================================

/**
 * Buscar widgets de um dashboard
 */
export async function getDashboardWidgets(dashboardId: string): Promise<DashboardWidget[]> {
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .eq('dashboard_id', dashboardId)
    .order('position_y', { ascending: true })
    .order('position_x', { ascending: true })

  if (error) {
    console.error('Erro ao buscar widgets:', error)
    throw new Error('Erro ao buscar widgets do dashboard')
  }

  return data || []
}

/**
 * Criar widget
 */
export async function createDashboardWidget(
  data: CreateDashboardWidgetData
): Promise<DashboardWidget> {
  const widgetData = {
    dashboard_id: data.dashboard_id,
    widget_type: data.widget_type,
    metric_key: data.metric_key,
    title: data.title.trim(),
    config: data.config || {},
    position_x: data.position_x ?? 0,
    position_y: data.position_y ?? 0,
    width: data.width ?? 2,
    height: data.height ?? 2
  }

  const { data: newWidget, error } = await supabase
    .from('dashboard_widgets')
    .insert([widgetData])
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao criar widget:', error)
    throw new Error('Erro ao criar widget')
  }

  return newWidget
}

/**
 * Atualizar widget
 */
export async function updateDashboardWidget(
  id: string,
  data: UpdateDashboardWidgetData
): Promise<DashboardWidget> {
  const updateData: Record<string, unknown> = {}

  if (data.widget_type !== undefined) updateData.widget_type = data.widget_type
  if (data.metric_key !== undefined) updateData.metric_key = data.metric_key
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.config !== undefined) updateData.config = data.config
  if (data.position_x !== undefined) updateData.position_x = data.position_x
  if (data.position_y !== undefined) updateData.position_y = data.position_y
  if (data.width !== undefined) updateData.width = data.width
  if (data.height !== undefined) updateData.height = data.height

  const { data: updated, error } = await supabase
    .from('dashboard_widgets')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao atualizar widget:', error)
    throw new Error('Erro ao atualizar widget')
  }

  return updated
}

/**
 * Atualizar posições de múltiplos widgets (batch)
 */
export async function updateWidgetPositions(
  widgets: Array<{ id: string; position_x: number; position_y: number; width: number; height: number }>
): Promise<void> {
  // Atualizar cada widget individualmente (Supabase não suporta batch update com diferentes valores)
  const updates = widgets.map(widget =>
    supabase
      .from('dashboard_widgets')
      .update({
        position_x: widget.position_x,
        position_y: widget.position_y,
        width: widget.width,
        height: widget.height
      })
      .eq('id', widget.id)
  )

  await Promise.all(updates)
}

/**
 * Deletar widget
 */
export async function deleteDashboardWidget(id: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_widgets')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar widget:', error)
    throw new Error('Erro ao deletar widget')
  }
}

// =====================================================
// CRUD DE COMPARTILHAMENTOS
// =====================================================

/**
 * Buscar compartilhamentos de um dashboard
 */
export async function getDashboardShares(dashboardId: string): Promise<DashboardShare[]> {
  const { data, error } = await supabase
    .from('dashboard_shares')
    .select(`
      *,
      shared_with_user:profiles!shared_with_user_id(uuid, full_name, email)
    `)
    .eq('dashboard_id', dashboardId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar compartilhamentos:', error)
    throw new Error('Erro ao buscar compartilhamentos')
  }

  return data || []
}

/**
 * Criar compartilhamento
 */
export async function createDashboardShare(
  data: CreateDashboardShareData
): Promise<DashboardShare> {
  const shareData = {
    dashboard_id: data.dashboard_id,
    shared_with_user_id: data.shared_with_user_id || null,
    shared_with_all: data.shared_with_all || false,
    permission: data.permission
  }

  const { data: newShare, error } = await supabase
    .from('dashboard_shares')
    .insert([shareData])
    .select(`
      *,
      shared_with_user:profiles!shared_with_user_id(uuid, full_name, email)
    `)
    .single()

  if (error) {
    console.error('Erro ao criar compartilhamento:', error)
    throw new Error('Erro ao criar compartilhamento')
  }

  return newShare
}

/**
 * Atualizar permissão de compartilhamento
 */
export async function updateDashboardShare(
  id: string,
  data: UpdateDashboardShareData
): Promise<DashboardShare> {
  const { data: updated, error } = await supabase
    .from('dashboard_shares')
    .update({ permission: data.permission })
    .eq('id', id)
    .select(`
      *,
      shared_with_user:profiles!shared_with_user_id(uuid, full_name, email)
    `)
    .single()

  if (error) {
    console.error('Erro ao atualizar compartilhamento:', error)
    throw new Error('Erro ao atualizar compartilhamento')
  }

  return updated
}

/**
 * Remover compartilhamento
 */
export async function deleteDashboardShare(id: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_shares')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao remover compartilhamento:', error)
    throw new Error('Erro ao remover compartilhamento')
  }
}

/**
 * Compartilhar com toda a empresa
 */
export async function shareWithCompany(
  dashboardId: string,
  permission: 'view' | 'edit'
): Promise<DashboardShare> {
  // Verificar se já existe compartilhamento com toda empresa
  const { data: existing } = await supabase
    .from('dashboard_shares')
    .select('id')
    .eq('dashboard_id', dashboardId)
    .eq('shared_with_all', true)
    .single()

  if (existing) {
    // Atualizar
    return updateDashboardShare(existing.id, { permission })
  }

  // Criar novo
  return createDashboardShare({
    dashboard_id: dashboardId,
    shared_with_all: true,
    permission
  })
}

/**
 * Remover compartilhamento com toda a empresa
 */
export async function unshareWithCompany(dashboardId: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_shares')
    .delete()
    .eq('dashboard_id', dashboardId)
    .eq('shared_with_all', true)

  if (error) {
    console.error('Erro ao remover compartilhamento com empresa:', error)
    throw new Error('Erro ao remover compartilhamento')
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Buscar usuários da empresa para compartilhar
 */
export async function getCompanyUsersForSharing(dashboardId: string): Promise<Profile[]> {
  const userId = await getCurrentUserId()
  const empresaId = await getUserEmpresaId()

  // Buscar todos usuários da empresa
  const { data: users, error } = await supabase
    .from('profiles')
    .select('uuid, full_name, email')
    .eq('empresa_id', empresaId)
    .neq('uuid', userId)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar usuários:', error)
    throw new Error('Erro ao buscar usuários')
  }

  // Buscar compartilhamentos existentes
  const { data: shares } = await supabase
    .from('dashboard_shares')
    .select('shared_with_user_id')
    .eq('dashboard_id', dashboardId)

  const sharedIds = new Set(shares?.map(s => s.shared_with_user_id) || [])

  // Filtrar usuários que ainda não têm compartilhamento
  return (users || []).filter(u => !sharedIds.has(u.uuid)) as Profile[]
}

/**
 * Definir dashboard como padrão
 */
export async function setDefaultDashboard(id: string): Promise<void> {
  const userId = await getCurrentUserId()

  // Remover default de outros dashboards
  await supabase
    .from('custom_dashboards')
    .update({ is_default: false })
    .eq('created_by', userId)
    .eq('is_default', true)

  // Definir o novo default
  await supabase
    .from('custom_dashboards')
    .update({ is_default: true })
    .eq('id', id)
}

/**
 * Buscar dashboard padrão do usuário
 */
export async function getDefaultDashboard(): Promise<CustomDashboard | null> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('custom_dashboards')
    .select(`
      *,
      created_user:profiles!created_by(uuid, full_name, email),
      widgets:dashboard_widgets(*),
      shares:dashboard_shares(
        *,
        shared_with_user:profiles!shared_with_user_id(uuid, full_name, email)
      )
    `)
    .eq('created_by', userId)
    .eq('is_default', true)
    .single()

  if (error || !data) {
    return null
  }

  return {
    ...data,
    widgets: data.widgets ? sortWidgetsByPosition(data.widgets) : [],
    user_permission: 'owner'
  }
}
