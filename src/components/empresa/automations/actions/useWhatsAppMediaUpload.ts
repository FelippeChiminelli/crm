import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { WhatsAppMessageType } from '../constants'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

const VALID_MEDIA_TYPES: Record<WhatsAppMessageType, string[]> = {
  text: [],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp3'],
}

const MAX_MEDIA_BYTES = 50 * 1024 * 1024

const EMPTY_MEDIA = { media_url: undefined, media_filename: undefined, media_size_bytes: undefined }

async function uploadMedia(file: File): Promise<string> {
  const { supabase } = await import('../../../../services/supabaseClient')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('uuid', user.id)
    .single()
  if (!profile?.empresa_id) throw new Error('Empresa não encontrada')

  const WEBHOOK_URL = import.meta.env.VITE_GREETING_UPLOAD_WEBHOOK_URL
    || 'https://n8n.advcrm.com.br/webhook/greeting-upload'
  const randomKey = Math.floor(100000 + Math.random() * 900000).toString()

  const formData = new FormData()
  formData.append('file', file)
  formData.append('filename', file.name)
  formData.append('content_type', file.type || 'application/octet-stream')
  formData.append('size', file.size.toString())
  formData.append('user_id', user.id)
  formData.append('empresa_id', profile.empresa_id)
  formData.append('random_key', randomKey)

  const response = await fetch(WEBHOOK_URL, { method: 'POST', body: formData })
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Erro desconhecido')
    throw new Error(`Erro no upload: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  if (!result.url) throw new Error('Webhook não retornou URL válida')
  return result.url
}

/** Estado do upload de mídia da ação "Enviar WhatsApp" em edição. */
export function useWhatsAppMediaUpload() {
  const { form, setForm } = useAutomationEditor()
  const [waUploading, setWaUploading] = useState(false)
  const [waUploadError, setWaUploadError] = useState<string | null>(null)
  const [waMediaPreview, setWaMediaPreview] = useState<string | null>((form.action?.media_url as string) || null)
  const waFileInputRef = useRef<HTMLInputElement>(null)

  function clearWaMedia() {
    setWaMediaPreview(null)
    setWaUploadError(null)
    if (waFileInputRef.current) waFileInputRef.current.value = ''
    setForm(prev => ({ ...prev, action: { ...prev.action, ...EMPTY_MEDIA } }))
  }

  function handleWaMessageTypeChange(nextType: WhatsAppMessageType) {
    setWaMediaPreview(null)
    setWaUploadError(null)
    setForm(prev => ({
      ...prev,
      action: {
        ...prev.action,
        wa_message_type: nextType,
        ...(nextType === 'text' ? EMPTY_MEDIA : {}),
      },
    }))
  }

  async function handleWaFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const currentType = (form.action?.wa_message_type || 'text') as WhatsAppMessageType
    if (currentType !== 'text' && !VALID_MEDIA_TYPES[currentType].includes(file.type)) {
      setWaUploadError(`Tipo de arquivo inválido. Aceitos: ${VALID_MEDIA_TYPES[currentType].join(', ')}`)
      return
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setWaUploadError('Arquivo muito grande. Máximo: 50MB')
      return
    }

    setWaUploadError(null)
    if (currentType === 'image') {
      const reader = new FileReader()
      reader.onload = (ev) => setWaMediaPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }

    try {
      setWaUploading(true)
      const url = await uploadMedia(file)
      setWaMediaPreview(url)
      setForm(prev => ({ ...prev, action: { ...prev.action, media_url: url, media_filename: file.name, media_size_bytes: file.size } }))
    } catch (error: any) {
      setWaUploadError(error.message || 'Erro ao fazer upload')
      setForm(prev => ({ ...prev, action: { ...prev.action, ...EMPTY_MEDIA } }))
    } finally {
      setWaUploading(false)
      e.target.value = ''
    }
  }

  return { waUploading, waUploadError, waMediaPreview, waFileInputRef, clearWaMedia, handleWaMessageTypeChange, handleWaFileUpload }
}
