import { useCallback } from 'react'
import { 
  createTask,
  updateTask,
  deleteTask,
  markTaskAsComplete,
  markTaskAsInProgress
} from '../services/taskService'
import type { CreateTaskData, UpdateTaskData, Task } from '../types'
import { useAsyncOperation } from './useGenericCrud'

/**
 * Hook para operações CRUD de tarefas
 * Separado do useTasksLogic para melhor organização
 */

interface UseTaskOperationsProps {
  onTaskCreated?: (task: Task) => void
  onTaskUpdated?: (task: Task) => void
  onTaskDeleted?: (taskId: string) => void
  onError?: (error: any) => void
}

export function useTaskOperations({
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onError
}: UseTaskOperationsProps = {}) {

  // Hook para operações assíncronas
  const createOperation = useAsyncOperation({
    onSuccess: onTaskCreated,
    onError,
    successMessage: 'Tarefa criada com sucesso!'
  })

  const updateOperation = useAsyncOperation({
    onSuccess: onTaskUpdated,
    onError,
    successMessage: 'Tarefa atualizada com sucesso!'
  })

  const deleteOperation = useAsyncOperation({
    onSuccess: () => {},
    onError,
    successMessage: 'Tarefa excluída com sucesso!'
  })

  // Criar nova tarefa
  const createNewTask = useCallback(async (data: CreateTaskData): Promise<Task | null> => {
    return await createOperation.execute(async () => {
      const task = await createTask(data)
      return task
    })
  }, [createOperation])

  // Atualizar tarefa
  const updateTaskData = useCallback(async (id: string, data: UpdateTaskData): Promise<Task | null> => {
    return await updateOperation.execute(async () => {
      const task = await updateTask(id, data)
      return task
    })
  }, [updateOperation])

  // Remover tarefa
  const removeTask = useCallback(async (id: string): Promise<boolean> => {
    const result = await deleteOperation.execute(async () => {
      await deleteTask(id)
      return true
    })

    if (result) {
      onTaskDeleted?.(id)
      return true
    }
    return false
  }, [deleteOperation, onTaskDeleted])

  // Marcar como concluída
  const completeTask = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateOperation.execute(async () => {
      const task = await markTaskAsComplete(id)
      return task
    })

    return result !== null
  }, [updateOperation])

  // Marcar como em andamento
  const startTask = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateOperation.execute(async () => {
      const task = await markTaskAsInProgress(id)
      return task
    })

    return result !== null
  }, [updateOperation])

  return {
    // Operações CRUD
    createNewTask,
    updateTaskData,
    removeTask,
    
    // Operações específicas
    completeTask,
    startTask,
    
    // Estados de loading
    creating: createOperation.loading,
    updating: updateOperation.loading,
    deleting: deleteOperation.loading,
    
    // Estados de erro/sucesso
    createError: createOperation.error,
    updateError: updateOperation.error,
    deleteError: deleteOperation.error,
    
    createSuccess: createOperation.success,
    updateSuccess: updateOperation.success,
    deleteSuccess: deleteOperation.success,
    
    // Limpar mensagens
    clearCreateMessages: createOperation.clearMessages,
    clearUpdateMessages: updateOperation.clearMessages,
    clearDeleteMessages: deleteOperation.clearMessages
  }
}
