    import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { connectWhatsAppInstance, subscribeToInstanceStatus, getWhatsAppInstances } from '../../services/chatService'
import { getUserEmpresaId } from '../../services/authService'
import type { ConnectInstanceData, ConnectInstanceResponse } from '../../types'

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
  const [form, setForm] = useState<ConnectInstanceData>({ name: '', phone_number: '' })
  const [connecting, setConnecting] = useState(false)
  const [generatingPairingCode, setGeneratingPairingCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle')
  const [subscription, setSubscription] = useState<any>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Resetar estado quando o modal abrir/fechar
  useEffect(() => {
    if (!isOpen) {
      setForm({ name: '', phone_number: '' })
      setError(null)
      setQrCode(null)
      setPairingCode(null)
      setConnectionStatus('idle')
      setConnecting(false)
      setGeneratingPairingCode(false)
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
    setPairingCode(null)

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

  const handleGeneratePairingCode = async () => {
    if (!form.name.trim() || !form.phone_number.trim()) {
      setError('Preencha todos os campos')
      return
    }

    setGeneratingPairingCode(true)
    setError(null)
    setPairingCode(null)
    setQrCode(null)

    try {
      const empresaId = await getUserEmpresaId()
      if (!empresaId) {
        throw new Error('Empresa não identificada')
      }

      // Primeiro, criar a instância no banco
      const { supabase } = await import('../../services/supabaseClient')
      const { data: instance, error: createError } = await supabase
        .from('whatsapp_instances')
        .insert([{
          name: form.name,
          phone_number: form.phone_number,
          status: 'connecting',
          empresa_id: empresaId
        }])
        .select()
        .single()

      if (createError) {
        console.error('❌ Erro ao criar instância:', createError)
        throw createError
      }

      if (!instance || !instance.id) {
        console.error('❌ Instância não foi criada ou não tem ID:', instance)
        throw new Error('Instância não foi criada corretamente')
      }

      console.log('✅ Instância criada com sucesso:', instance.id, instance)

      // Chamar webhook para gerar código de pareamento
      const response = await fetch('https://n8n.advcrm.com.br/webhook/instancia_crm_cod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          action: 'generate_pairing_code',
          instance_id: instance.id,
          name: form.name,
          phone_number: form.phone_number,
          empresa_id: empresaId
        })
      })

      if (!response.ok) {
        throw new Error(`Falha ao gerar código de pareamento. Status: ${response.status}`)
      }

      // Tentar parsear como JSON, mas se falhar, usar como texto
      let result: any
      const responseText = await response.text()
      
      try {
        result = JSON.parse(responseText)
      } catch {
        // Se não for JSON, usar o texto diretamente
        result = responseText
      }
      
      console.log('📥 Resposta completa do webhook:', result)
      console.log('📥 Tipo da resposta:', typeof result)
      
      // O código pode vir em diferentes formatos na resposta
      let code: string | null = null
      
      if (typeof result === 'string') {
        // Se a resposta é uma string direta, usar ela
        code = result.trim()
      } else if (Array.isArray(result)) {
        // Se for array, pegar o primeiro item
        if (result.length > 0) {
          const firstItem = result[0]
          if (typeof firstItem === 'string') {
            code = firstItem.trim()
          } else if (typeof firstItem === 'object') {
            code = firstItem.pairingCode || 
                   firstItem.pairing_code || 
                   firstItem.code ||
                   firstItem.pairingCodeValue ||
                   firstItem.pairing_code_value ||
                   (typeof firstItem === 'object' ? JSON.stringify(firstItem) : null)
          }
        }
      } else if (result && typeof result === 'object') {
        // Tentar diferentes propriedades possíveis
        code = result.pairingCode || 
               result.pairing_code || 
               result.code || 
               result.pairingCodeValue ||
               result.pairing_code_value ||
               result.pairingcode ||
               result.data?.pairingCode ||
               result.data?.pairing_code ||
               result.data?.code ||
               result.response?.pairingCode ||
               result.response?.pairing_code ||
               result.response?.code
        
        // Se ainda não encontrou, procurar em todas as propriedades
        if (!code) {
          for (const key in result) {
            const value = result[key]
            if (typeof value === 'string' && value.length > 0 && value.length < 20) {
              // Se encontrar uma string curta, pode ser o código
              code = value.trim()
              break
            } else if (typeof value === 'object' && value !== null) {
              // Procurar recursivamente em objetos aninhados
              const nestedCode = value.pairingCode || value.pairing_code || value.code
              if (nestedCode) {
                code = nestedCode
                break
              }
            }
          }
        }
      }
      
      console.log('🔑 Código de pareamento extraído:', code)
      
      if (code) {
        // Garantir que é string e limpar espaços
        const pairingCodeString = typeof code === 'string' ? code.trim() : String(code).trim()
        setPairingCode(pairingCodeString)
        setConnectionStatus('connecting') // Atualizar status para 'connecting' para iniciar monitoramento
        
        // Iniciar monitoramento de status
        const sub = subscribeToInstanceStatus(instance.id, (status: string) => {
          console.log('🔔 Subscription detectou mudança de status:', status)
          if (status === 'connected' || status === 'open') {
            console.log('✅ Status conectado detectado via subscription!')
            setConnectionStatus('connected')
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
            setTimeout(() => {
              console.log('🚪 Fechando modal após conexão detectada')
              onConnected?.()
              handleClose()
            }, 1000)
          }
        })
        setSubscription(sub)
        
        // Polling como fallback - verificar status a cada 2 segundos
        const actualInstanceId = instance.id
        console.log('⏰ Iniciando polling para instância criada:', actualInstanceId)
        const interval = setInterval(() => {
          checkConnectionStatus(actualInstanceId, sub, interval)
        }, 2000)
        setPollingInterval(interval)
        console.log('⏰ Polling iniciado para verificar status a cada 2 segundos. InstanceId:', actualInstanceId)
      } else {
        throw new Error('Código de pareamento não retornado pelo webhook')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar código de pareamento')
    } finally {
      setGeneratingPairingCode(false)
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
    setForm({ name: '', phone_number: '' })
    setError(null)
    setQrCode(null)
    setPairingCode(null)
    setConnectionStatus('idle')
    setConnecting(false)
    setGeneratingPairingCode(false)
    setSubscription(null)
    setPollingInterval(null)
    onClose()
  }

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

          {pairingCode && connectionStatus !== 'connected' && (
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Código de Pareamento
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Use este código para parear seu WhatsApp
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200 mb-4">
                <div className="text-3xl font-bold text-gray-900 tracking-wider mb-2 font-mono">
                  {pairingCode.length >= 8 
                    ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4, 8)}${pairingCode.length > 8 ? pairingCode.slice(8) : ''}`
                    : pairingCode}
                </div>
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

          {(connectionStatus === 'idle' || connectionStatus === 'failed') && !qrCode && !pairingCode && (
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
                  placeholder="Ex: Suporte Principal"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={connecting || generatingPairingCode}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Número do WhatsApp
                </label>
                <input
                  type="tel"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="5547999999999"
                  value={form.phone_number}
                  onChange={e => {
                    const numeric = e.target.value.replace(/\D/g, '')
                    const value = numeric.startsWith('55') ? numeric.slice(0,13) : `55${numeric}`.slice(0,13)
                    setForm(prev => ({ ...prev, phone_number: value }))
                  }}
                  maxLength={13}
                  disabled={connecting || generatingPairingCode}
                />
                <p className="text-xs text-gray-500">
                  Formato: 55 + DDD + Número (ex: 5547999999999)
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={connecting || generatingPairingCode}
                  className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateQRCode}
                  disabled={connecting || generatingPairingCode || !form.name.trim() || !form.phone_number.trim()}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {connecting ? 'Gerando...' : 'Gerar QR Code'}
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePairingCode}
                  disabled={connecting || generatingPairingCode || !form.name.trim() || !form.phone_number.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {generatingPairingCode ? 'Gerando...' : 'Gerar Código de Pareamento'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

