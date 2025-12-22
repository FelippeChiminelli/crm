import { useState } from 'react'
import {
  ChatBubbleLeftIcon,
  PhotoIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  DocumentIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import type { GreetingMessage } from '../../services/greetingMessageService'

interface GreetingMessageCardProps {
  message: GreetingMessage
  onEdit: (message: GreetingMessage) => void
  onDelete: (message: GreetingMessage) => void
  onToggleStatus: (messageId: string, isActive: boolean) => void
  onPreview: (message: GreetingMessage) => void
}

const scheduleTypeLabels = {
  always: 'Sempre',
  commercial_hours: 'Horário Comercial',
  after_hours: 'Fora do Expediente'
}

const mediaTypeIcons = {
  image: PhotoIcon,
  video: VideoCameraIcon,
  audio: SpeakerWaveIcon,
  document: DocumentIcon
}

export function GreetingMessageCard({
  message,
  onEdit,
  onDelete,
  onToggleStatus,
  onPreview
}: GreetingMessageCardProps) {
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)
    await onToggleStatus(message.id, !message.is_active)
    setIsToggling(false)
  }

  const getIcon = () => {
    if (message.message_type === 'text') {
      return <ChatBubbleLeftIcon className="w-5 h-5 text-blue-500" />
    }
    const Icon = mediaTypeIcons[message.media_type!]
    return <Icon className="w-5 h-5 text-purple-500" />
  }

  const getTitle = () => {
    if (message.message_type === 'text') {
      return message.text_content?.substring(0, 50) || 'Mensagem de texto'
    }
    return message.media_filename || `Mensagem de ${message.media_type}`
  }

  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
      !message.is_active ? 'opacity-60' : ''
    }`}>
      <div className="flex items-start justify-between gap-3">
        {/* Ícone e Informações */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 truncate">
                {getTitle()}
              </h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                message.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {message.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>

            {/* Tipo e Agendamento */}
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Tipo:</span>
                <span className="capitalize">
                  {message.message_type === 'text' ? 'Texto' : message.media_type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Quando:</span>
                <span>{scheduleTypeLabels[message.schedule_type]}</span>
              </div>
              {message.usage_count > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>📊 Enviada {message.usage_count}x</span>
                </div>
              )}
            </div>

            {/* Preview do texto se houver */}
            {message.text_content && message.message_type === 'media' && (
              <div className="mt-2 text-sm text-gray-500 italic">
                "{message.text_content.substring(0, 60)}..."
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onPreview(message)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Visualizar"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onEdit(message)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Editar"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onDelete(message)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Excluir"
          >
            <TrashIcon className="w-4 h-4" />
          </button>

          {/* Toggle Ativo/Inativo */}
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`ml-2 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              message.is_active ? 'bg-green-500' : 'bg-gray-200'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={message.is_active ? 'Desativar' : 'Ativar'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                message.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

