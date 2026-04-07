import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { XMarkIcon, ChevronDownIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatConversation, UnifiedChatMessage, SendMessageData, WhatsAppInstance } from '../../types'
import { MessageBubble } from './MessageBubble'
import { InstanceDivider } from './InstanceDivider'
import { SendMessageBar } from './SendMessageBar'
import {
  getUnifiedMessagesByLeadId,
  sendMessage,
  getWhatsAppInstances,
  findOrCreateConversationByPhone,
  getConversationsByLeadId,
} from '../../services/chatService'
import { getAllowedInstanceIdsForCurrentUser } from '../../services/instancePermissionService'
import { useAuthContext } from '../../contexts/AuthContext'
import { useToastContext } from '../../contexts/ToastContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const POLL_INTERVAL_MS = 3000

const CHAT_WALLPAPER_SVG = `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='1.2' fill='%23d5dbd6' opacity='0.45'/%3E%3Ccircle cx='30' cy='30' r='1.2' fill='%23d5dbd6' opacity='0.45'/%3E%3Ccircle cx='30' cy='10' r='0.7' fill='%23d5dbd6' opacity='0.3'/%3E%3Ccircle cx='10' cy='30' r='0.7' fill='%23d5dbd6' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='%23efeae2'/%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E")`

interface ConversationViewModalProps {
  isOpen: boolean
  onClose: () => void
  conversations: ChatConversation[]
  availableInstances?: WhatsAppInstance[]
  onSelectNewInstance?: (instanceId: string) => void
}

export function ConversationViewModal({ isOpen, onClose, conversations, availableInstances: propInstances = [], onSelectNewInstance }: ConversationViewModalProps) {
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

  const [allowedIds, setAllowedIds] = useState<string[] | null>(null)
  const [allInstances, setAllInstances] = useState<WhatsAppInstance[]>([])
  const [localConversations, setLocalConversations] = useState<ChatConversation[]>([])

  const { showError } = useToastContext()
  const { isAdmin } = useAuthContext()

  useEscapeKey(isOpen, onClose)

  const allConversations = useMemo(() => {
    const ids = new Set(conversations.map(c => c.id))
    const extras = localConversations.filter(c => !ids.has(c.id))
    return [...conversations, ...extras]
  }, [conversations, localConversations])

  const leadName = allConversations[0]?.lead_name || 'Lead'
  const leadPhone = allConversations[0]?.lead_phone || ''
  const leadId = allConversations[0]?.lead_id || ''
  const initial = leadName.charAt(0).toUpperCase()

  const canSend = isAdmin || (allowedIds !== null && allowedIds.length > 0)

  const permittedConversations = useMemo(() => {
    if (isAdmin || !allowedIds) return allConversations
    return allConversations.filter(c => allowedIds.includes(c.instance_id))
  }, [allConversations, allowedIds, isAdmin])

  const existingInstanceIds = useMemo(
    () => allConversations.map(c => c.instance_id).filter(Boolean),
    [allConversations],
  )

  const extraInstances = useMemo(() => {
    const instances = allInstances.length > 0 ? allInstances : propInstances
    let filtered = instances.filter(i => !existingInstanceIds.includes(i.id))
    if (!isAdmin && allowedIds && allowedIds.length > 0) {
      filtered = filtered.filter(i => allowedIds.includes(i.id))
    }
    return filtered
  }, [allInstances, propInstances, existingInstanceIds, isAdmin, allowedIds])

  // Carregar permissões e instâncias ao abrir
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false

    const loadPermissions = async () => {
      try {
        const [{ data: allowed }, instances] = await Promise.all([
          getAllowedInstanceIdsForCurrentUser(),
          getWhatsAppInstances(),
        ])
        if (cancelled) return
        setAllowedIds(allowed || [])
        setAllInstances(instances)
      } catch (error) {
        console.error('Erro ao carregar permissões:', error)
        if (!cancelled) setAllowedIds([])
      }
    }
    loadPermissions()

    return () => { cancelled = true }
  }, [isOpen])

  const loadMessages = useCallback(async (showSpinner = false) => {
    if (allConversations.length === 0) return
    try {
      if (showSpinner) setLoading(true)
      const data = await getUnifiedMessagesByLeadId(allConversations)
      setMessages(data)
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      if (showSpinner) showError('Erro ao carregar mensagens')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [allConversations, showError])

  useEffect(() => {
    if (isOpen && allConversations.length > 0) {
      loadMessages(true)
      if (!selectedInstanceConvId) {
        const first = permittedConversations[0] || allConversations[0]
        if (first) setSelectedInstanceConvId(first.id)
      }
    } else {
      setMessages([])
    }
  }, [isOpen, allConversations.length])

  useEffect(() => {
    if (isOpen && allConversations.length > 0) {
      pollRef.current = setInterval(() => loadMessages(false), POLL_INTERVAL_MS)
      return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }
    if (pollRef.current) clearInterval(pollRef.current)
  }, [isOpen, allConversations, loadMessages])

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages])

  useEffect(() => {
    if (!showInstancePicker) return
    function handleClickOutside(event: MouseEvent) {
      if (instancePickerRef.current && !instancePickerRef.current.contains(event.target as Node)) {
        setShowInstancePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showInstancePicker])

  // Reset estado local ao fechar
  useEffect(() => {
    if (!isOpen) {
      setLocalConversations([])
      setAllowedIds(null)
      setAllInstances([])
      setSelectedInstanceConvId('')
    }
  }, [isOpen])

  const handleSendMessage = async (data: SendMessageData) => {
    const selectedConv = allConversations.find(c => c.id === selectedInstanceConvId)
    if (!selectedConv) { showError('Selecione uma instância para enviar'); return }
    if (!canSend) { showError('Sem permissão para enviar mensagens'); return }

    const payload = { ...data, conversation_id: selectedConv.id, instance_id: selectedConv.instance_id }

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

  const handleSelectExtraInstance = async (instanceId: string) => {
    if (onSelectNewInstance) {
      setCreatingInstance(true)
      setShowInstancePicker(false)
      try {
        await onSelectNewInstance(instanceId)
      } finally {
        setCreatingInstance(false)
      }
      return
    }

    if (!leadPhone || !leadId) { showError('Dados do lead insuficientes'); return }

    setCreatingInstance(true)
    setShowInstancePicker(false)
    try {
      const newConv = await findOrCreateConversationByPhone(leadPhone, leadId, instanceId)
      if (newConv) {
        const updated = await getConversationsByLeadId(leadId)
        setLocalConversations(updated)
        setSelectedInstanceConvId(newConv.id)
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error)
      showError('Erro ao iniciar conversa nesta instância')
    } finally {
      setCreatingInstance(false)
    }
  }

  const selectedConv = allConversations.find(c => c.id === selectedInstanceConvId)
  const selectedIsPermitted = !selectedConv || isAdmin || (allowedIds?.includes(selectedConv.instance_id) ?? false)

  const formatPhone = (phone: string) => {
    if (!phone) return ''
    const clean = phone.replace(/\D/g, '')
    if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
    return phone
  }

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (dateString === format(now, 'yyyy-MM-dd')) return 'HOJE'
      if (dateString === format(yesterday, 'yyyy-MM-dd')) return 'ONTEM'
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()
    } catch { return dateString }
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
    <div className="fixed inset-y-0 right-0 w-full sm:w-1/2 lg:w-2/5 xl:w-1/3 z-[55] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-base">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-medium text-gray-900 truncate">{leadName}</h2>
          <p className="text-xs text-gray-500 truncate">
            {formatPhone(leadPhone)}
            {allConversations.length > 1 && (
              <span className="ml-2 text-gray-400">· {allConversations.length} conversas</span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors flex-shrink-0"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundImage: CHAT_WALLPAPER_SVG }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg px-6 py-4 shadow-sm text-center">
              <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhuma mensagem ainda com {leadName}.</p>
            </div>
          </div>
        ) : (
          <div className="px-4 lg:px-8 py-4 space-y-1">
            {timeline.map((item, idx) => {
              if (item.type === 'date') {
                return (
                  <div key={`date-${idx}`} className="flex items-center justify-center py-3">
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
                      <span className="text-[11px] font-medium text-gray-500 tracking-wide">{formatDate(item.date)}</span>
                    </div>
                  </div>
                )
              }
              if (item.type === 'instance') {
                return <InstanceDivider key={`inst-${idx}`} instanceName={item.instanceName} />
              }
              return (
                <MessageBubble key={item.message.id} message={item.message} isOwnMessage={item.message.direction === 'inbound'} />
              )
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="bg-[#f0f2f5] flex-shrink-0">
        {/* Seletor de instância */}
        <div className="px-3 pt-2 pb-1 relative" ref={instancePickerRef}>
          {canSend ? (
            <button
              type="button"
              onClick={() => setShowInstancePicker(!showInstancePicker)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors w-full justify-between ${
                selectedConv ? 'text-gray-700 bg-white hover:bg-gray-50' : 'text-gray-400 bg-white'
              }`}
            >
              <span className="truncate">
                Enviando por: {selectedConv?.nome_instancia || 'Selecionar instância'}
              </span>
              <ChevronDownIcon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${showInstancePicker ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded-lg w-full">
              <LockClosedIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Sem permissão para enviar mensagens</span>
            </div>
          )}

          {showInstancePicker && canSend && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
              {permittedConversations.map(conv => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => { setSelectedInstanceConvId(conv.id); setShowInstancePicker(false) }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    conv.id === selectedInstanceConvId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {conv.nome_instancia || 'Instância'}
                </button>
              ))}

              {extraInstances.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-t border-gray-100 bg-gray-50">
                    Outros números
                  </div>
                  {extraInstances.map(inst => (
                    <button
                      key={inst.id}
                      type="button"
                      disabled={creatingInstance}
                      onClick={() => handleSelectExtraInstance(inst.id)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-between"
                    >
                      <span>{inst.display_name || inst.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        inst.status === 'connected' || inst.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {inst.status === 'connected' || inst.status === 'open' ? 'online' : inst.status}
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
          disabled={!canSend || !selectedConv || !selectedIsPermitted || sending}
          loading={sending}
          conversationId={selectedConv?.id}
          instanceId={selectedConv?.instance_id}
        />
      </div>
    </div>
  )
}
