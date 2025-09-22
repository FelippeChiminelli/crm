import { useEffect, useState } from 'react'
import { getWhatsAppInstances, deleteWhatsAppInstance, connectWhatsAppInstance, subscribeToInstanceStatus, reconnectWhatsAppInstance } from '../../services/chatService'
import { InstancePermissions } from './InstancePermissions'
import { getAllowedCountForInstance } from '../../services/instancePermissionService'
import type { WhatsAppInstance, ConnectInstanceData, ConnectInstanceResponse } from '../../types'

export function WhatsAppNumbersTab() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ConnectInstanceData>({ name: '', phone_number: '' })
  const [connecting, setConnecting] = useState(false)
  const [qrCodeByInstance, setQrCodeByInstance] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [reconnectingId, setReconnectingId] = useState<string | null>(null)
  const [currentConnection, setCurrentConnection] = useState<{ instanceId: string; status: 'pending' | 'connected' | 'failed' } | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [allowedCounts, setAllowedCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getWhatsAppInstances()
      setInstances(data)
      // Carregar contagens em paralelo
      try {
        const entries = await Promise.all(
          data.map(async (inst) => [inst.id, await getAllowedCountForInstance(inst.id)] as const)
        )
        const map: Record<string, number> = {}
        for (const [id, cnt] of entries) map[id] = cnt
        setAllowedCounts(map)
      } catch {}
    } catch (e) {
      setError('Erro ao carregar instâncias')
      setInstances([])
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone_number.trim()) return
    setConnecting(true)
    setError(null)
    try {
      const result: ConnectInstanceResponse = await connectWhatsAppInstance(form)
      if (result?.instance_id) {
        if (result.qr_code) {
          setQrCodeByInstance(prev => ({ ...prev, [result.instance_id]: result.qr_code! }))
        }
        setCurrentConnection({ instanceId: result.instance_id, status: result.status })
        // Assinar atualizações de status dessa instância para refletir "connected"
        const sub = subscribeToInstanceStatus(result.instance_id, (status: string) => {
          if (status === 'connected') {
            setCurrentConnection(prev => prev ? { ...prev, status: 'connected' } : null)
            // Recarregar lista para refletir status conectado e limpar QR do fallback
            load()
          }
        })
        setSubscription(sub)
      }
      await load()
      setForm({ name: '', phone_number: '' })
    } catch (e) {
      setError('Erro ao conectar instância')
    } finally {
      setConnecting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setSavingId(id)
    setError(null)
    try {
      await deleteWhatsAppInstance(id)
      await load()
    } catch (e) {
      setError('Erro ao excluir instância')
    } finally {
      setSavingId(null)
    }
  }

  const handleReconnect = async (instanceId: string) => {
    setReconnectingId(instanceId)
    setError(null)
    try {
      const res = await reconnectWhatsAppInstance(instanceId)
      if (res?.qr_code) {
        setQrCodeByInstance(prev => ({ ...prev, [instanceId]: res.qr_code! }))
        setCurrentConnection({ instanceId, status: res.status })
        // Assinar atualizações de status para virar "connected"
        const sub = subscribeToInstanceStatus(instanceId, (status: string) => {
          if (status === 'connected') {
            setCurrentConnection(prev => prev ? { ...prev, status: 'connected' } : null)
            load()
          }
        })
        setSubscription(sub)
      }
      await load()
    } catch (e) {
      setError('Erro ao reconectar instância')
    } finally {
      setReconnectingId(null)
    }
  }

  const formatPhone = (p?: string) => {
    if (!p) return ''
    const digits = p.replace(/\D/g, '')
    if (digits.length === 13) return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`
    if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
    return p
  }

  // Cleanup de assinatura ao desmontar ou trocar de instância em conexão
  useEffect(() => {
    return () => {
      try {
        subscription?.unsubscribe?.()
      } catch {}
    }
  }, [subscription])

  return (
    <div className="space-y-6 overflow-y-auto max-h:[75vh] sm:max-h-[80vh] lg:max-h-[85vh] pr-2 sm:pr-3 pb-32">
      {/* Formulário de conexão */}
      <div className="bg-white border rounded-lg p-4 sm:p-6 shadow-sm">
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Conectar novo número</h3>
        <form onSubmit={handleConnect} className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Nome da instância</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Ex: Suporte Principal"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Número do WhatsApp</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="5547999999999"
              value={form.phone_number}
              onChange={e => {
                const numeric = e.target.value.replace(/\D/g, '')
                const value = numeric.startsWith('55') ? numeric.slice(0,13) : `55${numeric}`.slice(0,13)
                setForm(prev => ({ ...prev, phone_number: value }))
              }}
              maxLength={13}
            />
          </div>
          <div className="flex items-end mt-2 sm:mt-0">
            <button
              type="submit"
              disabled={connecting}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-5 sm:px-6 py-2.5 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {connecting ? 'Conectando...' : 'Conectar'}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {currentConnection && (
          <div className="mt-6 border border-blue-200 rounded-lg p-4 sm:p-6 bg-blue-50">
            {(() => {
              const inst = instances.find(i => i.id === currentConnection.instanceId)
              const qr = inst?.qr_code || qrCodeByInstance[currentConnection.instanceId]
              if (currentConnection.status === 'connected') {
                return (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Instância conectada!</h4>
                    <p className="text-sm text-gray-600">A conexão foi concluída com sucesso.</p>
                  </div>
                )
              }
              if (qr) {
                return (
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Escaneie o QR Code</h4>
                    <div className="bg-white p-3 sm:p-4 rounded-lg inline-block shadow-md">
                      <img src={qr} alt="QR Code para conexão" className="w-40 h-40 sm:w-48 sm:h-48 object-contain" />
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-3 text-sm text-gray-600">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                      <span>Aguardando conexão...</span>
                    </div>
                  </div>
                )
              }
              return (
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-sm text-gray-600">Gerando QR Code...</p>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Lista de instâncias */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-gray-900">Instâncias cadastradas</h3>
          <p className="text-sm text-gray-600 mt-1">Gerencie suas conexões do WhatsApp</p>
        </div>
        {/* Área rolável apenas do miolo de instâncias */}
        <div className="px-2 sm:px-4">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Carregando instâncias...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 pb-28">
              {instances.map(inst => (
                <div key={inst.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                          (inst.status === 'open' || inst.status === 'connected') ? 'bg-green-500' :
                          (inst.status === 'connecting') ? 'bg-yellow-500' :
                          (inst.status === 'close' || inst.status === 'disconnected') ? 'bg-red-500' :
                          'bg-gray-400'
                        }`}></div>
                        <h4 className="text-lg font-semibold text-gray-900 truncate">{inst.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {allowedCounts[inst.id] ?? 0} usuários com acesso
                        </span>
                        {inst.status === 'connected' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Conectado
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">Número:</span> {formatPhone(inst.phone_number)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReconnect(inst.id)}
                        disabled={reconnectingId === inst.id}
                        className="px-4 py-2 border border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {reconnectingId === inst.id ? 'Reconectando...' : 'Reconectar'}
                      </button>
                      <button
                        onClick={() => handleDelete(inst.id)}
                        disabled={savingId === inst.id}
                        className="px-4 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {savingId === inst.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>

                  {/* QR Code quando pendente */}
                  {(inst.qr_code || qrCodeByInstance[inst.id]) && (
                    <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">QR Code para conexão</h5>
                      <div className="flex justify-center">
                        <img 
                          src={inst.qr_code || qrCodeByInstance[inst.id]} 
                          alt="QR Code"
                          className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg border border-gray-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* Permissões */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Permissões desta instância</h5>
                    <InstancePermissions 
                      instance={inst}
                      onChanged={async (instanceId) => {
                        try {
                          const cnt = await getAllowedCountForInstance(instanceId)
                          setAllowedCounts(prev => ({ ...prev, [instanceId]: cnt }))
                        } catch {}
                      }}
                    />
                  </div>
                </div>
              ))}
              
              {instances.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma instância cadastrada</h4>
                  <p className="text-sm text-gray-600">Conecte seu primeiro número do WhatsApp para começar a usar o chat.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


