import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { ChatConversation, UnifiedChatMessage, SendMessageData, WhatsAppInstance } from '../../types'
import { SendMessageBar } from './SendMessageBar'
import { UnifiedChatTimeline } from './UnifiedChatTimeline'
import { InstanceSendPicker } from './InstanceSendPicker'
import {
  getUnifiedMessagesByLeadId,
  sendMessage,
  getSelectableWhatsAppInstances,
  findOrCreateConversationByPhone,
  getConversationsByLeadId,
} from '../../services/chatService'
import { getAllowedInstanceIdsForCurrentUser } from '../../services/instancePermissionService'
import { useAuthContext } from '../../contexts/AuthContext'
import { useToastContext } from '../../contexts/ToastContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const POLL_INTERVAL_MS = 3000

interface ConversationViewModalProps {
  isOpen: boolean
  onClose: () => void
  conversations: ChatConversation[]
  availableInstances?: WhatsAppInstance[]
  onSelectNewInstance?: (instanceId: string) => Promise<ChatConversation | null | void>
}

export function ConversationViewModal({ isOpen, onClose, conversations, availableInstances: propInstances = [], onSelectNewInstance }: ConversationViewModalProps) {
  const [creatingInstance, setCreatingInstance] = useState(false)
  const [pendingExtraInstance, setPendingExtraInstance] = useState<WhatsAppInstance | null>(null)
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedInstanceConvId, setSelectedInstanceConvId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  const cloudApiInstanceIds = useMemo(
    () => new Set(allInstances.filter(i => i.source === 'cloud_api').map(i => i.id)),
    [allInstances],
  )

  const isInstanceAllowed = (instanceId: string | null | undefined): boolean => {
    if (!instanceId) return false
    if (isAdmin) return true
    if (cloudApiInstanceIds.has(instanceId)) return true
    return allowedIds?.includes(instanceId) ?? false
  }

  const canSend =
    isAdmin ||
    (allowedIds !== null && allowedIds.length > 0) ||
    cloudApiInstanceIds.size > 0

  const permittedConversations = useMemo(() => {
    if (isAdmin || !allowedIds) return allConversations
    return allConversations.filter(c =>
      allowedIds.includes(c.instance_id) || cloudApiInstanceIds.has(c.instance_id),
    )
  }, [allConversations, allowedIds, isAdmin, cloudApiInstanceIds])

  const existingInstanceIds = useMemo(
    () => allConversations.map(c => c.instance_id).filter(Boolean),
    [allConversations],
  )

  const extraInstances = useMemo(() => {
    const instances = allInstances.length > 0 ? allInstances : propInstances
    let filtered = instances.filter(i => !existingInstanceIds.includes(i.id))
    if (!isAdmin && allowedIds && allowedIds.length > 0) {
      filtered = filtered.filter(
        i => i.source === 'cloud_api' || allowedIds.includes(i.id),
      )
    }
    return filtered
  }, [allInstances, propInstances, existingInstanceIds, isAdmin, allowedIds])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false

    const loadPermissions = async () => {
      try {
        const { data: allowed } = await getAllowedInstanceIdsForCurrentUser()
        if (cancelled) return
        const uazapiIds = allowed || []
        setAllowedIds(uazapiIds)

        const instances = await getSelectableWhatsAppInstances({
          allowedUazapiIds: isAdmin ? undefined : uazapiIds,
        })
        if (cancelled) return
        setAllInstances(instances)
      } catch (error) {
        console.error('Erro ao carregar permissões:', error)
        if (!cancelled) setAllowedIds([])
      }
    }
    loadPermissions()

    return () => { cancelled = true }
  }, [isOpen, isAdmin])

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
    if (!isOpen) {
      setLocalConversations([])
      setAllowedIds(null)
      setAllInstances([])
      setSelectedInstanceConvId('')
      setPendingExtraInstance(null)
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

  const resolveInstanceById = (instanceId: string): WhatsAppInstance | undefined =>
    extraInstances.find(i => i.id === instanceId)
    ?? allInstances.find(i => i.id === instanceId)
    ?? propInstances.find(i => i.id === instanceId)

  const applyNewInstanceSelection = async (
    instanceId: string,
    newConv: ChatConversation,
    updatedConversations: ChatConversation[],
  ) => {
    if (newConv.instance_id !== instanceId) {
      showError('Não foi possível iniciar conversa nesta instância')
      setPendingExtraInstance(null)
      return
    }

    setLocalConversations(updatedConversations)
    const convForInstance = updatedConversations.find(c => c.instance_id === instanceId) || newConv
    setSelectedInstanceConvId(convForInstance.id)
    setPendingExtraInstance(null)

    const data = await getUnifiedMessagesByLeadId(updatedConversations)
    setMessages(data)
  }

  const handleSelectExtraInstance = async (instanceId: string) => {
    const inst = resolveInstanceById(instanceId)
    if (inst) setPendingExtraInstance(inst)

    if (onSelectNewInstance) {
      setCreatingInstance(true)
      try {
        const newConv = await onSelectNewInstance(instanceId)
        if (!newConv) {
          setPendingExtraInstance(null)
          return
        }

        const updated = leadId
          ? await getConversationsByLeadId(leadId)
          : [newConv]

        await applyNewInstanceSelection(instanceId, newConv, updated)
      } catch (error) {
        console.error('Erro ao criar conversa:', error)
        showError('Erro ao iniciar conversa nesta instância')
        setPendingExtraInstance(null)
      } finally {
        setCreatingInstance(false)
      }
      return
    }

    if (!leadPhone) {
      showError('Conversa sem número de telefone')
      setPendingExtraInstance(null)
      return
    }

    setCreatingInstance(true)
    try {
      const newConv = await findOrCreateConversationByPhone(leadPhone, leadId || undefined, instanceId)

      const updated = leadId
        ? await getConversationsByLeadId(leadId)
        : [newConv]

      await applyNewInstanceSelection(instanceId, newConv, updated)
    } catch (error) {
      console.error('Erro ao criar conversa:', error)
      showError('Erro ao iniciar conversa nesta instância')
      setPendingExtraInstance(null)
    } finally {
      setCreatingInstance(false)
    }
  }

  const handleSelectConversation = (conversationId: string) => {
    setPendingExtraInstance(null)
    setSelectedInstanceConvId(conversationId)
  }

  const selectedConv = allConversations.find(c => c.id === selectedInstanceConvId)
  const selectedIsPermitted = !selectedConv || isInstanceAllowed(selectedConv.instance_id)

  const formatPhone = (phone: string) => {
    if (!phone) return ''
    const clean = phone.replace(/\D/g, '')
    if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
    return phone
  }

  if (!isOpen || conversations.length === 0) return null

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-1/2 lg:w-2/5 xl:w-1/3 z-[55] flex flex-col shadow-2xl">
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

      <UnifiedChatTimeline
        messages={messages}
        loading={loading}
        emptyLabel={`Nenhuma mensagem ainda com ${leadName}.`}
        messagesEndRef={messagesEndRef}
      />

      <div className="bg-[#f0f2f5] flex-shrink-0">
        <InstanceSendPicker
          conversations={permittedConversations}
          labelConversations={allConversations}
          selectedConversationId={selectedInstanceConvId}
          onSelect={handleSelectConversation}
          extraInstances={extraInstances}
          onSelectExtraInstance={handleSelectExtraInstance}
          pendingInstanceId={pendingExtraInstance?.id}
          pendingInstanceLabel={pendingExtraInstance?.display_name || pendingExtraInstance?.name}
          canSend={canSend}
          creating={creatingInstance}
        />
        <SendMessageBar
          onSendMessage={handleSendMessage}
          disabled={!canSend || !selectedConv || !selectedIsPermitted || sending || creatingInstance}
          loading={sending}
          conversationId={selectedConv?.id}
          instanceId={selectedConv?.instance_id}
        />
      </div>
    </div>
  )
}
