import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { AutomationRule, CreateAutomationRuleData, UpdateAutomationRuleData, Lead } from '../types'

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
  const { data: rules } = await supabase
    .from('automations')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('active', true)
    .eq('event_type', 'lead_stage_changed')

  const activeRules: AutomationRule[] = (rules || []) as AutomationRule[]
  for (const rule of activeRules) {
    try {
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
      if (!fromOk || !toOk) continue

      const action = rule.action || {}
      const actionType = action.type as string

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
      }

      // Futuras ações: send_message/create_task/send_notification
    } catch (err) {
      console.error('Erro ao executar automação', rule.id, err)
    }
  }
}


