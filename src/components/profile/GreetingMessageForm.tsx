import { useState, useRef } from 'react'
import {
  PhotoIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import type { CreateGreetingMessageData, GreetingMessage } from '../../services/greetingMessageService'

interface GreetingMessageFormProps {
  onSubmit: (data: CreateGreetingMessageData) => Promise<void>
  onCancel: () => void
  editingMessage?: GreetingMessage
  uploading?: boolean
  onUpload: (file: File) => Promise<{ success: boolean; data?: any; error?: any }>
}

export function GreetingMessageForm({
  onSubmit,
  onCancel,
  editingMessage,
  uploading,
  onUpload
}: GreetingMessageFormProps) {
  const [messageType, setMessageType] = useState<'text' | 'media'>(
    editingMessage?.message_type || 'text'
  )
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'document'>(
    editingMessage?.media_type || 'image'
  )
  const [textContent, setTextContent] = useState(editingMessage?.text_content || '')
  const [scheduleType, setScheduleType] = useState(editingMessage?.schedule_type || 'always')
  const [mediaUrl, setMediaUrl] = useState(editingMessage?.media_url || '')
  const [mediaFilename, setMediaFilename] = useState(editingMessage?.media_filename || '')
  const [mediaSizeBytes, setMediaSizeBytes] = useState(editingMessage?.media_size_bytes || 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    // Validar tamanho do arquivo (máximo 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      setUploadError('Arquivo muito grande. Máximo 50MB.')
      return
    }

    // Validar tipo do arquivo
    const validTypes: Record<string, string[]> = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/opus'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    }

    if (!validTypes[mediaType].includes(file.type)) {
      setUploadError(`Tipo de arquivo inválido para ${mediaType}`)
      return
    }

    // Fazer upload
    const result = await onUpload(file)
    
    if (result.success && result.data) {
      setMediaUrl(result.data.url)
      setMediaFilename(result.data.filename)
      setMediaSizeBytes(result.data.size)
    } else {
      setUploadError(result.error?.message || 'Erro ao fazer upload')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSubmitting(true)
    
    try {
      const data: CreateGreetingMessageData = {
        message_type: messageType,
        schedule_type: scheduleType as any,
        is_active: true
      }

      if (messageType === 'text') {
        data.text_content = textContent
      } else {
        data.media_type = mediaType
        data.media_url = mediaUrl
        data.media_filename = mediaFilename
        data.media_size_bytes = mediaSizeBytes
        if (textContent) {
          data.text_content = textContent // Legenda opcional
        }
      }

      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de Mensagem */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Mensagem *
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMessageType('text')}
            className={`p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              messageType === 'text'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span className="font-medium">Texto</span>
          </button>
          
          <button
            type="button"
            onClick={() => setMessageType('media')}
            className={`p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              messageType === 'media'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <PhotoIcon className="w-5 h-5" />
            <span className="font-medium">Mídia</span>
          </button>
        </div>
      </div>

      {/* Tipo de Mídia (se selecionou mídia) */}
      {messageType === 'media' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Mídia *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'image', label: 'Imagem', icon: PhotoIcon },
              { value: 'video', label: 'Vídeo', icon: VideoCameraIcon },
              { value: 'audio', label: 'Áudio', icon: SpeakerWaveIcon },
              { value: 'document', label: 'Documento', icon: DocumentTextIcon }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMediaType(value as any)}
                className={`p-3 border-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                  mediaType === value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload de Arquivo (se selecionou mídia) */}
      {messageType === 'media' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arquivo *
          </label>
          
          {!mediaUrl ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept={
                  mediaType === 'image' ? 'image/*' :
                  mediaType === 'video' ? 'video/*' :
                  mediaType === 'audio' ? 'audio/*' :
                  '.pdf,.doc,.docx'
                }
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors disabled:opacity-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <ArrowUpTrayIcon className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {uploading ? 'Fazendo upload...' : 'Clique para fazer upload'}
                  </span>
                  <span className="text-xs text-gray-500">Máximo 50MB</span>
                </div>
              </button>
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
                  <PhotoIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{mediaFilename}</p>
                  <p className="text-xs text-gray-500">
                    {(mediaSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMediaUrl('')
                  setMediaFilename('')
                  setMediaSizeBytes(0)
                }}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Texto/Legenda */}
      <div>
        <label htmlFor="textContent" className="block text-sm font-medium text-gray-700 mb-2">
          {messageType === 'text' ? 'Texto da Mensagem *' : 'Legenda (opcional)'}
        </label>
        <textarea
          id="textContent"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={
            messageType === 'text'
              ? 'Digite a mensagem de saudação...'
              : 'Digite uma legenda para acompanhar a mídia (opcional)...'
          }
          required={messageType === 'text'}
        />
      </div>

      {/* Agendamento */}
      <div>
        <label htmlFor="scheduleType" className="block text-sm font-medium text-gray-700 mb-2">
          Quando enviar? *
        </label>
        <select
          id="scheduleType"
          value={scheduleType}
          onChange={(e) => setScheduleType(e.target.value as 'always' | 'commercial_hours' | 'after_hours')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="always">Sempre</option>
          <option value="commercial_hours">Apenas no Horário Comercial</option>
          <option value="after_hours">Fora do Horário Comercial</option>
        </select>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploading || (messageType === 'media' && !mediaUrl)}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Salvando...' : editingMessage ? 'Atualizar' : 'Criar Mensagem'}
        </button>
      </div>
    </form>
  )
}

