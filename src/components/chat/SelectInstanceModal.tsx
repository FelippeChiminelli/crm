import { useEffect, useState } from 'react'
import type { WhatsAppInstance } from '../../types'
import { getSelectableWhatsAppInstances } from '../../services/chatService'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface SelectInstanceModalProps {
  isOpen: boolean
  onClose: () => void
  /** IDs uazapi permitidos para o usuário; quando ausente, não filtra. */
  allowedInstanceIds?: string[]
  onSelect: (instanceId: string) => void
}

function sourceBadge(source: WhatsAppInstance['source']) {
  if (source === 'cloud_api') {
    return { label: 'API Oficial', cls: 'bg-emerald-100 text-emerald-700' }
  }
  return { label: 'QR Code', cls: 'bg-slate-100 text-slate-600' }
}

function statusBadgeClass(status: WhatsAppInstance['status']) {
  if (status === 'connected' || status === 'active' || status === 'open') {
    return 'bg-green-100 text-green-700'
  }
  if (status === 'connecting') return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-700'
}

export function SelectInstanceModal({ isOpen, onClose, allowedInstanceIds, onSelect }: SelectInstanceModalProps) {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!isOpen) return
      try {
        setLoading(true)
        setError(null)

        const list = await getSelectableWhatsAppInstances({
          allowedUazapiIds: allowedInstanceIds,
        })
        setInstances(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar instâncias')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [isOpen, allowedInstanceIds])

  useEscapeKey(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Selecionar instância</h3>
        </div>
        <div className="p-4">
          {loading && <p className="text-sm text-gray-600">Carregando...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && instances.length === 0 && (
            <p className="text-sm text-gray-600">Nenhuma instância disponível.</p>
          )}
          <ul className="divide-y divide-gray-200">
            {instances.map((inst) => {
              const sb = sourceBadge(inst.source)
              return (
                <li key={inst.id} className="py-3">
                  <button
                    onClick={() => onSelect(inst.id)}
                    className="w-full text-left px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-gray-900 truncate">{inst.display_name || inst.name}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${sb.cls}`}>
                            {sb.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{inst.phone_number || '—'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${statusBadgeClass(inst.status)}`}>
                        {inst.status}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="p-4 border-t border-gray-200 text-right">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
