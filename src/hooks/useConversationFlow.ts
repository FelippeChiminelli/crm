import { useState, useCallback, useMemo } from 'react'
import type { ChatConversation, WhatsAppInstance } from '../types'
import { getConversationsByLeadId, findOrCreateConversationByPhone } from '../services/chatService'
import { getAllowedInstanceIdsForCurrentUser } from '../services/instancePermissionService'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import { supabase } from '../services/supabaseClient'

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

async function fetchCompanyInstances(allowedIds?: string[]): Promise<WhatsAppInstance[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('uuid', user.id)
    .single()

  if (!profile?.empresa_id) return []

  const { data, error } = await supabase
    .from('whatsapp_instances')
    .select('id, name, display_name, phone_number, status, empresa_id, created_at, updated_at')
    .eq('empresa_id', profile.empresa_id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  let list = data as WhatsAppInstance[]
  if (Array.isArray(allowedIds) && allowedIds.length > 0) {
    list = list.filter(i => allowedIds.includes(i.id))
  }
  return list
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
      const ids = allowed || []

      if (!isAdmin && ids.length === 0) {
        throw new Error('Você não tem permissão para nenhuma instância de WhatsApp')
      }

      const conversations = await getConversationsByLeadId(leadId)

      if (conversations.length > 0) {
        const instances = await fetchCompanyInstances(isAdmin ? undefined : ids)

        setState(prev => ({
          ...prev,
          conversations,
          availableInstances: instances,
          showConversationView: true,
          pendingPhone: phone,
          pendingLeadId: leadId,
          loading: false,
        }))
      } else {
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
        const ids = allowed.data || []
        const instances = await fetchCompanyInstances(isAdmin ? undefined : ids)

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
