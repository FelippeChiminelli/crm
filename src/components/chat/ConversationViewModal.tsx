import { useState, useEffect, useRef, useCallback } from 'react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { PhoneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatConversation, UnifiedChatMessage, SendMessageData, WhatsAppInstance } from '../../types'
import { MessageBubble } from './MessageBubble'
import { InstanceDivider } from './InstanceDivider'
import { SendMessageBar } from './SendMessageBar'
import { getUnifiedMessagesByLeadId, sendMessage } from '../../services/chatService'
import { useToastContext } from '../../contexts/ToastContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const POLL_INTERVAL_MS = 3000

interface ConversationViewModalProps {
  isOpen: boolean
  onClose: () => void
  conversations: ChatConversation[]
  availableInstances?: WhatsAppInstance[]
  onSelectNewInstance?: (instanceId: string) => void
}

export function ConversationViewModal({ isOpen, onClose, conversations, availableInstances = [], onSelectNewInstance }: ConversationViewModalProps) {
  const [creatingInstance, setCreatingInstance] = useState(false)
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedInstanceConvId, setSelectedInstanceConvId] = useState<string>('')
  const [showInstancePicker, setShowInstancePicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const instancePickerRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevMessageCountRef = useRef(0)
  const { showError } = useToastContext()

  useEscapeKey(isOpen, onClose)

  const leadName = conversations[0]?.lead_name || 'Lead'
  const leadPhone = conversations[0]?.lead_phone || ''

  const loadMessages = useCallback(async (showSpinner = false) => {
    if (conversations.length === 0) return

    try {
      if (showSpinner) setLoading(true)
      const data = await getUnifiedMessagesByLeadId(conversations)
      setMessages(data)
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      if (showSpinner) showError('Erro ao carregar mensagens')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [conversations, showError])

  useEffect(() => {
    if (isOpen && conversations.length > 0) {
      loadMessages(true)
      if (!selectedInstanceConvId && conversations.length > 0) {
        setSelectedInstanceConvId(conversations[0].id)
      }
    } else {
      setMessages([])
    }
  }, [isOpen, conversations])

  // Polling para manter mensagens atualizadas
  useEffect(() => {
    if (isOpen && conversations.length > 0) {
      pollRef.current = setInterval(() => loadMessages(false), POLL_INTERVAL_MS)
      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
    if (pollRef.current) clearInterval(pollRef.current)
  }, [isOpen, conversations, loadMessages])

  // Scroll automático apenas quando chegam novas mensagens
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (instancePickerRef.current && !instancePickerRef.current.contains(event.target as Node)) {
        setShowInstancePicker(false)
      }
    }
    if (showInstancePicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showInstancePicker])

  const handleSendMessage = async (data: SendMessageData) => {
    const selectedConv = conversations.find(c => c.id === selectedInstanceConvId)
    if (!selectedConv) {
      showError('Selecione uma instância para enviar')
      return
    }

    const payload = {
      ...data,
      conversation_id: selectedConv.id,
      instance_id: selectedConv.instance_id,
    }

    // Optimistic update: exibe a mensagem na UI imediatamente
    // direction 'inbound' = lado direito (mensagens do CRM) conforme convenção invertida do sistema
    const optimisticMsg: UnifiedChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConv.id,
      instance_id: selectedConv.instance_id,
      message_type: data.message_type,
      content: data.content,
      direction: 'inbound',
      status: 'sent',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      instance_name: selectedConv.nome_instancia || 'Instância desconhecida',
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      setSending(true)
      await sendMessage(payload)
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      showError('Erro ao enviar mensagem')
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
    } finally {
      setSending(false)
    }
  }

  const selectedConv = conversations.find(c => c.id === selectedInstanceConvId)

  const formatPhone = (phone: string) => {
    if (!phone) return 'Telefone não informado'
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length === 13) {
      return `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`
    }
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`
    }
    return phone
  }

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      const now = new Date()
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
      if (isToday) return 'Hoje'
      if (isYesterday) return 'Ontem'
      return format(date, 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const buildTimeline = (msgs: UnifiedChatMessage[]) => {
    type TimelineItem =
      | { type: 'date'; date: string }
      | { type: 'instance'; instanceName: string }
      | { type: 'message'; message: UnifiedChatMessage }

    const items: TimelineItem[] = []
    let lastDate = ''
    let lastInstanceName = ''

    for (const msg of msgs) {
      const dateKey = msg.timestamp.split('T')[0]

      if (dateKey !== lastDate) {
        lastDate = dateKey
        lastInstanceName = ''
        items.push({ type: 'date', date: dateKey })
      }

      if (msg.instance_name !== lastInstanceName) {
        lastInstanceName = msg.instance_name
        items.push({ type: 'instance', instanceName: msg.instance_name })
      }

      items.push({ type: 'message', message: msg })
    }

    return items
  }

  if (!isOpen || conversations.length === 0) return null

  const timeline = buildTimeline(messages)

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-1/2 lg:w-2/5 xl:w-1/3 bg-white shadow-2xl z-[55] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Conversas</h2>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">{leadName}</h3>
              <p className="text-sm text-white/80">
                {conversations.length} {conversations.length === 1 ? 'conversa' : 'conversas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/90">
            <PhoneIcon className="w-4 h-4" />
            <span>{formatPhone(leadPhone)}</span>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-500">Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma mensagem</h3>
            <p className="text-gray-500 text-center max-w-md">
              Ainda não há mensagens neste lead.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {timeline.map((item, idx) => {
              if (item.type === 'date') {
                return (
                  <div key={`date-${idx}`} className="flex items-center justify-center my-4">
                    <div className="bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                      <span className="text-sm font-medium text-gray-600">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  </div>
                )
              }
              if (item.type === 'instance') {
                return (
                  <InstanceDivider key={`inst-${idx}`} instanceName={item.instanceName} />
                )
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
        <div ref={messagesEndRef} />
      </div>

      {/* Footer: seletor de instância + barra de envio */}
      <div className="border-t border-gray-200 bg-white">
        {/* Seletor de instância — sempre visível */}
        <div className="px-3 pt-2 pb-1 relative" ref={instancePickerRef}>
          <button
            type="button"
            onClick={() => setShowInstancePicker(!showInstancePicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full justify-between"
          >
            <span className="truncate">
              Enviando por: {selectedConv?.nome_instancia || 'Selecionar instância'}
            </span>
            <ChevronDownIcon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${showInstancePicker ? 'rotate-180' : ''}`} />
          </button>

          {showInstancePicker && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setSelectedInstanceConvId(conv.id)
                    setShowInstancePicker(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${
                    conv.id === selectedInstanceConvId ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {conv.nome_instancia || 'Instância'}
                </button>
              ))}

              {availableInstances.length > 0 && onSelectNewInstance && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-t border-gray-100 bg-gray-50">
                    Outros números
                  </div>
                  {availableInstances.map(inst => (
                    <button
                      key={inst.id}
                      type="button"
                      disabled={creatingInstance}
                      onClick={async () => {
                        setCreatingInstance(true)
                        setShowInstancePicker(false)
                        try {
                          await onSelectNewInstance(inst.id)
                        } finally {
                          setCreatingInstance(false)
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors disabled:opacity-50 flex items-center justify-between"
                    >
                      <span>{inst.display_name || inst.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        inst.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {inst.status === 'connected' ? 'online' : inst.status}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <SendMessageBar
          onSendMessage={handleSendMessage}
          disabled={!selectedConv || sending}
          loading={sending}
          conversationId={selectedConv?.id}
          instanceId={selectedConv?.instance_id}
        />
      </div>
    </div>
  )
}
