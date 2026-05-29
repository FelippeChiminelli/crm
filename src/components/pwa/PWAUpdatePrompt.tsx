import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { resetChunkReloadCounter } from '../../utils/chunkErrorHandler'

/**
 * Notificação quando há atualização do PWA disponível.
 * Reload manual pelo usuário — evita perda de dados não salvos.
 */
export function PWAUpdatePrompt() {
  const [isUpdating, setIsUpdating] = useState(false)
  
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update()
        }, 60 * 1000)
      }
      console.log('🔧 Service Worker registrado:', swUrl)
    },
    onRegisterError(error) {
      console.error('❌ Erro ao registrar Service Worker:', error)
    }
  })

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      resetChunkReloadCounter()
      await updateServiceWorker(true)
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      window.location.reload()
    }
  }

  const handleClose = () => {
    setNeedRefresh(false)
  }

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 right-4 z-[99999] animate-slide-up">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-orange-100 rounded-lg">
            <ArrowPathIcon className="w-6 h-6 text-orange-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">
              Nova versão disponível
            </h4>
            <p className="text-xs text-gray-600 mt-1">
              Salve alterações em andamento antes de atualizar. Isso evita perda de dados em formulários abertos.
            </p>
            
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Atualizando...
                  </>
                ) : (
                  'Atualizar agora'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isUpdating}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Depois
              </button>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
