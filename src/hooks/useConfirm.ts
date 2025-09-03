import { useState } from 'react'
import { useToastContext } from '../contexts/ToastContext'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export function useConfirm() {
  const [isConfirming, setIsConfirming] = useState(false)
  const { showError, showWarning } = useToastContext()

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setIsConfirming(true)
      
      // Criar um modal de confirmação personalizado
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999]'
      
      const getTypeStyles = () => {
        switch (options.type) {
          case 'danger':
            return {
              bg: 'bg-red-500',
              hover: 'hover:bg-red-600',
              icon: 'text-red-500'
            }
          case 'warning':
            return {
              bg: 'bg-yellow-500',
              hover: 'hover:bg-yellow-600',
              icon: 'text-yellow-500'
            }
          default:
            return {
              bg: 'bg-blue-500',
              hover: 'hover:bg-blue-600',
              icon: 'text-blue-500'
            }
        }
      }
      
      const styles = getTypeStyles()
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="p-6">
            <div class="flex items-center mb-4">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 ${styles.icon}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-lg font-medium text-gray-900">${options.title}</h3>
              </div>
            </div>
            <div class="mb-6">
              <p class="text-sm text-gray-500 whitespace-pre-line">${options.message}</p>
            </div>
            <div class="flex justify-end space-x-3">
              <button id="cancel-btn" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                ${options.cancelText || 'Cancelar'}
              </button>
              <button id="confirm-btn" class="px-4 py-2 text-sm font-medium text-white ${styles.bg} border border-transparent rounded-md ${styles.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                ${options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      `
      
      document.body.appendChild(modal)
      
      const handleConfirm = () => {
        document.body.removeChild(modal)
        setIsConfirming(false)
        resolve(true)
      }
      
      const handleCancel = () => {
        document.body.removeChild(modal)
        setIsConfirming(false)
        resolve(false)
      }
      
      // Adicionar event listeners
      modal.querySelector('#confirm-btn')?.addEventListener('click', handleConfirm)
      modal.querySelector('#cancel-btn')?.addEventListener('click', handleCancel)
      
      // Fechar ao clicar fora do modal
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          handleCancel()
        }
      })
      
      // Fechar com ESC
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCancel()
        }
      }
      document.addEventListener('keydown', handleEsc)
      
      // Cleanup
      const cleanup = () => {
        document.removeEventListener('keydown', handleEsc)
      }
      
      // Cleanup quando o modal for fechado
      modal.addEventListener('remove', cleanup)
    })
  }

  return {
    confirm,
    isConfirming
  }
} 