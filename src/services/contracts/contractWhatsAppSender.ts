import { findOrCreateConversationByPhone } from '../chatService'
import SecureLogger from '../../utils/logger'

/**
 * Envia o PDF do contrato por WhatsApp.
 *
 * O arquivo já está no Storage com URL pública, então mandamos direto ao
 * webhook de mídia do n8n — mesmo caminho usado pelas automações e pelo chat.
 */

const N8N_WEBHOOK_SEND_MEDIA = 'https://n8n.advcrm.com.br/webhook/midiascrm'

export interface SendContractByWhatsAppParams {
  leadId: string
  leadPhone?: string | null
  empresaId: string
  instanceId: string
  mediaUrl: string
  fileName: string
  caption?: string | null
}

export async function sendContractByWhatsApp(
  params: SendContractByWhatsAppParams
): Promise<void> {
  const { leadId, leadPhone, empresaId, instanceId, mediaUrl, fileName, caption } = params

  if (!leadPhone?.trim()) {
    throw new Error('Lead sem telefone: não foi possível enviar o contrato por WhatsApp')
  }

  if (!instanceId?.trim()) {
    throw new Error('Nenhuma instância de WhatsApp configurada para envio do contrato')
  }

  const conversation = await findOrCreateConversationByPhone(leadPhone, leadId, instanceId)
  const aletNum = Math.floor(100000 + Math.random() * 900000)

  const response = await fetch(N8N_WEBHOOK_SEND_MEDIA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message_type: 'document',
      type_message: 'document',
      conversation_id: conversation.id,
      instance_id: instanceId,
      empresa_id: empresaId,
      media_url: mediaUrl,
      content: caption || undefined,
      filename: fileName,
      alet_num: aletNum,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Webhook midiascrm falhou: ${response.status} ${response.statusText} ${text}`)
  }

  SecureLogger.info('Contrato enviado por WhatsApp', {
    leadId,
    conversationId: conversation.id,
    fileName,
  })
}
