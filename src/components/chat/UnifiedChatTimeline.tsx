import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import type { UnifiedChatMessage } from '../../types'
import { buildUnifiedTimeline } from '../../utils/unifiedChatTimeline'
import { MessageBubble } from './MessageBubble'
import { InstanceDivider } from './InstanceDivider'
import { CHAT_WALLPAPER_STYLE } from './chatWallpaper'

interface UnifiedChatTimelineProps {
  messages: UnifiedChatMessage[]
  loading?: boolean
  emptyLabel?: string
  className?: string
  messagesEndRef?: React.RefObject<HTMLDivElement | null>
}

function formatTimelineDate(dateString: string): string {
  try {
    const date = parseISO(dateString)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (dateString === format(now, 'yyyy-MM-dd')) return 'HOJE'
    if (dateString === format(yesterday, 'yyyy-MM-dd')) return 'ONTEM'
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()
  } catch {
    return dateString
  }
}

export function UnifiedChatTimeline({
  messages,
  loading = false,
  emptyLabel = 'Nenhuma mensagem ainda.',
  className = '',
  messagesEndRef,
}: UnifiedChatTimelineProps) {
  const timeline = useMemo(() => buildUnifiedTimeline(messages), [messages])

  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto ${className}`}
      style={CHAT_WALLPAPER_STYLE}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">Carregando mensagens...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg px-6 py-4 shadow-sm text-center">
            <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{emptyLabel}</p>
          </div>
        </div>
      ) : (
        <div className="px-4 lg:px-16 py-4 space-y-1">
          {timeline.map((item, idx) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${idx}`} className="flex items-center justify-center py-3">
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
                    <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                      {formatTimelineDate(item.date)}
                    </span>
                  </div>
                </div>
              )
            }
            if (item.type === 'instance') {
              return <InstanceDivider key={`inst-${idx}`} instanceName={item.instanceName} />
            }
            return (
              <MessageBubble
                key={item.message.id}
                message={item.message}
                isOwnMessage={item.message.direction === 'inbound'}
              />
            )
          })}
        </div>
      )}
      {messagesEndRef && <div ref={messagesEndRef} />}
    </div>
  )
}
