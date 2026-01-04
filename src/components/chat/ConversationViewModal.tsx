import { useState, useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { PhoneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatConversation, ChatMessage } from '../../types'
import { MessageBubble } from './MessageBubble'
import { getChatMessages } from '../../services/chatService'
import { useToastContext } from '../../contexts/ToastContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface ConversationViewModalProps {
  isOpen: boolean
  onClose: () => void
  conversation: ChatConversation | null
}

export function ConversationViewModal({ isOpen, onClose, conversation }: ConversationViewModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { showError } = useToastContext()
  
  useEscapeKey(isOpen, onClose)

  useEffect(() => {
    if (isOpen && conversation) {
      loadMessages()
    } else {
      setMessages([])
    }
  }, [isOpen, conversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    if (!conversation) return

    try {
      setLoading(true)
      const data = await getChatMessages(conversation.id)
      setMessages(data)
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      showError('Erro ao carregar mensagens da conversa')
    } finally {
      setLoading(false)
    }
  }

  const formatPhone = (phone: string) => {
    if (!phone) return 'Telefone não informado'
    
    const cleanPhone = phone.replace(/\D/g, '')
    
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`
    } else if (cleanPhone.length === 10) {
      return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`
    } else if (cleanPhone.length === 13) {
      return `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`
    } else if (cleanPhone.length === 12) {
      return `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 8)}-${cleanPhone.slice(8)}`
    }
    
    return phone
  }

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      const now = new Date()
      const messageDate = new Date(date)
      
      const isToday = 
        messageDate.getDate() === now.getDate() &&
        messageDate.getMonth() === now.getMonth() &&
        messageDate.getFullYear() === now.getFullYear()
      
      const isYesterday = 
        messageDate.getDate() === now.getDate() - 1 &&
        messageDate.getMonth() === now.getMonth() &&
        messageDate.getFullYear() === now.getFullYear()
      
      if (isToday) return 'Hoje'
      if (isYesterday) return 'Ontem'
      
      return format(date, 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {}
    
    messages.forEach((message) => {
      const dateKey = message.timestamp.split('T')[0]
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })
    
    return groups
  }

  if (!isOpen || !conversation) return null

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-1/2 lg:w-2/5 xl:w-1/3 bg-white shadow-2xl z-[55] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Visualizar Conversa</h2>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Info da conversa */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">
                {conversation.lead_name}
              </h3>
              <p className="text-sm text-white/90">
                {conversation.nome_instancia}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/90">
            <PhoneIcon className="w-4 h-4" />
            <span>{formatPhone(conversation.lead_phone)}</span>
          </div>

          {conversation.Nome_Whatsapp && (
            <div className="text-sm text-white/80">
              Nome no WhatsApp: {conversation.Nome_Whatsapp}
            </div>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma mensagem
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              Ainda não há mensagens nesta conversa.
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
                      isOwnMessage={message.direction === 'inbound'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Footer - Apenas informativo */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <ChatBubbleLeftRightIcon className="w-4 h-4" />
          <span>Modo visualização - somente leitura</span>
        </div>
      </div>
    </div>
  )
}

