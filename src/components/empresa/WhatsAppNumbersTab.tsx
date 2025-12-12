import { useEffect, useState } from 'react'
import { getWhatsAppInstances, deleteWhatsAppInstance } from '../../services/chatService'
import { getAllowedCountForInstance } from '../../services/instancePermissionService'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { InstancePermissionsModal } from './InstancePermissionsModal'
import { ConnectWhatsAppModal } from './ConnectWhatsAppModal'
import { ReconnectInstanceModal } from '../chat/ReconnectInstanceModal'
import { AutoCreateLeadConfigModal } from './AutoCreateLeadConfigModal'
import { RenameInstanceModal } from './RenameInstanceModal'
import { UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { WhatsAppInstance } from '../../types'

export function WhatsAppNumbersTab() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [allowedCounts, setAllowedCounts] = useState<Record<string, number>>({})
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; instanceId: string | null }>({ 
    isOpen: false, 
    instanceId: null 
  })
  const [permissionsModal, setPermissionsModal] = useState<{ isOpen: boolean; instance: WhatsAppInstance | null }>({
    isOpen: false,
    instance: null
  })
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [reconnectModal, setReconnectModal] = useState<{ isOpen: boolean; instance: WhatsAppInstance | null }>({
    isOpen: false,
    instance: null
  })
  const [configModal, setConfigModal] = useState<{ isOpen: boolean; instance: WhatsAppInstance | null }>({
    isOpen: false,
    instance: null
  })
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; instance: WhatsAppInstance | null }>({
    isOpen: false,
    instance: null
  })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
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
      setInstances([])
    } finally {
      setLoading(false)
    }
  }


  const handleDelete = async (deleteConversations: boolean) => {
    if (!deleteDialog.instanceId) return
    
    setSavingId(deleteDialog.instanceId)
    try {
      await deleteWhatsAppInstance(deleteDialog.instanceId, deleteConversations)
      await load()
      setDeleteDialog({ isOpen: false, instanceId: null })
    } catch (e) {
      // Erro será tratado pelo ConfirmDialog se necessário
    } finally {
      setSavingId(null)
    }
  }

  const openDeleteDialog = (id: string) => {
    setDeleteDialog({ isOpen: true, instanceId: id })
  }

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, instanceId: null })
  }

  const handleReconnect = (instanceId: string) => {
    const instance = instances.find(inst => inst.id === instanceId)
    if (instance) {
      setReconnectModal({ isOpen: true, instance })
    }
  }

  const formatPhone = (p?: string) => {
    if (!p) return ''
    const digits = p.replace(/\D/g, '')
    if (digits.length === 13) return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`
    if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
    return p
  }

  return (
    <>
      <AutoCreateLeadConfigModal
        isOpen={configModal.isOpen}
        onClose={() => setConfigModal({ isOpen: false, instance: null })}
        instance={configModal.instance}
        onSaved={() => {
          load()
          setConfigModal({ isOpen: false, instance: null })
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        title="Excluir instância do WhatsApp"
        message="Deseja excluir todas as conversas e mensagens vinculadas a esta instância?"
        confirmText="Sim"
        cancelText="Não"
        loading={savingId === deleteDialog.instanceId}
      />

      <InstancePermissionsModal
        isOpen={permissionsModal.isOpen}
        onClose={() => setPermissionsModal({ isOpen: false, instance: null })}
        instance={permissionsModal.instance}
        onChanged={async (instanceId) => {
          try {
            const cnt = await getAllowedCountForInstance(instanceId)
            setAllowedCounts(prev => ({ ...prev, [instanceId]: cnt }))
          } catch {}
        }}
      />

      <ConnectWhatsAppModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={() => {
          load()
        }}
      />

      <ReconnectInstanceModal
        isOpen={reconnectModal.isOpen}
        onClose={() => setReconnectModal({ isOpen: false, instance: null })}
        instance={reconnectModal.instance}
        onReconnected={() => {
          load()
        }}
      />

      <RenameInstanceModal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, instance: null })}
        instance={renameModal.instance}
        onRenamed={() => {
          load()
          setRenameModal({ isOpen: false, instance: null })
        }}
      />
      
      <div className="space-y-6 overflow-y-auto max-h:[75vh] sm:max-h-[80vh] lg:max-h-[85vh] pr-2 sm:pr-3 pb-32">
      {/* Botão para conectar novo número */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowConnectModal(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Conectar WhatsApp</span>
        </button>
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
              {instances.map(inst => {
                const displayName = inst.display_name || inst.name
                return (
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
                        <h4 className="text-lg font-semibold text-gray-900 truncate">{displayName}</h4>
                        {inst.display_name && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700" title={`Nome técnico: ${inst.name}`}>
                            Renomeado
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {allowedCounts[inst.id] ?? 0} usuários com acesso
                        </span>
                        {(inst.status === 'connected' || inst.status === 'open') && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Conectado
                          </span>
                        )}
                        {inst.status === 'connecting' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Conectando
                          </span>
                        )}
                        {(inst.status === 'disconnected' || inst.status === 'close') && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Desconectado
                          </span>
                        )}
                        {inst.auto_create_leads && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Auto-criação ativa
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Número:</span> {formatPhone(inst.phone_number)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setPermissionsModal({ isOpen: true, instance: inst })}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-2"
                      >
                        <UserGroupIcon className="w-4 h-4" />
                        <span>Permissões</span>
                      </button>
                      <button
                        onClick={() => setRenameModal({ isOpen: true, instance: inst })}
                        className="px-4 py-2 border border-purple-300 rounded-lg text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Renomear</span>
                      </button>
                      <button
                        onClick={() => setConfigModal({ isOpen: true, instance: inst })}
                        className="px-4 py-2 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>Auto Criação Leads</span>
                      </button>
                      <button
                        onClick={() => handleReconnect(inst.id)}
                        className="px-4 py-2 border border-green-300 rounded-lg text-green-700 hover:bg-green-50 hover:border-green-400 transition-colors"
                      >
                        Reconectar
                      </button>
                      <button
                        onClick={() => openDeleteDialog(inst.id)}
                        disabled={savingId === inst.id}
                        className="px-4 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {savingId === inst.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </div>
              )})}
              
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
    </>
  )
}


