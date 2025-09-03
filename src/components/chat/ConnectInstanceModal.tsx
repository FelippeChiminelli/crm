import React, { useState, useEffect } from 'react'
import { XMarkIcon, QrCodeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import type { ConnectInstanceData, ConnectInstanceResponse } from '../../types'
import { ds } from '../../utils/designSystem'

interface ConnectInstanceModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (data: ConnectInstanceData) => Promise<ConnectInstanceResponse>
}

export function ConnectInstanceModal({ isOpen, onClose, onConnect }: ConnectInstanceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone_number: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle')

  // Monitorar mudanças no QR Code (apenas em desenvolvimento)
  useEffect(() => {
    if (import.meta.env.MODE === 'development') {
      console.log('🔍 Modal: QR Code status:', qrCode ? 'disponível' : 'não disponível')
      console.log('🔍 Modal: Status da conexão:', connectionStatus)
    }
  }, [qrCode, connectionStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.phone_number.trim()) {
      setError('Preencha todos os campos')
      return
    }

    // Validar formato do número de telefone
    const phoneRegex = /^55\d{11}$/
    if (!phoneRegex.test(formData.phone_number)) {
      setError(`Número inválido. Use o formato: 5547997878866 (55 + DDD + número). 
      Número atual: ${formData.phone_number} (${formData.phone_number.length} dígitos)`)
      return
    }

    setLoading(true)
    setError(null)
    setConnectionStatus('connecting')
    setQrCode(null) // Limpar QR Code anterior

    try {
      const result = await onConnect(formData)
      
      if (result.status === 'pending' && result.qr_code) {
        if (import.meta.env.MODE === 'development') {
          console.log('🔍 Modal: QR Code recebido e exibindo')
        }
        setQrCode(result.qr_code)
        setConnectionStatus('connecting')
        // Não fechar o modal - deixar o usuário escanear o QR Code
      } else if (result.status === 'connected') {
        if (import.meta.env.MODE === 'development') {
          console.log('🔍 Modal: Instância conectada')
        }
        setConnectionStatus('connected')
        setTimeout(() => {
          onClose()
          resetForm()
        }, 2000)
      } else {
        if (import.meta.env.MODE === 'development') {
          console.log('🔍 Modal: Status inesperado:', result.status)
        }
        setConnectionStatus('failed')
        setError(`Falha ao conectar instância. Status: ${result.status || 'indefinido'}`)
      }
    } catch (err) {
      setConnectionStatus('failed')
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', phone_number: '' })
    setError(null)
    setQrCode(null)
    setConnectionStatus('idle')
  }

  const formatPhoneNumber = (value: string): string => {
    // Remover todos os caracteres não numéricos
    const numericValue = value.replace(/\D/g, '')
    
    // Se não começar com 55, adicionar automaticamente
    if (numericValue.length > 0 && !numericValue.startsWith('55')) {
      return `55${numericValue.slice(0, 11)}`
    }
    
    // Limitar a 13 dígitos (55 + DDD + número)
    return numericValue.slice(0, 13)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={ds.modal.overlay()}>
      <div className={ds.modal.container()}>
        {/* Header */}
        <div className={ds.modal.header()}>
          <h3 className={ds.modal.title()}>Conectar Instância WhatsApp</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            title="Fechar"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className={ds.modal.content()}>
          {connectionStatus === 'connected' ? (
            <div className="text-center">
              <CheckCircleIcon className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Instância Conectada!
              </h3>
              <p className="text-gray-600">
                Sua instância foi conectada com sucesso.
              </p>
            </div>
          ) : (qrCode && qrCode.length > 0 && qrCode.startsWith('data:image')) ? (
            <div className="text-center">
              <QrCodeIcon className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Escaneie o QR Code
              </h3>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <img 
                  src={qrCode} 
                  alt="QR Code para conexão" 
                  className="mx-auto max-w-full"
                  onError={(e) => console.error('🔍 Modal: Erro ao carregar QR Code:', e)}
                  style={{ maxWidth: '300px', maxHeight: '300px' }}
                />
              </div>
              <p className="text-sm text-gray-600">
                Abra o WhatsApp no seu celular e escaneie o QR Code acima.
              </p>
              <div className="mt-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Aguardando conexão...</span>
                </div>
              </div>
            </div>
          ) : (qrCode && qrCode.length > 0) ? (
            // Fallback: se o QR Code existe mas não começa com data:image, mostrar de qualquer forma
            <div className="text-center">
              <QrCodeIcon className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Escaneie o QR Code (Fallback)
              </h3>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <img 
                  src={qrCode} 
                  alt="QR Code para conexão" 
                  className="mx-auto max-w-full"
                  onError={(e) => console.error('🔍 Modal: Erro ao carregar QR Code (fallback):', e)}
                  style={{ maxWidth: '300px', maxHeight: '300px' }}
                />
              </div>
              <p className="text-sm text-gray-600">
                Abra o WhatsApp no seu celular e escaneie o QR Code acima.
              </p>
              <div className="mt-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Aguardando conexão...</span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Instância
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={loading}
                  className={ds.input()}
                  placeholder="Ex: Vendas Principal"
                />
              </div>

              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Número do WhatsApp
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => {
                    const formattedValue = formatPhoneNumber(e.target.value)
                    setFormData({ ...formData, phone_number: formattedValue })
                  }}
                  disabled={loading}
                  className={ds.input()}
                  placeholder="5547997878866"
                  maxLength={13}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    Formato: 55 + DDD + Número (ex: 5547997878866)
                  </p>
                  <p className={`text-xs ${
                    formData.phone_number.length === 13 ? 'text-green-600' : 
                    formData.phone_number.length >= 10 ? 'text-yellow-600' : 
                    'text-gray-400'
                  }`}>
                    {formData.phone_number.length}/13
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> Certifique-se de que o WhatsApp está aberto no celular 
                  e que você tem permissão para conectar instâncias.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!qrCode && connectionStatus !== 'connected' && (
          <div className={ds.modal.footer()}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={ds.button('outline')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !formData.name.trim() || !formData.phone_number.trim()}
              className={ds.button('primary')}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Conectando...</span>
                </div>
              ) : (
                'Conectar Instância'
              )}
            </button>
          </div>
        )}
        
        {/* Footer quando QR Code está sendo exibido */}
        {qrCode && connectionStatus === 'connecting' && (
          <div className={ds.modal.footer()}>
            <button
              type="button"
              onClick={handleClose}
              className={ds.button('outline')}
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => {
                setQrCode(null)
                setConnectionStatus('idle')
                resetForm()
              }}
              className={ds.button('secondary')}
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 