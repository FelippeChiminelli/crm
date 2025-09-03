import { useState } from 'react'
import { useToastContext } from '../contexts/ToastContext'
import { useConfirm } from './useConfirm'

interface UseDeleteConfirmationProps {
  defaultConfirmMessage?: string
  defaultErrorContext?: string
}

export function useDeleteConfirmation({ 
  defaultConfirmMessage = 'Tem certeza que deseja excluir este item?',
  defaultErrorContext = 'ao excluir item'
}: UseDeleteConfirmationProps = {}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { showError } = useToastContext()
  const { confirm } = useConfirm()

  const executeDelete = async (
    deleteFunction: () => Promise<any>,
    confirmMessage?: string,
    errorContext?: string
  ) => {
    const message = confirmMessage || defaultConfirmMessage
    const context = errorContext || defaultErrorContext
    
    const confirmed = await confirm({
      title: 'Confirmar Exclusão',
      message,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    })
    
    if (!confirmed) {
      return null
    }

    setIsDeleting(true)
    
    try {
      await deleteFunction()
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      showError(`Erro ${context}`, `${errorMessage}. Tente novamente.`)
      return null
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    isDeleting,
    executeDelete
  }
} 