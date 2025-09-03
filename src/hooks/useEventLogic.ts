import type { Event, CreateEventData, UpdateEventData } from '../types'
import {
  createEvent,
  updateEvent,
  deleteEvent
} from '../services/eventService'
import { useAsyncOperation } from './useGenericCrud'

export function useEventLogic() {
  // Operações específicas usando o hook genérico
  const createOperation = useAsyncOperation({
    successMessage: 'Evento criado com sucesso!',
    errorMessage: 'Erro ao criar evento'
  })

  const updateOperation = useAsyncOperation({
    successMessage: 'Evento atualizado com sucesso!',
    errorMessage: 'Erro ao atualizar evento'
  })

  const deleteOperation = useAsyncOperation({
    successMessage: 'Evento excluído com sucesso!',
    errorMessage: 'Erro ao excluir evento'
  })

  async function handleCreateEvent(data: CreateEventData, refetch?: () => void): Promise<Event | null> {
    const result = await createOperation.execute(async () => {
      const created = await createEvent(data)
      if (refetch) refetch()
      return created
    })
    return result
  }

  async function handleUpdateEvent(id: string, data: UpdateEventData, refetch?: () => void): Promise<Event | null> {
    const result = await updateOperation.execute(async () => {
      const updated = await updateEvent(id, data)
      if (refetch) refetch()
      return updated
    })
    return result
  }

  async function handleDeleteEvent(id: string, refetch?: () => void): Promise<boolean> {
    const result = await deleteOperation.execute(async () => {
      await deleteEvent(id)
      if (refetch) refetch()
      return true
    })
    return result !== null
  }

  return {
    // Estados unificados
    loading: createOperation.loading || updateOperation.loading || deleteOperation.loading,
    error: createOperation.error || updateOperation.error || deleteOperation.error,
    success: createOperation.success || updateOperation.success || deleteOperation.success,

    // Operações
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,

    // Estados específicos (se necessário)
    creating: createOperation.loading,
    updating: updateOperation.loading,
    deleting: deleteOperation.loading,

    // Limpar mensagens
    clearMessages: () => {
      createOperation.clearMessages()
      updateOperation.clearMessages()
      deleteOperation.clearMessages()
    }
  }
} 