import { useEffect, useRef } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import { ChatBubbleLeftRightIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import type { ChatConversation, UnifiedChatMessage, SendMessageData, SendMessageResponse, WhatsAppInstance } from '../../types'
import { SendMessageBar } from './SendMessageBar'
import { UnifiedChatTimeline } from './UnifiedChatTimeline'
import { InstanceSendPicker } from './InstanceSendPicker'

interface ChatWindowProps {
  selectedConversation: ChatConversation | null
  activeConversations: ChatConversation[]
  selectedSendConversation: ChatConversation | null
  onSelectSendConversation: (conversationId: string) => void
  messages: UnifiedChatMessage[]
  loading?: boolean
  sending: boolean
  onSendMessage: (data: SendMessageData) => Promise<SendMessageResponse>
  onBack?: () => void
  conversationCount?: number
  labelConversations?: ChatConversation[]
  extraInstances?: WhatsAppInstance[]
  onSelectExtraInstance?: (instanceId: string) => void
  canSend?: boolean
  canSendToSelected?: boolean
  creatingInstance?: boolean
}

export function ChatWindow({
  selectedConversation,
  activeConversations,
  selectedSendConversation,
  onSelectSendConversation,
  messages,
  loading = false,
  sending,
  onSendMessage,
  onBack,
  conversationCount,
  labelConversations,
  extraInstances = [],
  onSelectExtraInstance,
  canSend = true,
  canSendToSelected = true,
  creatingInstance = false,
}: ChatWindowProps) {
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
    if (!selectedSendConversation) return
    try {
      await onSendMessage({
        ...data,
        conversation_id: selectedSendConversation.id,
        instance_id: selectedSendConversation.instance_id,
      })
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    }
  }

  if (!selectedConversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center w-full bg-[#f0f2f5]">
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

  const leadName = selectedConversation.lead_name || 'Lead'
  const leadPhone = selectedConversation.lead_phone || ''
  const totalConversations = conversationCount ?? activeConversations.length
  const initial = leadName.charAt(0).toUpperCase()

  return (
    <div className="h-full flex flex-col w-full">
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
          <h2 className="text-base font-medium text-gray-900 truncate">{leadName}</h2>
          <p className="text-xs text-gray-500 truncate">
            {formatPhone(leadPhone)}
            {totalConversations > 1 && (
              <span className="ml-2 text-gray-400">· {totalConversations} conversas</span>
            )}
          </p>
        </div>
      </div>

      <UnifiedChatTimeline
        messages={messages}
        loading={loading}
        emptyLabel={`Nenhuma mensagem ainda. Inicie uma conversa com ${leadName}.`}
        messagesEndRef={messagesEndRef}
      />

      <div className="bg-[#f0f2f5] flex-shrink-0">
        <InstanceSendPicker
          conversations={activeConversations}
          labelConversations={labelConversations}
          selectedConversationId={selectedSendConversation?.id || ''}
          onSelect={onSelectSendConversation}
          extraInstances={extraInstances}
          onSelectExtraInstance={onSelectExtraInstance}
          canSend={canSend}
          creating={creatingInstance}
        />
        <SendMessageBar
          onSendMessage={handleSendMessage}
          loading={sending}
          disabled={!canSend || !canSendToSelected || !selectedSendConversation}
          conversationId={selectedSendConversation?.id}
          instanceId={selectedSendConversation?.instance_id}
        />
      </div>
    </div>
  )
}
