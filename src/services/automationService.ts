import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import type { AutomationRule, CreateAutomationRuleData, UpdateAutomationRuleData, Lead, TaskPriority } from '../types'
import { createTask } from './taskService'
import { markLeadAsSold, markLeadAsLost, updateLead } from './leadService'
import { getCustomValuesByLead } from './leadCustomValueService'
import { getCustomFieldsByPipeline } from './leadCustomFieldService'
import { findOrCreateConversationByPhone, sendMessage } from './chatService'
import { 
  requestAutomationCreateTaskPrompt,
  requestAutomationSalePrompt,
  requestAutomationLossPrompt,
  notifyAutomationComplete
} from '../utils/automationUiBridge'

// Helper: interpolar variáveis dinâmicas na mensagem template
function interpolateMessageTemplate(template: string, lead: Lead): string {
  const variables: Record<string, string> = {
    '{nome_lead}': lead.name || '',
    '{primeiro_nome}': (lead.name || '').split(' ')[0],
    '{empresa_lead}': lead.company || '',
    '{telefone}': lead.phone || '',
    '{email}': lead.email || '',
    '{valor}': lead.value != null ? String(lead.value) : '',
    '{origem}': lead.origin || '',
    '{notas}': lead.notes || '',
  }

  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.split(key).join(value)
  }
  return result
}

// Helper: executar ação de envio de WhatsApp
async function executeWhatsAppAction(
  action: Record<string, any>,
  lead: Lead,
  empresaId: string,
  ruleId: string
): Promise<void> {
  const instanceId = action.instance_id as string
  const messageTemplate = (action.message_template as string) || ''
  const waMessageType = (action.wa_message_type as string) || 'text'
  const mediaUrl = action.media_url as string | undefined
  const mediaFilename = (action.media_filename as string) || ''

  if (!instanceId?.trim()) {
    console.warn('[AUTO] Ação send_whatsapp sem instância configurada', { ruleId })
    return
  }

  if (waMessageType === 'text' && !messageTemplate.trim()) {
    console.warn('[AUTO] Ação send_whatsapp sem mensagem configurada', { ruleId })
    return
  }

  if (waMessageType !== 'text' && !mediaUrl?.trim()) {
    console.warn('[AUTO] Ação send_whatsapp sem mídia configurada', { ruleId, waMessageType })
    return
  }

  const phone = lead.phone
  if (!phone?.trim()) {
    console.warn('[AUTO] Lead sem telefone, ação send_whatsapp ignorada', { ruleId, leadId: lead.id })
    return
  }

  try {
    const conversation = await findOrCreateConversationByPhone(phone, lead.id, instanceId)
    const content = messageTemplate.trim() ? interpolateMessageTemplate(messageTemplate, lead) : ''

    if (waMessageType === 'text') {
      await sendMessage({
        conversation_id: conversation.id,
        instance_id: instanceId,
        message_type: 'text',
        content,
      })
    } else {
      const aletNum = Math.floor(100000 + Math.random() * 900000)
      const resp = await fetch('https://n8n.advcrm.com.br/webhook/midiascrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_type: waMessageType,
          type_message: waMessageType,
          conversation_id: conversation.id,
          instance_id: instanceId,
          empresa_id: empresaId,
          media_url: mediaUrl,
          content: content || undefined,
          filename: mediaFilename || undefined,
          alet_num: aletNum,
        })
      })
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Webhook midiascrm falhou: ${resp.status} ${resp.statusText} ${text}`)
      }
    }

    console.log('[AUTO] Mensagem WhatsApp enviada por automação', {
      ruleId, leadId: lead.id, conversationId: conversation.id, waMessageType,
      hasMedia: !!mediaUrl
    })
  } catch (err) {
    console.error('[AUTO] Erro ao enviar WhatsApp por automação', { ruleId, leadId: lead.id, err })
  }
}

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
    const actions = (payload.actions || []).filter((item): item is Record<string, any> => !!item && typeof item === 'object')
    const fallbackAction = payload.action && typeof payload.action === 'object'
      ? payload.action
      : (actions[0] || {})
    const row = {
      empresa_id: empresaId,
      name: payload.name,
      description: payload.description || null,
      active: payload.active ?? true,
      event_type: payload.event_type,
      condition: payload.condition || {},
      action: fallbackAction,
      actions
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
  const actions = (payload.actions || []).filter((item): item is Record<string, any> => !!item && typeof item === 'object')
  const fallbackAction = payload.action && typeof payload.action === 'object'
    ? payload.action
    : (actions[0] || undefined)
  const { data, error } = await supabase
    .from('automations')
    .update({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.active !== undefined ? { active: payload.active } : {}),
      ...(payload.event_type !== undefined ? { event_type: payload.event_type } : {}),
      ...(payload.condition !== undefined ? { condition: payload.condition } : {}),
      ...(payload.action !== undefined || payload.actions !== undefined ? { action: fallbackAction } : {}),
      ...(payload.actions !== undefined ? { actions } : {}),
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

function getRuleActions(rule: AutomationRule): Record<string, any>[] {
  const actions = (rule.actions || []).filter((item): item is Record<string, any> => !!item && typeof item === 'object')
  if (actions.length > 0) return actions
  if (rule.action && typeof rule.action === 'object') return [rule.action]
  return []
}

function evaluateLeadAttributeConditions(
  condition: Record<string, any>,
  lead: Lead
): { ok: boolean; reason?: string } {
  const statuses = condition?.statuses as string[] | undefined
  if (statuses?.length && (!lead.status || !statuses.includes(lead.status))) {
    return { ok: false, reason: `status "${lead.status || ''}" não está em [${statuses.join(', ')}]` }
  }

  const origins = condition?.origins as string[] | undefined
  if (origins?.length && (!lead.origin || !origins.includes(lead.origin))) {
    return { ok: false, reason: `origem "${lead.origin || ''}" não está em [${origins.join(', ')}]` }
  }

  const condTags = condition?.tags as string[] | undefined
  if (condTags?.length) {
    const leadTags = lead.tags || []
    const hasMatch = condTags.some(t => leadTags.includes(t))
    if (!hasMatch) {
      return { ok: false, reason: `tags [${leadTags.join(', ')}] não intersecta [${condTags.join(', ')}]` }
    }
  }

  return { ok: true }
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

      const attrCheck = evaluateLeadAttributeConditions(condition, event.lead)
      if (!attrCheck.ok) {
        console.log('[AUTO] Regra ignorada por condição de atributo do lead', { ruleId: rule.id, reason: attrCheck.reason })
        continue
      }

      const actions = getRuleActions(rule)
      if (actions.length === 0) {
        console.warn('[AUTO] Regra sem ação configurada', { ruleId: rule.id })
        continue
      }
      console.log('[AUTO] Ações da regra', { ruleId: rule.id, actionsCount: actions.length })
      for (const action of actions) {
      const actionType = action.type as string
      console.log('[AUTO] Executando ação da regra', { ruleId: rule.id, actionType, action })

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

      if (actionType === 'assign_responsible') {
        const targetResponsibleUuidRaw = action.responsible_uuid as string | undefined
        const targetResponsibleUuid = targetResponsibleUuidRaw?.trim()
        if (!targetResponsibleUuid) {
          console.warn('[AUTO] Ação assign_responsible sem responsible_uuid', { ruleId: rule.id })
          continue
        }

        if (event.lead.responsible_uuid === targetResponsibleUuid) {
          continue
        }

        await updateLead(event.lead.id, { responsible_uuid: targetResponsibleUuid })
        console.log('[AUTO] Responsável do lead atualizado por automação', { ruleId: rule.id, leadId: event.lead.id, targetResponsibleUuid })
        notifyAutomationComplete()
      }

      if (actionType === 'create_task') {
        // Configuração esperada (opcional): title, priority, task_type_id, due_in_days, assign_to_responsible, assigned_to
        // Novos campos: task_count, due_date_mode, due_time, task_interval_days
        const title: string = (action.title as string) || 'Tarefa automática'
        const priority: TaskPriority | undefined = action.priority as TaskPriority | undefined
        const taskTypeIdRaw: string | undefined = action.task_type_id as string | undefined
        const taskTypeId: string | undefined = taskTypeIdRaw && taskTypeIdRaw.trim() ? taskTypeIdRaw : undefined
        const dueInDays: number | undefined = typeof action.due_in_days === 'number' ? action.due_in_days : undefined
        const dueTime: string | undefined = action.due_time as string | undefined
        const dueDateMode: 'manual' | 'fixed' = (action.due_date_mode as 'manual' | 'fixed') || 'manual'
        const taskCount: number = typeof action.task_count === 'number' && action.task_count > 0 ? action.task_count : 1
        const taskIntervalDays: number = typeof action.task_interval_days === 'number' && action.task_interval_days >= 0 ? action.task_interval_days : 0
        const taskIntervalUnit: 'days' | 'months' = action.task_interval_unit === 'months' ? 'months' : 'days'
        
        // Responsável: se houver assigned_to explícito na regra, sempre usar; caso contrário, automático
        const explicitAssignedToRaw: string | undefined = action.assigned_to as string | undefined
        const explicitAssignedTo: string | undefined = explicitAssignedToRaw && explicitAssignedToRaw.trim() ? explicitAssignedToRaw : undefined

        // Modo de definição do responsável: auto | fixed | manual
        // Compatibilidade com regras antigas: sem assignee_mode, infere de assigned_to
        const rawAssigneeMode = action.assignee_mode as 'auto' | 'fixed' | 'manual' | undefined
        const assigneeMode: 'auto' | 'fixed' | 'manual' = rawAssigneeMode || (explicitAssignedTo ? 'fixed' : 'auto')
        const manualAssignee = assigneeMode === 'manual' && dueDateMode === 'manual'

        // Definir responsável (default antes do modal)
        // Responsável: sempre o usuário que executou a ação (quem moveu o card)
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        let assignedTo: string | undefined = explicitAssignedTo || currentUser?.id || event.lead.responsible_uuid

        try {
          // Se modo é fixo, calcular datas automaticamente sem abrir modal
          if (dueDateMode === 'fixed' && typeof dueInDays === 'number') {
            // Criar múltiplas tarefas com datas calculadas
            for (let i = 0; i < taskCount; i++) {
              const isInitialDecimal = (dueInDays < 1 && dueInDays > 0) || (dueInDays >= 1 && dueInDays % 1 > 0)
              const isIntervalDecimal = (taskIntervalDays < 1 && taskIntervalDays > 0) || (taskIntervalDays >= 1 && taskIntervalDays % 1 > 0)
              
              let calculatedDueDate: string
              let calculatedDueTime: string | undefined = dueTime
              
              if (taskIntervalUnit === 'months' && i > 0) {
                // Recorrência mensal: primeira tarefa usa dueInDays normal; demais somam meses
                const baseDate = new Date()
                baseDate.setDate(baseDate.getDate() + Math.floor(dueInDays))
                baseDate.setMonth(baseDate.getMonth() + i * Math.max(1, Math.round(taskIntervalDays)))
                const yyyy = baseDate.getFullYear()
                const mm = String(baseDate.getMonth() + 1).padStart(2, '0')
                const dd = String(baseDate.getDate()).padStart(2, '0')
                calculatedDueDate = `${yyyy}-${mm}-${dd}`
              } else if (isInitialDecimal || isIntervalDecimal) {
                // Trabalhar com horas quando inicial ou intervalo tiver parte decimal
                // Quando for decimal, sempre calcular horário automaticamente (ignorar dueTime fixo)
                
                // Calcular horas iniciais
                // Detectar casas decimais: se for múltiplo de 0.1 (0.1, 0.2, etc.) usar *10, senão *100
                let initialHours = 0
                if (dueInDays < 1 && dueInDays > 0) {
                  // Apenas horas: detectar se é 1 ou 2 casas decimais
                  const decimalPart = dueInDays % 1
                  const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                  initialHours = isSingleDecimal 
                    ? Math.round(dueInDays * 10)  // 1 casa: 0.1 = 1h
                    : Math.round(dueInDays * 100) // 2 casas: 0.12 = 12h
                } else if (dueInDays >= 1) {
                  // Dias + horas
                  const days = Math.floor(dueInDays)
                  const decimalPart = dueInDays % 1
                  const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                  const hours = isSingleDecimal
                    ? Math.round(decimalPart * 10)  // 1 casa: 0.1 = 1h
                    : Math.round(decimalPart * 100) // 2 casas: 0.12 = 12h
                  initialHours = (days * 24) + hours
                }
                
                // Calcular horas do intervalo
                let intervalHours = 0
                if (taskIntervalDays < 1 && taskIntervalDays > 0) {
                  const decimalPart = taskIntervalDays % 1
                  const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                  intervalHours = (isSingleDecimal
                    ? Math.round(taskIntervalDays * 10)  // 1 casa: 0.1 = 1h
                    : Math.round(taskIntervalDays * 100) // 2 casas: 0.12 = 12h
                  ) * i
                } else if (taskIntervalDays >= 1) {
                  const intervalDays = Math.floor(taskIntervalDays)
                  const intervalDecimalPart = taskIntervalDays % 1
                  const isSingleDecimal = Math.abs(intervalDecimalPart * 10 - Math.round(intervalDecimalPart * 10)) < 0.001
                  const hours = isSingleDecimal
                    ? Math.round(intervalDecimalPart * 10)  // 1 casa: 0.1 = 1h
                    : Math.round(intervalDecimalPart * 100) // 2 casas: 0.12 = 12h
                  intervalHours = ((intervalDays * 24) + hours) * i
                } else {
                  // Intervalo em dias inteiros
                  intervalHours = Math.floor(taskIntervalDays) * 24 * i
                }
                
                const totalHours = initialHours + intervalHours
                
                const taskDateTime = new Date()
                taskDateTime.setHours(taskDateTime.getHours() + totalHours)
                
                // Formatar data
                const yyyy = taskDateTime.getFullYear()
                const mm = String(taskDateTime.getMonth() + 1).padStart(2, '0')
                const dd = String(taskDateTime.getDate()).padStart(2, '0')
                calculatedDueDate = `${yyyy}-${mm}-${dd}`
                
                // Quando for decimal, sempre calcular horário automaticamente
                const hh = String(taskDateTime.getHours()).padStart(2, '0')
                const min = String(taskDateTime.getMinutes()).padStart(2, '0')
                calculatedDueTime = `${hh}:${min}`
              } else {
                // Ambos em dias inteiros: calcular normalmente
                const daysOffset = Math.floor(dueInDays) + (i * Math.floor(taskIntervalDays))
                const taskDate = new Date()
                taskDate.setDate(taskDate.getDate() + daysOffset)
                
                // Formatar como YYYY-MM-DD
                const yyyy = taskDate.getFullYear()
                const mm = String(taskDate.getMonth() + 1).padStart(2, '0')
                const dd = String(taskDate.getDate()).padStart(2, '0')
                calculatedDueDate = `${yyyy}-${mm}-${dd}`
              }

              const payload = {
                title: taskCount > 1 ? `${title} (${i + 1}/${taskCount})` : title,
                description: rule.description || undefined,
                lead_id: event.lead.id,
                pipeline_id: event.lead.pipeline_id,
                priority,
                due_date: calculatedDueDate,
                due_time: calculatedDueTime || undefined,
                ...(assignedTo ? { assigned_to: assignedTo } : {}),
                ...(taskTypeId ? { task_type_id: taskTypeId } : {}),
              }
              console.log('[AUTO] Criando tarefa por automação (modo fixo)', { ruleId: rule.id, taskIndex: i + 1, totalTasks: taskCount, payload })
              await createTask(payload as any)
            }
            console.log('[AUTO] Tarefas criadas com sucesso por automação (modo fixo)', { ruleId: rule.id, count: taskCount })
          } else {
            // Modo manual: abrir modal para confirmar data/horário (comportamento original)
            // Calcular due_date inicial se configurado
            let initialDueDate: string | undefined = undefined
            let initialDueTime: string | undefined = dueTime
            if (typeof dueInDays === 'number') {
              const hasDecimal = (dueInDays < 1 && dueInDays > 0) || (dueInDays >= 1 && dueInDays % 1 > 0)
              
              if (hasDecimal) {
                // Valor com parte decimal - sempre calcular horário automaticamente
                // Detectar casas decimais: se for múltiplo de 0.1 usar *10, senão *100
                let hours = 0
                if (dueInDays < 1 && dueInDays > 0) {
                  const decimalPart = dueInDays % 1
                  const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                  hours = isSingleDecimal
                    ? Math.round(dueInDays * 10)  // 1 casa: 0.1 = 1h
                    : Math.round(dueInDays * 100) // 2 casas: 0.12 = 12h
                } else if (dueInDays >= 1) {
                  const days = Math.floor(dueInDays)
                  const decimalPart = dueInDays % 1
                  const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                  const decimalHours = isSingleDecimal
                    ? Math.round(decimalPart * 10)  // 1 casa: 0.1 = 1h
                    : Math.round(decimalPart * 100) // 2 casas: 0.12 = 12h
                  hours = (days * 24) + decimalHours
                }
                
                const now = new Date()
                now.setHours(now.getHours() + hours)
                
                const yyyy = now.getFullYear()
                const mm = String(now.getMonth() + 1).padStart(2, '0')
                const dd = String(now.getDate()).padStart(2, '0')
                initialDueDate = `${yyyy}-${mm}-${dd}`
                
                // Quando for decimal, sempre calcular horário automaticamente (ignorar dueTime fixo)
                const hh = String(now.getHours()).padStart(2, '0')
                const min = String(now.getMinutes()).padStart(2, '0')
                initialDueTime = `${hh}:${min}`
              } else {
                // Valor inteiro representa dias
                const now = new Date()
                now.setDate(now.getDate() + Math.floor(dueInDays))
                const yyyy = now.getFullYear()
                const mm = String(now.getMonth() + 1).padStart(2, '0')
                const dd = String(now.getDate()).padStart(2, '0')
                initialDueDate = `${yyyy}-${mm}-${dd}`
              }
            }

            // Solicitar dados ao usuário (se houver handler registrado)
            const uiInput = {
              ruleId: rule.id,
              leadId: event.lead.id,
              pipelineId: event.lead.pipeline_id,
              defaultTitle: title,
              defaultPriority: priority,
              defaultAssignedTo: assignedTo,
              defaultDueDate: initialDueDate,
              defaultDueTime: initialDueTime || undefined,
              manualAssignee,
              defaultTaskCount: taskCount,
              defaultTaskIntervalDays: taskIntervalDays,
              defaultTaskIntervalUnit: taskIntervalUnit,
            }
            const uiResult = await requestAutomationCreateTaskPrompt(uiInput)

            // Se modo manual de responsável e modal foi cancelado, abortar criação
            if (manualAssignee && !uiResult) {
              console.log('[AUTO] Modal cancelado em modo de respons\u00e1vel manual, criação abortada', { ruleId: rule.id })
              continue
            }

            // Sobrescrever responsável quando o modal devolveu seleção manual
            if (manualAssignee && uiResult?.assigned_to) {
              assignedTo = uiResult.assigned_to
            }

            // Usar quantidade e intervalo definidos no modal (fallback para os valores da regra)
            const confirmedTaskCount =
              typeof uiResult?.task_count === 'number' && uiResult.task_count > 0
                ? uiResult.task_count
                : taskCount
            const confirmedInterval =
              typeof uiResult?.task_interval_days === 'number' && uiResult.task_interval_days >= 0
                ? uiResult.task_interval_days
                : taskIntervalDays
            const confirmedIntervalUnit: 'days' | 'months' =
              uiResult?.task_interval_unit === 'months' || uiResult?.task_interval_unit === 'days'
                ? uiResult.task_interval_unit
                : taskIntervalUnit

            // Criar múltiplas tarefas se confirmedTaskCount > 1 (modo manual)
            const confirmedDueDate = uiResult?.due_date ?? initialDueDate
            const confirmedDueTime = uiResult?.due_time ?? dueTime

            for (let i = 0; i < confirmedTaskCount; i++) {
              // Para modo manual com múltiplas tarefas, usar a mesma data confirmada pelo usuário
              // ou calcular com intervalo se houver
              let taskDueDate = confirmedDueDate
              let taskDueTime = confirmedDueTime
              
              if (confirmedTaskCount > 1 && confirmedInterval > 0 && confirmedDueDate) {
                const isIntervalDecimal = (confirmedInterval < 1 && confirmedInterval > 0) || (confirmedInterval >= 1 && confirmedInterval % 1 > 0)
                
                if (confirmedIntervalUnit === 'months') {
                  // Recorrência mensal: i-ésima tarefa = data base + i meses
                  const baseDate = new Date(confirmedDueDate + 'T00:00:00')
                  baseDate.setMonth(baseDate.getMonth() + i * Math.max(1, Math.round(confirmedInterval)))
                  const yyyy = baseDate.getFullYear()
                  const mm = String(baseDate.getMonth() + 1).padStart(2, '0')
                  const dd = String(baseDate.getDate()).padStart(2, '0')
                  taskDueDate = `${yyyy}-${mm}-${dd}`
                  taskDueTime = confirmedDueTime
                } else if (isIntervalDecimal) {
                  // Intervalo com parte decimal (horas ou dias+horas)
                  // Detectar casas decimais: se for múltiplo de 0.1 usar *10, senão *100
                  let intervalHours = 0
                  if (confirmedInterval < 1 && confirmedInterval > 0) {
                    const decimalPart = confirmedInterval % 1
                    const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                    intervalHours = (isSingleDecimal
                      ? Math.round(confirmedInterval * 10)  // 1 casa: 0.1 = 1h
                      : Math.round(confirmedInterval * 100) // 2 casas: 0.12 = 12h
                    ) * i
                  } else if (confirmedInterval >= 1) {
                    const intervalDays = Math.floor(confirmedInterval)
                    const intervalDecimalPart = confirmedInterval % 1
                    const isSingleDecimal = Math.abs(intervalDecimalPart * 10 - Math.round(intervalDecimalPart * 10)) < 0.001
                    const hours = isSingleDecimal
                      ? Math.round(intervalDecimalPart * 10)  // 1 casa: 0.1 = 1h
                      : Math.round(intervalDecimalPart * 100) // 2 casas: 0.12 = 12h
                    intervalHours = ((intervalDays * 24) + hours) * i
                  }
                  
                  const baseDate = new Date(confirmedDueDate + (confirmedDueTime ? `T${confirmedDueTime}` : ''))
                  baseDate.setHours(baseDate.getHours() + intervalHours)
                  
                  const yyyy = baseDate.getFullYear()
                  const mm = String(baseDate.getMonth() + 1).padStart(2, '0')
                  const dd = String(baseDate.getDate()).padStart(2, '0')
                  taskDueDate = `${yyyy}-${mm}-${dd}`
                  
                  // Quando intervalo for decimal, sempre calcular horário automaticamente
                  const hh = String(baseDate.getHours()).padStart(2, '0')
                  const min = String(baseDate.getMinutes()).padStart(2, '0')
                  taskDueTime = `${hh}:${min}`
                } else {
                  // Intervalo em dias inteiros
                  const baseDate = new Date(confirmedDueDate)
                  baseDate.setDate(baseDate.getDate() + (i * Math.floor(confirmedInterval)))
                  const yyyy = baseDate.getFullYear()
                  const mm = String(baseDate.getMonth() + 1).padStart(2, '0')
                  const dd = String(baseDate.getDate()).padStart(2, '0')
                  taskDueDate = `${yyyy}-${mm}-${dd}`
                }
              }

              const payload = {
                title: confirmedTaskCount > 1 ? `${title} (${i + 1}/${confirmedTaskCount})` : title,
                description: rule.description || undefined,
                lead_id: event.lead.id,
                pipeline_id: event.lead.pipeline_id,
                priority,
                due_date: taskDueDate,
                due_time: taskDueTime || confirmedDueTime || undefined,
                ...(assignedTo ? { assigned_to: assignedTo } : {}),
                ...(taskTypeId ? { task_type_id: taskTypeId } : {}),
              }
              console.log('[AUTO] Criando tarefa por automação (modo manual)', { ruleId: rule.id, taskIndex: i + 1, totalTasks: confirmedTaskCount, payload })
              await createTask(payload as any)
            }
            console.log('[AUTO] Tarefas criadas com sucesso por automação (modo manual)', { ruleId: rule.id, count: confirmedTaskCount })
          }
        } catch (taskErr) {
          console.error('Erro ao criar tarefa por automação', { ruleId: rule.id, taskErr })
        }
      }

      // Ação: Marcar lead como vendido
      if (actionType === 'mark_as_sold') {
        try {
          // Buscar dados do lead para o modal
          const { data: leadData } = await supabase
            .from('leads')
            .select('name, value, responsible_uuid')
            .eq('id', event.lead.id)
            .single()
          
          const leadName = (leadData as any)?.name || 'Lead'
          const estimatedValue = (leadData as any)?.value || 0
          const defaultResponsibleUuid = (leadData as any)?.responsible_uuid || undefined

          // Solicitar dados ao usuário (se houver handler registrado)
          const uiInput = {
            ruleId: rule.id,
            leadId: event.lead.id,
            leadName,
            estimatedValue,
            defaultResponsibleUuid
          }
          const uiResult = await requestAutomationSalePrompt(uiInput)

          if (uiResult && typeof uiResult.soldValue === 'number') {
            // skipAutomations=true para evitar loop de automações
            await markLeadAsSold(
              event.lead.id,
              uiResult.soldValue,
              uiResult.saleNotes,
              true,
              undefined,
              uiResult.responsibleUuid
            )
            console.log('[AUTO] Lead marcado como vendido por automação', { ruleId: rule.id, leadId: event.lead.id, soldValue: uiResult.soldValue })
            // Notificar que a automação foi completada para recarregar a UI
            notifyAutomationComplete()
          } else {
            console.log('[AUTO] Ação mark_as_sold cancelada pelo usuário ou sem handler', { ruleId: rule.id })
          }
        } catch (saleErr) {
          console.error('Erro ao marcar lead como vendido por automação', { ruleId: rule.id, saleErr })
        }
      }

      // Ação: Marcar lead como perdido
      if (actionType === 'mark_as_lost') {
        try {
          // Buscar dados do lead para o modal
          const { data: leadData } = await supabase
            .from('leads')
            .select('name, pipeline_id')
            .eq('id', event.lead.id)
            .single()
          
          const leadName = (leadData as any)?.name || 'Lead'
          const pipelineId = (leadData as any)?.pipeline_id || event.lead.pipeline_id

          // Solicitar dados ao usuário (se houver handler registrado)
          const uiInput = {
            ruleId: rule.id,
            leadId: event.lead.id,
            leadName,
            pipelineId
          }
          const uiResult = await requestAutomationLossPrompt(uiInput)

          if (uiResult && uiResult.lossReasonCategory) {
            // skipAutomations=true para evitar loop de automações
            await markLeadAsLost(event.lead.id, uiResult.lossReasonCategory, uiResult.lossReasonNotes, true)
            console.log('[AUTO] Lead marcado como perdido por automação', { ruleId: rule.id, leadId: event.lead.id, lossReason: uiResult.lossReasonCategory })
            // Notificar que a automação foi completada para recarregar a UI
            notifyAutomationComplete()
          } else {
            console.log('[AUTO] Ação mark_as_lost cancelada pelo usuário ou sem handler', { ruleId: rule.id })
          }
        } catch (lossErr) {
          console.error('Erro ao marcar lead como perdido por automação', { ruleId: rule.id, lossErr })
        }
      }

      // Ação: Acionar webhook
      if (actionType === 'call_webhook') {
        const webhookUrl = action.webhook_url as string
        const webhookMethod = (action.webhook_method as 'GET' | 'POST') || 'POST'
        const webhookHeadersArray = (action.webhook_headers as Array<{ key: string; value: string }>) || []
        const webhookFields = (action.webhook_fields as string[]) || []

        if (!webhookUrl || !webhookUrl.match(/^https?:\/\/.+/)) {
          console.error('[AUTO] URL do webhook inválida', { ruleId: rule.id, webhookUrl })
          continue
        }

        if (webhookFields.length === 0) {
          console.error('[AUTO] Nenhum campo selecionado para o webhook', { ruleId: rule.id })
          continue
        }

        try {
          // Montar headers como objeto
          const webhookHeaders: Record<string, string> = {}
          for (const header of webhookHeadersArray) {
            if (header.key && header.key.trim()) {
              webhookHeaders[header.key.trim()] = header.value || ''
            }
          }

          // Separar campos padrão e campos personalizados
          const standardFields = webhookFields.filter(f => !f.startsWith('custom_field_'))
          const customFieldIds = webhookFields
            .filter(f => f.startsWith('custom_field_'))
            .map(f => f.replace('custom_field_', ''))

          // Montar payload com campos padrão do lead
          const leadPayload: Record<string, any> = {}
          for (const field of standardFields) {
            if (field in event.lead) {
              leadPayload[field] = (event.lead as any)[field]
            }
          }

          // Buscar e montar campos personalizados se houver
          let customFieldsPayload: Record<string, any> | undefined
          if (customFieldIds.length > 0) {
            try {
              const [customValuesRes, customFieldsRes] = await Promise.all([
                getCustomValuesByLead(event.lead.id),
                getCustomFieldsByPipeline('null')
              ])
              
              const customValues = customValuesRes.data || []
              const customFieldDefs = customFieldsRes.data || []
              
              customFieldsPayload = {}
              for (const fieldId of customFieldIds) {
                const fieldDef = customFieldDefs.find(f => f.id === fieldId)
                const fieldValue = customValues.find(v => v.field_id === fieldId)
                if (fieldDef) {
                  customFieldsPayload[fieldDef.name] = fieldValue?.value ?? null
                }
              }
            } catch (cfErr) {
              console.error('[AUTO] Erro ao buscar campos personalizados para webhook', cfErr)
            }
          }

          const payload: Record<string, any> = {
            event_type: rule.event_type,
            automation_name: rule.name,
            timestamp: new Date().toISOString(),
            lead: leadPayload
          }
          
          if (customFieldsPayload && Object.keys(customFieldsPayload).length > 0) {
            payload.custom_fields = customFieldsPayload
          }

          console.log('[AUTO] Chamando webhook', { ruleId: rule.id, webhookUrl, webhookMethod, fieldsCount: webhookFields.length, customFieldsCount: customFieldIds.length })

          // Chamar a Edge Function para evitar problemas de CORS
          const { data: { session } } = await supabase.auth.getSession()
          const accessToken = session?.access_token

          const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://dcvpehjfbpburrtviwhq.supabase.co'}/functions/v1/call_webhook`
          
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              url: webhookUrl,
              method: webhookMethod,
              headers: webhookHeaders,
              payload
            })
          })

          const result = await response.json()
          
          if (result.success) {
            console.log('[AUTO] Webhook chamado com sucesso', { ruleId: rule.id, status: result.status })
          } else {
            console.error('[AUTO] Webhook retornou erro', { ruleId: rule.id, error: result.error || result.statusText })
          }
        } catch (webhookErr) {
          console.error('[AUTO] Erro ao chamar webhook', { ruleId: rule.id, webhookErr })
        }
      }

      // Ação: Enviar mensagem WhatsApp
      if (actionType === 'send_whatsapp' && empresaId) {
        await executeWhatsAppAction(action, event.lead, empresaId, rule.id)
      }

      }
    } catch (err) {
      console.error('Erro ao executar automação', rule.id, err)
    }
  }
}

// =============================================
// EVENTOS: LEAD MARCADO COMO VENDIDO/PERDIDO
// =============================================

type LeadMarkedSoldEvent = {
  type: 'lead_marked_sold'
  lead: Lead
  soldValue: number
  saleNotes?: string
}

type LeadMarkedLostEvent = {
  type: 'lead_marked_lost'
  lead: Lead
  lossReasonCategory: string
  lossReasonNotes?: string
}

type LeadResponsibleAssignedEvent = {
  type: 'lead_responsible_assigned'
  lead: Lead
  previous_responsible_uuid?: string | null
  new_responsible_uuid: string
}

/**
 * Avalia automações que devem ser executadas quando um lead é marcado como vendido
 */
export async function evaluateAutomationsForLeadMarkedSold(event: LeadMarkedSoldEvent): Promise<void> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) {
    console.warn('[AUTO] lead_marked_sold ignorado: usuário não autenticado')
    return
  }

  console.log('[AUTO] lead_marked_sold recebido', {
    empresaId,
    leadId: event.lead?.id,
    soldValue: event.soldValue
  })

  const { data: rules } = await supabase
    .from('automations')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('active', true)
    .eq('event_type', 'lead_marked_sold')

  const activeRules: AutomationRule[] = (rules || []) as AutomationRule[]
  console.log('[AUTO] Regras ativas para lead_marked_sold:', activeRules.length)

  for (const rule of activeRules) {
    try {
      console.log('[AUTO] Avaliando regra', rule.id, rule.name)
      const condition = rule.condition || {}
      
      // Verificar condição de pipeline (se definida)
      const conditionPipelineId = condition?.pipeline_id as string | undefined
      if (conditionPipelineId && conditionPipelineId !== event.lead.pipeline_id) {
        console.log('[AUTO] Regra ignorada - pipeline não corresponde', {
          ruleId: rule.id,
          conditionPipelineId,
          leadPipelineId: event.lead.pipeline_id
        })
        continue
      }

      const attrCheck = evaluateLeadAttributeConditions(condition, event.lead)
      if (!attrCheck.ok) {
        console.log('[AUTO] Regra ignorada por condição de atributo do lead', { ruleId: rule.id, reason: attrCheck.reason })
        continue
      }

      // Executar ação da automação
      await executeAutomationAction(rule, event.lead, empresaId)
    } catch (err) {
      console.error('Erro ao executar automação para lead_marked_sold', rule.id, err)
    }
  }
}

/**
 * Avalia automações que devem ser executadas quando um lead é marcado como perdido
 */
export async function evaluateAutomationsForLeadMarkedLost(event: LeadMarkedLostEvent): Promise<void> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) {
    console.warn('[AUTO] lead_marked_lost ignorado: usuário não autenticado')
    return
  }

  console.log('[AUTO] lead_marked_lost recebido', {
    empresaId,
    leadId: event.lead?.id,
    lossReasonCategory: event.lossReasonCategory
  })

  const { data: rules } = await supabase
    .from('automations')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('active', true)
    .eq('event_type', 'lead_marked_lost')

  const activeRules: AutomationRule[] = (rules || []) as AutomationRule[]
  console.log('[AUTO] Regras ativas para lead_marked_lost:', activeRules.length)

  for (const rule of activeRules) {
    try {
      console.log('[AUTO] Avaliando regra', rule.id, rule.name)
      const condition = rule.condition || {}
      
      // Verificar condição de pipeline (se definida)
      const conditionPipelineId = condition?.pipeline_id as string | undefined
      if (conditionPipelineId && conditionPipelineId !== event.lead.pipeline_id) {
        console.log('[AUTO] Regra ignorada - pipeline não corresponde', {
          ruleId: rule.id,
          conditionPipelineId,
          leadPipelineId: event.lead.pipeline_id
        })
        continue
      }

      // Verificar condição de motivos de perda (se definida)
      const conditionLossReasonIds = condition?.loss_reason_ids as string[] | undefined
      if (conditionLossReasonIds && conditionLossReasonIds.length > 0) {
        if (!event.lossReasonCategory || !conditionLossReasonIds.includes(event.lossReasonCategory)) {
          console.log('[AUTO] Regra ignorada - motivo de perda não corresponde', {
            ruleId: rule.id,
            conditionLossReasonIds,
            leadLossReasonCategory: event.lossReasonCategory
          })
          continue
        }
      }

      const attrCheck = evaluateLeadAttributeConditions(condition, event.lead)
      if (!attrCheck.ok) {
        console.log('[AUTO] Regra ignorada por condição de atributo do lead', { ruleId: rule.id, reason: attrCheck.reason })
        continue
      }

      // Executar ação da automação
      await executeAutomationAction(rule, event.lead, empresaId)
    } catch (err) {
      console.error('Erro ao executar automação para lead_marked_lost', rule.id, err)
    }
  }
}

/**
 * Avalia automações que devem ser executadas quando um responsável é atribuído ao lead
 */
export async function evaluateAutomationsForLeadResponsibleAssigned(event: LeadResponsibleAssignedEvent): Promise<void> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) {
    console.warn('[AUTO] lead_responsible_assigned ignorado: usuário não autenticado')
    return
  }

  console.log('[AUTO] lead_responsible_assigned recebido', {
    empresaId,
    leadId: event.lead?.id,
    previous_responsible_uuid: event.previous_responsible_uuid,
    new_responsible_uuid: event.new_responsible_uuid
  })

  const { data: rules } = await supabase
    .from('automations')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('active', true)
    .eq('event_type', 'lead_responsible_assigned')

  const activeRules: AutomationRule[] = (rules || []) as AutomationRule[]
  console.log('[AUTO] Regras ativas para lead_responsible_assigned:', activeRules.length)

  for (const rule of activeRules) {
    try {
      console.log('[AUTO] Avaliando regra', rule.id, rule.name)
      const condition = rule.condition || {}

      // Verificar condição de pipeline (se definida)
      const conditionPipelineId = condition?.pipeline_id as string | undefined
      if (conditionPipelineId && conditionPipelineId !== event.lead.pipeline_id) {
        console.log('[AUTO] Regra ignorada - pipeline não corresponde', {
          ruleId: rule.id,
          conditionPipelineId,
          leadPipelineId: event.lead.pipeline_id
        })
        continue
      }

      // Verificar condição de responsável (aceita formato antigo e novo)
      const conditionResponsibleIds = ((condition?.responsible_uuids as string[] | undefined) || [])
        .filter((id) => !!id)
      const conditionResponsibleId = (condition?.responsible_uuid as string | undefined)?.trim()
      const normalizedResponsibleIds = conditionResponsibleIds.length > 0
        ? conditionResponsibleIds
        : (conditionResponsibleId ? [conditionResponsibleId] : [])

      if (normalizedResponsibleIds.length > 0 && !normalizedResponsibleIds.includes(event.new_responsible_uuid)) {
        console.log('[AUTO] Regra ignorada - responsável não corresponde', {
          ruleId: rule.id,
          configuredResponsibleIds: normalizedResponsibleIds,
          newResponsibleUuid: event.new_responsible_uuid
        })
        continue
      }

      const attrCheck = evaluateLeadAttributeConditions(condition, event.lead)
      if (!attrCheck.ok) {
        console.log('[AUTO] Regra ignorada por condição de atributo do lead', { ruleId: rule.id, reason: attrCheck.reason })
        continue
      }

      await executeAutomationAction(rule, event.lead, empresaId)
    } catch (err) {
      console.error('Erro ao executar automação para lead_responsible_assigned', rule.id, err)
    }
  }
}

/**
 * Executa uma ação de automação para um lead
 * Função auxiliar compartilhada entre diferentes tipos de eventos
 */
async function executeAutomationAction(rule: AutomationRule, lead: Lead, empresaId: string): Promise<void> {
  const actions = getRuleActions(rule)
  if (actions.length === 0) {
    console.warn('[AUTO] Regra sem ação configurada', { ruleId: rule.id })
    return
  }
  for (const action of actions) {
    const actionType = action.type as string
    console.log('[AUTO] Executando ação da regra', { ruleId: rule.id, actionType, action })

  // Ação: Mover lead
  if (actionType === 'move_lead') {
    const targetPipelineId = action.target_pipeline_id as string
    const targetStageId = action.target_stage_id as string
    if (!targetPipelineId || !targetStageId) continue

    // Evitar loop: se já está nesse pipeline/etapa, ignora
    if (lead.pipeline_id === targetPipelineId && lead.stage_id === targetStageId) {
      console.log('[AUTO] Lead já está no destino, ignorando')
      continue
    }

    await supabase
      .from('leads')
      .update({ pipeline_id: targetPipelineId, stage_id: targetStageId })
      .eq('id', lead.id)
      .eq('empresa_id', empresaId)
    console.log('[AUTO] Lead movido por automação', { ruleId: rule.id, targetPipelineId, targetStageId })
    notifyAutomationComplete()
  }

  // Ação: Atribuir responsável
  if (actionType === 'assign_responsible') {
    const targetResponsibleUuidRaw = action.responsible_uuid as string | undefined
    const targetResponsibleUuid = targetResponsibleUuidRaw?.trim()
    if (!targetResponsibleUuid) {
      console.warn('[AUTO] Ação assign_responsible sem responsible_uuid', { ruleId: rule.id })
      continue
    }

    if (lead.responsible_uuid === targetResponsibleUuid) {
      console.log('[AUTO] Lead já está com este responsável, ignorando')
      continue
    }

    await updateLead(lead.id, { responsible_uuid: targetResponsibleUuid })
    console.log('[AUTO] Responsável do lead atualizado por automação', { ruleId: rule.id, leadId: lead.id, targetResponsibleUuid })
    notifyAutomationComplete()
  }

  // Ação: Criar tarefa
  if (actionType === 'create_task') {
    const title: string = (action.title as string) || 'Tarefa automática'
    const priority: TaskPriority | undefined = action.priority as TaskPriority | undefined
    const taskTypeIdRaw: string | undefined = action.task_type_id as string | undefined
    const taskTypeId: string | undefined = taskTypeIdRaw && taskTypeIdRaw.trim() ? taskTypeIdRaw : undefined
    const dueInDays: number | undefined = typeof action.due_in_days === 'number' ? action.due_in_days : undefined
    const dueTime: string | undefined = action.due_time as string | undefined
    const dueDateMode: 'manual' | 'fixed' = (action.due_date_mode as 'manual' | 'fixed') || 'manual'
    const taskCount: number = typeof action.task_count === 'number' && action.task_count > 0 ? action.task_count : 1
    const taskIntervalDays: number = typeof action.task_interval_days === 'number' && action.task_interval_days >= 0 ? action.task_interval_days : 0
    const taskIntervalUnit: 'days' | 'months' = action.task_interval_unit === 'months' ? 'months' : 'days'
    
    const explicitAssignedToRaw: string | undefined = action.assigned_to as string | undefined
    const explicitAssignedTo: string | undefined = explicitAssignedToRaw && explicitAssignedToRaw.trim() ? explicitAssignedToRaw : undefined

    // Modo de definição do responsável: auto | fixed | manual
    const rawAssigneeMode = action.assignee_mode as 'auto' | 'fixed' | 'manual' | undefined
    const assigneeMode: 'auto' | 'fixed' | 'manual' = rawAssigneeMode || (explicitAssignedTo ? 'fixed' : 'auto')
    const manualAssignee = assigneeMode === 'manual' && dueDateMode === 'manual'

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    let assignedTo: string | undefined = explicitAssignedTo || currentUser?.id || lead.responsible_uuid

    try {
      if (dueDateMode === 'fixed' && typeof dueInDays === 'number') {
        // Modo fixo: criar tarefas com datas calculadas
        for (let i = 0; i < taskCount; i++) {
          const calculatedDueDate = calculateDueDate(dueInDays, taskIntervalDays, i, taskIntervalUnit)
          const calculatedDueTime = calculateDueTime(dueInDays, taskIntervalDays, i, dueTime, taskIntervalUnit)

          const payload = {
            title: taskCount > 1 ? `${title} (${i + 1}/${taskCount})` : title,
            description: rule.description || undefined,
            lead_id: lead.id,
            pipeline_id: lead.pipeline_id,
            priority,
            due_date: calculatedDueDate,
            due_time: calculatedDueTime || undefined,
            ...(assignedTo ? { assigned_to: assignedTo } : {}),
            ...(taskTypeId ? { task_type_id: taskTypeId } : {}),
          }
          console.log('[AUTO] Criando tarefa por automação (vendido/perdido)', { ruleId: rule.id, taskIndex: i + 1, payload })
          await createTask(payload as any)
        }
        console.log('[AUTO] Tarefas criadas com sucesso', { ruleId: rule.id, count: taskCount })
        notifyAutomationComplete()
      } else {
        // Modo manual: abrir modal
        let initialDueDate: string | undefined = undefined
        let initialDueTime: string | undefined = dueTime
        if (typeof dueInDays === 'number') {
          const result = calculateInitialDueDateTime(dueInDays)
          initialDueDate = result.date
          if (result.time) initialDueTime = result.time
        }

        const uiInput = {
          ruleId: rule.id,
          leadId: lead.id,
          pipelineId: lead.pipeline_id,
          defaultTitle: title,
          defaultPriority: priority,
          defaultAssignedTo: assignedTo,
          defaultDueDate: initialDueDate,
          defaultDueTime: initialDueTime || undefined,
          manualAssignee,
          defaultTaskCount: taskCount,
          defaultTaskIntervalDays: taskIntervalDays,
          defaultTaskIntervalUnit: taskIntervalUnit,
        }
        const uiResult = await requestAutomationCreateTaskPrompt(uiInput)

        // Se modo manual de responsável e modal foi cancelado, abortar criação
        if (manualAssignee && !uiResult) {
          console.log('[AUTO] Modal cancelado em modo de respons\u00e1vel manual, criação abortada', { ruleId: rule.id })
          continue
        }

        // Sobrescrever responsável quando o modal devolveu seleção manual
        if (manualAssignee && uiResult?.assigned_to) {
          assignedTo = uiResult.assigned_to
        }

        // Usar quantidade e intervalo definidos no modal (fallback para os valores da regra)
        const confirmedTaskCount =
          typeof uiResult?.task_count === 'number' && uiResult.task_count > 0
            ? uiResult.task_count
            : taskCount
        const confirmedInterval =
          typeof uiResult?.task_interval_days === 'number' && uiResult.task_interval_days >= 0
            ? uiResult.task_interval_days
            : taskIntervalDays
        const confirmedIntervalUnit: 'days' | 'months' =
          uiResult?.task_interval_unit === 'months' || uiResult?.task_interval_unit === 'days'
            ? uiResult.task_interval_unit
            : taskIntervalUnit

        const confirmedDueDate = uiResult?.due_date ?? initialDueDate
        const confirmedDueTime = uiResult?.due_time ?? dueTime

        for (let i = 0; i < confirmedTaskCount; i++) {
          let taskDueDate = confirmedDueDate
          let taskDueTime = confirmedDueTime

          if (confirmedTaskCount > 1 && confirmedInterval > 0 && confirmedDueDate) {
            const offsetResult = calculateTaskOffset(confirmedDueDate, confirmedDueTime, confirmedInterval, i, confirmedIntervalUnit)
            taskDueDate = offsetResult.date
            taskDueTime = offsetResult.time || confirmedDueTime
          }

          const payload = {
            title: confirmedTaskCount > 1 ? `${title} (${i + 1}/${confirmedTaskCount})` : title,
            description: rule.description || undefined,
            lead_id: lead.id,
            pipeline_id: lead.pipeline_id,
            priority,
            due_date: taskDueDate,
            due_time: taskDueTime || confirmedDueTime || undefined,
            ...(assignedTo ? { assigned_to: assignedTo } : {}),
            ...(taskTypeId ? { task_type_id: taskTypeId } : {}),
          }
          console.log('[AUTO] Criando tarefa por automação (modo manual)', { ruleId: rule.id, taskIndex: i + 1, payload })
          await createTask(payload as any)
        }
        console.log('[AUTO] Tarefas criadas com sucesso (modo manual)', { ruleId: rule.id, count: confirmedTaskCount })
        notifyAutomationComplete()
      }
    } catch (taskErr) {
      console.error('Erro ao criar tarefa por automação', { ruleId: rule.id, taskErr })
    }
  }

  // Ação: Acionar webhook
  if (actionType === 'call_webhook') {
    const webhookUrl = action.webhook_url as string
    const webhookMethod = (action.webhook_method as 'GET' | 'POST') || 'POST'
    const webhookHeadersArray = (action.webhook_headers as Array<{ key: string; value: string }>) || []
    const webhookFields = (action.webhook_fields as string[]) || []

    if (!webhookUrl || !webhookUrl.match(/^https?:\/\/.+/)) {
      console.error('[AUTO] URL do webhook inválida', { ruleId: rule.id, webhookUrl })
      continue
    }

    if (webhookFields.length === 0) {
      console.error('[AUTO] Nenhum campo selecionado para o webhook', { ruleId: rule.id })
      continue
    }

    try {
      // Montar headers como objeto
      const webhookHeaders: Record<string, string> = {}
      for (const header of webhookHeadersArray) {
        if (header.key && header.key.trim()) {
          webhookHeaders[header.key.trim()] = header.value || ''
        }
      }

      // Separar campos padrão e campos personalizados
      const standardFields = webhookFields.filter(f => !f.startsWith('custom_field_'))
      const customFieldIds = webhookFields
        .filter(f => f.startsWith('custom_field_'))
        .map(f => f.replace('custom_field_', ''))

      // Montar payload com campos padrão do lead
      const leadPayload: Record<string, any> = {}
      for (const field of standardFields) {
        if (field in lead) {
          leadPayload[field] = (lead as any)[field]
        }
      }

      // Buscar e montar campos personalizados se houver
      let customFieldsPayload: Record<string, any> | undefined
      if (customFieldIds.length > 0) {
        try {
          const [customValuesRes, customFieldsRes] = await Promise.all([
            getCustomValuesByLead(lead.id),
            getCustomFieldsByPipeline('null')
          ])
          
          const customValues = customValuesRes.data || []
          const customFieldDefs = customFieldsRes.data || []
          
          customFieldsPayload = {}
          for (const fieldId of customFieldIds) {
            const fieldDef = customFieldDefs.find(f => f.id === fieldId)
            const fieldValue = customValues.find(v => v.field_id === fieldId)
            if (fieldDef) {
              customFieldsPayload[fieldDef.name] = fieldValue?.value ?? null
            }
          }
        } catch (cfErr) {
          console.error('[AUTO] Erro ao buscar campos personalizados para webhook', cfErr)
        }
      }

      const payload: Record<string, any> = {
        event_type: rule.event_type,
        automation_name: rule.name,
        timestamp: new Date().toISOString(),
        lead: leadPayload
      }
      
      if (customFieldsPayload && Object.keys(customFieldsPayload).length > 0) {
        payload.custom_fields = customFieldsPayload
      }

      console.log('[AUTO] Chamando webhook', { ruleId: rule.id, webhookUrl, webhookMethod, fieldsCount: webhookFields.length, customFieldsCount: customFieldIds.length })

      // Chamar a Edge Function para evitar problemas de CORS
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://dcvpehjfbpburrtviwhq.supabase.co'}/functions/v1/call_webhook`
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          url: webhookUrl,
          method: webhookMethod,
          headers: webhookHeaders,
          payload
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('[AUTO] Webhook chamado com sucesso', { ruleId: rule.id, status: result.status })
      } else {
        console.error('[AUTO] Webhook retornou erro', { ruleId: rule.id, error: result.error || result.statusText })
      }
    } catch (webhookErr) {
      console.error('[AUTO] Erro ao chamar webhook', { ruleId: rule.id, webhookErr })
    }
  }

  // Ação: Enviar mensagem WhatsApp
  if (actionType === 'send_whatsapp') {
    await executeWhatsAppAction(action, lead, empresaId, rule.id)
  }

  }
}

// =============================================
// FUNÇÕES AUXILIARES PARA CÁLCULO DE DATAS
// =============================================

function calculateDueDate(dueInDays: number, intervalDays: number, taskIndex: number, intervalUnit: 'days' | 'months' = 'days'): string {
  if (intervalUnit === 'months' && taskIndex > 0) {
    // Recorrência mensal: data inicial calculada em dias + offset em meses para tarefas seguintes
    const taskDate = new Date()
    taskDate.setDate(taskDate.getDate() + Math.floor(dueInDays))
    taskDate.setMonth(taskDate.getMonth() + taskIndex * Math.max(1, Math.round(intervalDays)))
    return formatDate(taskDate)
  }

  const isInitialDecimal = (dueInDays < 1 && dueInDays > 0) || (dueInDays >= 1 && dueInDays % 1 > 0)
  const isIntervalDecimal = (intervalDays < 1 && intervalDays > 0) || (intervalDays >= 1 && intervalDays % 1 > 0)

  if (isInitialDecimal || isIntervalDecimal) {
    let initialHours = calculateHoursFromDecimal(dueInDays)
    let intervalHours = calculateHoursFromDecimal(intervalDays) * taskIndex
    const totalHours = initialHours + intervalHours

    const taskDateTime = new Date()
    taskDateTime.setHours(taskDateTime.getHours() + totalHours)

    return formatDate(taskDateTime)
  } else {
    const daysOffset = Math.floor(dueInDays) + (taskIndex * Math.floor(intervalDays))
    const taskDate = new Date()
    taskDate.setDate(taskDate.getDate() + daysOffset)
    return formatDate(taskDate)
  }
}

function calculateDueTime(dueInDays: number, intervalDays: number, taskIndex: number, defaultTime?: string, intervalUnit: 'days' | 'months' = 'days'): string | undefined {
  if (intervalUnit === 'months') {
    return defaultTime
  }

  const isInitialDecimal = (dueInDays < 1 && dueInDays > 0) || (dueInDays >= 1 && dueInDays % 1 > 0)
  const isIntervalDecimal = (intervalDays < 1 && intervalDays > 0) || (intervalDays >= 1 && intervalDays % 1 > 0)

  if (isInitialDecimal || isIntervalDecimal) {
    let initialHours = calculateHoursFromDecimal(dueInDays)
    let intervalHours = calculateHoursFromDecimal(intervalDays) * taskIndex
    const totalHours = initialHours + intervalHours

    const taskDateTime = new Date()
    taskDateTime.setHours(taskDateTime.getHours() + totalHours)

    return formatTime(taskDateTime)
  }

  return defaultTime
}

function calculateInitialDueDateTime(dueInDays: number): { date: string; time?: string } {
  const hasDecimal = (dueInDays < 1 && dueInDays > 0) || (dueInDays >= 1 && dueInDays % 1 > 0)

  if (hasDecimal) {
    const hours = calculateHoursFromDecimal(dueInDays)
    const now = new Date()
    now.setHours(now.getHours() + hours)
    return { date: formatDate(now), time: formatTime(now) }
  } else {
    const now = new Date()
    now.setDate(now.getDate() + Math.floor(dueInDays))
    return { date: formatDate(now) }
  }
}

function calculateTaskOffset(baseDate: string, baseTime: string | undefined, intervalDays: number, taskIndex: number, intervalUnit: 'days' | 'months' = 'days'): { date: string; time?: string } {
  if (intervalUnit === 'months') {
    const baseDateObj = new Date(baseDate + 'T00:00:00')
    baseDateObj.setMonth(baseDateObj.getMonth() + taskIndex * Math.max(1, Math.round(intervalDays)))
    return { date: formatDate(baseDateObj), time: baseTime }
  }

  const isIntervalDecimal = (intervalDays < 1 && intervalDays > 0) || (intervalDays >= 1 && intervalDays % 1 > 0)

  if (isIntervalDecimal) {
    const intervalHours = calculateHoursFromDecimal(intervalDays) * taskIndex
    const baseDateObj = new Date(baseDate + (baseTime ? `T${baseTime}` : ''))
    baseDateObj.setHours(baseDateObj.getHours() + intervalHours)
    return { date: formatDate(baseDateObj), time: formatTime(baseDateObj) }
  } else {
    const baseDateObj = new Date(baseDate)
    baseDateObj.setDate(baseDateObj.getDate() + (taskIndex * Math.floor(intervalDays)))
    return { date: formatDate(baseDateObj) }
  }
}

function calculateHoursFromDecimal(value: number): number {
  if (value < 1 && value > 0) {
    const decimalPart = value % 1
    const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
    return isSingleDecimal ? Math.round(value * 10) : Math.round(value * 100)
  } else if (value >= 1) {
    const days = Math.floor(value)
    const decimalPart = value % 1
    if (decimalPart > 0) {
      const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
      const hours = isSingleDecimal ? Math.round(decimalPart * 10) : Math.round(decimalPart * 100)
      return (days * 24) + hours
    }
    return days * 24
  }
  return 0
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}
