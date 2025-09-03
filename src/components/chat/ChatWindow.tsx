import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PhoneIcon } from '@heroicons/react/24/solid'
import type { ChatConversation, ChatMessage, SendMessageData, SendMessageResponse } from '../../types'
import { MessageBubble } from './MessageBubble'
import { SendMessageBar } from './SendMessageBar'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

interface ChatWindowProps {
  selectedConversation: ChatConversation | null
  messages: ChatMessage[]
  sending: boolean
  onSendMessage: (data: SendMessageData) => Promise<SendMessageResponse>
}

export function ChatWindow({ selectedConversation, messages, sending, onSendMessage }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatPhone = (phone: string) => {
    if (!phone) return 'Telefone não informado'
    
    // Remove caracteres especiais e mantém apenas números
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Formatação brasileira
    if (cleanPhone.length === 11) {
      // (11) 99999-9999
      return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`
    } else if (cleanPhone.length === 10) {
      // (11) 9999-9999
      return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`
    } else if (cleanPhone.length === 13) {
      // +55 (11) 99999-9999
      return `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`
    } else if (cleanPhone.length === 12) {
      // +55 (11) 9999-9999
      return `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 8)}-${cleanPhone.slice(8)}`
    }
    
    // Se não conseguir formatar, retorna o telefone original
    return phone
  }

  const handleSendMessage = async (data: SendMessageData) => {
    if (!selectedConversation) return

    try {
      const messageData = {
        ...data,
        conversation_id: selectedConversation.id,
        instance_id: selectedConversation.instance_id
      }
      
      await onSendMessage(messageData)
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    }
  }

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {}
    
    messages.forEach(message => {
      const date = format(new Date(message.timestamp), 'yyyy-MM-dd')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    
    return groups
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (dateString === format(today, 'yyyy-MM-dd')) {
      return 'Hoje'
    } else if (dateString === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ontem'
    } else {
      return format(date, 'EEEE, dd/MM/yyyy', { locale: ptBR })
    }
  }

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Selecione uma conversa
          </h3>
          <p className="text-gray-500 max-w-md">
            Escolha uma conversa na lista para começar a enviar mensagens e gerenciar seus leads.
          </p>
        </div>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header da conversa */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-lg">
                {selectedConversation.lead_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedConversation.lead_name}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <PhoneIcon className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-500">
                  {formatPhone(selectedConversation.lead_phone)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma mensagem ainda
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              Inicie uma conversa enviando sua primeira mensagem para {selectedConversation.lead_name}.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date} className="space-y-4">
                {/* Separador de data */}
                <div className="flex items-center justify-center">
                  <div className="bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                    <span className="text-sm font-medium text-gray-600">
                      {formatDate(date)}
                    </span>
                  </div>
                </div>
                
                {/* Mensagens do dia */}
                <div className="space-y-3">
                  {dateMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwnMessage={message.direction === 'inbound'} // Invertido: inbound = lado direito
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Barra de envio de mensagem */}
      <SendMessageBar
        onSendMessage={handleSendMessage}
        loading={sending}
        conversationId={selectedConversation.id}
        instanceId={selectedConversation.instance_id}
      />
    </div>
  )
} 