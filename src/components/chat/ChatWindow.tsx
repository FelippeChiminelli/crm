import { useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import { ChatBubbleLeftRightIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import type { ChatConversation, ChatMessage, SendMessageData, SendMessageResponse } from '../../types'
import { MessageBubble } from './MessageBubble'
import { SendMessageBar } from './SendMessageBar'

const CHAT_WALLPAPER_SVG = `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='1.2' fill='%23d5dbd6' opacity='0.45'/%3E%3Ccircle cx='30' cy='30' r='1.2' fill='%23d5dbd6' opacity='0.45'/%3E%3Ccircle cx='30' cy='10' r='0.7' fill='%23d5dbd6' opacity='0.3'/%3E%3Ccircle cx='10' cy='30' r='0.7' fill='%23d5dbd6' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='%23efeae2'/%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E")`

interface ChatWindowProps {
  selectedConversation: ChatConversation | null
  messages: ChatMessage[]
  sending: boolean
  onSendMessage: (data: SendMessageData) => Promise<SendMessageResponse>
  onBack?: () => void
}

export function ChatWindow({ selectedConversation, messages, sending, onSendMessage, onBack }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatPhone = (phone: string) => {
    if (!phone) return ''
    const clean = phone.replace(/\D/g, '')
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
    if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
    if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`
    if (clean.length === 12) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`
    return phone
  }

  const handleSendMessage = async (data: SendMessageData) => {
    if (!selectedConversation) return
    try {
      await onSendMessage({
        ...data,
        conversation_id: selectedConversation.id,
        instance_id: selectedConversation.instance_id
      })
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    }
  }

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {}
    msgs.forEach(message => {
      const date = format(parseISO(message.timestamp), 'yyyy-MM-dd')
      if (!groups[date]) groups[date] = []
      groups[date].push(message)
    })
    return groups
  }

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (dateString === format(today, 'yyyy-MM-dd')) return 'HOJE'
    if (dateString === format(yesterday, 'yyyy-MM-dd')) return 'ONTEM'
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()
  }

  // Empty state: nenhuma conversa selecionada
  if (!selectedConversation) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center w-full"
        style={{ backgroundImage: CHAT_WALLPAPER_SVG }}
      >
        <div className="text-center p-6">
          <div className="w-[200px] h-[200px] mx-auto mb-6 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="w-24 h-24 text-gray-300" />
          </div>
          <h3 className="text-2xl font-light text-gray-600 mb-2">
            Chat WhatsApp
          </h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Envie e receba mensagens dos seus leads diretamente pelo CRM.
            Selecione uma conversa para começar.
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-8 text-gray-400">
            <LockClosedIcon className="w-3.5 h-3.5" />
            <span className="text-xs">Suas mensagens são gerenciadas com segurança</span>
          </div>
        </div>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)
  const initial = (selectedConversation.lead_name || '?').charAt(0).toUpperCase()

  return (
    <div className="h-full flex flex-col w-full">
      {/* Header da conversa */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:bg-gray-200/60 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-base">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-medium text-gray-900 truncate">
            {selectedConversation.lead_name}
          </h2>
          <p className="text-xs text-gray-500 truncate">
            {formatPhone(selectedConversation.lead_phone)}
          </p>
        </div>
      </div>

      {/* Área de mensagens com wallpaper */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ backgroundImage: CHAT_WALLPAPER_SVG }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg px-6 py-4 shadow-sm text-center">
              <p className="text-sm text-gray-500">
                Nenhuma mensagem ainda. Inicie uma conversa com {selectedConversation.lead_name}.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 lg:px-16 py-4 space-y-1">
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Separador de data */}
                <div className="flex items-center justify-center py-3">
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
                    <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                      {formatDate(date)}
                    </span>
                  </div>
                </div>
                
                {/* Mensagens do dia */}
                {dateMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={message.direction === 'inbound'}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Barra de envio */}
      <SendMessageBar
        onSendMessage={handleSendMessage}
        loading={sending}
        conversationId={selectedConversation.id}
        instanceId={selectedConversation.instance_id}
      />
    </div>
  )
}
