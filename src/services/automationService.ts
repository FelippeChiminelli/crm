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
        
        // Responsável: se houver assigned_to explícito na regra, sempre usar; caso contrário, automático
        const explicitAssignedToRaw: string | undefined = action.assigned_to as string | undefined
        const explicitAssignedTo: string | undefined = explicitAssignedToRaw && explicitAssignedToRaw.trim() ? explicitAssignedToRaw : undefined

        // Definir responsável
        // Responsável: sempre o usuário que executou a ação (quem moveu o card)
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const assignedTo = explicitAssignedTo || currentUser?.id || event.lead.responsible_uuid

        try {
          // Se modo é fixo, calcular datas automaticamente sem abrir modal
          if (dueDateMode === 'fixed' && typeof dueInDays === 'number') {
            // Criar múltiplas tarefas com datas calculadas
            for (let i = 0; i < taskCount; i++) {
              const isInitialDecimal = (dueInDays < 1 && dueInDays > 0) || (dueInDays >= 1 && dueInDays % 1 > 0)
              const isIntervalDecimal = (taskIntervalDays < 1 && taskIntervalDays > 0) || (taskIntervalDays >= 1 && taskIntervalDays % 1 > 0)
              
              let calculatedDueDate: string
              let calculatedDueTime: string | undefined = dueTime
              
              if (isInitialDecimal || isIntervalDecimal) {
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
            }
            const uiResult = await requestAutomationCreateTaskPrompt(uiInput)

            // Criar múltiplas tarefas se task_count > 1 (modo manual)
            const confirmedDueDate = uiResult?.due_date ?? initialDueDate
            const confirmedDueTime = uiResult?.due_time ?? dueTime

            for (let i = 0; i < taskCount; i++) {
              // Para modo manual com múltiplas tarefas, usar a mesma data confirmada pelo usuário
              // ou calcular com intervalo se houver
              let taskDueDate = confirmedDueDate
              let taskDueTime = confirmedDueTime
              
              if (taskCount > 1 && taskIntervalDays > 0 && confirmedDueDate) {
                const isIntervalDecimal = (taskIntervalDays < 1 && taskIntervalDays > 0) || (taskIntervalDays >= 1 && taskIntervalDays % 1 > 0)
                
                if (isIntervalDecimal) {
                  // Intervalo com parte decimal (horas ou dias+horas)
                  // Detectar casas decimais: se for múltiplo de 0.1 usar *10, senão *100
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
                  baseDate.setDate(baseDate.getDate() + (i * Math.floor(taskIntervalDays)))
                  const yyyy = baseDate.getFullYear()
                  const mm = String(baseDate.getMonth() + 1).padStart(2, '0')
                  const dd = String(baseDate.getDate()).padStart(2, '0')
                  taskDueDate = `${yyyy}-${mm}-${dd}`
                }
              }

              const payload = {
                title: taskCount > 1 ? `${title} (${i + 1}/${taskCount})` : title,
                description: rule.description || undefined,
                lead_id: event.lead.id,
                pipeline_id: event.lead.pipeline_id,
                priority,
                due_date: taskDueDate,
                due_time: taskDueTime || confirmedDueTime || undefined,
                ...(assignedTo ? { assigned_to: assignedTo } : {}),
                ...(taskTypeId ? { task_type_id: taskTypeId } : {}),
              }
              console.log('[AUTO] Criando tarefa por automação (modo manual)', { ruleId: rule.id, taskIndex: i + 1, totalTasks: taskCount, payload })
              await createTask(payload as any)
            }
            console.log('[AUTO] Tarefas criadas com sucesso por automação (modo manual)', { ruleId: rule.id, count: taskCount })
          }
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


