import { useState, useEffect, useCallback } from 'react'
import { 
  getChatConversations, 
  getChatMessages, 
  sendMessage, 
  connectWhatsAppInstance,
  deleteWhatsAppInstance,
  subscribeToNewMessages,
  subscribeToInstanceStatus,
  testRealtimeConnection,
  getConversationById
} from '../services/chatService'
import type { 
  ChatConversation, 
  ChatMessage, 
  SendMessageData, 
  SendMessageResponse,
  ConnectInstanceData,
  ConnectInstanceResponse
} from '../types'
import SecureLogger from '../utils/logger'

export function useChatLogic() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Testar conexão realtime na inicialização
  useEffect(() => {
    const testChannel = testRealtimeConnection()
    
    return () => {
      testChannel.unsubscribe()
    }
  }, [])

  // Carregar conversas
  const loadConversations = async (filters = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await getChatConversations(filters)
      setConversations(data)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar conversas'
      setError(errorMessage)
      SecureLogger.error('Erro ao carregar conversas', err)
    } finally {
      setLoading(false)
    }
  }

  // Carregar mensagens de uma conversa
  const loadMessages = async (leadId: string) => {
    if (!leadId) {
      setMessages([])
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const data = await getChatMessages(leadId)
      setMessages(data)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar mensagens'
      setError(errorMessage)
      SecureLogger.error('Erro ao carregar mensagens', err)
    } finally {
      setLoading(false)
    }
  }

  // Função para selecionar conversa inicial baseada na URL
  const selectInitialConversation = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const conversationId = urlParams.get('conversation')
    
    if (conversationId) {
      try {
        const conversation = await getConversationById(conversationId)
        
        if (conversation) {
          setSelectedConversation(conversation)
          await loadMessages(conversation.id)
        }
      } catch (error) {
        SecureLogger.error('Erro ao selecionar conversa inicial', error)
      }
    }
  }, [loadMessages])

  // Carregar conversas e selecionar conversa inicial
  useEffect(() => {
    const initializeChat = async () => {
      await loadConversations()
      await selectInitialConversation()
    }
    
    initializeChat()
  }, []) // Remover selectInitialConversation da dependência para evitar loops

  // Selecionar conversa
  const selectConversation = (conversation: ChatConversation | null) => {
    setSelectedConversation(conversation)
    
    if (conversation) {
      loadMessages(conversation.id)
    } else {
      // Limpar mensagens quando não há conversa selecionada
      setMessages([])
    }
  }

  // Enviar mensagem
  const sendNewMessage = async (data: SendMessageData): Promise<SendMessageResponse> => {
    try {
      setSending(true)
      setError(null)
      
      const result = await sendMessage(data)
      
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

  // Conectar instância
  const connectInstance = async (data: ConnectInstanceData): Promise<ConnectInstanceResponse> => {
    try {
      setError(null)
      
      const result = await connectWhatsAppInstance(data)
      
      // Recarregar conversas após conexão
      await loadConversations()
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar instância'
      setError(errorMessage)
      SecureLogger.error('Erro ao conectar instância', err)
      throw err
    }
  }

  // Deletar instância
  const deleteInstance = async (instanceId: string): Promise<void> => {
    try {
      setError(null)
      
      await deleteWhatsAppInstance(instanceId)
      
      // Recarregar conversas após exclusão
      await loadConversations()
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar instância'
      setError(errorMessage)
      SecureLogger.error('Erro ao deletar instância', err)
      throw err
    }
  }

  // Subscrição para novas mensagens
  useEffect(() => {
    if (!selectedConversation) {
      return
    }

    const subscription = subscribeToNewMessages(
      selectedConversation.id,
      (newMessage) => {
        // Verificar se a mensagem já existe no estado
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === newMessage.id)
          if (messageExists) {
            return prev
          }
          
          return [...prev, newMessage]
        })
      }
    )

    // Polling como fallback - verificar novas mensagens a cada 10 segundos (reduzido de 3s)
    const pollingInterval = setInterval(async () => {
      try {
        const newMessages = await getChatMessages(selectedConversation.id, 50)
        
        setMessages(prev => {
          // Verificar se há mensagens novas usando Set para O(1) lookup
          const currentIds = new Set(prev.map(msg => msg.id))
          const newMessagesOnly = newMessages.filter(msg => !currentIds.has(msg.id))
          
          if (newMessagesOnly.length > 0) {
            return [...prev, ...newMessagesOnly]
          }
          
          return prev
        })
      } catch (error) {
        SecureLogger.error('❌ Erro no polling de mensagens', error)
      }
    }, 10000) // Aumentado de 3000ms para 10000ms

    return () => {
      subscription.unsubscribe()
      clearInterval(pollingInterval)
    }
  }, [selectedConversation?.id])

  // Subscrição para mudanças de status da instância
  useEffect(() => {
    if (!selectedConversation) return

    const subscription = subscribeToInstanceStatus(
      selectedConversation.instance_id,
      () => {
        // Atualizar status na conversa selecionada
        setSelectedConversation(prev => prev ? { ...prev } : null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [selectedConversation?.instance_id])

  return {
    // Estado
    conversations,
    selectedConversation,
    messages,
    loading,
    sending,
    error,
    
    // Ações
    loadConversations,
    loadMessages,
    selectConversation,
    sendNewMessage,
    connectInstance,
    deleteInstance,
    
    // Utilitários
    clearError: () => setError(null)
  }
} 