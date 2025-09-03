import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { 
  Role, 
  Permission, 
  RoleWithPermissions, 
  CreateRoleData, 
  UpdateRoleData,
  PermissionModule,
  RoleStats,
  ProfileWithRole
} from '../types'

// ===========================================
// FUNÇÕES DE ROLES
// ===========================================

// Buscar todos os roles da empresa
export async function getRoles(): Promise<{ data: Role[] | null; error: any }> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      return { data: [], error: null }
    }

    const result = await supabase
      .from('roles')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    return result
  } catch (error) {
    console.error('❌ getRoles: Erro:', error)
    return { data: null, error }
  }
}

// Buscar role específico com permissões
export async function getRoleWithPermissions(roleId: string): Promise<{ data: RoleWithPermissions | null; error: any }> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      return { data: null, error: 'Empresa não encontrada' }
    }

    // Buscar role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .eq('empresa_id', empresaId)
      .single()

    if (roleError || !role) {
      return { data: null, error: roleError || 'Role não encontrado' }
    }

    // Buscar permissões do role
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          id,
          name,
          description,
          module,
          action,
          is_active,
          created_at
        )
      `)
      .eq('role_id', roleId)
      .eq('granted', true)

    if (permError) {
      return { data: null, error: permError }
    }

    const roleWithPermissions: RoleWithPermissions = {
      ...role,
      permissions: permissions?.map(p => p.permissions).filter(Boolean) || []
    }

    return { data: roleWithPermissions, error: null }
  } catch (error) {
    console.error('❌ getRoleWithPermissions: Erro:', error)
    return { data: null, error }
  }
}

// Criar novo role
export async function createRole(roleData: CreateRoleData): Promise<{ data: Role | null; error: any }> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      return { data: null, error: 'Empresa não encontrada' }
    }

    // Verificar se já existe role com mesmo nome
    const { data: existingRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleData.name)
      .eq('empresa_id', empresaId)
      .single()

    if (existingRole) {
      return { data: null, error: 'Já existe um role com este nome' }
    }

    // Criar role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name: roleData.name,
        description: roleData.description,
        empresa_id: empresaId,
        is_system_role: false,
        is_active: true
      })
      .select()
      .single()

    if (roleError || !role) {
      return { data: null, error: roleError || 'Erro ao criar role' }
    }

    // Atribuir permissões ao role
    if (roleData.permission_ids && roleData.permission_ids.length > 0) {
      const permissionEntries = roleData.permission_ids.map(permissionId => ({
        role_id: role.id,
        permission_id: permissionId,
        granted: true
      }))

      const { error: permError } = await supabase
        .from('role_permissions')
        .insert(permissionEntries)

      if (permError) {
        // Rollback - deletar role criado
        await supabase.from('roles').delete().eq('id', role.id)
        return { data: null, error: 'Erro ao atribuir permissões' }
      }
    }

    return { data: role, error: null }
  } catch (error) {
    console.error('❌ createRole: Erro:', error)
    return { data: null, error }
  }
}

// Atualizar role
export async function updateRole(roleId: string, updateData: UpdateRoleData): Promise<{ data: Role | null; error: any }> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      return { data: null, error: 'Empresa não encontrada' }
    }

    // Verificar se role existe e pertence à empresa
    const { data: existingRole } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .eq('empresa_id', empresaId)
      .single()

    if (!existingRole) {
      return { data: null, error: 'Role não encontrado' }
    }

    // Verificar se é role do sistema
    if (existingRole.is_system_role && (updateData.name || updateData.is_active === false)) {
      return { data: null, error: 'Não é possível modificar roles do sistema' }
    }

    // Atualizar role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .update({
        name: updateData.name,
        description: updateData.description,
        is_active: updateData.is_active
      })
      .eq('id', roleId)
      .eq('empresa_id', empresaId)
      .select()
      .single()

    if (roleError) {
      return { data: null, error: roleError }
    }

    // Atualizar permissões se fornecidas
    if (updateData.permission_ids) {
      // Remover permissões existentes
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      // Adicionar novas permissões
      if (updateData.permission_ids.length > 0) {
        const permissionEntries = updateData.permission_ids.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
          granted: true
        }))

        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(permissionEntries)

        if (permError) {
          return { data: null, error: 'Erro ao atualizar permissões' }
        }
      }
    }

    return { data: role, error: null }
  } catch (error) {
    console.error('❌ updateRole: Erro:', error)
    return { data: null, error }
  }
}

// Deletar role
export async function deleteRole(roleId: string): Promise<{ error: any }> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      return { error: 'Empresa não encontrada' }
    }

    // Verificar se role existe e não é do sistema
    const { data: role } = await supabase
      .from('roles')
      .select('is_system_role')
      .eq('id', roleId)
      .eq('empresa_id', empresaId)
      .single()

    if (!role) {
      return { error: 'Role não encontrado' }
    }

    if (role.is_system_role) {
      return { error: 'Não é possível deletar roles do sistema' }
    }

    // Verificar se há usuários usando este role
    const { data: usersWithRole } = await supabase
      .from('profiles')
      .select('uuid')
      .eq('role_id', roleId)
      .limit(1)

    if (usersWithRole && usersWithRole.length > 0) {
      return { error: 'Não é possível deletar role que está sendo usado por usuários' }
    }

    // Deletar role (cascata remove permissões)
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)
      .eq('empresa_id', empresaId)

    return { error }
  } catch (error) {
    console.error('❌ deleteRole: Erro:', error)
    return { error }
  }
}

// ===========================================
// FUNÇÕES DE PERMISSÕES
// ===========================================

// Buscar todas as permissões disponíveis
export async function getPermissions(): Promise<{ data: Permission[] | null; error: any }> {
  try {
    const result = await supabase
      .from('permissions')
      .select('*')
      .eq('is_active', true)
      .order('module', { ascending: true })
      .order('action', { ascending: true })

    return result
  } catch (error) {
    console.error('❌ getPermissions: Erro:', error)
    return { data: null, error }
  }
}

// Buscar permissões agrupadas por módulo
export async function getPermissionsByModule(): Promise<{ data: PermissionModule[] | null; error: any }> {
  try {
    const { data: permissions, error } = await getPermissions()
    if (error || !permissions) {
      return { data: null, error }
    }

    // Agrupar por módulo
    const modules: { [key: string]: PermissionModule } = {}
    
    permissions.forEach(permission => {
      if (!modules[permission.module]) {
        modules[permission.module] = {
          name: permission.module,
          label: getModuleLabel(permission.module),
          permissions: []
        }
      }
      modules[permission.module].permissions.push(permission)
    })

    return { data: Object.values(modules), error: null }
  } catch (error) {
    console.error('❌ getPermissionsByModule: Erro:', error)
    return { data: null, error }
  }
}

// Verificar se usuário tem permissão específica
export async function userHasPermission(permissionName: string): Promise<boolean> {
  try {
    const { data: result } = await supabase.rpc('user_has_permission', {
      permission_name: permissionName
    })

    return result || false
  } catch (error) {
    console.error('❌ userHasPermission: Erro:', error)
    return false
  }
}

// Buscar permissões do usuário atual
export async function getUserPermissions(): Promise<{ data: Permission[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [], error: 'Usuário não autenticado' }
    }

    // Primeiro verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role_id')
      .eq('uuid', user.id)
      .single()

    if (!profile) {
      return { data: [], error: 'Perfil não encontrado' }
    }

    // Se é admin, retorna todas as permissões
    if (profile.is_admin) {
      return await getPermissions()
    }

    // Buscar permissões do role do usuário
    if (!profile.role_id) {
      return { data: [], error: null }
    }

    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          id,
          name,
          description,
          module,
          action,
          is_active,
          created_at
        )
      `)
      .eq('role_id', profile.role_id)
      .eq('granted', true)

    if (error) {
      return { data: null, error }
    }

    const userPermissions = permissions?.map(p => p.permissions).filter(Boolean).flat() || []
    return { data: userPermissions, error: null }
  } catch (error) {
    console.error('❌ getUserPermissions: Erro:', error)
    return { data: null, error }
  }
}

// ===========================================
// FUNÇÕES DE USUÁRIOS E ROLES
// ===========================================

// Atribuir role a usuário
export async function assignRoleToUser(userId: string, roleId: string): Promise<{ error: any }> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      return { error: 'Empresa não encontrada' }
    }

    // Verificar se role existe na empresa
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .eq('empresa_id', empresaId)
      .single()

    if (!role) {
      return { error: 'Role não encontrado' }
    }

    // Verificar se usuário existe na empresa
    const { data: user } = await supabase
      .from('profiles')
      .select('uuid')
      .eq('uuid', userId)
      .eq('empresa_id', empresaId)
      .single()

    if (!user) {
      return { error: 'Usuário não encontrado' }
    }

    // Atualizar role do usuário
    const { error } = await supabase
      .from('profiles')
      .update({ role_id: roleId })
      .eq('uuid', userId)
      .eq('empresa_id', empresaId)

    return { error }
  } catch (error) {
    console.error('❌ assignRoleToUser: Erro:', error)
    return { error }
  }
}

// Buscar usuários da empresa com roles
export async function getEmpresaUsersWithRoles(): Promise<{ data: ProfileWithRole[] | null; error: any }> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      return { data: [], error: null }
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        *,
        roles (
          id,
          name,
          description,
          is_system_role,
          is_active
        )
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: true })

    if (error) {
      return { data: null, error }
    }

    const usersWithRoles: ProfileWithRole[] = users?.map(user => ({
      ...user,
      role: user.roles || undefined
    })) || []

    return { data: usersWithRoles, error: null }
  } catch (error) {
    console.error('❌ getEmpresaUsersWithRoles: Erro:', error)
    return { data: null, error }
  }
}

// ===========================================
// FUNÇÕES DE ESTATÍSTICAS
// ===========================================

// Buscar estatísticas de roles
export async function getRoleStats(): Promise<{ data: RoleStats | null; error: any }> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      return { data: null, error: 'Empresa não encontrada' }
    }

    // Contar roles
    const { count: totalRoles } = await supabase
      .from('roles')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('is_active', true)

    // Contar permissões
    const { count: totalPermissions } = await supabase
      .from('permissions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Contar usuários por role
    const { data: usersByRole } = await supabase
      .from('profiles')
      .select('role_id, roles(name)')
      .eq('empresa_id', empresaId)
      .not('role_id', 'is', null)

    const usersByRoleCount: { [roleName: string]: number } = {}
    usersByRole?.forEach(user => {
      const roleName = (user.roles as any)?.name || 'Sem Role'
      usersByRoleCount[roleName] = (usersByRoleCount[roleName] || 0) + 1
    })

    const stats: RoleStats = {
      total_roles: totalRoles || 0,
      total_permissions: totalPermissions || 0,
      users_by_role: usersByRoleCount
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('❌ getRoleStats: Erro:', error)
    return { data: null, error }
  }
}

// ===========================================
// FUNÇÕES AUXILIARES
// ===========================================

function getModuleLabel(module: string): string {
  const labels: { [key: string]: string } = {
    leads: 'Leads',
    pipelines: 'Pipelines',
    tasks: 'Tarefas',
    reports: 'Relatórios',
    admin: 'Administração',
    agenda: 'Agenda'
  }
  return labels[module] || module
} 