import { XMarkIcon } from '@heroicons/react/24/outline'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cn } from '../../utils/designSystem'
import { useEffect } from 'react'

interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  fullScreenMobile?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}

/**
 * Modal responsivo que adapta seu layout baseado no tamanho da tela
 * 
 * Comportamentos:
 * - Mobile + fullScreenMobile=true: Fullscreen (ocupa tela inteira)
 * - Mobile + fullScreenMobile=false: Bottom sheet (desliza de baixo)
 * - Desktop: Modal centralizado tradicional
 * 
 * @example
 * ```tsx
 * <ResponsiveModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Novo Lead"
 *   fullScreenMobile={true}
 * >
 *   <LeadForm />
 * </ResponsiveModal>
 * ```
 */
export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  fullScreenMobile = false,
  size = 'lg',
  showCloseButton = true
}: ResponsiveModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)')

  // Previne scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Handler para fechar modal ao clicar no overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handler para ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Mapeamento de tamanhos
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto"
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        aria-hidden="true"
      />
      
      {/* Centralizador */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal Container */}
        <div 
          className={cn(
            "relative bg-white shadow-2xl transition-all duration-300 ease-out rounded-xl",
            // Fullscreen no mobile quando solicitado
            isMobile && fullScreenMobile && "!rounded-none !max-w-none !m-0 fixed inset-0",
            // Tamanhos
            sizeClasses[size],
            // Largura
            "w-full overflow-hidden flex flex-col",
            // Altura máxima
            "max-h-[90vh]"
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header fixo */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between flex-shrink-0">
          {/* Título */}
          <h2 
            id="modal-title"
            className="text-base lg:text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
          
          {/* Botão de fechar */}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              aria-label="Fechar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Conteúdo scrollável */}
        <div 
          className={cn(
            "overflow-y-auto flex-1",
            "p-4 lg:p-6"
          )}
        >
          {children}
        </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Variante simplificada para confirmações e alertas
 */
interface ResponsiveAlertProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'info' | 'warning' | 'danger' | 'success'
}

export function ResponsiveAlert({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info'
}: ResponsiveAlertProps) {
  const variantStyles = {
    info: 'text-blue-600 bg-blue-50',
    warning: 'text-yellow-600 bg-yellow-50',
    danger: 'text-red-600 bg-red-50',
    success: 'text-green-600 bg-green-50'
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
    >
      <div className="space-y-4">
        <div className={cn(
          'p-4 rounded-lg',
          variantStyles[variant]
        )}>
          <p className="text-sm">{message}</p>
        </div>
        
        <div className="flex items-center gap-3 flex-col sm:flex-row">
          <button
            onClick={onClose}
            className="w-full sm:flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-200 transition-all duration-200 text-sm font-medium min-h-[44px]"
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={cn(
                "w-full sm:flex-1 px-4 py-2.5 rounded-lg focus:ring-2 transition-all duration-200 text-sm font-medium min-h-[44px]",
                variant === 'danger' 
                  ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-200'
                  : 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-200'
              )}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </ResponsiveModal>
  )
}
