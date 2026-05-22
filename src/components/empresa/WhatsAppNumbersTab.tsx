import { useEffect, useMemo, useState } from 'react'
import { getWhatsAppInstances, deleteWhatsAppInstance } from '../../services/chatService'
import { getAllowedCountForInstance } from '../../services/instancePermissionService'
import {
  listWhatsAppCloudConnections,
  disconnectWhatsAppCloud,
} from '../../services/whatsappCloudService'
import { getUserEmpresaId } from '../../services/authService'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { InstancePermissionsModal } from './InstancePermissionsModal'
import { ConnectWhatsAppModal } from './ConnectWhatsAppModal'
import { ConnectWhatsAppOfficialModal } from './ConnectWhatsAppOfficialModal'
import { ReconnectInstanceModal } from '../chat/ReconnectInstanceModal'
import { AutoCreateLeadConfigModal } from './AutoCreateLeadConfigModal'
import { RenameInstanceModal } from './RenameInstanceModal'
import { InstanceRow } from './InstanceRow'
import { PlusIcon } from '@heroicons/react/24/outline'
import type {
  WhatsAppInstance,
  WabaConnection,
  UnifiedWhatsAppNumber,
} from '../../types'

function buildUnifiedItems(
  instances: WhatsAppInstance[],
  cloud: WabaConnection[],
): UnifiedWhatsAppNumber[] {
  const uazapiItems: UnifiedWhatsAppNumber[] = instances.map((inst) => ({
    source: 'uazapi',
    id: inst.id,
    display_name: inst.display_name || inst.name,
    phone_number: inst.phone_number,
    status: inst.status,
    empresa_id: inst.empresa_id,
    created_at: inst.created_at,
    uazapi: inst,
  }))

  const cloudItems: UnifiedWhatsAppNumber[] = cloud.map((conn) => ({
    source: 'cloud_api',
    id: conn.phone_number_id,
    display_name: conn.verified_name || conn.display_phone_number || 'WhatsApp Oficial',
    phone_number: conn.display_phone_number || '',
    status: conn.status,
    empresa_id: conn.empresa_id,
    created_at: conn.connected_at,
    cloud: conn,
  }))

  return [...uazapiItems, ...cloudItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

interface DeleteState {
  isOpen: boolean
  id: string | null
  source: UnifiedWhatsAppNumber['source'] | null
}

export function WhatsAppNumbersTab() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [cloudConnections, setCloudConnections] = useState<WabaConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [allowedCounts, setAllowedCounts] = useState<Record<string, number>>({})

  const [deleteDialog, setDeleteDialog] = useState<DeleteState>({ isOpen: false, id: null, source: null })
  const [permissionsModal, setPermissionsModal] = useState<{ isOpen: boolean; instance: WhatsAppInstance | null }>({ isOpen: false, instance: null })
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showOfficialModal, setShowOfficialModal] = useState(false)
  const [reconnectModal, setReconnectModal] = useState<{ isOpen: boolean; instance: WhatsAppInstance | null }>({ isOpen: false, instance: null })
  const [configModal, setConfigModal] = useState<{ isOpen: boolean; instance: WhatsAppInstance | null }>({ isOpen: false, instance: null })
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; instance: WhatsAppInstance | null }>({ isOpen: false, instance: null })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const empresaId = await getUserEmpresaId()
      const [uazapiList, cloudList] = await Promise.all([
        getWhatsAppInstances().catch(() => [] as WhatsAppInstance[]),
        empresaId
          ? listWhatsAppCloudConnections(empresaId).catch(() => [] as WabaConnection[])
          : Promise.resolve([] as WabaConnection[]),
      ])
      setInstances(uazapiList)
      setCloudConnections(cloudList)

      try {
        const entries = await Promise.all(
          uazapiList.map(async (inst) => [inst.id, await getAllowedCountForInstance(inst.id)] as const),
        )
        const map: Record<string, number> = {}
        for (const [id, cnt] of entries) map[id] = cnt
        setAllowedCounts(map)
      } catch {}
    } finally {
      setLoading(false)
    }
  }

  const unifiedItems = useMemo(
    () => buildUnifiedItems(instances, cloudConnections),
    [instances, cloudConnections],
  )

  const openDeleteDialog = (id: string, source: UnifiedWhatsAppNumber['source']) => {
    setDeleteDialog({ isOpen: true, id, source })
  }

  const closeDeleteDialog = () => setDeleteDialog({ isOpen: false, id: null, source: null })

  const handleConfirmDelete = async (deleteConversations: boolean) => {
    if (!deleteDialog.id || !deleteDialog.source) return
    setSavingId(deleteDialog.id)
    try {
      if (deleteDialog.source === 'uazapi') {
        await deleteWhatsAppInstance(deleteDialog.id, deleteConversations)
      } else {
        await disconnectWhatsAppCloud(deleteDialog.id)
      }
      await load()
      closeDeleteDialog()
    } finally {
      setSavingId(null)
    }
  }

  const handleReconnect = (instanceId: string) => {
    const inst = instances.find((i) => i.id === instanceId)
    if (inst) setReconnectModal({ isOpen: true, instance: inst })
  }

  const isCloudDelete = deleteDialog.source === 'cloud_api'

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
        onConfirm={handleConfirmDelete}
        title={isCloudDelete ? 'Desconectar WhatsApp Oficial' : 'Excluir instância do WhatsApp'}
        message={
          isCloudDelete
            ? 'Deseja marcar esta conexão oficial como desconectada? O registro será preservado.'
            : 'Deseja excluir todas as conversas e mensagens vinculadas a esta instância?'
        }
        confirmText="Sim"
        cancelText="Não"
        loading={savingId === deleteDialog.id}
      />

      <InstancePermissionsModal
        isOpen={permissionsModal.isOpen}
        onClose={() => setPermissionsModal({ isOpen: false, instance: null })}
        instance={permissionsModal.instance}
        onChanged={async (instanceId) => {
          try {
            const cnt = await getAllowedCountForInstance(instanceId)
            setAllowedCounts((prev) => ({ ...prev, [instanceId]: cnt }))
          } catch {}
        }}
      />

      <ConnectWhatsAppModal
        isOpen={showConnectModal}
        onClose={() => {
          setShowConnectModal(false)
          load()
        }}
        onConnected={() => load()}
      />

      <ConnectWhatsAppOfficialModal
        isOpen={showOfficialModal}
        onClose={() => {
          setShowOfficialModal(false)
          load()
        }}
        onConnected={() => load()}
      />

      <ReconnectInstanceModal
        isOpen={reconnectModal.isOpen}
        onClose={() => setReconnectModal({ isOpen: false, instance: null })}
        instance={reconnectModal.instance}
        onReconnected={() => load()}
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

      <div className="space-y-4 lg:space-y-6 overflow-y-auto max-h-[75vh] sm:max-h-[80vh] lg:max-h-[85vh] pr-1 lg:pr-3 pb-32">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={() => setShowOfficialModal(true)}
            className="px-3 lg:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 lg:gap-2 text-sm lg:text-base"
          >
            <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">Conectar oficial (Meta)</span>
            <span className="sm:hidden">Oficial</span>
          </button>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-3 lg:px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 lg:gap-2 text-sm lg:text-base"
          >
            <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">Conectar WhatsApp (QR)</span>
            <span className="sm:hidden">QR</span>
          </button>
        </div>

        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-3 lg:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h3 className="text-base lg:text-xl font-semibold text-gray-900">Instâncias cadastradas</h3>
            <p className="text-xs lg:text-sm text-gray-600 mt-1 hidden sm:block">
              Gerencie suas conexões do WhatsApp (oficial Meta Cloud API e QR Code)
            </p>
          </div>
          <div className="px-2 lg:px-4">
            {loading ? (
              <div className="p-6 lg:p-8 text-center">
                <div className="w-6 h-6 lg:w-8 lg:h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2 lg:mb-3" />
                <p className="text-xs lg:text-sm text-gray-500">Carregando...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 pb-28">
                {unifiedItems.map((item) => (
                  <InstanceRow
                    key={`${item.source}:${item.id}`}
                    item={item}
                    allowedCount={item.uazapi ? allowedCounts[item.uazapi.id] ?? 0 : 0}
                    savingId={savingId}
                    onPermissions={(inst) => setPermissionsModal({ isOpen: true, instance: inst })}
                    onRename={(inst) => setRenameModal({ isOpen: true, instance: inst })}
                    onAutoLead={(inst) => setConfigModal({ isOpen: true, instance: inst })}
                    onReconnect={handleReconnect}
                    onDelete={openDeleteDialog}
                  />
                ))}

                {unifiedItems.length === 0 && (
                  <div className="p-6 lg:p-8 text-center">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                      <svg className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h4 className="text-sm lg:text-lg font-medium text-gray-900 mb-1 lg:mb-2">Nenhuma instância</h4>
                    <p className="text-xs lg:text-sm text-gray-600">Conecte um número do WhatsApp.</p>
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
