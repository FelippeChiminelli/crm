import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  sendMessage, 
  connectWhatsAppInstance,
  deleteWhatsAppInstance,
  subscribeToNewMessages,
  subscribeToInstanceStatus,
  testRealtimeConnection,
  getConversationById,
  resolveUnifiedConversations,
  getUnifiedMessagesByLeadId,
  findOrCreateConversationByPhone,
  getSelectableWhatsAppInstances,
} from '../services/chatService'
import { getAllowedInstanceIdsForCurrentUser } from '../services/instancePermissionService'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import type { 
  ChatConversation, 
  SendMessageData, 
  SendMessageResponse,
  ConnectInstanceData,
  ConnectInstanceResponse,
  UnifiedChatMessage,
  WhatsAppInstance,
} from '../types'
import { pickSendConversation } from '../utils/chatConversationGroups'
import SecureLogger from '../utils/logger'

export function useChatLogic() {
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [activeConversations, setActiveConversations] = useState<ChatConversation[]>([])
  const [selectedSendConversation, setSelectedSendConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [creatingInstance, setCreatingInstance] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allInstances, setAllInstances] = useState<WhatsAppInstance[]>([])
  const [allowedIds, setAllowedIds] = useState<string[] | null>(null)
  const [sidebarRefreshToken, setSidebarRefreshToken] = useState(0)
  const preferredInstanceIdRef = useRef<string | null>(null)

  const { isAdmin } = useAuthContext()
  const { showError } = useToastContext()

  const cloudApiInstanceIds = useMemo(
    () => new Set(allInstances.filter(i => i.source === 'cloud_api').map(i => i.id)),
    [allInstances],
  )

  const canSend =
    isAdmin ||
    (allowedIds !== null && allowedIds.length > 0) ||
    cloudApiInstanceIds.size > 0

  const permittedActiveConversations = useMemo(() => {
    if (isAdmin || !allowedIds) return activeConversations
    return activeConversations.filter(c =>
      allowedIds.includes(c.instance_id) || cloudApiInstanceIds.has(c.instance_id),
    )
  }, [activeConversations, allowedIds, isAdmin, cloudApiInstanceIds])

  const extraInstances = useMemo(() => {
    const existingIds = activeConversations.map(c => c.instance_id).filter(Boolean)
    let filtered = allInstances.filter(i => !existingIds.includes(i.id))
    if (!isAdmin && allowedIds && allowedIds.length > 0) {
      filtered = filtered.filter(
        i => i.source === 'cloud_api' || allowedIds.includes(i.id),
      )
    }
    return filtered
  }, [allInstances, activeConversations, isAdmin, allowedIds])

  const canSendToSelected = useMemo(() => {
    if (!selectedSendConversation) return false
    if (!canSend) return false
    if (isAdmin) return true
    if (cloudApiInstanceIds.has(selectedSendConversation.instance_id)) return true
    return allowedIds?.includes(selectedSendConversation.instance_id) ?? false
  }, [selectedSendConversation, canSend, isAdmin, cloudApiInstanceIds, allowedIds])

  useEffect(() => {
    let cancelled = false

    const loadInstancesAndPermissions = async () => {
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
      } catch (err) {
        SecureLogger.error('Erro ao carregar instâncias do chat', err)
        if (!cancelled) setAllowedIds([])
      }
    }

    loadInstancesAndPermissions()
    return () => { cancelled = true }
  }, [isAdmin])

  const loadUnifiedMessages = useCallback(async (conversations: ChatConversation[]) => {
    if (conversations.length === 0) {
      setMessages([])
      return
    }
    const data = await getUnifiedMessagesByLeadId(conversations)
    setMessages(data)
  }, [])

  const selectConversation = useCallback(async (
    conversation: ChatConversation | null,
    preferredInstanceId?: string | null
  ) => {
    if (preferredInstanceId !== undefined) {
      preferredInstanceIdRef.current = preferredInstanceId
    }

    if (!conversation) {
      setSelectedConversation(null)
      setActiveConversations([])
      setSelectedSendConversation(null)
      setMessages([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const unified = await resolveUnifiedConversations(conversation)
      const instanceId = preferredInstanceIdRef.current
      const sendTarget = pickSendConversation(unified, instanceId)

      setSelectedConversation(conversation)
      setActiveConversations(unified)
      setSelectedSendConversation(sendTarget)
      await loadUnifiedMessages(unified)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar conversa'
      setError(errorMessage)
      SecureLogger.error('Erro ao selecionar conversa unificada', err)
    } finally {
      setLoading(false)
    }
  }, [loadUnifiedMessages])

  const selectSendConversation = useCallback((conversationId: string) => {
    const conv = activeConversations.find(c => c.id === conversationId)
    if (conv) setSelectedSendConversation(conv)
  }, [activeConversations])

  const createConversationOnInstance = useCallback(async (instanceId: string) => {
    if (!selectedConversation) return

    const phone = selectedConversation.lead_phone
    const leadId = selectedConversation.lead_id

    if (!phone) {
      showError('Conversa sem número de telefone')
      return
    }

    setCreatingInstance(true)
    try {
      const newConv = await findOrCreateConversationByPhone(phone, leadId, instanceId)
      preferredInstanceIdRef.current = instanceId
      const unified = await resolveUnifiedConversations(newConv)
      const sendTarget = pickSendConversation(unified, instanceId)

      setSelectedConversation(newConv)
      setActiveConversations(unified)
      setSelectedSendConversation(sendTarget)
      await loadUnifiedMessages(unified)
      setSidebarRefreshToken(t => t + 1)
    } catch (err) {
      SecureLogger.error('Erro ao iniciar conversa em nova instância', err)
      showError('Erro ao iniciar conversa nesta instância')
    } finally {
      setCreatingInstance(false)
    }
  }, [selectedConversation, loadUnifiedMessages, showError])

  useEffect(() => {
    const testChannel = testRealtimeConnection()
    return () => { testChannel.unsubscribe() }
  }, [])

  useEffect(() => {
    const selectInitialConversation = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const conversationId = urlParams.get('conversation')

      if (conversationId) {
        try {
          const conversation = await getConversationById(conversationId)
          if (conversation) {
            await selectConversation(conversation, conversation.instance_id)
          }
        } catch (error) {
          SecureLogger.error('Erro ao selecionar conversa inicial', error)
        }
      }
    }

    selectInitialConversation()
  }, [selectConversation])

  const sendNewMessage = async (data: SendMessageData): Promise<SendMessageResponse> => {
    try {
      setSending(true)
      setError(null)
      const result = await sendMessage(data)

      const sendConv = activeConversations.find(c => c.id === data.conversation_id)
      const optimisticMsg: UnifiedChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: data.conversation_id,
        instance_id: data.instance_id,
        message_type: data.message_type,
        content: data.content,
        media_url: data.media_url,
        direction: 'inbound',
        status: 'sent',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        instance_name: sendConv?.nome_instancia || 'Instância desconhecida',
      }
      setMessages(prev => [...prev, optimisticMsg])

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      setError(errorMessage)
      SecureLogger.error('Erro ao enviar mensagem', err)
      throw err
    } finally {
      setSending(false)
    }
  }

  const connectInstance = async (data: ConnectInstanceData): Promise<ConnectInstanceResponse> => {
    try {
      setError(null)
      return await connectWhatsAppInstance(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar instância'
      setError(errorMessage)
      SecureLogger.error('Erro ao conectar instância', err)
      throw err
    }
  }

  const deleteInstance = async (instanceId: string, deleteConversations: boolean = true): Promise<void> => {
    try {
      setError(null)
      await deleteWhatsAppInstance(instanceId, deleteConversations)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar instância'
      setError(errorMessage)
      SecureLogger.error('Erro ao deletar instância', err)
      throw err
    }
  }

  const refreshUnifiedMessages = useCallback(async () => {
    if (activeConversations.length === 0) return
    try {
      await loadUnifiedMessages(activeConversations)
    } catch (err) {
      SecureLogger.error('Erro ao atualizar mensagens unificadas', err)
    }
  }, [activeConversations, loadUnifiedMessages])

  useEffect(() => {
    if (activeConversations.length === 0) return

    const subscriptions = activeConversations.map(conv =>
      subscribeToNewMessages(conv.id, () => {
        refreshUnifiedMessages()
      })
    )

    const pollingInterval = setInterval(() => {
      refreshUnifiedMessages()
    }, 10000)

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
      clearInterval(pollingInterval)
    }
  }, [activeConversations, refreshUnifiedMessages])

  useEffect(() => {
    if (!selectedSendConversation) return

    const subscription = subscribeToInstanceStatus(
      selectedSendConversation.instance_id,
      () => {
        setSelectedSendConversation(prev => prev ? { ...prev } : null)
      }
    )

    return () => { subscription.unsubscribe() }
  }, [selectedSendConversation?.instance_id])

  return {
    selectedConversation,
    activeConversations,
    permittedActiveConversations,
    selectedSendConversation,
    messages,
    loading,
    sending,
    creatingInstance,
    error,
    canSend,
    canSendToSelected,
    extraInstances,
    sidebarRefreshToken,
    selectConversation,
    selectSendConversation,
    createConversationOnInstance,
    sendNewMessage,
    connectInstance,
    deleteInstance,
    clearError: () => setError(null),
  }
}
