import { supabase } from './supabaseClient'
import type { LeadAttachment } from '../types'
import { getUserEmpresaId } from './authService'
import { logAttachmentEvent } from './leadHistoryService'
import SecureLogger from '../utils/logger'

const BUCKET = 'lead-attachments'

// Limite de 20MB por arquivo (validação client-side; reforçada pelo bucket)
export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024

// Tipos aceitos: PDF, imagens e vídeos
export const ALLOWED_ATTACHMENT_PREFIXES = ['image/', 'video/']
export const ALLOWED_ATTACHMENT_MIME_TYPES = ['application/pdf']

export function isAllowedAttachmentType(mimeType: string): boolean {
  if (ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType)) return true
  return ALLOWED_ATTACHMENT_PREFIXES.some((prefix) => mimeType.startsWith(prefix))
}

export async function getAttachmentsByLead(
  leadId: string | undefined
): Promise<LeadAttachment[]> {
  if (!leadId) return []

  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não identificada')

  const { data, error } = await supabase
    .from('lead_attachments')
    .select('*')
    .eq('lead_id', leadId)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as LeadAttachment[]) || []
}

export async function uploadLeadAttachment(
  leadId: string,
  file: File
): Promise<LeadAttachment> {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error('O arquivo excede o limite de 20MB.')
  }
  if (!isAllowedAttachmentType(file.type)) {
    throw new Error('Tipo de arquivo não permitido. Envie PDF, imagem ou vídeo.')
  }

  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não identificada')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const safeName = file.name.replace(/\s+/g, '_')
  const filePath = `${empresaId}/${leadId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath)

  const { data, error } = await supabase
    .from('lead_attachments')
    .insert({
      lead_id: leadId,
      empresa_id: empresaId,
      file_name: file.name,
      file_path: filePath,
      url: urlData.publicUrl,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Evita arquivo órfão caso o insert falhe
    await supabase.storage.from(BUCKET).remove([filePath])
    throw error
  }

  try {
    await logAttachmentEvent(leadId, 'attachment_added', file.name)
  } catch (historyErr) {
    SecureLogger.error('Erro ao registrar histórico de anexo adicionado:', historyErr)
  }

  return data as LeadAttachment
}

export async function deleteLeadAttachment(attachmentId: string): Promise<void> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não identificada')

  const { data: attachment, error: fetchError } = await supabase
    .from('lead_attachments')
    .select('file_path, file_name, lead_id')
    .eq('id', attachmentId)
    .eq('empresa_id', empresaId)
    .single()

  if (fetchError) throw fetchError

  if (attachment?.file_path) {
    await supabase.storage.from(BUCKET).remove([attachment.file_path])
  }

  const { error } = await supabase
    .from('lead_attachments')
    .delete()
    .eq('id', attachmentId)
    .eq('empresa_id', empresaId)

  if (error) throw error

  if (attachment?.lead_id) {
    try {
      await logAttachmentEvent(attachment.lead_id, 'attachment_removed', attachment.file_name)
    } catch (historyErr) {
      SecureLogger.error('Erro ao registrar histórico de anexo removido:', historyErr)
    }
  }
}
