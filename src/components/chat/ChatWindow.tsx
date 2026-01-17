import { useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PhoneIcon, ArrowLeftIcon } from '@heroicons/react/24/solid'
import type { ChatConversation, ChatMessage, SendMessageData, SendMessageResponse } from '../../types'
import { MessageBubble } from './MessageBubble'
import { SendMessageBar } from './SendMessageBar'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

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
      // parseISO garante que timestamps UTC sejam interpretados corretamente
      const date = format(parseISO(message.timestamp), 'yyyy-MM-dd')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    
    return groups
  }

  const formatDate = (dateString: string) => {
    // dateString já vem no formato 'yyyy-MM-dd' do groupMessagesByDate
    // Criar data a partir dessa string (sem timezone issues)
    const date = parseISO(dateString)
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
      <div className="flex-1 flex items-center justify-center bg-gray-50 w-full">
        <div className="text-center p-6">
          <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 shadow-lg">
            <ChatBubbleLeftRightIcon className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
          </div>
          <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2 lg:mb-3">
            Selecione uma conversa
          </h3>
          <p className="text-gray-500 max-w-md text-sm lg:text-base">
            Escolha uma conversa na lista para começar a enviar mensagens.
          </p>
          {/* Botão voltar no mobile */}
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 lg:hidden px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium"
            >
              Ver Conversas
            </button>
          )}
        </div>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="flex-1 flex flex-col bg-white w-full">
      {/* Header da conversa */}
      <div className="bg-white border-b border-gray-200 px-3 lg:px-6 py-3 lg:py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
            {/* Botão voltar - apenas mobile */}
            {onBack && (
              <button
                onClick={onBack}
                className="lg:hidden p-2 -ml-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-white font-semibold text-base lg:text-lg">
                {selectedConversation.lead_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base lg:text-lg font-semibold text-gray-900 truncate">
                {selectedConversation.lead_name}
              </h2>
              <div className="flex items-center space-x-1 lg:space-x-2 mt-0.5 lg:mt-1">
                <PhoneIcon className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 flex-shrink-0" />
                <p className="text-xs lg:text-sm text-gray-500 truncate">
                  {formatPhone(selectedConversation.lead_phone)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="flex items-center space-x-1 px-2 lg:px-3 py-1 lg:py-1.5 bg-green-50 text-green-700 rounded-full">
              <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full"></div>
              <span className="text-[10px] lg:text-xs font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 lg:p-8">
            <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3 lg:mb-4">
              <ChatBubbleLeftRightIcon className="w-7 h-7 lg:w-8 lg:h-8 text-gray-400" />
            </div>
            <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-1.5 lg:mb-2">
              Nenhuma mensagem ainda
            </h3>
            <p className="text-gray-500 text-center max-w-md text-sm lg:text-base">
              Inicie uma conversa enviando sua primeira mensagem para {selectedConversation.lead_name}.
            </p>
          </div>
        ) : (
          <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date} className="space-y-3 lg:space-y-4">
                {/* Separador de data */}
                <div className="flex items-center justify-center">
                  <div className="bg-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-full border border-gray-200 shadow-sm">
                    <span className="text-xs lg:text-sm font-medium text-gray-600">
                      {formatDate(date)}
                    </span>
                  </div>
                </div>
                
                {/* Mensagens do dia */}
                <div className="space-y-2 lg:space-y-3">
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