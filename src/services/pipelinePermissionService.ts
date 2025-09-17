import { supabase } from './supabaseClient'
// types reservados para futura integração tipada
// import type { UserPipelinePermission, PipelinePermissionData } from '../types'

// ===========================================
// SERVIÇO DE PERMISSÕES DE PIPELINE
// ===========================================

/**
 * Por enquanto, usar localStorage para simular o sistema de permissões
 * até que possamos criar a tabela no banco de dados
 */

const PIPELINE_PERMISSIONS_KEY = 'pipeline_permissions'

// Flag para habilitar uso do DB (evita 404 quando a tabela ainda não existe)
const ENABLE_DB_PIPELINE_PERMISSIONS = import.meta.env.VITE_ENABLE_PIPELINE_PERMISSIONS_DB === 'true'
export function isPipelinePermissionsDbEnabled(): boolean {
  return ENABLE_DB_PIPELINE_PERMISSIONS
}
if (import.meta.env.MODE === 'development') {
  try {
    console.log('[PipelinePermService] ENABLE_DB_PIPELINE_PERMISSIONS:', ENABLE_DB_PIPELINE_PERMISSIONS, 'raw:', import.meta.env.VITE_ENABLE_PIPELINE_PERMISSIONS_DB)
  } catch {}
}

interface StoredPermissions {
  [userId: string]: {
    allowedPipelineIds: string[]
    isAdmin: boolean
  }
}

// Carregar permissões do localStorage
function loadPermissionsFromStorage(): StoredPermissions {
  try {
    const stored = localStorage.getItem(PIPELINE_PERMISSIONS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Salvar permissões no localStorage
function savePermissionsToStorage(permissions: StoredPermissions): void {
  try {
    localStorage.setItem(PIPELINE_PERMISSIONS_KEY, JSON.stringify(permissions))
  } catch (error) {
    console.error('Erro ao salvar permissões:', error)
  }
}

// Helper: empresa do usuário atual
// function getCurrentEmpresaIdForCurrentUser reservada para uso futuro

// Buscar permissões de pipeline para um usuário
export async function getUserPipelinePermissions(userId: string): Promise<{ data: string[] | null; error: any }> {
  try {
    console.log('🔍 Buscando permissões de pipeline para usuário:', userId)
    
    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, empresa_id')
      .eq('uuid', userId)
      .single()

    if (profile?.is_admin) {
      console.log('✅ Usuário é admin - acesso a todos os pipelines')
      return { data: [], error: null } // Array vazio = acesso a todos
    }

    // 1) (Opcional) Tentar via banco (tabela user_pipeline_permissions)
    if (ENABLE_DB_PIPELINE_PERMISSIONS) {
      try {
        if (import.meta.env.MODE === 'development') {
          console.log('[PipelinePermService] getUserPipelinePermissions via DB', { userId })
        }
        const { data: dbPerms, error: dbError } = await supabase
          .from('user_pipeline_permissions')
          .select('pipeline_id')
          .eq('user_id', userId)
          .eq('granted', true)

        if (!dbError && Array.isArray(dbPerms)) {
          const ids = dbPerms.map(r => r.pipeline_id)
          if (ids.length > 0) {
            console.log('✅ Permissões (DB) encontradas:', ids)
            return { data: ids, error: null }
          }
          // DB respondeu vazio → tentar fallback do localStorage
          const permissions = loadPermissionsFromStorage()
          const lsIds = permissions[userId]?.allowedPipelineIds || []
          if (lsIds.length > 0) {
            console.log('✅ Permissões (fallback) usadas por DB vazio:', lsIds)
            return { data: lsIds, error: null }
          }
          // Nada no DB e nada no LS
          return { data: [], error: null }
        }
      } catch (e) {
        console.warn('⚠️ Falha ao ler permissões no DB, usando fallback localStorage', e)
      }
    }

    // 2) Fallback: localStorage
    const permissions = loadPermissionsFromStorage()
    const userPermissions = permissions[userId]
    const ids = userPermissions?.allowedPipelineIds || []
    if (import.meta.env.MODE === 'development') {
      console.log('✅ Permissões (fallback) encontradas:', ids)
    }
    return { data: ids, error: null }
  } catch (error) {
    console.error('❌ Erro ao buscar permissões de pipeline:', error)
    return { data: null, error }
  }
}

// Definir permissões de pipeline para um usuário (apenas admin)
export async function setUserPipelinePermissions(
  userId: string, 
  pipelineIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔧 Definindo permissões de pipeline:', { userId, pipelineIds })

    // Verificar se o usuário atual é admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('is_admin, empresa_id')
      .eq('uuid', currentUser.id)
      .single()

    if (!currentProfile?.is_admin) {
      return { success: false, error: 'Apenas administradores podem gerenciar permissões' }
    }

    // 1) (Opcional) Tentar salvar no DB (tabela user_pipeline_permissions)
    if (ENABLE_DB_PIPELINE_PERMISSIONS) {
      try {
        const empresaId = currentProfile.empresa_id
        if (!empresaId) throw new Error('Empresa não identificada')

        // Remover permissões anteriores do usuário nesta empresa
        const delRes = await supabase
          .from('user_pipeline_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('empresa_id', empresaId)
        if (import.meta.env.MODE === 'development') {
          console.log('[PipelinePermService] Delete anterior concluído', delRes)
        }

        // Inserir novas permissões (granted = true)
        if (pipelineIds.length > 0) {
          const rows = pipelineIds.map(pid => ({
            user_id: userId,
            pipeline_id: pid,
            empresa_id: empresaId,
            granted: true
          }))
          const { error: insertError, data: insertData } = await supabase
            .from('user_pipeline_permissions')
            .insert(rows)
          if (import.meta.env.MODE === 'development') {
            console.log('[PipelinePermService] Insert realizado', { error: insertError, rows: rows.length, data: insertData })
          }
          if (insertError) throw insertError
        }

        // Espelhar no localStorage para robustez de leitura
        const permissions = loadPermissionsFromStorage()
        permissions[userId] = {
          allowedPipelineIds: pipelineIds,
          isAdmin: false
        }
        savePermissionsToStorage(permissions)

        console.log('✅ Permissões salvas no DB (e espelhadas em localStorage) com sucesso')
        return { success: true }
      } catch (dbError) {
        console.warn('⚠️ Falha ao persistir no DB, usando fallback localStorage:', dbError)
      }
    }

    // 2) Fallback localStorage (padrão)
    if (!ENABLE_DB_PIPELINE_PERMISSIONS && import.meta.env.MODE === 'development') {
      console.log('[PipelinePermService] ENABLE_DB_PIPELINE_PERMISSIONS=false, salvando apenas em localStorage')
    }
    const permissions = loadPermissionsFromStorage()
    permissions[userId] = {
      allowedPipelineIds: pipelineIds,
      isAdmin: false
    }
    savePermissionsToStorage(permissions)

    console.log('✅ Permissões salvas (fallback) com sucesso')
    return { success: true }
  } catch (error) {
    console.error('❌ Erro ao definir permissões:', error)
    return { success: false, error: 'Erro interno' }
  }
}

// Verificar se um usuário tem acesso a um pipeline específico
export async function canAccessPipeline(userId: string, pipelineId: string): Promise<boolean> {
  try {
    const { data: allowedPipelineIds } = await getUserPipelinePermissions(userId)
    
    if (!allowedPipelineIds) {
      return false
    }

    // Array vazio = admin com acesso a todos
    if (allowedPipelineIds.length === 0) {
      return true
    }

    // Verificar se o pipeline está na lista
    return allowedPipelineIds.includes(pipelineId)
  } catch (error) {
    console.error('❌ Erro ao verificar acesso ao pipeline:', error)
    return false
  }
}

// Listar todos os usuários e suas permissões (apenas admin)
export async function getAllUserPipelinePermissions(): Promise<{ 
  data: Array<{ userId: string; userName: string; isAdmin: boolean; allowedPipelineIds: string[] }> | null; 
  error: any 
}> {
  try {
    // Verificar se o usuário atual é admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { data: null, error: 'Usuário não autenticado' }
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('is_admin, empresa_id')
      .eq('uuid', currentUser.id)
      .single()

    if (!currentProfile?.is_admin) {
      return { data: null, error: 'Apenas administradores podem ver permissões' }
    }

    // Buscar todos os usuários da empresa
    const { data: users } = await supabase
      .from('profiles')
      .select('uuid, full_name, is_admin')
      .eq('empresa_id', currentProfile.empresa_id)
      .order('full_name')

    if (!users) {
      return { data: [], error: null }
    }

    // 1) (Opcional) Tentar carregar permissões do DB
    if (ENABLE_DB_PIPELINE_PERMISSIONS) {
      try {
        const userIds = users.map(u => u.uuid)
        const mapUserToPipelines: Record<string, string[]> = {}
        if (userIds.length > 0) {
          const { data: dbPerms, error: dbError } = await supabase
            .from('user_pipeline_permissions')
            .select('user_id, pipeline_id')
            .in('user_id', userIds)
            .eq('empresa_id', currentProfile.empresa_id)
            .eq('granted', true)
          if (!dbError && dbPerms) {
            for (const row of dbPerms) {
              if (!mapUserToPipelines[row.user_id]) mapUserToPipelines[row.user_id] = []
              mapUserToPipelines[row.user_id].push(row.pipeline_id)
            }
          }
        }

        // Carregar fallback de localStorage para complementar onde DB retornou vazio
        const permissions = loadPermissionsFromStorage()
        const result = users.map(user => {
          const dbIds = mapUserToPipelines[user.uuid] || []
          const lsIds = permissions[user.uuid]?.allowedPipelineIds || []
          const combined = dbIds.length > 0 ? dbIds : lsIds
          return {
            userId: user.uuid,
            userName: user.full_name,
            isAdmin: !!user.is_admin,
            allowedPipelineIds: user.is_admin ? [] : combined
          }
        })
        return { data: result, error: null }
      } catch (e) {
        console.warn('⚠️ Falha ao ler permissões no DB, usando fallback localStorage')
      }
    }

    // 2) Fallback localStorage (padrão)
    const permissions = loadPermissionsFromStorage()
    const result = users.map(user => ({
      userId: user.uuid,
      userName: user.full_name,
      isAdmin: !!user.is_admin,
      allowedPipelineIds: user.is_admin
        ? []
        : permissions[user.uuid]?.allowedPipelineIds || []
    }))
    return { data: result, error: null }
  } catch (error) {
    console.error('❌ Erro ao listar permissões:', error)
    return { data: null, error }
  }
}

// Remover todas as permissões de um usuário
export async function removeUserPipelinePermissions(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const permissions = loadPermissionsFromStorage()
    delete permissions[userId]
    savePermissionsToStorage(permissions)
    
    console.log('✅ Permissões removidas para usuário:', userId)
    return { success: true }
  } catch (error) {
    console.error('❌ Erro ao remover permissões:', error)
    return { success: false, error: 'Erro interno' }
  }
}
