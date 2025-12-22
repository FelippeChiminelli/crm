import { useState, useEffect, useCallback } from 'react'
import {
  getMyGreetingMessages,
  createGreetingMessage,
  updateGreetingMessage,
  deleteGreetingMessage,
  toggleGreetingMessageStatus,
  uploadGreetingMedia,
  deleteGreetingMedia,
  type GreetingMessage,
  type CreateGreetingMessageData,
  type UpdateGreetingMessageData
} from '../services/greetingMessageService'

export function useGreetingMessages() {
  const [messages, setMessages] = useState<GreetingMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Carregar mensagens
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getMyGreetingMessages()

      if (fetchError) {
        setError(fetchError.message || 'Erro ao carregar mensagens')
        return
      }

      setMessages(data || [])
    } catch (err) {
      setError('Erro ao carregar mensagens')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Criar mensagem
  const createMessage = useCallback(async (data: CreateGreetingMessageData) => {
    try {
      setError(null)

      const { data: newMessage, error: createError } = await createGreetingMessage(data)

      if (createError) {
        setError(createError.message || 'Erro ao criar mensagem')
        return { success: false, error: createError }
      }

      // Adicionar à lista
      if (newMessage) {
        setMessages(prev => [newMessage, ...prev])
      }

      return { success: true, data: newMessage }
    } catch (err) {
      const errorMsg = 'Erro ao criar mensagem'
      setError(errorMsg)
      console.error(err)
      return { success: false, error: errorMsg }
    }
  }, [])

  // Atualizar mensagem
  const updateMessage = useCallback(async (messageId: string, updates: UpdateGreetingMessageData) => {
    try {
      setError(null)

      const { data: updatedMessage, error: updateError } = await updateGreetingMessage(messageId, updates)

      if (updateError) {
        setError(updateError.message || 'Erro ao atualizar mensagem')
        return { success: false, error: updateError }
      }

      // Atualizar na lista
      if (updatedMessage) {
        setMessages(prev =>
          prev.map(msg => (msg.id === messageId ? updatedMessage : msg))
        )
      }

      return { success: true, data: updatedMessage }
    } catch (err) {
      const errorMsg = 'Erro ao atualizar mensagem'
      setError(errorMsg)
      console.error(err)
      return { success: false, error: errorMsg }
    }
  }, [])

  // Deletar mensagem
  const deleteMessage = useCallback(async (messageId: string, mediaUrl?: string) => {
    try {
      setError(null)

      // Se tem mídia, deletar do storage primeiro
      if (mediaUrl) {
        await deleteGreetingMedia(mediaUrl)
      }

      const { error: deleteError } = await deleteGreetingMessage(messageId)

      if (deleteError) {
        setError(deleteError.message || 'Erro ao deletar mensagem')
        return { success: false, error: deleteError }
      }

      // Remover da lista
      setMessages(prev => prev.filter(msg => msg.id !== messageId))

      return { success: true }
    } catch (err) {
      const errorMsg = 'Erro ao deletar mensagem'
      setError(errorMsg)
      console.error(err)
      return { success: false, error: errorMsg }
    }
  }, [])

  // Ativar/Desativar mensagem
  const toggleMessageStatus = useCallback(async (messageId: string, isActive: boolean) => {
    try {
      setError(null)

      const { data: updatedMessage, error: toggleError } = await toggleGreetingMessageStatus(messageId, isActive)

      if (toggleError) {
        setError(toggleError.message || 'Erro ao atualizar status da mensagem')
        return { success: false, error: toggleError }
      }

      // Atualizar na lista
      if (updatedMessage) {
        setMessages(prev =>
          prev.map(msg => (msg.id === messageId ? updatedMessage : msg))
        )
      }

      return { success: true, data: updatedMessage }
    } catch (err) {
      const errorMsg = 'Erro ao atualizar status da mensagem'
      setError(errorMsg)
      console.error(err)
      return { success: false, error: errorMsg }
    }
  }, [])

  // Upload de arquivo
  const uploadMedia = useCallback(async (file: File) => {
    try {
      setUploading(true)
      setError(null)

      const { data, error: uploadError } = await uploadGreetingMedia(file)

      if (uploadError) {
        setError(uploadError.message || 'Erro ao fazer upload do arquivo')
        return { success: false, error: uploadError }
      }

      return { success: true, data }
    } catch (err) {
      const errorMsg = 'Erro ao fazer upload do arquivo'
      setError(errorMsg)
      console.error(err)
      return { success: false, error: errorMsg }
    } finally {
      setUploading(false)
    }
  }, [])

  // Carregar ao montar
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  return {
    messages,
    loading,
    error,
    uploading,
    loadMessages,
    createMessage,
    updateMessage,
    deleteMessage,
    toggleMessageStatus,
    uploadMedia,
    setError
  }
}

