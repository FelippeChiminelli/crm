import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { ChatMessage } from '../../types'
import { MessageAudio } from './message-media/MessageAudio'
import { MessageCall } from './message-media/MessageCall'
import { MessageDocument } from './message-media/MessageDocument'
import { MessageVideo } from './message-media/MessageVideo'
import { useResolvedMediaUrl } from './message-media/useResolvedMediaUrl'

interface MessageBubbleProps {
  message: ChatMessage
  isOwnMessage: boolean
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const resolvedUrl = useResolvedMediaUrl(message.media_url)

  const formatTime = (timestamp: string) => format(parseISO(timestamp), 'HH:mm', { locale: ptBR })

  const renderStatusIcon = () => {
    if (message.status === 'failed') return <ExclamationTriangleIcon className="w-3 h-3 text-red-400" />
    return null
  }

  const renderContent = () => {
    switch (message.message_type) {
      case 'text':
        return <span className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{message.content}</span>

      case 'image':
        return (
          <div className="space-y-1">
            <img src={resolvedUrl || message.media_url} alt="Imagem" className="max-w-[300px] rounded-lg" />
            {message.content && <span className="text-[14.2px] leading-[19px]">{message.content}</span>}
          </div>
        )

      case 'audio':
        return (
          <MessageAudio
            messageId={message.id}
            mediaUrl={message.media_url}
            resolvedUrl={resolvedUrl}
          />
        )

      case 'video':
        return <MessageVideo url={resolvedUrl} caption={message.content} />

      case 'document':
        return <MessageDocument url={resolvedUrl} caption={message.content} />

      case 'call':
        return <MessageCall direction={message.direction} />

      default:
        return <span className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{message.content}</span>
    }
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`relative max-w-[65%] px-2.5 py-1.5 rounded-lg shadow-sm ${
          isOwnMessage
            ? 'bg-primary-50 text-gray-900'
            : 'bg-white text-gray-900'
        }`}
        style={isOwnMessage
          ? { borderTopRightRadius: '3px' }
          : { borderTopLeftRadius: '3px' }
        }
      >
        {/* Tail (rabinho) */}
        <div
          className={`absolute top-0 w-0 h-0 ${
            isOwnMessage
              ? '-right-2 border-l-[8px] border-t-[8px] border-l-transparent border-t-primary-50'
              : '-left-2 border-r-[8px] border-t-[8px] border-r-transparent border-t-white'
          }`}
        />

        {/* Conteúdo */}
        <div>
          {renderContent()}
        </div>

        {/* Timestamp + status */}
        <div className="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
          <span className="text-[11px] text-gray-400 leading-none">{formatTime(message.timestamp)}</span>
          {renderStatusIcon()}
        </div>
      </div>
    </div>
  )
}
