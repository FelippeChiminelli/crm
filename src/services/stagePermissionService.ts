import { supabase } from './supabaseClient'
import { getUserPipelinePermissions } from './pipelinePermissionService'

const ENABLE_DB = import.meta.env.VITE_ENABLE_STAGE_PERMISSIONS_DB === 'true'

export function isStagePermissionsDbEnabled(): boolean {
  return ENABLE_DB
}

if (import.meta.env.MODE === 'development') {
  try {
    console.log('[StagePermService] ENABLE_DB:', ENABLE_DB, 'raw:', import.meta.env.VITE_ENABLE_STAGE_PERMISSIONS_DB)
  } catch {}
}

const STAGE_PERMISSIONS_KEY = 'stage_permissions'

/** userId -> pipelineId -> stageIds explícitos; chave ausente = todos os estágios */
export type StagesByPipeline = Record<string, string[]>

interface StoredStagePermissions {
  [userId: string]: StagesByPipeline
}

function loadPermissionsFromStorage(): StoredStagePermissions {
  try {
    const stored = localStorage.getItem(STAGE_PERMISSIONS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function savePermissionsToStorage(permissions: StoredStagePermissions): void {
  try {
    localStorage.setItem(STAGE_PERMISSIONS_KEY, JSON.stringify(permissions))
  } catch (error) {
    console.error('Erro ao salvar permissões de estágio no localStorage:', error)
  }
}

async function getCurrentAdminContext() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('uuid, is_admin, empresa_id')
    .eq('uuid', user.id)
    .single()

  if (error || !profile) throw new Error('Perfil do usuário não encontrado')
  if (!profile.is_admin) throw new Error('Apenas administradores podem gerenciar permissões')

  return {
    userId: profile.uuid as string,
    empresaId: profile.empresa_id as string,
  }
}

async function isUserAdmin(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('uuid', userId)
    .single()
  return !!profile?.is_admin
}

async function loadStagePermissionsFromDb(
  userId: string,
  empresaId: string
): Promise<StagesByPipeline | null> {
  if (!ENABLE_DB) return null

  try {
    const { data: rows, error } = await supabase
      .from('user_stage_permissions')
      .select('pipeline_id, stage_id')
      .eq('user_id', userId)
      .eq('empresa_id', empresaId)
      .eq('granted', true)

    if (error || !Array.isArray(rows)) return null

    const map: StagesByPipeline = {}
    for (const row of rows) {
      if (!map[row.pipeline_id]) map[row.pipeline_id] = []
      map[row.pipeline_id].push(row.stage_id)
    }
    return map
  } catch {
    return null
  }
}

/** Retorna mapa pipelineId -> stageIds explícitos; pipeline ausente = todos os estágios */
export async function getUserStagePermissions(userId: string): Promise<{ data: StagesByPipeline; error: any }> {
  try {
    if (await isUserAdmin(userId)) {
      return { data: {}, error: null }
    }

    if (ENABLE_DB) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('uuid', userId)
        .single()

      if (profile?.empresa_id) {
        const dbMap = await loadStagePermissionsFromDb(userId, profile.empresa_id)
        if (dbMap !== null) {
          const ls = loadPermissionsFromStorage()
          const lsMap = ls[userId] || {}
          const merged: StagesByPipeline = { ...lsMap, ...dbMap }
          for (const pipelineId of Object.keys(lsMap)) {
            if (!(pipelineId in dbMap)) {
              merged[pipelineId] = lsMap[pipelineId]
            }
          }
          return { data: merged, error: null }
        }
      }
    }

    const ls = loadPermissionsFromStorage()
    return { data: ls[userId] || {}, error: null }
  } catch (error) {
    console.error('❌ Erro ao buscar permissões de estágio:', error)
    return { data: {}, error }
  }
}

/** true quando há restrição explícita (array, inclusive vazio) para o pipeline */
export function hasStageRestriction(stagesByPipeline: StagesByPipeline, pipelineId: string): boolean {
  return Object.prototype.hasOwnProperty.call(stagesByPipeline, pipelineId)
}

/** Resolve IDs de estágios visíveis no Kanban para um usuário */
export async function getVisibleStageIdsForKanban(
  userId: string,
  pipelineId: string,
  allStageIds: string[]
): Promise<string[]> {
  if (allStageIds.length === 0) return []

  if (await isUserAdmin(userId)) {
    return allStageIds
  }

  const { data: allowedPipelineIds } = await getUserPipelinePermissions(userId)
  if (!allowedPipelineIds || !allowedPipelineIds.includes(pipelineId)) {
    return []
  }

  const { data: stagesByPipeline } = await getUserStagePermissions(userId)
  if (!hasStageRestriction(stagesByPipeline, pipelineId)) {
    return allStageIds
  }

  const allowed = stagesByPipeline[pipelineId] || []
  return allStageIds.filter(id => allowed.includes(id))
}

/** Filtra objetos Stage completos para o Kanban do usuário atual */
export async function filterStagesForCurrentUser<T extends { id: string }>(
  stages: T[],
  pipelineId: string
): Promise<T[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const visibleIds = await getVisibleStageIdsForKanban(
    user.id,
    pipelineId,
    stages.map(s => s.id)
  )
  const visibleSet = new Set(visibleIds)
  return stages.filter(s => visibleSet.has(s.id))
}

/** Resolve visible stage IDs para o usuário autenticado (uso em leadService) */
export async function getVisibleStageIdsForCurrentUser(
  pipelineId: string,
  allStageIds: string[]
): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return getVisibleStageIdsForKanban(user.id, pipelineId, allStageIds)
}

export async function setUserStagePermissions(
  userId: string,
  stagesByPipeline: StagesByPipeline
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId: adminUserId, empresaId } = await getCurrentAdminContext()

    if (ENABLE_DB) {
      try {
        await supabase
          .from('user_stage_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('empresa_id', empresaId)

        const rows: Array<{
          user_id: string
          pipeline_id: string
          stage_id: string
          empresa_id: string
          granted: boolean
          granted_by: string
        }> = []

        for (const [pipelineId, stageIds] of Object.entries(stagesByPipeline)) {
          for (const stageId of stageIds) {
            rows.push({
              user_id: userId,
              pipeline_id: pipelineId,
              stage_id: stageId,
              empresa_id: empresaId,
              granted: true,
              granted_by: adminUserId,
            })
          }
        }

        if (rows.length > 0) {
          const { error: insertError } = await supabase
            .from('user_stage_permissions')
            .insert(rows)
          if (insertError) throw insertError
        }
      } catch (dbError) {
        console.warn('[StagePermService] Falha ao persistir no DB, usando localStorage:', dbError)
      }
    }

    const ls = loadPermissionsFromStorage()
    ls[userId] = stagesByPipeline
    savePermissionsToStorage(ls)

    return { success: true }
  } catch (error) {
    console.error('❌ Erro ao definir permissões de estágio:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    }
  }
}

export async function getAllUserStagePermissions(): Promise<{
  data: Record<string, StagesByPipeline> | null
  error: any
}> {
  try {
    const { empresaId } = await getCurrentAdminContext()

    const { data: users } = await supabase
      .from('profiles')
      .select('uuid, is_admin')
      .eq('empresa_id', empresaId)

    if (!users) return { data: {}, error: null }

    const ls = loadPermissionsFromStorage()
    const result: Record<string, StagesByPipeline> = {}

    if (ENABLE_DB) {
      const userIds = users.filter(u => !u.is_admin).map(u => u.uuid)
      if (userIds.length > 0) {
        const { data: rows, error: dbError } = await supabase
          .from('user_stage_permissions')
          .select('user_id, pipeline_id, stage_id')
          .in('user_id', userIds)
          .eq('empresa_id', empresaId)
          .eq('granted', true)

        if (!dbError && rows) {
          for (const row of rows) {
            if (!result[row.user_id]) result[row.user_id] = {}
            if (!result[row.user_id][row.pipeline_id]) {
              result[row.user_id][row.pipeline_id] = []
            }
            result[row.user_id][row.pipeline_id].push(row.stage_id)
          }
        }
      }
    }

    for (const user of users) {
      if (user.is_admin) continue
      const lsMap = ls[user.uuid] || {}
      result[user.uuid] = { ...lsMap, ...(result[user.uuid] || {}) }
      for (const pipelineId of Object.keys(lsMap)) {
        if (!result[user.uuid][pipelineId]?.length && lsMap[pipelineId]?.length) {
          result[user.uuid][pipelineId] = lsMap[pipelineId]
        }
      }
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('❌ Erro ao listar permissões de estágio:', error)
    return { data: null, error }
  }
}

export const stagePermissionsSQL = `
create table if not exists public.user_stage_permissions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references public.profiles(uuid) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  granted boolean not null default true,
  granted_by uuid references public.profiles(uuid),
  created_at timestamptz not null default now(),
  unique (empresa_id, user_id, pipeline_id, stage_id)
);

alter table public.user_stage_permissions enable row level security;

create policy read_own_company on public.user_stage_permissions
  for select using (
    empresa_id in (select empresa_id from profiles where uuid = auth.uid())
  );

create policy admin_manage_own_company on public.user_stage_permissions
  for all using (
    (select is_admin from profiles where uuid = auth.uid()) = true
    and empresa_id in (select empresa_id from profiles where uuid = auth.uid())
  );

create index if not exists idx_user_stage_permissions_lookup
  on public.user_stage_permissions (user_id, empresa_id, pipeline_id)
  where granted = true;
`
