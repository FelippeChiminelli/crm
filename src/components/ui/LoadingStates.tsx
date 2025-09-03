import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'

/**
 * Componentes padronizados para estados de loading, erro e sucesso
 * Melhora consistência visual em toda a aplicação
 */

// Spinner de loading padrão
export function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg', text?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className="flex items-center justify-center space-x-2">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-primary-600`}></div>
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  )
}

// Card de loading para páginas inteiras
export function LoadingCard({ title = 'Carregando...', description }: { title?: string, description?: string }) {
  return (
    <div className={ds.card()}>
      <div className="p-6 text-center">
        <LoadingSpinner size="lg" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  )
}

// Skeleton loader para listas
export function SkeletonLoader({ 
  lines = 3, 
  height = 'h-4',
  className = '' 
}: { 
  lines?: number
  height?: string
  className?: string 
}) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`bg-gray-200 rounded ${height} ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}></div>
      ))}
    </div>
  )
}

// Card de erro padronizado
export function ErrorCard({ 
  title = 'Ops! Algo deu errado', 
  message, 
  onRetry,
  retryText = 'Tentar novamente'
}: { 
  title?: string
  message: string
  onRetry?: () => void
  retryText?: string 
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              {retryText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Card de sucesso padronizado
export function SuccessCard({ 
  title = 'Sucesso!', 
  message,
  onDismiss
}: { 
  title?: string
  message: string
  onDismiss?: () => void 
}) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start">
        <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-green-800">{title}</h3>
          <p className="mt-1 text-sm text-green-700">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 flex-shrink-0 text-green-400 hover:text-green-500"
          >
            <span className="sr-only">Fechar</span>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// Botão com loading integrado
export function LoadingButton({ 
  loading, 
  children, 
  disabled,
  variant = 'primary',
  ...props 
}: { 
  loading: boolean
  children: React.ReactNode
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  [key: string]: any 
}) {
  const isDisabled = loading || disabled

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${ds.button(variant)} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${props.className || ''}`}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span>Carregando...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

// Estado vazio padronizado
export function EmptyState({ 
  title, 
  description, 
  action,
  icon: IconComponent 
}: { 
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }> 
}) {
  return (
    <div className="text-center py-12">
      {IconComponent && (
        <IconComponent className="mx-auto h-12 w-12 text-gray-400" />
      )}
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}

// Estado de loading inline para formulários
export function InlineLoading({ text = 'Salvando...' }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </div>
  )
}

// Overlay de loading para modais
export function LoadingOverlay({ isVisible, text = 'Carregando...' }: { isVisible: boolean, text?: string }) {
  if (!isVisible) return null

  return (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      </div>
    </div>
  )
}
