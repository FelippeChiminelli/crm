import { supabase } from './supabaseClient'
import type { AnalyticsFilters, ChatAnalyticsFilters } from '../types'

/**
 * Tempo de resposta do chat (RPCs get_chat_response_time_*).
 *
 * Uma espera começa na primeira mensagem do cliente sem resposta e termina na
 * primeira mensagem da loja. O período e o horário valem para o início da
 * espera, no fuso de São Paulo. As RPCs derivam o empresa_id do usuário.
 */

export interface ResponseTimeDetail {
  id: string
  lead_id?: string
  lead_name?: string
  created_at: string
  phone: string
  contact_name?: string
  instance_name?: string
  response_time_minutes: number
  response_time_formatted: string
}

export interface AverageResponseTimeResult {
  average_minutes: number
  formatted: string
  total_conversations: number
  details?: ResponseTimeDetail[]
}

export interface InstanceResponseTime {
  instance_name: string
  average_minutes: number
  formatted: string
  conversations_count: number
}

// numeric e bigint chegam como string pelo PostgREST
interface SummaryRow {
  is_total: boolean
  instance_id: string | null
  instance_name: string | null
  avg_minutes: string | number
  waits: string | number
  conversations: string | number
}

interface ConversationRow {
  conversation_id: string
  lead_id: string | null
  lead_name: string | null
  phone: string | null
  contact_name: string | null
  instance_name: string | null
  first_wait_at: string
  avg_minutes: string | number
  waits: string | number
}

const EMPTY_RESULT: AverageResponseTimeResult = {
  average_minutes: 0,
  formatted: '0h 0min 0seg',
  total_conversations: 0,
  details: []
}

function toNumber(value: unknown): number {
  // O Postgres devolve numeric como string no PostgREST
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMinutes(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}h ${m}min ${s}seg`
}

function buildRpcParams(filters: AnalyticsFilters) {
  const chatFilters = filters as AnalyticsFilters & Partial<ChatAnalyticsFilters>
  return {
    p_start: filters.period.start,
    p_end: filters.period.end,
    p_instances: chatFilters.instances?.length ? chatFilters.instances : null,
    p_origins: chatFilters.origins?.length ? chatFilters.origins : null,
    p_time_start: chatFilters.timeRange?.start ?? null,
    p_time_end: chatFilters.timeRange?.end ?? null
  }
}

// O KPI e a tabela por instância pedem o mesmo resumo em paralelo; a promessa
// em andamento é compartilhada para que a consulta rode uma vez só.
const pendingSummaries = new Map<string, Promise<SummaryRow[]>>()

function fetchSummaryRows(filters: AnalyticsFilters): Promise<SummaryRow[]> {
  const params = buildRpcParams(filters)
  const key = JSON.stringify(params)
  const pending = pendingSummaries.get(key)
  if (pending) return pending

  const request = (async () => {
    const { data, error } = await supabase.rpc('get_chat_response_time_summary', params)
    if (error) throw error
    return (data || []) as SummaryRow[]
  })().finally(() => pendingSummaries.delete(key))

  pendingSummaries.set(key, request)
  return request
}

async function fetchDetails(filters: AnalyticsFilters): Promise<ResponseTimeDetail[]> {
  const { data, error } = await supabase.rpc(
    'get_chat_response_time_conversations',
    buildRpcParams(filters)
  )
  if (error) throw error

  return ((data || []) as ConversationRow[]).map(row => {
    const minutes = toNumber(row.avg_minutes)
    return {
      id: row.conversation_id,
      lead_id: row.lead_id ?? undefined,
      lead_name: row.lead_name ?? undefined,
      created_at: row.first_wait_at,
      phone: row.phone || 'Não informado',
      contact_name: row.contact_name ?? undefined,
      instance_name: row.instance_name ?? undefined,
      response_time_minutes: minutes,
      response_time_formatted: formatMinutes(minutes)
    }
  })
}

export async function getAverageFirstResponseTime(
  filters: AnalyticsFilters
): Promise<AverageResponseTimeResult> {
  try {
    const [summary, details] = await Promise.all([
      fetchSummaryRows(filters),
      fetchDetails(filters)
    ])

    const total = summary.find(row => row.is_total)
    if (!total) return EMPTY_RESULT

    const averageMinutes = toNumber(total.avg_minutes)
    return {
      average_minutes: averageMinutes,
      formatted: formatMinutes(averageMinutes),
      total_conversations: toNumber(total.conversations),
      details
    }
  } catch (err) {
    console.error('Erro ao calcular tempo médio de resposta:', err)
    return EMPTY_RESULT
  }
}

export async function getAverageFirstResponseTimeByInstance(
  filters: AnalyticsFilters
): Promise<InstanceResponseTime[]> {
  try {
    const summary = await fetchSummaryRows(filters)

    return summary
      .filter(row => !row.is_total)
      .map(row => {
        const averageMinutes = toNumber(row.avg_minutes)
        return {
          instance_name: row.instance_name ?? '',
          average_minutes: averageMinutes,
          formatted: formatMinutes(averageMinutes),
          conversations_count: toNumber(row.conversations)
        }
      })
      .sort((a, b) => a.average_minutes - b.average_minutes)
  } catch (err) {
    console.error('Erro ao calcular tempo médio por instância:', err)
    return []
  }
}
