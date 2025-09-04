import { useState, useCallback } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Hook genérico para operações CRUD reutilizáveis
 * Elimina duplicação de código entre diferentes entidades
 */

interface CrudOperations<T, CreateData, UpdateData> {
  list: (params?: any) => Promise<{ data: T[]; total?: number }>
  getById: (id: string) => Promise<T>
  create: (data: CreateData) => Promise<T>
  update: (id: string, data: UpdateData) => Promise<T>
  delete: (id: string) => Promise<void>
}

interface UseGenericCrudProps<T, CreateData, UpdateData> {
  queryKey: string[]
  operations: CrudOperations<T, CreateData, UpdateData>
  onSuccess?: {
    create?: (data: T) => void
    update?: (data: T) => void
    delete?: () => void
  }
  onError?: {
    create?: (error: any) => void
    update?: (error: any) => void
    delete?: (error: any) => void
  }
}

interface UseGenericCrudReturn<T, CreateData, UpdateData> {
  // Queries
  list: UseQueryResult<{ data: T[]; total?: number }, Error>
  
  // Estados de loading unificados
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  
  // Operações
  createItem: (data: CreateData) => Promise<T | null>
  updateItem: (id: string, data: UpdateData) => Promise<T | null>
  deleteItem: (id: string) => Promise<boolean>
  
  // Utilitários
  refetch: () => void
  invalidate: () => void
  getItem: (id: string) => T | undefined
}

export function useGenericCrud<T, CreateData, UpdateData>({
  queryKey,
  operations,
  onSuccess,
  onError
}: UseGenericCrudProps<T, CreateData, UpdateData>): UseGenericCrudReturn<T, CreateData, UpdateData> {
  
  const queryClient = useQueryClient()
  
  // Query para listagem
  const listQuery = useQuery({
    queryKey,
    queryFn: operations.list,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
  
  // Mutations
  const createMutation = useMutation({
    mutationFn: operations.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey })
      onSuccess?.create?.(data)
    },
    onError: (error) => {
      onError?.create?.(error)
    }
  })
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateData }) => 
      operations.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey })
      onSuccess?.update?.(data)
    },
    onError: (error) => {
      onError?.update?.(error)
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: operations.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      onSuccess?.delete?.()
    },
    onError: (error) => {
      onError?.delete?.(error)
    }
  })
  
  // Operações simplificadas
  const createItem = useCallback(async (data: CreateData): Promise<T | null> => {
    try {
      return await createMutation.mutateAsync(data)
    } catch (error) {
      console.error('❌ Erro ao criar item:', error)
      return null
    }
  }, [createMutation])
  
  const updateItem = useCallback(async (id: string, data: UpdateData): Promise<T | null> => {
    try {
      return await updateMutation.mutateAsync({ id, data })
    } catch (error) {
      console.error('❌ Erro ao atualizar item:', error)
      return null
    }
  }, [updateMutation])
  
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id)
      return true
    } catch (error) {
      console.error('❌ Erro ao deletar item:', error)
      return false
    }
  }, [deleteMutation])
  
  // Utilitários
  const refetch = useCallback(() => {
    listQuery.refetch()
  }, [listQuery])
  
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])
  
  const getItem = useCallback((id: string): T | undefined => {
    return listQuery.data?.data.find((item: any) => item.id === id)
  }, [listQuery.data])
  
  return {
    // Queries
    list: listQuery,
    
    // Estados
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Operações
    createItem,
    updateItem,
    deleteItem,
    
    // Utilitários
    refetch,
    invalidate,
    getItem
  }
}

/**
 * Hook específico para loading states padronizados
 */
interface UseLoadingStatesReturn {
  loading: boolean
  saving: boolean
  deleting: boolean
  error: string | null
  success: string | null
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  clearMessages: () => void
}

export function useLoadingStates(): UseLoadingStatesReturn {
  const [loading] = useState(false)
  const [saving] = useState(false)
  const [deleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])
  
  return {
    loading,
    saving,
    deleting,
    error,
    success,
    setError,
    setSuccess,
    clearMessages
  }
}

/**
 * Hook para operações assíncronas com estados padronizados
 */
interface UseAsyncOperationProps {
  onSuccess?: (result: any) => void
  onError?: (error: any) => void
  successMessage?: string
  errorMessage?: string
}

export function useAsyncOperation(props: UseAsyncOperationProps = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    customProps?: Partial<UseAsyncOperationProps>
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const result = await operation()
      
      const successMsg = customProps?.successMessage || props.successMessage
      if (successMsg) setSuccess(successMsg)
      
      const onSuccessCallback = customProps?.onSuccess || props.onSuccess
      onSuccessCallback?.(result)
      
      return result
    } catch (err: any) {
      const errorMsg = customProps?.errorMessage || props.errorMessage || err.message
      setError(errorMsg)
      
      const onErrorCallback = customProps?.onError || props.onError
      onErrorCallback?.(err)
      
      return null
    } finally {
      setLoading(false)
    }
  }, [props])
  
  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])
  
  return {
    loading,
    error,
    success,
    execute,
    clearMessages
  }
}
