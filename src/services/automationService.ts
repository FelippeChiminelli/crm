import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { AutomationRule, CreateAutomationRuleData, UpdateAutomationRuleData, Lead, TaskPriority } from '../types'
import { createTask } from './taskService'
import { requestAutomationCreateTaskPrompt } from '../utils/automationUiBridge'

// CRUD básico de automações
export async function listAutomations(): Promise<{ data: AutomationRule[]; error: any }> {
  const empresaId = await getUserEmpresaId()
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
  return { data: (data || []) as AutomationRule[], error }
}

export async function createAutomation(payload: CreateAutomationRuleData): Promise<{ data: AutomationRule | null; error: any }> {
  const empresaId = await getUserEmpresaId()
  try {
    const row = {
      empresa_id: empresaId,
      name: payload.name,
      description: payload.description || null,
      active: payload.active ?? true,
      event_type: payload.event_type,
      condition: payload.condition || {},
      action: payload.action
    }
    const { data, error } = await supabase
      .from('automations')
      .insert([row])
      .select()
      .single()
    if (error) {
      console.error('❌ createAutomation falhou', { empresaId, row, error })
    }
    return { data: (data || null) as AutomationRule | null, error }
  } catch (e) {
    console.error('❌ createAutomation erro inesperado', { empresaId, payload, e })
    return { data: null, error: e }
  }
}

export async function updateAutomation(id: string, payload: UpdateAutomationRuleData): Promise<{ data: AutomationRule | null; error: any }> {
  const empresaId = await getUserEmpresaId()
  const { data, error } = await supabase
    .from('automations')
    .update({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.active !== undefined ? { active: payload.active } : {}),
      ...(payload.event_type !== undefined ? { event_type: payload.event_type } : {}),
      ...(payload.condition !== undefined ? { condition: payload.condition } : {}),
      ...(payload.action !== undefined ? { action: payload.action } : {}),
    })
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()
  return { data: (data || null) as AutomationRule | null, error }
}

export async function deleteAutomation(id: string): Promise<{ error: any }> {
  const empresaId = await getUserEmpresaId()
  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)
  return { error }
}

// Engine mínima: avaliar automações por evento e executar ações
type LeadStageChangedEvent = {
  type: 'lead_stage_changed'
  lead: Lead
  previous_stage_id: string
  new_stage_id: string
}

export async function evaluateAutomationsForLeadStageChanged(event: LeadStageChangedEvent): Promise<void> {
  const empresaId = await getUserEmpresaId()
  console.log('[AUTO] lead_stage_changed recebido', {
    empresaId,
    leadId: event.lead?.id,
    previous_stage_id: event.previous_stage_id,
    new_stage_id: event.new_stage_id
  })
  const { data: rules } = await supabase
    .from('automations')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('active', true)
    .eq('event_type', 'lead_stage_changed')

  const activeRules: AutomationRule[] = (rules || []) as AutomationRule[]
  console.log('[AUTO] Regras ativas encontradas:', activeRules.length)
  for (const rule of activeRules) {
    try {
      console.log('[AUTO] Avaliando regra', rule.id, rule.name)
      const condition = rule.condition || {}
      // Condições suportadas: from_pipeline_id/from_stage_id/to_pipeline_id/to_stage_id
      const fromStageOk = !condition?.from_stage_id || condition.from_stage_id === event.previous_stage_id
      const toStageOk = !condition?.to_stage_id || condition.to_stage_id === event.new_stage_id

      // Buscar pipeline atual do lead quando necessário
      let leadPipelineId = event.lead.pipeline_id
      if (!leadPipelineId) {
        const { data: leadRow } = await supabase
          .from('leads')
          .select('pipeline_id')
          .eq('id', event.lead.id)
          .single()
        leadPipelineId = (leadRow as any)?.pipeline_id
      }

      const fromPipeIds: string[] | undefined = (condition?.from_pipeline_ids as string[] | undefined)
      const toPipeIds: string[] | undefined = (condition?.to_pipeline_ids as string[] | undefined)

      const fromPipeOk = !fromPipeIds || fromPipeIds.length === 0 || (leadPipelineId ? fromPipeIds.includes(leadPipelineId) : false)

      // Para validar to_pipeline_ids, precisamos descobrir o pipeline da etapa de destino
      let toStagePipelineId: string | undefined = undefined
      if (toPipeIds && toPipeIds.length > 0) {
        const { data: stageRow } = await supabase
          .from('stages')
          .select('pipeline_id')
          .eq('id', event.new_stage_id)
          .single()
        toStagePipelineId = (stageRow as any)?.pipeline_id
      }
      const toPipeOk = !toPipeIds || toPipeIds.length === 0 || (toStagePipelineId ? toPipeIds.includes(toStagePipelineId) : false)

      const fromOk = fromStageOk && fromPipeOk
      const toOk = toStageOk && toPipeOk
      if (!fromOk || !toOk) {
        console.log('[AUTO] Regra ignorada por condição não satisfeita', {
          ruleId: rule.id,
          fromStageOk,
          toStageOk,
          fromPipeOk,
          toPipeOk
        })
        continue
      }

      const action = rule.action || {}
      const actionType = action.type as string
      console.log('[AUTO] Ação da regra', { ruleId: rule.id, actionType, action })

      if (actionType === 'move_lead') {
        // Requer: target_pipeline_id e target_stage_id
        const targetPipelineId = action.target_pipeline_id as string
        const targetStageId = action.target_stage_id as string
        if (!targetPipelineId || !targetStageId) continue

        // Evitar loop: se já está nesse pipeline/etapa, ignora
        if (event.lead.pipeline_id === targetPipelineId && event.lead.stage_id === targetStageId) {
          continue
        }

        // Atualiza lead
        await supabase
          .from('leads')
          .update({ pipeline_id: targetPipelineId, stage_id: targetStageId })
          .eq('id', event.lead.id)
          .eq('empresa_id', empresaId)
        console.log('[AUTO] Lead movido por automação', { ruleId: rule.id })
      }

      if (actionType === 'create_task') {
        // Configuração esperada (opcional): title, priority, task_type_id, due_in_days, assign_to_responsible, assigned_to
        const title: string = (action.title as string) || 'Tarefa automática'
        const priority: TaskPriority | undefined = action.priority as TaskPriority | undefined
        const taskTypeIdRaw: string | undefined = action.task_type_id as string | undefined
        const taskTypeId: string | undefined = taskTypeIdRaw && taskTypeIdRaw.trim() ? taskTypeIdRaw : undefined
        const dueInDays: number | undefined = typeof action.due_in_days === 'number' ? action.due_in_days : undefined
        // Responsável: se houver assigned_to explícito na regra, sempre usar; caso contrário, automático
        const explicitAssignedToRaw: string | undefined = action.assigned_to as string | undefined
        const explicitAssignedTo: string | undefined = explicitAssignedToRaw && explicitAssignedToRaw.trim() ? explicitAssignedToRaw : undefined

        // Calcular due_date se configurado
        let dueDate: string | undefined = undefined
        if (typeof dueInDays === 'number') {
          const now = new Date()
          now.setDate(now.getDate() + dueInDays)
          // Formatar como YYYY-MM-DD
          const yyyy = now.getFullYear()
          const mm = String(now.getMonth() + 1).padStart(2, '0')
          const dd = String(now.getDate()).padStart(2, '0')
          dueDate = `${yyyy}-${mm}-${dd}`
        }

        // Definir responsável
        // Responsável: sempre o usuário que executou a ação (quem moveu o card)
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const assignedTo = explicitAssignedTo || currentUser?.id || event.lead.responsible_uuid

        try {
          // Solicitar dados ao usuário (se houver handler registrado)
          const uiInput = {
            ruleId: rule.id,
            leadId: event.lead.id,
            pipelineId: event.lead.pipeline_id,
            defaultTitle: title,
            defaultPriority: priority,
            defaultAssignedTo: assignedTo,
            defaultDueDate: dueDate,
            defaultDueTime: undefined as string | undefined,
          }
          const uiResult = await requestAutomationCreateTaskPrompt(uiInput)

          const payload = {
            title,
            description: rule.description || undefined,
            lead_id: event.lead.id,
            pipeline_id: event.lead.pipeline_id,
            priority,
            due_date: uiResult?.due_date ?? dueDate,
            due_time: uiResult?.due_time ?? undefined,
            ...(assignedTo ? { assigned_to: assignedTo } : {}),
            ...(taskTypeId ? { task_type_id: taskTypeId } : {}),
          }
          console.log('[AUTO] Criando tarefa por automação', { ruleId: rule.id, payload })
          await createTask(payload as any)
          console.log('[AUTO] Tarefa criada com sucesso por automação', { ruleId: rule.id })
        } catch (taskErr) {
          console.error('Erro ao criar tarefa por automação', { ruleId: rule.id, taskErr })
        }
      }

      // Futuras ações: send_message/send_notification
    } catch (err) {
      console.error('Erro ao executar automação', rule.id, err)
    }
  }
}


