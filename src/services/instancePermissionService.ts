import { supabase } from './supabaseClient'

const ENABLE_DB = (import.meta as any)?.env?.VITE_ENABLE_INSTANCE_PERMISSIONS_DB === 'true'
export function isInstancePermissionsDbEnabled(): boolean {
  return ENABLE_DB
}
if (import.meta.env.MODE === 'development') {
  try {
    console.log('[InstancePermService] ENABLE_DB:', ENABLE_DB, 'raw:', (import.meta as any)?.env?.VITE_ENABLE_INSTANCE_PERMISSIONS_DB)
  } catch {}
}

const INSTANCE_PERMISSIONS_KEY = 'instance_permissions'

interface StoredInstancePermissions {
  [empresaId: string]: {
    [instanceId: string]: string[] // userIds permitidos
  }
}

function loadPermissionsFromStorage(): StoredInstancePermissions {
  try {
    const stored = localStorage.getItem(INSTANCE_PERMISSIONS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function savePermissionsToStorage(permissions: StoredInstancePermissions): void {
  try {
    localStorage.setItem(INSTANCE_PERMISSIONS_KEY, JSON.stringify(permissions))
  } catch (error) {
    console.error('Erro ao salvar permissões de instância no localStorage:', error)
  }
}

async function getCurrentContext() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('uuid, is_admin, empresa_id, full_name')
    .eq('uuid', user.id)
    .single()

  if (error || !profile) throw new Error('Perfil do usuário não encontrado')

  return { userId: profile.uuid as string, empresaId: profile.empresa_id as string, isAdmin: !!profile.is_admin }
}

export async function getAllowedUserIdsForInstance(instanceId: string): Promise<{ data: string[]; error: any }> {
  try {
    const { empresaId } = await getCurrentContext()

    // Tentar DB somente quando habilitado via env
    if (ENABLE_DB) {
      try {
        if (import.meta.env.MODE === 'development') {
          console.log('[InstancePermService] getAllowedUserIdsForInstance via DB', { instanceId, empresaId })
        }
        const { data: rows, error: dbError } = await supabase
          .from('user_instance_permissions')
          .select('user_id')
          .eq('empresa_id', empresaId)
          .eq('instance_id', instanceId)
          .eq('granted', true)

        if (!dbError && Array.isArray(rows)) {
          const ids = rows.map(r => r.user_id)
          if (ids.length > 0) return { data: ids, error: null }
        }
      } catch (e) {
        // Silenciar 404 quando tabela não existir
        if (import.meta.env.MODE === 'development') {
          console.warn('[InstancePermService] DB indisponível, caindo para localStorage', e)
        }
      }
    }

    // Fallback localStorage
    const ls = loadPermissionsFromStorage()
    const ids = ls[empresaId]?.[instanceId] || []
    if (import.meta.env.MODE === 'development') {
      console.log('[InstancePermService] getAllowedUserIdsForInstance via localStorage', { instanceId, empresaId, count: ids.length })
    }
    return { data: ids, error: null }
  } catch (error) {
    console.error('❌ Erro ao obter usuários permitidos para instância:', error)
    return { data: [], error }
  }
}

// Conta quantos usuários (não-admin) têm permissão explícita para a instância
export async function getAllowedCountForInstance(instanceId: string): Promise<number> {
  try {
    const { empresaId } = await getCurrentContext()

    if (ENABLE_DB) {
      try {
        const { count, error } = await supabase
          .from('user_instance_permissions')
          .select('user_id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .eq('instance_id', instanceId)
          .eq('granted', true)
        if (!error && typeof count === 'number') return count
      } catch {}
    }

    const ls = loadPermissionsFromStorage()
    const ids = ls[empresaId]?.[instanceId] || []
    return Array.isArray(ids) ? ids.length : 0
  } catch {
    return 0
  }
}

export async function setAllowedUserIdsForInstance(instanceId: string, userIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, empresaId, isAdmin } = await getCurrentContext()
    if (!isAdmin) return { success: false, error: 'Apenas administradores podem gerenciar permissões' }

    // Persistir no DB somente quando habilitado
    if (ENABLE_DB) {
      try {
        if (import.meta.env.MODE === 'development') {
          console.log('[InstancePermService] Persistindo no DB', { empresaId, instanceId, userIdsCount: userIds.length })
        }
        // Remover permissões anteriores
        const delRes = await supabase
          .from('user_instance_permissions')
          .delete()
          .eq('empresa_id', empresaId)
          .eq('instance_id', instanceId)
        if (import.meta.env.MODE === 'development') {
          console.log('[InstancePermService] Delete anterior concluído', delRes)
        }

        if (userIds.length > 0) {
          const rows = userIds.map(uid => ({
            empresa_id: empresaId,
            instance_id: instanceId,
            user_id: uid,
            granted: true,
            granted_by: userId
          }))
          const { error: insertError, data: insertData } = await supabase
            .from('user_instance_permissions')
            .insert(rows)
          if (import.meta.env.MODE === 'development') {
            console.log('[InstancePermService] Insert realizado', { error: insertError, rows: rows.length, data: insertData })
          }
          if (insertError) throw insertError
        }
      } catch (dbError) {
        // Silenciar erros quando tabela não existir
        console.warn('[InstancePermService] Erro ao persistir no DB, usando somente localStorage', dbError)
      }
    } else if (import.meta.env.MODE === 'development') {
      console.log('[InstancePermService] ENABLE_DB=false, salvando apenas em localStorage')
    }

    // Espelhar no localStorage (sempre)
    const ls = loadPermissionsFromStorage()
    ls[empresaId] = ls[empresaId] || {}
    ls[empresaId][instanceId] = userIds
    savePermissionsToStorage(ls)

    return { success: true }
  } catch (error) {
    console.error('❌ Erro ao salvar permissões da instância:', error)
    return { success: false, error: 'Erro interno' }
  }
}

export async function getAllUsersWithInstancePermissions(instanceId: string): Promise<{ data: Array<{ userId: string; userName: string; isAdmin: boolean; allowed: boolean }>; error: any }> {
  try {
    const { empresaId } = await getCurrentContext()

    // Buscar usuários da empresa
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('uuid, full_name, is_admin')
      .eq('empresa_id', empresaId)
      .order('full_name')

    if (usersError || !users) {
      return { data: [], error: usersError }
    }

    const { data: allowedIds } = await getAllowedUserIdsForInstance(instanceId)

    const result = users.map(u => ({
      userId: u.uuid,
      userName: u.full_name,
      isAdmin: !!u.is_admin,
      allowed: !!u.is_admin || allowedIds.includes(u.uuid)
    }))

    return { data: result, error: null }
  } catch (error) {
    console.error('❌ Erro ao carregar permissões por instância:', error)
    return { data: [], error }
  }
}

export const instancePermissionsSQL = `
create table if not exists public.user_instance_permissions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instances(id) on delete cascade,
  user_id uuid not null references public.profiles(uuid) on delete cascade,
  granted boolean not null default true,
  granted_by uuid references public.profiles(uuid),
  created_at timestamptz not null default now(),
  unique (empresa_id, instance_id, user_id)
);
` 


// Retorna as instâncias às quais o usuário atual tem acesso
export async function getAllowedInstanceIdsForCurrentUser(): Promise<{ data: string[]; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: 'Usuário não autenticado' }

    // Tentar no DB primeiro somente quando habilitado
    if (ENABLE_DB) {
      try {
        const { data: rows, error } = await supabase
          .from('user_instance_permissions')
          .select('instance_id')
          .eq('user_id', user.id)
          .eq('granted', true)

        if (!error && Array.isArray(rows)) {
          const ids = rows.map(r => r.instance_id as string)
          if (ids.length > 0) return { data: ids, error: null }
        }
      } catch {}
    }

    // Fallback localStorage
    const ls = loadPermissionsFromStorage()
    // Descobrir empresa do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('uuid', user.id)
      .single()
    const empresaId = profile?.empresa_id as string | undefined
    if (!empresaId) return { data: [], error: null }
    const byEmpresa = ls[empresaId] || {}
    const allowedInstanceIds = Object.entries(byEmpresa)
      .filter(([, users]) => Array.isArray(users) && users.includes(user.id))
      .map(([instanceId]) => instanceId)

    return { data: allowedInstanceIds, error: null }
  } catch (error) {
    console.error('❌ Erro ao obter instâncias permitidas do usuário atual:', error)
    return { data: [], error }
  }
}

