import { cacheUtils } from '../contexts/QueryContext'
import { cacheService } from '../services/cacheService'
import { clearInstanceSourceCache } from '../services/chatService'

/** Chaves de sessão/permissão — NÃO incluir preferências de UI (sidebar, tasks-view-mode, etc.) */
const SESSION_LOCAL_STORAGE_KEYS = [
  'pipeline_permissions',
  'stage_permissions',
  'instance_permissions',
  'user-is-admin',
  'cached-user-id',
  'last_is_admin',
] as const

const PROFILE_CACHE_PREFIX = 'profile_cache_'

/**
 * Limpa caches de sessão ao trocar de conta ou deslogar.
 * Preserva preferências de UI e tokens (Supabase gerencia auth token no signOut).
 */
export function clearSessionCaches(options?: { userId?: string | null }): void {
  try {
    cacheService.clear()
  } catch {
    /* ignore */
  }

  try {
    cacheUtils.clear()
  } catch {
    /* ignore */
  }

  try {
    clearInstanceSourceCache()
  } catch {
    /* ignore */
  }

  for (const key of SESSION_LOCAL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }

  const userId = options?.userId
  if (userId) {
    try {
      localStorage.removeItem(`${PROFILE_CACHE_PREFIX}${userId}`)
    } catch {
      /* ignore */
    }
  }
}
