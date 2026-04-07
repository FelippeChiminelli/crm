    import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { PhoneInput } from '../ui/PhoneInput'
import { StyledSelect } from '../ui/StyledSelect'
import { connectWhatsAppInstance, subscribeToInstanceStatus, getWhatsAppInstances } from '../../services/chatService'
import { supabase } from '../../services/supabaseClient'
import type { ConnectInstanceData, ConnectInstanceResponse } from '../../types'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface ConnectWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  onConnected?: () => void
}

export function ConnectWhatsAppModal({
  isOpen,
  onClose,
  onConnected
}: ConnectWhatsAppModalProps) {
  const [form, setForm] = useState<ConnectInstanceData>({ name: '', phone_number: '', default_responsible_uuid: '' })
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle')
  const [subscription, setSubscription] = useState<any>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [users, setUsers] = useState<{ uuid: string; full_name: string }[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Carregar usuários ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      
      // Obter empresa_id do usuário logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('uuid', user.id)
        .single()

      if (profileError || !profile?.empresa_id) return

      const { data, error } = await supabase
        .from('profiles')
        .select('uuid, full_name')
        .eq('empresa_id', profile.empresa_id)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Resetar estado quando o modal abrir/fechar
  useEffect(() => {
    if (!isOpen) {
      setForm({ name: '', phone_number: '', default_responsible_uuid: '' })
      setError(null)
      setQrCode(null)
      setConnectionStatus('idle')
      setConnecting(false)
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
    }
  }, [isOpen, pollingInterval])

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

  // Função para verificar status da conexão
  const checkConnectionStatus = async (currentInstanceId: string, currentSubscription: any, currentPollingInterval: NodeJS.Timeout | null) => {
    if (!currentInstanceId) {
      console.log('⚠️ checkConnectionStatus: instanceId não definido')
      return
    }
    
    try {
      const instances = await getWhatsAppInstances()
      const instance = instances.find(inst => inst.id === currentInstanceId)
      
      console.log('🔍 Polling verificando status:', {
        instanceId: currentInstanceId,
        status: instance?.status,
        encontrou: !!instance
      })
      
      if (instance && (instance.status === 'connected' || instance.status === 'open')) {
        console.log('✅ Status conectado detectado via polling!', instance.status)
        
        // Limpar assinatura e polling primeiro
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
        
        // Atualizar status para 'connected'
        setConnectionStatus('connected')
        
        // Fechar modal após 1 segundo e recarregar dados
        setTimeout(() => {
          console.log('🚪 Fechando modal após conexão detectada via polling')
          onConnected?.()
          handleClose()
        }, 1000)
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status da conexão:', error)
    }
  }

  const handleGenerateQRCode = async () => {
    if (!form.name.trim() || !form.phone_number.trim()) {
      setError('Preencha todos os campos')
      return
    }

    setConnecting(true)
    setError(null)
    setConnectionStatus('connecting')
    setQrCode(null)

    try {
      const result: ConnectInstanceResponse = await connectWhatsAppInstance(form)
      
      console.log('📦 Resultado completo do connectWhatsAppInstance:', result)
      
      if (result?.instance_id) {
        // Verificar se o instance_id não é um placeholder
        if (result.instance_id === 'SUA_INSTANCIA_ID' || !result.instance_id || result.instance_id.length < 10) {
          console.error('❌ Instance ID inválido ou placeholder detectado:', result.instance_id)
          throw new Error('ID da instância inválido. Tente novamente.')
        }
        
        console.log('📱 Instância criada:', result.instance_id, 'Status inicial:', result.status)
        
        if (result.qr_code) {
          setQrCode(result.qr_code)
          setConnectionStatus('connecting')
          
          // Assinar atualizações de status dessa instância para refletir "connected"
          const sub = subscribeToInstanceStatus(result.instance_id, (status: string) => {
            console.log('🔔 Subscription detectou mudança de status:', status)
            if (status === 'connected' || status === 'open') {
              console.log('✅ Status conectado detectado via subscription!')
              setConnectionStatus('connected')
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
                onConnected?.()
                handleClose()
              }, 1000)
            }
          })
          setSubscription(sub)
          
        // Polling como fallback - verificar status a cada 2 segundos
        const interval = setInterval(() => {
          checkConnectionStatus(result.instance_id, sub, interval)
        }, 2000)
        setPollingInterval(interval)
        console.log('⏰ Polling iniciado para verificar status a cada 2 segundos. InstanceId:', result.instance_id)
        } else if (result.status === 'connected') {
          setConnectionStatus('connected')
          setTimeout(() => {
            onConnected?.()
            handleClose()
          }, 1000)
        }
      }
    } catch (e) {
      setConnectionStatus('failed')
      setError(e instanceof Error ? e.message : 'Erro ao conectar instância')
    } finally {
      setConnecting(false)
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
    setForm({ name: '', phone_number: '', default_responsible_uuid: '' })
    setError(null)
    setQrCode(null)
    setConnectionStatus('idle')
    setConnecting(false)
    setSubscription(null)
    setPollingInterval(null)
    onClose()
  }
  
  useEscapeKey(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Conectar WhatsApp
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo baseado no status */}
          {connectionStatus === 'connected' && (
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
                A instância foi conectada. O modal será fechado automaticamente.
              </p>
            </div>
          )}
          
          {/* Mostrar código de pareamento apenas se não estiver conectado */}

          {connectionStatus === 'connecting' && qrCode && (
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
                  alt="QR Code para conexão" 
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

          {(connectionStatus === 'idle' || connectionStatus === 'failed') && !qrCode && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nome da instância
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="Ex: Suporte_Principal"
                  value={form.name}
                  onChange={e => {
                    // Remove espaços e permite apenas letras, números, _ e -
                    const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')
                    setForm(prev => ({ ...prev, name: sanitizedValue }))
                  }}
                  disabled={connecting}
                />
                <p className="text-xs text-gray-500">
                  Use apenas letras, números, _ ou - (sem espaços)
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Número do WhatsApp
                </label>
                <PhoneInput
                  value={form.phone_number}
                  onChange={(value) => setForm(prev => ({ ...prev, phone_number: value }))}
                  disabled={connecting}
                  required
                />
                <p className="text-xs text-gray-500 -mt-8">
                  Formato: 55 + DDD + Número (ex: 5547999999999)
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Responsável (Opcional)
                </label>
                <StyledSelect
                  value={form.default_responsible_uuid || ''}
                  onChange={(value) => setForm(prev => ({ ...prev, default_responsible_uuid: value }))}
                  options={[
                    { value: '', label: 'Nenhum' },
                    ...users.map((user) => ({ 
                      value: user.uuid, 
                      label: user.full_name 
                    }))
                  ]}
                  placeholder={loadingUsers ? 'Carregando...' : 'Selecionar responsável'}
                  disabled={connecting || loadingUsers}
                />
                <p className="text-xs text-gray-500">
                  Usuário responsável pela instância
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={connecting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateQRCode}
                  disabled={connecting || !form.name.trim() || !form.phone_number.trim()}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {connecting ? 'Gerando...' : 'Gerar QR Code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

