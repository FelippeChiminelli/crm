import type { Lead, Stage } from '../types'
import type { DashboardNotificationItem } from '../types/dashboard'
import type { NotificationContext, PipelineWithStages } from './notificationHelpers'
import { isLeadActive, leadDetail, take, MAX_DETAILS } from './notificationHelpers'

const STAGE_STALE_DAYS = 3

export function buildStageStaleNotifications(ctx: NotificationContext): DashboardNotificationItem[] {
  if (!ctx.stageAgeMap || ctx.stageAgeMap.size === 0 || !ctx.pipelines) return []

  const items: DashboardNotificationItem[] = []
  const scope = ctx.isAdmin ? 'company' : 'user'
  const now = Date.now()
  const staleCutoffMs = STAGE_STALE_DAYS * 24 * 60 * 60 * 1000

  const activeLeads = ctx.visibleLeads.filter(isLeadActive)

  const grouped = new Map<string, Lead[]>()
  for (const lead of activeLeads) {
    const enteredAt = ctx.stageAgeMap.get(lead.id) || lead.created_at
    const elapsed = now - new Date(enteredAt).getTime()
    if (elapsed < staleCutoffMs) continue

    const key = `${lead.pipeline_id}::${lead.stage_id}`
    const arr = grouped.get(key) || []
    arr.push(lead)
    grouped.set(key, arr)
  }

  const pipelineMap = new Map<string, PipelineWithStages>()
  const stageMap = new Map<string, Stage>()
  for (const p of ctx.pipelines) {
    pipelineMap.set(p.id, p)
    for (const s of p.stages || []) {
      stageMap.set(s.id, s)
    }
  }

  for (const [key, leads] of grouped) {
    const [pipelineId, stageId] = key.split('::')
    const pipeline = pipelineMap.get(pipelineId)
    const stage = stageMap.get(stageId)
    if (!pipeline || !stage) continue

    const oldestEnteredAt = leads.reduce((oldest, lead) => {
      const entered = ctx.stageAgeMap!.get(lead.id) || lead.created_at
      return new Date(entered) < new Date(oldest) ? entered : oldest
    }, ctx.stageAgeMap!.get(leads[0].id) || leads[0].created_at)

    const daysStale = Math.floor((now - new Date(oldestEnteredAt).getTime()) / (24 * 60 * 60 * 1000))
    const severity = daysStale >= 7 ? 'warning' : 'info'

    items.push({
      id: `stage-stale-${pipelineId}-${stageId}`,
      source: 'leads',
      severity,
      ownerScope: scope,
      title: `${leads.length} lead${leads.length > 1 ? 's' : ''} parado${leads.length > 1 ? 's' : ''} em ${stage.name}`,
      message: `Pipeline ${pipeline.name} — há mais de ${daysStale} dia${daysStale > 1 ? 's' : ''} sem avançar de etapa.`,
      count: leads.length,
      href: `/kanban?pipeline=${pipelineId}`,
      details: take(leads, MAX_DETAILS).map(leadDetail)
    })
  }

  return items
}
