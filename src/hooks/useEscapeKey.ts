import { useEffect } from 'react'

/**
 * Hook para fechar modais/dialogs com a tecla ESC
 * @param isOpen - Indica se o modal está aberto
 * @param onClose - Função para fechar o modal
 */
export function useEscapeKey(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }

    // Adicionar listener quando modal estiver aberto
    document.addEventListener('keydown', handleEscape)

    // Remover listener quando modal fechar ou componente desmontar
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])
}

