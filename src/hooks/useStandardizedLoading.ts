import { useState, useCallback } from 'react'

/**
 * Hook padronizado para estados de loading, erro e sucesso
 * Centraliza a lógica comum de carregamento em toda a aplicação
 */

interface UseStandardizedLoadingProps {
  initialLoading?: boolean
  successMessage?: string
  errorMessage?: string
  onSuccess?: (result: any) => void
  onError?: (error: any) => void
}

interface UseStandardizedLoadingReturn {
  // Estados
  loading: boolean
  error: string | null
  success: string | null
  
  // Setters
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  
  // Operações
  executeAsync: <T>(operation: () => Promise<T>, options?: ExecuteOptions) => Promise<T | null>
  reset: () => void
  clearMessages: () => void
  
  // Estados derivados
  isIdle: boolean
  hasError: boolean
  hasSuccess: boolean
}

interface ExecuteOptions {
  successMessage?: string
  errorMessage?: string
  onSuccess?: (result: any) => void
  onError?: (error: any) => void
}

export function useStandardizedLoading({
  initialLoading = false,
  successMessage,
  errorMessage,
  onSuccess,
  onError
}: UseStandardizedLoadingProps = {}): UseStandardizedLoadingReturn {
  
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Executar operação assíncrona com tratamento padronizado
  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ExecuteOptions = {}
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await operation()
      
      // Mensagem de sucesso
      const successMsg = options.successMessage || successMessage
      if (successMsg) {
        setSuccess(successMsg)
      }
      
      // Callback de sucesso
      const successCallback = options.onSuccess || onSuccess
      if (successCallback) {
        successCallback(result)
      }
      
      return result
    } catch (err: any) {
      // Mensagem de erro
      const errorMsg = options.errorMessage || errorMessage || err.message || 'Erro desconhecido'
      setError(errorMsg)
      
      // Callback de erro
      const errorCallback = options.onError || onError
      if (errorCallback) {
        errorCallback(err)
      }
      
      console.error('❌ Erro na operação:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [successMessage, errorMessage, onSuccess, onError])

  // Resetar todos os estados
  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setSuccess(null)
  }, [])

  // Limpar apenas mensagens
  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  // Estados derivados
  const isIdle = !loading && !error && !success
  const hasError = error !== null
  const hasSuccess = success !== null

  return {
    // Estados
    loading,
    error,
    success,
    
    // Setters
    setLoading,
    setError,
    setSuccess,
    
    // Operações
    executeAsync,
    reset,
    clearMessages,
    
    // Estados derivados
    isIdle,
    hasError,
    hasSuccess
  }
}

/**
 * Hook especializado para operações CRUD
 */
export function useCrudLoading() {
  const createState = useStandardizedLoading({
    successMessage: 'Item criado com sucesso!',
    errorMessage: 'Erro ao criar item'
  })
  
  const updateState = useStandardizedLoading({
    successMessage: 'Item atualizado com sucesso!',
    errorMessage: 'Erro ao atualizar item'
  })
  
  const deleteState = useStandardizedLoading({
    successMessage: 'Item excluído com sucesso!',
    errorMessage: 'Erro ao excluir item'
  })
  
  const loadState = useStandardizedLoading({
    errorMessage: 'Erro ao carregar dados'
  })

  return {
    // Estados individuais
    create: createState,
    update: updateState,
    delete: deleteState,
    load: loadState,
    
    // Estados combinados
    isAnyLoading: createState.loading || updateState.loading || deleteState.loading || loadState.loading,
    hasAnyError: createState.hasError || updateState.hasError || deleteState.hasError || loadState.hasError,
    hasAnySuccess: createState.hasSuccess || updateState.hasSuccess || deleteState.hasSuccess,
    
    // Operações combinadas
    clearAllMessages: () => {
      createState.clearMessages()
      updateState.clearMessages()
      deleteState.clearMessages()
      loadState.clearMessages()
    },
    
    resetAll: () => {
      createState.reset()
      updateState.reset()
      deleteState.reset()
      loadState.reset()
    }
  }
}

/**
 * Hook para loading com timeout automático
 */
export function useLoadingWithTimeout(timeoutMs = 30000) {
  const loadingState = useStandardizedLoading()
  
  const executeWithTimeout = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ExecuteOptions = {}
  ): Promise<T | null> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operação expirou')), timeoutMs)
    })
    
    return loadingState.executeAsync(
      () => Promise.race([operation(), timeoutPromise]),
      options
    )
  }, [loadingState, timeoutMs])
  
  return {
    ...loadingState,
    executeWithTimeout
  }
}

/**
 * Hook para loading com retry automático
 */
export function useLoadingWithRetry(maxRetries = 3, retryDelay = 1000) {
  const loadingState = useStandardizedLoading()
  
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ExecuteOptions = {}
  ): Promise<T | null> => {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await loadingState.executeAsync(operation, {
          ...options,
          // Só mostrar erro na última tentativa
          errorMessage: attempt === maxRetries ? options.errorMessage : undefined
        })
        
        if (result !== null) {
          return result
        }
      } catch (error) {
        lastError = error
        
        // Se não é a última tentativa, aguardar antes do retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          loadingState.clearMessages() // Limpar erro antes do retry
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    loadingState.setError(options.errorMessage || lastError?.message || 'Operação falhou após várias tentativas')
    return null
  }, [loadingState, maxRetries, retryDelay])
  
  return {
    ...loadingState,
    executeWithRetry
  }
}
