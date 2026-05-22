import { useState, useCallback, useMemo } from 'react'
import type { ChatConversation, WhatsAppInstance } from '../types'
import {
  getConversationsByLeadId,
  findOrCreateConversationByPhone,
  getSelectableWhatsAppInstances,
} from '../services/chatService'
import { getAllowedInstanceIdsForCurrentUser } from '../services/instancePermissionService'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'

interface ConversationFlowState {
  conversations: ChatConversation[]
  availableInstances: WhatsAppInstance[]
  showConversationView: boolean
  showSelectInstance: boolean
  allowedInstanceIds: string[] | undefined
  pendingPhone: string | null
  pendingLeadId: string | null
  loading: boolean
}

const INITIAL_STATE: ConversationFlowState = {
  conversations: [],
  availableInstances: [],
  showConversationView: false,
  showSelectInstance: false,
  allowedInstanceIds: undefined,
  pendingPhone: null,
  pendingLeadId: null,
  loading: false,
}

export function useConversationFlow() {
  const [state, setState] = useState<ConversationFlowState>(INITIAL_STATE)
  const { isAdmin } = useAuthContext()
  const { showError } = useToastContext()

  const existingInstanceIds = useMemo(
    () => state.conversations.map(c => c.instance_id).filter(Boolean),
    [state.conversations],
  )

  const filteredAvailableInstances = useMemo(
    () => state.availableInstances.filter(i => !existingInstanceIds.includes(i.id)),
    [state.availableInstances, existingInstanceIds],
  )

  const openInternalChat = useCallback(async (phone: string, leadId: string) => {
    setState(prev => ({ ...prev, loading: true }))

    try {
      const { data: allowed } = await getAllowedInstanceIdsForCurrentUser()
      const uazapiIds = allowed || []

      // Carrega instâncias unificadas (uazapi filtradas + todas as cloud_api da empresa).
      const allInstances = await getSelectableWhatsAppInstances({
        allowedUazapiIds: isAdmin ? undefined : uazapiIds,
      })

      // Permissão: admin sempre; demais precisam de pelo menos uma instância disponível
      // (uazapi permitida OU qualquer cloud_api).
      if (!isAdmin && allInstances.length === 0) {
        throw new Error('Você não tem permissão para nenhuma conexão de WhatsApp')
      }

      const conversations = await getConversationsByLeadId(leadId)

      if (conversations.length > 0) {
        setState(prev => ({
          ...prev,
          conversations,
          availableInstances: allInstances,
          showConversationView: true,
          pendingPhone: phone,
          pendingLeadId: leadId,
          loading: false,
        }))
      } else {
        setState(prev => ({
          ...prev,
          allowedInstanceIds: isAdmin ? undefined : uazapiIds,
          pendingPhone: phone,
          pendingLeadId: leadId,
          showSelectInstance: true,
          loading: false,
        }))
      }
    } catch (error) {
      console.error('Erro ao abrir chat interno:', error)
      showError('Erro ao abrir chat. Tente novamente.')
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [isAdmin, showError])

  const createConversationForInstance = useCallback(async (instanceId: string) => {
    const { pendingPhone, pendingLeadId } = state
    if (!pendingPhone || !pendingLeadId) return

    setState(prev => ({ ...prev, loading: true }))

    try {
      const conversation = await findOrCreateConversationByPhone(pendingPhone, pendingLeadId, instanceId)
      if (conversation) {
        const conversations = await getConversationsByLeadId(pendingLeadId)
        setState(prev => ({
          ...prev,
          conversations: conversations.length > 0 ? conversations : [conversation],
          loading: false,
        }))
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error)
      showError('Erro ao iniciar conversa. Tente novamente.')
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [state.pendingPhone, state.pendingLeadId, showError])

  const handleInstanceSelect = useCallback(async (instanceId: string) => {
    const { pendingPhone, pendingLeadId } = state
    if (!pendingPhone || !pendingLeadId) return

    setState(prev => ({ ...prev, showSelectInstance: false, loading: true }))

    try {
      const conversation = await findOrCreateConversationByPhone(pendingPhone, pendingLeadId, instanceId)
      if (conversation) {
        const [conversations, allowed] = await Promise.all([
          getConversationsByLeadId(pendingLeadId),
          getAllowedInstanceIdsForCurrentUser(),
        ])
        const uazapiIds = allowed.data || []
        const instances = await getSelectableWhatsAppInstances({
          allowedUazapiIds: isAdmin ? undefined : uazapiIds,
        })

        setState(prev => ({
          ...prev,
          conversations: conversations.length > 0 ? conversations : [conversation],
          availableInstances: instances,
          showConversationView: true,
          loading: false,
          allowedInstanceIds: undefined,
        }))
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error)
      showError('Erro ao iniciar conversa. Tente novamente.')
      setState(prev => ({ ...prev, loading: false, pendingPhone: null, pendingLeadId: null }))
    }
  }, [state.pendingPhone, state.pendingLeadId, isAdmin, showError])

  const closeConversationView = useCallback(() => {
    setState(prev => ({
      ...prev,
      showConversationView: false,
      pendingPhone: null,
      pendingLeadId: null,
      availableInstances: [],
    }))
  }, [])

  const closeSelectInstance = useCallback(() => {
    setState(prev => ({
      ...prev,
      showSelectInstance: false,
      pendingPhone: null,
      pendingLeadId: null,
    }))
  }, [])

  return {
    conversations: state.conversations,
    availableInstances: filteredAvailableInstances,
    showConversationView: state.showConversationView,
    showSelectInstance: state.showSelectInstance,
    allowedInstanceIds: state.allowedInstanceIds,
    loading: state.loading,
    openInternalChat,
    createConversationForInstance,
    handleInstanceSelect,
    closeConversationView,
    closeSelectInstance,
  }
}
