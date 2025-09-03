import React, { useEffect, useRef, useState } from 'react'
import { 
  PaperAirplaneIcon, 
  PaperClipIcon,
  PhotoIcon,
  MicrophoneIcon,
  StopCircleIcon
} from '@heroicons/react/24/outline'
import type { SendMessageData } from '../../types'
import { uploadChatMedia, sendMediaViaWebhook } from '../../services/chatService'
import { useToastContext } from '../../contexts/ToastContext'

interface SendMessageBarProps {
  onSendMessage: (data: SendMessageData) => Promise<void>
  disabled?: boolean
  loading?: boolean
  conversationId?: string
  instanceId?: string
}

export function SendMessageBar({ onSendMessage, disabled = false, loading = false, conversationId, instanceId }: SendMessageBarProps) {
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'image' | 'audio' | 'document'>('text')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const [recordSeconds, setRecordSeconds] = useState(0)
  const timerRef = useRef<number | null>(null)
  const stopTimeoutRef = useRef<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { showError, showSuccess } = useToastContext()

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || disabled || loading) return

    try {
      await onSendMessage({
        conversation_id: '', // Será preenchido pelo componente pai
        instance_id: '', // Será preenchido pelo componente pai
        message_type: messageType,
        content: message.trim(),
        media_url: undefined // Será preenchido se houver arquivo
      })
      
      setMessage('')
      setMessageType('text')
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Determinar tipo baseado na extensão
    let detectedType: 'image' | 'audio' | 'document' = 'document'
    if (file.type.startsWith('image/')) detectedType = 'image'
    else if (file.type.startsWith('audio/')) detectedType = 'audio'
    setMessageType(detectedType)

    // Upload e envio imediato
    ;(async () => {
      try {
        // Preferir webhook midiascrm para áudio/mídia
        if (detectedType === 'audio' || detectedType === 'image' || detectedType === 'document') {
          if (!conversationId || !instanceId) {
            showError('Nenhuma conversa selecionada', 'Selecione uma conversa antes de enviar mídia.')
            return
          }
          await sendMediaViaWebhook({
            file,
            message_type: detectedType,
            conversation_id: conversationId,
            instance_id: instanceId,
            content: ''
          })
        } else {
          const publicUrl = await uploadChatMedia(file, detectedType)
          await onSendMessage({
            conversation_id: conversationId || '',
            instance_id: instanceId || '',
            message_type: detectedType,
            content: detectedType === 'image' || detectedType === 'audio' ? '' : (message.trim() || file.name),
            media_url: publicUrl
          } as SendMessageData)
        }
        setMessage('')
        setMessageType('text')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (err) {
        console.error('Erro ao enviar mídia:', err)
      }
    })()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event)
  }

  const startRecording = async () => {
    if (disabled || loading || isRecording || isUploading) return
    try {
      console.log('[Audio] Solicitando permissão do microfone...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const options: MediaRecorderOptions = (() => {
        if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) return { mimeType: 'audio/webm; codecs=opus' }
        if (MediaRecorder.isTypeSupported('audio/webm')) return { mimeType: 'audio/webm' }
        if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) return { mimeType: 'audio/ogg; codecs=opus' }
        return {}
      })()
      const recorder = new MediaRecorder(stream, options)
      console.log('[Audio] MediaRecorder iniciado com mimeType:', recorder.mimeType)
      mediaRecorderRef.current = recorder
      recordedChunksRef.current = []
      setRecordSeconds(0)
      setIsRecording(true)
      timerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000)
      // Auto-stop em 2 minutos para evitar gravações infinitas
      stopTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      }, 120000)
      recorder.ondataavailable = (e: BlobEvent) => {
        console.log('[Audio] dataavailable', e.data?.size)
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        console.log('[Audio] onstop. chunks:', recordedChunksRef.current.length)
        if (timerRef.current) window.clearInterval(timerRef.current)
        if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current)
        setIsRecording(false)
        const finalMime = recorder.mimeType || 'audio/webm'
        const blob = new Blob(recordedChunksRef.current, { type: finalMime })
        if (!blob.size) {
          console.error('[Audio] Blob vazio. Nada gravado.')
          showError('Áudio não capturado', 'Nenhum dado de áudio foi gravado. Tente novamente.')
          stream.getTracks().forEach(t => t.stop())
          return
        }
        const ext = (recorder.mimeType || 'audio/webm').includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `gravacao-${Date.now()}.${ext}`, { type: recorder.mimeType || 'audio/webm' })
        try {
          setIsUploading(true)
          if (!conversationId || !instanceId) {
            showError('Nenhuma conversa selecionada', 'Selecione uma conversa antes de enviar áudio.')
            stream.getTracks().forEach(t => t.stop())
            return
          }
          await sendMediaViaWebhook({
            file,
            message_type: 'audio',
            conversation_id: conversationId,
            instance_id: instanceId,
            content: ''
          })
          showSuccess('Áudio enviado', 'Sua mensagem de voz foi enviada com sucesso.', 3000)
        } catch (err) {
          console.error('Erro ao enviar áudio gravado:', err)
          showError('Falha ao enviar áudio', err instanceof Error ? err.message : 'Tente novamente')
        } finally {
          setIsUploading(false)
          stream.getTracks().forEach(t => t.stop())
        }
      }
      recorder.start()
      console.log('[Audio] Gravação iniciada')
    } catch (err) {
      console.error('Permissão de microfone negada ou erro ao iniciar gravação:', err)
      showError('Microfone indisponível', 'Autorize o uso do microfone para gravar áudio.')
    }
  }

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return
    try {
      mediaRecorderRef.current.stop()
    } catch (err) {
      console.error('Erro ao parar gravação:', err)
    }
  }

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Botões de anexo */}
        <div className="flex space-x-1 items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 disabled:opacity-50"
            title="Anexar arquivo"
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 disabled:opacity-50"
            title="Anexar imagem"
          >
            <PhotoIcon className="w-5 h-5" />
          </button>

          {/* Gravação de áudio */}
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || loading || isUploading}
              className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 disabled:opacity-50"
              title="Gravar áudio"
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
              title="Parar gravação"
            >
              <StopCircleIcon className="w-5 h-5" />
            </button>
          )}

          {isRecording && (
            <span className="text-xs text-red-600 ml-1 select-none">{Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:{(recordSeconds % 60).toString().padStart(2, '0')}</span>
          )}
        </div>

        {/* Campo de texto */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={disabled}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 placeholder-gray-400 disabled:opacity-50"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>

        {/* Botão de envio */}
        <button
          type="submit"
          disabled={disabled || !message.trim() || isRecording || isUploading}
          className="p-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-sm"
        >
          {loading || isUploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <PaperAirplaneIcon className="w-5 h-5" />
          )}
        </button>
      </form>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={false}
        accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.ogg,.mp3,.wav,.webm,.m4a"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
} 