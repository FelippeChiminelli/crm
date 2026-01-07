import { createContext, useContext, type ReactNode } from 'react'
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

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
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
  }

  return (
    <ToastContext.Provider value={{ ...toast, showToast }}>
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