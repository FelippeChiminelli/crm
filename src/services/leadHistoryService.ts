import { supabase } from './supabaseClient'
import SecureLogger from '../utils/logger'
import { getUserEmpresaId } from './authService'

// Tipos de evento registrados no histórico do lead (lead_pipeline_history)
export type LeadHistoryChangeType =
  | 'created'
  | 'pipeline_changed'
  | 'stage_changed'
  | 'both_changed'
  | 'marked_as_lost'
  | 'reactivated'
  | 'marked_as_sold'
  | 'sale_unmarked'
  | 'responsible_changed'
  | 'field_updated'
  | 'task_created'
  | 'task_completed'
  | 'task_cancelled'
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'attachment_added'
  | 'attachment_removed'
  | 'custom_field_changed'

// Representa a alteração de um campo (valor anterior -> novo)
export interface FieldChange {
  field: string
  old: unknown
  new: unknown
}

interface CreateHistoryEntryArgs {
  leadId: string
  changeType: LeadHistoryChangeType
  notes?: string
  pipelineId?: string | null
  stageId?: string | null
  previousPipelineId?: string | null
  previousStageId?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Cria uma entrada genérica no histórico do lead.
 * Nunca lança: erros são logados e retornados, sem bloquear a operação principal.
 */
export async function createLeadHistoryEntry(args: CreateHistoryEntryArgs) {
  try {
    const {
      leadId,
      changeType,
      notes,
      pipelineId,
      stageId,
      previousPipelineId,
      previousStageId,
      metadata,
    } = args

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const empresaId = await getUserEmpresaId()

    const historyEntry = {
      lead_id: leadId,
      empresa_id: empresaId,
      changed_by: user.id,
      changed_at: new Date().toISOString(),
      change_type: changeType,
      notes: notes || null,
      pipeline_id: pipelineId || null,
      stage_id: stageId || null,
      previous_pipeline_id: previousPipelineId || null,
      previous_stage_id: previousStageId || null,
      metadata: metadata ?? null,
    }

    const { data, error } = await supabase
      .from('lead_pipeline_history')
      .insert([historyEntry])
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    SecureLogger.error('❌ Erro ao criar entrada no histórico:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

/**
 * Anexa as notas (digitadas no StageChangeModal) à entrada de histórico de
 * mudança de etapa que o trigger `log_lead_pipeline_change` acabou de criar.
 *
 * O trigger registra a mudança de stage/pipeline mas não tem acesso ao texto
 * informado pelo usuário no modal, então o gravamos aqui na entrada mais
 * recente, evitando duplicar o histórico. Nunca lança: erros são apenas logados.
 */
export async function attachNotesToLatestStageChange(leadId: string, notes?: string) {
  const trimmed = notes?.trim()
  if (!leadId?.trim() || !trimmed) return

  try {
    const empresaId = await getUserEmpresaId()

    const { data: latest, error: findError } = await supabase
      .from('lead_pipeline_history')
      .select('id')
      .eq('lead_id', leadId)
      .eq('empresa_id', empresaId)
      .in('change_type', ['stage_changed', 'both_changed'])
      .order('changed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError) throw findError
    if (!latest?.id) return

    const { error: updateError } = await supabase
      .from('lead_pipeline_history')
      .update({ notes: trimmed })
      .eq('id', latest.id)

    if (updateError) throw updateError
  } catch (error) {
    SecureLogger.error('❌ Erro ao anexar notas à mudança de etapa:', error)
  }
}

/** Busca o nome legível de um perfil a partir do uuid. */
async function resolveProfileName(uuid?: string | null): Promise<string | null> {
  if (!uuid) return null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('uuid', uuid)
      .single()
    return data?.full_name ?? null
  } catch {
    return null
  }
}

/** Registra a edição de um ou mais campos básicos do lead (valor anterior -> novo). */
export async function logFieldChanges(leadId: string, changes: FieldChange[]) {
  if (!changes.length) return
  await createLeadHistoryEntry({
    leadId,
    changeType: 'field_updated',
    metadata: { changes },
  })
}

/** Registra a mudança de responsável do lead, resolvendo os nomes para exibição. */
export async function logResponsibleChange(
  leadId: string,
  previousResponsibleUuid?: string | null,
  newResponsibleUuid?: string | null,
) {
  const [previousName, newName] = await Promise.all([
    resolveProfileName(previousResponsibleUuid),
    resolveProfileName(newResponsibleUuid),
  ])

  await createLeadHistoryEntry({
    leadId,
    changeType: 'responsible_changed',
    metadata: {
      previous_responsible_uuid: previousResponsibleUuid ?? null,
      new_responsible_uuid: newResponsibleUuid ?? null,
      previous_responsible_name: previousName,
      new_responsible_name: newName,
    },
  })
}

type TaskEventType = 'task_created' | 'task_completed' | 'task_cancelled'

/** Registra eventos de tarefa vinculada ao lead. */
export async function logTaskEvent(
  leadId: string,
  eventType: TaskEventType,
  taskTitle?: string | null,
  taskId?: string | null,
) {
  await createLeadHistoryEntry({
    leadId,
    changeType: eventType,
    metadata: { task_title: taskTitle ?? null, task_id: taskId ?? null },
  })
}

type BookingEventType = 'booking_created' | 'booking_cancelled' | 'booking_completed'

/** Registra eventos de agendamento/visita vinculados ao lead. */
export async function logBookingEvent(
  leadId: string,
  eventType: BookingEventType,
  bookingTitle?: string | null,
  bookingId?: string | null,
  scheduledAt?: string | null,
) {
  await createLeadHistoryEntry({
    leadId,
    changeType: eventType,
    metadata: {
      booking_title: bookingTitle ?? null,
      booking_id: bookingId ?? null,
      scheduled_at: scheduledAt ?? null,
    },
  })
}

type AttachmentEventType = 'attachment_added' | 'attachment_removed'

/** Registra eventos de anexo do lead. */
export async function logAttachmentEvent(
  leadId: string,
  eventType: AttachmentEventType,
  fileName?: string | null,
) {
  await createLeadHistoryEntry({
    leadId,
    changeType: eventType,
    metadata: { file_name: fileName ?? null },
  })
}

/** Registra a criação/alteração de um valor de campo personalizado. */
export async function logCustomFieldChange(
  leadId: string,
  fieldName: string,
  oldValue: unknown,
  newValue: unknown,
) {
  await createLeadHistoryEntry({
    leadId,
    changeType: 'custom_field_changed',
    metadata: { field_name: fieldName, old: oldValue ?? null, new: newValue ?? null },
  })
}
