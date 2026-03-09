import { useState, useCallback } from 'react'
import type { ChatConversation } from '../types'
import { getConversationsByLeadId, findOrCreateConversationByPhone } from '../services/chatService'
import { getAllowedInstanceIdsForCurrentUser } from '../services/instancePermissionService'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'

interface ConversationFlowState {
  conversations: ChatConversation[]
  showConversationView: boolean
  showSelectInstance: boolean
  allowedInstanceIds: string[] | undefined
  pendingPhone: string | null
  pendingLeadId: string | null
  loading: boolean
}

const INITIAL_STATE: ConversationFlowState = {
  conversations: [],
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

  const openInternalChat = useCallback(async (phone: string, leadId: string) => {
    setState(prev => ({ ...prev, loading: true }))

    try {
      const conversations = await getConversationsByLeadId(leadId)

      if (conversations.length > 0) {
        setState(prev => ({
          ...prev,
          conversations,
          showConversationView: true,
          loading: false,
        }))
      } else {
        const { data: allowed } = await getAllowedInstanceIdsForCurrentUser()
        const ids = allowed || []

        if (!isAdmin && ids.length === 0) {
          throw new Error('Você não tem permissão para nenhuma instância de WhatsApp')
        }

        setState(prev => ({
          ...prev,
          allowedInstanceIds: isAdmin ? undefined : ids,
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

  const handleInstanceSelect = useCallback(async (instanceId: string) => {
    const { pendingPhone, pendingLeadId } = state
    if (!pendingPhone || !pendingLeadId) return

    setState(prev => ({ ...prev, showSelectInstance: false, loading: true }))

    try {
      const conversation = await findOrCreateConversationByPhone(pendingPhone, pendingLeadId, instanceId)
      if (conversation) {
        const conversations = await getConversationsByLeadId(pendingLeadId)
        setState(prev => ({
          ...prev,
          conversations: conversations.length > 0 ? conversations : [conversation],
          showConversationView: true,
          loading: false,
          pendingPhone: null,
          pendingLeadId: null,
          allowedInstanceIds: undefined,
        }))
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error)
      showError('Erro ao iniciar conversa. Tente novamente.')
      setState(prev => ({ ...prev, loading: false, pendingPhone: null, pendingLeadId: null }))
    }
  }, [state.pendingPhone, state.pendingLeadId, showError])

  const closeConversationView = useCallback(() => {
    setState(prev => ({ ...prev, showConversationView: false }))
  }, [])

  const closeSelectInstance = useCallback(() => {
    setState(prev => ({ ...prev, showSelectInstance: false, pendingPhone: null, pendingLeadId: null }))
  }, [])

  return {
    conversations: state.conversations,
    showConversationView: state.showConversationView,
    showSelectInstance: state.showSelectInstance,
    allowedInstanceIds: state.allowedInstanceIds,
    loading: state.loading,
    openInternalChat,
    handleInstanceSelect,
    closeConversationView,
    closeSelectInstance,
  }
}
