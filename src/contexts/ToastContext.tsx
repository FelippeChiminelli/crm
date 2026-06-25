import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useToast as useToastHook, ToastContainer } from '../components/ui/Toast'

interface ToastContextType {
  showSuccess: (title: string, message?: string, duration?: number) => void
  showError: (title: string, message?: string, duration?: number) => void
  showWarning: (title: string, message?: string, duration?: number) => void
  showInfo: (title: string, message?: string, duration?: number) => void
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toast = useToastHook()

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        toast.showSuccess(message)
        break
      case 'error':
        toast.showError(message)
        break
      case 'warning':
        toast.showWarning(message)
        break
      case 'info':
        toast.showInfo(message)
        break
    }
  }, [toast.showSuccess, toast.showError, toast.showWarning, toast.showInfo])

  const contextValue = useMemo(
    () => ({ ...toast, showToast }),
    [toast, showToast]
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToastContext deve ser usado dentro de um ToastProvider')
  }
  return context
}

// Alias para compatibilidade
export { useToastContext as useToast } 