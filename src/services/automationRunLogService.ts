import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { AutomationRunLog, AutomationRunStatus, AutomationRunTargetType } from '../types'

const TABLE = 'automation_run_log'

export interface RecordAutomationRunInput {
  empresaId: string
  ruleId: string
  ruleName?: string | null
  eventType?: string | null
  targetType?: AutomationRunTargetType | null
  targetId?: string | null
  targetLabel?: string | null
  actionType?: string | null
  status: AutomationRunStatus
  detail?: Record<string, any> | null
  errorMessage?: string | null
}

// Registra uma execução de ação. Nunca lança: log não pode quebrar a automação.
export async function recordAutomationRun(input: RecordAutomationRunInput): Promise<void> {
  try {
    await supabase.from(TABLE).insert({
      empresa_id: input.empresaId,
      rule_id: input.ruleId,
      rule_name: input.ruleName ?? null,
      event_type: input.eventType ?? null,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      target_label: input.targetLabel ?? null,
      action_type: input.actionType ?? null,
      status: input.status,
      detail: input.detail ?? null,
      error_message: input.errorMessage ?? null,
    })
  } catch (e) {
    console.error('[AUTO] Falha ao registrar automation_run_log', e)
  }
}

export interface ListAutomationRunsParams {
  ruleId?: string
  status?: AutomationRunStatus
  from?: string // ISO datetime (inclusive)
  to?: string // ISO datetime (inclusive)
  page?: number
  pageSize?: number
}

export interface ListAutomationRunsResult {
  data: AutomationRunLog[]
  count: number
  error: any
}

// Lista execuções com escopo de empresa, filtros e paginação.
export async function listAutomationRuns(
  params: ListAutomationRunsParams = {}
): Promise<ListAutomationRunsResult> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) {
    return { data: [], count: 0, error: new Error('Empresa não identificada') }
  }

  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))
  const fromIdx = (page - 1) * pageSize
  const toIdx = fromIdx + pageSize - 1

  let query = supabase
    .from(TABLE)
    .select('*', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .range(fromIdx, toIdx)

  if (params.ruleId) query = query.eq('rule_id', params.ruleId)
  if (params.status) query = query.eq('status', params.status)
  if (params.from) query = query.gte('created_at', params.from)
  if (params.to) query = query.lte('created_at', params.to)

  const { data, count, error } = await query
  return { data: (data || []) as AutomationRunLog[], count: count || 0, error }
}
