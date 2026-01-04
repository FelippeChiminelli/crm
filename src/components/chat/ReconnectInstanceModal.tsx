import { useState, useEffect } from 'react'
import { XMarkIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import { reconnectWhatsAppInstance, subscribeToInstanceStatus, getWhatsAppInstances } from '../../services/chatService'
import type { WhatsAppInstance } from '../../types'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface ReconnectInstanceModalProps {
  isOpen: boolean
  onClose: () => void
  instance: WhatsAppInstance | null
  onReconnected?: () => void
}

export function ReconnectInstanceModal({
  isOpen,
  onClose,
  instance,
  onReconnected
}: ReconnectInstanceModalProps) {
  const [step, setStep] = useState<'confirm' | 'connecting' | 'qr' | 'connected' | 'error'>('confirm')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Resetar estado quando o modal abrir/fechar ou instância mudar
  useEffect(() => {
    if (!isOpen || !instance) {
      setStep('confirm')
      setQrCode(null)
      setError(null)
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
      return
    }
  }, [isOpen, instance, pollingInterval])

  // Cleanup de assinatura e polling ao desmontar
  useEffect(() => {
    return () => {
      try {
        subscription?.unsubscribe?.()
      } catch {}
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [subscription, pollingInterval])
  
  useEscapeKey(isOpen && !!instance, onClose)

  // Função para verificar status da conexão
  const checkConnectionStatus = async (currentSubscription: any, currentPollingInterval: NodeJS.Timeout | null) => {
    if (!instance) {
      console.log('⚠️ checkConnectionStatus: instance não definido')
      return
    }
    
    try {
      const instances = await getWhatsAppInstances()
      const foundInstance = instances.find(inst => inst.id === instance.id)
      
      console.log('🔍 Polling verificando status:', {
        instanceId: instance.id,
        status: foundInstance?.status,
        encontrou: !!foundInstance
      })
      
      if (foundInstance && (foundInstance.status === 'connected' || foundInstance.status === 'open')) {
        console.log('✅ Status conectado detectado via polling!', foundInstance.status)
        setStep('connected')
        // Limpar assinatura e polling
        if (currentSubscription) {
          try {
            currentSubscription.unsubscribe?.()
          } catch {}
        }
        if (currentPollingInterval) {
          clearInterval(currentPollingInterval)
        }
        setSubscription(null)
        setPollingInterval(null)
        // Fechar modal após 1 segundo e recarregar dados
        setTimeout(() => {
          onReconnected?.()
          handleClose()
        }, 1000)
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status da conexão:', error)
    }
  }

  const handleConfirm = async () => {
    if (!instance) return

    setStep('connecting')
    setError(null)
    setQrCode(null)

    try {
      const res = await reconnectWhatsAppInstance(instance.id)
      
      if (res?.qr_code) {
        setQrCode(res.qr_code)
        setStep('qr')
        console.log('📱 Reconectando instância:', instance.id, 'Status inicial:', res.status)
        
        // Assinar atualizações de status para detectar quando conectar
        const sub = subscribeToInstanceStatus(instance.id, (status: string) => {
          console.log('🔔 Subscription detectou mudança de status:', status)
          if (status === 'connected' || status === 'open') {
            console.log('✅ Status conectado detectado via subscription!')
            setStep('connected')
            // Limpar assinatura e polling
            try {
              sub.unsubscribe?.()
            } catch {}
            setSubscription((prev: any) => {
              if (prev) {
                try {
                  prev.unsubscribe?.()
                } catch {}
              }
              return null
            })
            setPollingInterval((prev: NodeJS.Timeout | null) => {
              if (prev) {
                clearInterval(prev)
              }
              return null
            })
            // Fechar modal após 1 segundo e recarregar dados
            setTimeout(() => {
              onReconnected?.()
              handleClose()
            }, 1000)
          }
        })
        setSubscription(sub)
        
        // Polling como fallback - verificar status a cada 2 segundos
        const interval = setInterval(() => {
          checkConnectionStatus(sub, interval)
        }, 2000)
        setPollingInterval(interval)
        console.log('⏰ Polling iniciado para verificar status a cada 2 segundos')
      } else {
        setError('QR Code não foi gerado. Tente novamente.')
        setStep('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reconectar instância')
      setStep('error')
    }
  }

  const handleClose = () => {
    // Limpar assinatura e polling ao fechar
    if (subscription) {
      try {
        subscription.unsubscribe?.()
      } catch {}
    }
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
    setStep('confirm')
    setQrCode(null)
    setError(null)
    setSubscription(null)
    setPollingInterval(null)
    onClose()
  }

  if (!isOpen || !instance) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Botão fechar */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          {/* Conteúdo baseado no step */}
          {step === 'confirm' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCodeIcon className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Reconectar WhatsApp
                </h3>
                <p className="text-sm text-gray-600 mb-1">
                  Instância: <span className="font-medium">{instance.name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Deseja reconectar esta instância agora?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  Sim, reconectar
                </button>
              </div>
            </>
          )}

          {step === 'connecting' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Gerando QR Code...
              </h3>
              <p className="text-sm text-gray-600">
                Aguarde enquanto preparamos a reconexão
              </p>
            </div>
          )}

          {step === 'qr' && qrCode && (
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Escaneie o QR Code
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Abra o WhatsApp no seu celular e escaneie o código abaixo
              </p>
              
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block mb-4">
                <img 
                  src={qrCode} 
                  alt="QR Code para reconexão" 
                  className="w-48 h-48 object-contain"
                />
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>Aguardando conexão...</span>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          )}

          {step === 'connected' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg 
                  className="w-8 h-8 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Conectado com sucesso!
              </h3>
              <p className="text-sm text-gray-600">
                A instância foi reconectada. O modal será fechado automaticamente.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg 
                  className="w-8 h-8 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Erro ao reconectar
              </h3>
              <p className="text-sm text-red-600 mb-6">
                {error || 'Ocorreu um erro ao tentar reconectar a instância'}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

