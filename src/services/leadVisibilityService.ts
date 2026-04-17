import { supabase } from './supabaseClient'
import { getUserPipelinePermissions } from './pipelinePermissionService'
import SecureLogger from '../utils/logger'

/**
 * Serviço central de visibilidade de leads.
 *
 * Regra:
 *  - ADMIN (profiles.is_admin = true): vê todos os leads da empresa.
 *  - VENDEDOR:
 *      - vê leads onde responsible_uuid = user.id
 *      - OU leads com responsible_uuid IS NULL em pipelines permitidos pelo admin
 *
 * Ponto único de verdade para todas as queries client-side de leads.
 * Para evitar bypass, o ideal futuro é replicar essas regras em RLS.
 */

export interface LeadsVisibilityContext {
  userId: string
  isAdmin: boolean
  allowedPipelineIds: string[]
}

/**
 * Escapa um UUID para uso seguro dentro de uma expressão `.or(...)` do PostgREST.
 * UUIDs não contêm vírgulas nem parênteses, mas filtramos por segurança.
 */
function sanitizeUuid(id: string): string {
  return id.replace(/[^a-zA-Z0-9-]/g, '')
}

/**
 * Lê o contexto do usuário atual (uuid, is_admin, pipelines permitidos) uma única vez
 * para ser reutilizado em toda a query.
 */
export async function getLeadsVisibilityContext(): Promise<LeadsVisibilityContext | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('uuid', user.id)
    .single()

  const isAdmin = !!profile?.is_admin

  if (isAdmin) {
    return { userId: user.id, isAdmin: true, allowedPipelineIds: [] }
  }

  const { data: allowedPipelineIds } = await getUserPipelinePermissions(user.id)
  return {
    userId: user.id,
    isAdmin: false,
    allowedPipelineIds: allowedPipelineIds || []
  }
}

export interface ApplyVisibilityOptions {
  /**
   * Quando a query já está fixada em um pipeline específico (ex.: Kanban),
   * passamos o id aqui. Assim não precisamos repetir o `pipeline_id IN (...)`
   * no OR e simplificamos o filtro.
   */
  pipelineId?: string
}

/**
 * Aplica o filtro de visibilidade de leads ao query builder do Supabase.
 *
 * Uso: `query = applyLeadVisibilityFilter(query, ctx, { pipelineId })`.
 *
 * Retorna o próprio query encadeável. Quando `ctx.isAdmin` é `true`, retorna
 * a query inalterada.
 */
export function applyLeadVisibilityFilter<T>(
  query: T,
  ctx: LeadsVisibilityContext,
  options: ApplyVisibilityOptions = {}
): T {
  if (ctx.isAdmin) return query

  const q = query as any
  const userId = sanitizeUuid(ctx.userId)
  const { pipelineId } = options

  // Caso 1: query fixada em um pipeline específico (Kanban).
  if (pipelineId) {
    if (ctx.allowedPipelineIds.includes(pipelineId)) {
      // Pode ver todos os leads dele + leads sem responsável deste pipeline.
      return q.or(`responsible_uuid.eq.${userId},responsible_uuid.is.null`) as T
    }
    // Pipeline não permitido: só leads onde ele é responsável.
    return q.eq('responsible_uuid', userId) as T
  }

  // Caso 2: query global (lista de Leads, ids filtrados, etc.).
  if (ctx.allowedPipelineIds.length === 0) {
    return q.eq('responsible_uuid', userId) as T
  }

  const sanitizedPipelines = ctx.allowedPipelineIds.map(sanitizeUuid).join(',')
  return q.or(
    `responsible_uuid.eq.${userId},and(responsible_uuid.is.null,pipeline_id.in.(${sanitizedPipelines}))`
  ) as T
}

/**
 * Retorna `true` se o usuário atual pode editar um lead específico
 * (admin OU é o responsável). Usado para gating de UI no modo somente leitura.
 */
export function canEditLead(
  lead: { responsible_uuid?: string | null } | null | undefined,
  ctx: Pick<LeadsVisibilityContext, 'userId' | 'isAdmin'> | null
): boolean {
  if (!lead || !ctx) return false
  if (ctx.isAdmin) return true
  return lead.responsible_uuid === ctx.userId
}

/**
 * Log auxiliar (somente dev) para facilitar depuração da regra.
 */
export function logVisibilityContext(ctx: LeadsVisibilityContext | null, scope: string) {
  if (import.meta.env.MODE !== 'development') return
  SecureLogger.log(`[leadVisibility:${scope}]`, ctx)
}
