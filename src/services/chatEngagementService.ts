import { supabase } from './supabaseClient'
// Apesar do nome, useCachedQuery não é um hook React: é um wrapper assíncrono
// de cache. O apelido evita que o eslint o trate como hook fora de componente.
import { useCachedQuery as withCache } from './cacheService'
import type {
  AnalyticsPeriod,
  ChatAnalyticsFilters,
  ChatEngagementCategory,
  ChatEngagementConversation,
  ChatEngagementSummary
} from '../types'

/**
 * Análise de estágio do atendimento das conversas de WhatsApp.
 *
 * O cálculo roda em SQL (RPCs `get_chat_engagement_summary` e
 * `get_chat_engagement_conversations`) porque exige varrer todas as mensagens
 * do período — inviável no navegador, que é o padrão usado em analyticsService.
 * As RPCs derivam o empresa_id do usuário autenticado, então nenhum filtro de
 * empresa é enviado daqui.
 */

/** Janela padrão, em horas, para considerar uma conversa parada. */
export const DEFAULT_INACTIVE_HOURS = 24

/** Opções oferecidas no filtro da aba Chat. */
export const INACTIVE_WINDOW_OPTIONS = [
  { hours: 6, label: '6h' },
  { hours: 12, label: '12h' },
  { hours: 24, label: '24h' },
  { hours: 48, label: '48h' },
  { hours: 72, label: '72h' },
  { hours: 360, label: '15 dias' },
  { hours: 720, label: '30 dias' }
]

export const ENGAGEMENT_PAGE_SIZE = 50

/** Duração do período analisado, em horas (datas inclusivas nas duas pontas). */
export function getPeriodDurationHours(period: AnalyticsPeriod): number {
  const start = new Date(`${period.start}T00:00:00`)
  const end = new Date(`${period.end}T00:00:00`)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return days * 24
}

/**
 * A janela precisa ser menor que o período: uma conversa criada dentro do
 * período não consegue acumular mais silêncio do que o próprio período dura.
 * Com janela igual ou maior, as categorias de conversa parada zeram.
 */
export function isWindowValidForPeriod(hours: number, period: AnalyticsPeriod): boolean {
  return hours < getPeriodDurationHours(period)
}

function buildRpcParams(filters: ChatAnalyticsFilters) {
  return {
    p_start: filters.period.start,
    p_end: filters.period.end,
    p_instances: filters.instances?.length ? filters.instances : null,
    p_inactive_hours: filters.inactiveHours ?? DEFAULT_INACTIVE_HOURS,
    p_origins: filters.origins?.length ? filters.origins : null
  }
}

function toNumber(value: unknown): number {
  // O Postgres devolve numeric como string no PostgREST
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * O cache usa o prefixo `analytics_chat`, então `invalidateChatCache()` do
 * analyticsService já limpa estas entradas junto das demais métricas de chat.
 */
const SUMMARY_CACHE_KEY = 'analytics_chat_engagement'
const CONVERSATIONS_CACHE_KEY = 'analytics_chat_engagement_list'

export async function getChatEngagementSummary(
  filters: ChatAnalyticsFilters
): Promise<ChatEngagementSummary[]> {
  const params = buildRpcParams(filters)

  return withCache(SUMMARY_CACHE_KEY, params, async () => {
    const { data, error } = await supabase.rpc('get_chat_engagement_summary', params)

    if (error) {
      console.error('Erro ao buscar estágio do atendimento:', error)
      throw error
    }

    return (data || []).map((row: any) => ({
      category: row.category as ChatEngagementCategory,
      conversations: toNumber(row.conversations),
      stale_conversations: toNumber(row.stale_conversations),
      percentage: toNumber(row.percentage),
      avg_idle_hours: toNumber(row.avg_idle_hours),
      excluded_no_lead: toNumber(row.excluded_no_lead)
    }))
  })
}

export interface EngagementConversationsPage {
  conversations: ChatEngagementConversation[]
  total: number
}

export async function getChatEngagementConversations(
  filters: ChatAnalyticsFilters,
  category: ChatEngagementCategory,
  page = 0,
  pageSize = ENGAGEMENT_PAGE_SIZE
): Promise<EngagementConversationsPage> {
  // A RPC de lista reclassifica todo o período antes de paginar, então custa
  // o mesmo que o resumo e vale o cache.
  const params = {
    ...buildRpcParams(filters),
    p_category: category,
    p_limit: pageSize,
    p_offset: page * pageSize
  }

  return withCache(CONVERSATIONS_CACHE_KEY, params, async () => {
    const { data, error } = await supabase.rpc('get_chat_engagement_conversations', params)

    if (error) {
      console.error('Erro ao buscar conversas do estágio:', error)
      throw error
    }

    const rows = data || []

    return {
      // total_count vem repetido em todas as linhas (count(*) over ())
      total: rows.length > 0 ? toNumber(rows[0].total_count) : 0,
      conversations: rows.map((row: any) => ({
        conversation_id: row.conversation_id,
        lead_id: row.lead_id,
        lead_name: row.lead_name,
        contact_name: row.contact_name,
        phone: row.phone,
        instance_name: row.instance_name,
        responsible_name: row.responsible_name,
        msgs_loja: toNumber(row.msgs_loja),
        msgs_cliente: toNumber(row.msgs_cliente),
        last_message_at: row.last_message_at,
        idle_hours: toNumber(row.idle_hours),
        total_count: toNumber(row.total_count)
      }))
    }
  })
}

/** Converte horas em um rótulo curto: "3h", "2d 5h", "45min". */
export function formatIdleTime(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '-'
  if (hours < 1) return `${Math.round(hours * 60)}min`
  if (hours < 48) return `${Math.round(hours)}h`

  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}
