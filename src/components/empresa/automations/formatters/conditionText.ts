import type { AutomationRule } from '../../../../types'
import { formatTaskTypeName } from '../../../../utils/taskTypeDisplay'
import { formatScheduleWindow } from '../conditions/scheduleWindow'
import { getStageChangePipelineId } from '../conditions/stageChangePipeline'
import { LEAD_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, BOOKING_STATUS_OPTIONS } from '../constants'
import type { AutomationLookups } from '../useAutomationLookups'

export function createConditionFormatter(lookups: AutomationLookups) {
  const { pipelines, stageIndex, profiles, taskTypes, dateCustomFields, lossReasons, whatsappInstances, bookingCalendars, bookingTypes } = lookups

  function formatUniversalConditions(cond: any): string[] {
    const parts: string[] = []
    const statuses = cond.statuses as string[] | undefined
    if (statuses?.length) {
      const labels = statuses.map(s => LEAD_STATUS_OPTIONS.find(o => o.value === s)?.label || s)
      parts.push(`Status: ${labels.join(', ')}`)
    }
    const origins = cond.origins as string[] | undefined
    if (origins?.length) {
      parts.push(`Origem: ${origins.join(', ')}`)
    }
    const tags = cond.tags as string[] | undefined
    if (tags?.length) {
      parts.push(`Tags: ${tags.join(', ')}`)
    }
    return parts
  }

  function formatConditions(rule: AutomationRule): string | null {
    const cond: any = rule.condition || {}
    const eventType = rule.event_type

    if (eventType === 'conversation_created') {
      const parts: string[] = []
      const instanceIds = cond.instance_ids as string[] | undefined
      if (instanceIds?.length) {
        const names = instanceIds
          .map(id => whatsappInstances.find(i => i.id === id)?.name || id)
          .join(', ')
        parts.push(`Instância: ${names}`)
      }
      if (cond.has_lead === true) parts.push('Com lead vinculado')
      if (cond.has_lead === false) parts.push('Sem lead vinculado')
      const assignedIds = cond.assigned_user_ids as string[] | undefined
      if (assignedIds?.length) {
        const names = assignedIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Atribuído a: ${names}`)
      }
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'booking_created') {
      const parts: string[] = []
      const calendarIds = cond.calendar_ids as string[] | undefined
      if (calendarIds?.length) {
        const names = calendarIds
          .map(id => bookingCalendars.find(c => c.id === id)?.name || id)
          .join(', ')
        parts.push(`Agenda: ${names}`)
      }
      const bookingTypeIds = cond.booking_type_ids as string[] | undefined
      if (bookingTypeIds?.length) {
        const names = bookingTypeIds
          .map(id => bookingTypes.find(t => t.id === id)?.name || id)
          .join(', ')
        parts.push(`Tipo: ${names}`)
      }
      const assignedIds = cond.assigned_to_ids as string[] | undefined
      if (assignedIds?.length) {
        const names = assignedIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Responsável: ${names}`)
      }
      const statuses = cond.statuses as string[] | undefined
      if (statuses?.length) {
        const labels = statuses
          .map(s => BOOKING_STATUS_OPTIONS.find(o => o.value === s)?.label || s)
          .join(', ')
        parts.push(`Status: ${labels}`)
      }
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'task_created') {
      const parts: string[] = []
      const taskTypeIds = cond.task_type_ids as string[] | undefined
      if (taskTypeIds?.length) {
        const names = taskTypeIds
          .map(id => formatTaskTypeName(taskTypes.find(t => t.id === id)?.name) || id)
          .join(', ')
        parts.push(`Tipo: ${names}`)
      }
      const priorities = cond.priorities as string[] | undefined
      if (priorities?.length) {
        const labels = priorities
          .map(p => TASK_PRIORITY_OPTIONS.find(o => o.value === p)?.label || p)
          .join(', ')
        parts.push(`Prioridade: ${labels}`)
      }
      const assignedIds = cond.assigned_to_ids as string[] | undefined
      if (assignedIds?.length) {
        const names = assignedIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Responsável: ${names}`)
      }
      const createdByIds = cond.created_by_ids as string[] | undefined
      if (createdByIds?.length) {
        const names = createdByIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Criador: ${names}`)
      }
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'task_due_date_reached') {
      const parts: string[] = []
      const offsetValue = (cond.offset_value as number | undefined) ?? 0
      const offsetDirection = (cond.offset_direction as string | undefined) || 'on'
      const offsetUnit = (cond.offset_unit as string | undefined) || 'days'
      if (offsetDirection === 'on' || offsetValue === 0) {
        parts.push('No vencimento')
      } else {
        const unitLabel = offsetUnit === 'hours'
          ? (offsetValue === 1 ? 'hora' : 'horas')
          : (offsetValue === 1 ? 'dia' : 'dias')
        parts.push(`${offsetValue} ${unitLabel} ${offsetDirection === 'before' ? 'antes' : 'depois'}`)
      }
      const statuses = cond.statuses as string[] | undefined
      if (statuses?.length) {
        const labels = statuses
          .map(s => TASK_STATUS_OPTIONS.find(o => o.value === s)?.label || s)
          .join(', ')
        parts.push(`Status: ${labels}`)
      }
      const taskTypeIds = cond.task_type_ids as string[] | undefined
      if (taskTypeIds?.length) {
        const names = taskTypeIds
          .map(id => formatTaskTypeName(taskTypes.find(t => t.id === id)?.name) || id)
          .join(', ')
        parts.push(`Tipo: ${names}`)
      }
      const priorities = cond.priorities as string[] | undefined
      if (priorities?.length) {
        const labels = priorities
          .map(p => TASK_PRIORITY_OPTIONS.find(o => o.value === p)?.label || p)
          .join(', ')
        parts.push(`Prioridade: ${labels}`)
      }
      const assignedIds = cond.assigned_to_ids as string[] | undefined
      if (assignedIds?.length) {
        const names = assignedIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Responsável: ${names}`)
      }
      const createdByIds = cond.created_by_ids as string[] | undefined
      if (createdByIds?.length) {
        const names = createdByIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Criador: ${names}`)
      }
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'lead_idle_in_stage') {
      const parts: string[] = []
      const idleValue = cond.idle_time_value as number | undefined
      const idleUnit = cond.idle_time_unit as string | undefined
      if (idleValue) {
        const unitLabel = idleUnit === 'days' ? (idleValue === 1 ? 'dia' : 'dias') : idleUnit === 'minutes' ? (idleValue === 1 ? 'minuto' : 'minutos') : (idleValue === 1 ? 'hora' : 'horas')
        parts.push(`Parado há ${idleValue} ${unitLabel}`)
      }
      const pipeIds = cond.pipeline_ids as string[] | undefined
      if (pipeIds?.length) {
        const names = pipeIds.map(id => pipelines.find(p => p.id === id)?.name || id).join(', ')
        parts.push(`Pipeline: ${names}`)
      }
      const stIds = cond.stage_ids as string[] | undefined
      if (stIds?.length) {
        const names = stIds.map(id => stageIndex[id]?.name || id).join(', ')
        parts.push(`Estágio: ${names}`)
      }
      if (cond.is_recurring) {
        const recurValue = cond.recurring_interval_value as number | undefined
        const recurUnit = cond.recurring_interval_unit as string | undefined
        if (recurValue) {
          const rUnitLabel = recurUnit === 'days' ? (recurValue === 1 ? 'dia' : 'dias') : recurUnit === 'minutes' ? (recurValue === 1 ? 'minuto' : 'minutos') : (recurValue === 1 ? 'hora' : 'horas')
          parts.push(`Repete a cada ${recurValue} ${rUnitLabel}`)
        }
      } else {
        parts.push('Disparo único')
      }
      const scheduleText = formatScheduleWindow(cond.schedule_window)
      if (scheduleText) parts.push(scheduleText)
      const maxPerRun = cond.max_per_run as number | undefined
      if (maxPerRun) parts.push(`Até ${maxPerRun} por rodada`)
      parts.push(...formatUniversalConditions(cond))
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'custom_field_date_reached') {
      const parts: string[] = []
      const fieldIds = cond.field_ids as string[] | undefined
      if (fieldIds?.length) {
        const names = fieldIds
          .map(id => dateCustomFields.find(f => f.id === id)?.name || id)
          .join(', ')
        parts.push(`Campos: ${names}`)
      }
      const offsetValue = (cond.offset_value as number | undefined) ?? 0
      const offsetDirection = (cond.offset_direction as string | undefined) || 'on'
      if (offsetDirection === 'on' || offsetValue === 0) {
        parts.push('No dia')
      } else if (offsetDirection === 'before') {
        parts.push(`${offsetValue} ${offsetValue === 1 ? 'dia antes' : 'dias antes'}`)
      } else if (offsetDirection === 'after') {
        parts.push(`${offsetValue} ${offsetValue === 1 ? 'dia depois' : 'dias depois'}`)
      }
      const fireTime = cond.fire_time as string | undefined
      if (fireTime) parts.push(`às ${fireTime}`)
      const pipeIds = cond.pipeline_ids as string[] | undefined
      if (pipeIds?.length) {
        const names = pipeIds.map(id => pipelines.find(p => p.id === id)?.name || id).join(', ')
        parts.push(`Pipeline: ${names}`)
      }
      parts.push(...formatUniversalConditions(cond))
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'lead_created') {
      const parts: string[] = []
      const pipeIds = cond.pipeline_ids as string[] | undefined
      if (pipeIds?.length) {
        const names = pipeIds.map(id => pipelines.find(p => p.id === id)?.name || id).join(', ')
        parts.push(`Pipeline: ${names}`)
      }
      const stIds = cond.stage_ids as string[] | undefined
      if (stIds?.length) {
        const names = stIds.map(id => stageIndex[id]?.name || id).join(', ')
        parts.push(`Estágio: ${names}`)
      }
      const respIds = ((cond.responsible_uuids as string[] | undefined) || []).filter(Boolean)
      if (respIds.length > 0) {
        const names = respIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Responsável: ${names}`)
      }
      parts.push(...formatUniversalConditions(cond))
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'lead_responsible_assigned') {
      const parts: string[] = []
      const pipelineId = cond.pipeline_id as string | undefined
      if (pipelineId) {
        const pipeName = pipelines.find(p => p.id === pipelineId)?.name || pipelineId
        parts.push(`Pipeline: ${pipeName}`)
      }

      const responsibleIds = ((cond.responsible_uuids as string[] | undefined) || [])
        .filter(Boolean)
      const singleResponsible = (cond.responsible_uuid as string | undefined)?.trim()
      const normalizedResponsibleIds = responsibleIds.length > 0
        ? responsibleIds
        : (singleResponsible ? [singleResponsible] : [])

      if (normalizedResponsibleIds.length > 0) {
        const names = normalizedResponsibleIds
          .map((id) => profiles.find((p) => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Responsável: ${names}`)
      }

      parts.push(...formatUniversalConditions(cond))
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'lead_marked_sold' || eventType === 'lead_marked_lost') {
      const parts: string[] = []
      const pipelineId = cond.pipeline_id as string | undefined
      if (pipelineId) {
        const pipeName = pipelines.find(p => p.id === pipelineId)?.name || pipelineId
        parts.push(`Pipeline: ${pipeName}`)
      }
      const lossReasonIds = cond.loss_reason_ids as string[] | undefined
      if (eventType === 'lead_marked_lost' && lossReasonIds && lossReasonIds.length > 0) {
        const reasonNames = lossReasonIds
          .map(id => lossReasons.find(r => r.id === id)?.name || id)
          .join(', ')
        parts.push(`Motivos: ${reasonNames}`)
      }
      parts.push(...formatUniversalConditions(cond))
      return parts.length > 0 ? parts.join(' • ') : null
    }

    const fromPipeId = getStageChangePipelineId(cond, 'from') || undefined
    const fromStageId = cond.from_stage_id as string | undefined
    const toPipeId = getStageChangePipelineId(cond, 'to') || undefined
    const toStageId = cond.to_stage_id as string | undefined

    const getPipeName = (id?: string) => (id ? (pipelines.find(p => p.id === id)?.name || id) : undefined)
    const getStageName = (id?: string) => (id ? (stageIndex[id]?.name || id) : undefined)

    const parts: string[] = []
    if (fromPipeId || fromStageId) {
      const fp = getPipeName(fromPipeId)
      const fs = getStageName(fromStageId)
      parts.push(`De ${[fp, fs].filter(Boolean).join(' > ')}`)
    }
    if (toPipeId || toStageId) {
      const tp = getPipeName(toPipeId)
      const ts = getStageName(toStageId)
      parts.push(`Para ${[tp, ts].filter(Boolean).join(' > ')}`)
    }
    parts.push(...formatUniversalConditions(cond))
    if (parts.length === 0) return null
    return parts.join(' • ')
  }

  return formatConditions
}
