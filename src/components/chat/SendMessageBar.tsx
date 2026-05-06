import React, { useEffect, useRef, useState } from 'react'
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  MicrophoneIcon,
  StopCircleIcon
} from '@heroicons/react/24/outline'
import type { SendMessageData } from '../../types'
import { uploadChatMedia, sendMediaViaWebhook } from '../../services/chatService'
import { useToastContext } from '../../contexts/ToastContext'
import { recordingBlobToWhatsAppAudioFile } from '../../utils/voiceRecordingWhatsApp'

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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled || loading) return
    try {
      await onSendMessage({
        conversation_id: '',
        instance_id: '',
        message_type: messageType,
        content: message.trim(),
        media_url: undefined
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

    let detectedType: 'image' | 'audio' | 'document' = 'document'
    if (file.type.startsWith('image/')) detectedType = 'image'
    else if (file.type.startsWith('audio/')) detectedType = 'audio'
    setMessageType(detectedType)

    ;(async () => {
      try {
        if (detectedType === 'audio' || detectedType === 'image' || detectedType === 'document') {
          if (!conversationId || !instanceId) {
            showError('Nenhuma conversa selecionada', 'Selecione uma conversa antes de enviar mídia.')
            return
          }
          await sendMediaViaWebhook({
            file, message_type: detectedType,
            conversation_id: conversationId, instance_id: instanceId, content: ''
          })
        } else {
          const publicUrl = await uploadChatMedia(file, detectedType)
          await onSendMessage({
            conversation_id: conversationId || '', instance_id: instanceId || '',
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

  const startRecording = async () => {
    if (disabled || loading || isRecording || isUploading) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const options: MediaRecorderOptions = (() => {
        // WhatsApp Cloud aceita explicitamente OGG+Opus; preferir antes de WebM (Chrome costuma só oferecer WebM).
        if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) return { mimeType: 'audio/ogg; codecs=opus' }
        if (MediaRecorder.isTypeSupported('audio/mp4')) return { mimeType: 'audio/mp4' }
        if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) return { mimeType: 'audio/webm; codecs=opus' }
        if (MediaRecorder.isTypeSupported('audio/webm')) return { mimeType: 'audio/webm' }
        return {}
      })()
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      recordedChunksRef.current = []
      setRecordSeconds(0)
      setIsRecording(true)
      timerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000)
      stopTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
      }, 120000)

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        if (timerRef.current) window.clearInterval(timerRef.current)
        if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current)
        setIsRecording(false)
        const finalMime = recorder.mimeType || 'audio/webm'
        const blob = new Blob(recordedChunksRef.current, { type: finalMime })
        if (!blob.size) {
          showError('Áudio não capturado', 'Nenhum dado de áudio foi gravado. Tente novamente.')
          stream.getTracks().forEach(t => t.stop())
          return
        }
        let file: File
        try {
          file = await recordingBlobToWhatsAppAudioFile(blob, finalMime)
        } catch (normErr) {
          console.warn('Normalização WhatsApp falhou; envio do blob gravado:', normErr)
          const fallbackExt = finalMime.includes('ogg') ? 'ogg' : 'webm'
          file = new File([blob], `gravacao-${Date.now()}.${fallbackExt}`, { type: finalMime })
        }
        try {
          setIsUploading(true)
          if (!conversationId || !instanceId) {
            showError('Nenhuma conversa selecionada', 'Selecione uma conversa antes de enviar áudio.')
            stream.getTracks().forEach(t => t.stop())
            return
          }
          await sendMediaViaWebhook({
            file, message_type: 'audio',
            conversation_id: conversationId, instance_id: instanceId, content: ''
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
    } catch (err) {
      console.error('Permissão de microfone negada:', err)
      showError('Microfone indisponível', 'Autorize o uso do microfone para gravar áudio.')
    }
  }

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return
    try { mediaRecorderRef.current.stop() } catch (err) { console.error('Erro ao parar gravação:', err) }
  }

  const hasText = message.trim().length > 0

  return (
    <div className="bg-[#f0f2f5] px-3 py-2.5 flex-shrink-0">
      {/* Recording state */}
      {isRecording ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={stopRecording}
            className="p-2.5 text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors shadow-sm"
          >
            <StopCircleIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center gap-3 bg-white rounded-full px-5 py-3">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600 font-medium tabular-nums">
              {Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:{(recordSeconds % 60).toString().padStart(2, '0')}
            </span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full animate-pulse" style={{ width: `${Math.min((recordSeconds / 120) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          {/* Attach */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors disabled:opacity-40"
            title="Anexar arquivo"
          >
            <PaperClipIcon className="w-6 h-6" />
          </button>

          {/* Input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem"
              disabled={disabled}
              className="w-full px-4 py-2.5 bg-white rounded-full text-[15px] text-gray-900 placeholder-gray-400 resize-none focus:outline-none disabled:opacity-50"
              rows={1}
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
          </div>

          {/* Mic or Send */}
          {hasText ? (
            <button
              type="submit"
              disabled={disabled || isUploading}
              className="p-2.5 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-40 transition-colors shadow-sm"
            >
              {loading || isUploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <PaperAirplaneIcon className="w-6 h-6" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || loading || isUploading}
              className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors disabled:opacity-40"
              title="Gravar áudio"
            >
              <MicrophoneIcon className="w-6 h-6" />
            </button>
          )}
        </form>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple={false}
        accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.ogg,.mp3,.wav,.webm,.m4a"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
