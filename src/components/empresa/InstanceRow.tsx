import { UserGroupIcon } from '@heroicons/react/24/outline'
import type { UnifiedWhatsAppNumber, WhatsAppInstance } from '../../types'

interface InstanceRowProps {
  item: UnifiedWhatsAppNumber
  allowedCount: number
  savingId: string | null
  onPermissions: (instance: WhatsAppInstance) => void
  onRename: (instance: WhatsAppInstance) => void
  onAutoLead: (instance: WhatsAppInstance) => void
  onReconnect: (instanceId: string) => void
  onDelete: (id: string, source: UnifiedWhatsAppNumber['source']) => void
}

function formatPhone(p?: string) {
  if (!p) return ''
  const digits = p.replace(/\D/g, '')
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  return p
}

function statusDotColor(status: UnifiedWhatsAppNumber['status']) {
  if (status === 'connected' || status === 'open' || status === 'active') return 'bg-green-500'
  if (status === 'connecting') return 'bg-yellow-500'
  if (status === 'disconnected' || status === 'close' || status === 'error') return 'bg-red-500'
  return 'bg-gray-400'
}

function statusBadge(status: UnifiedWhatsAppNumber['status']) {
  if (status === 'connected' || status === 'open' || status === 'active') {
    return { label: 'Conectado', cls: 'bg-green-100 text-green-800' }
  }
  if (status === 'connecting') {
    return { label: 'Conectando', cls: 'bg-yellow-100 text-yellow-800' }
  }
  if (status === 'disconnected' || status === 'close') {
    return { label: 'Desconectado', cls: 'bg-red-100 text-red-800' }
  }
  if (status === 'error') {
    return { label: 'Erro', cls: 'bg-red-100 text-red-800' }
  }
  return null
}

function sourceBadge(source: UnifiedWhatsAppNumber['source']) {
  if (source === 'cloud_api') {
    return { label: 'API Oficial', cls: 'bg-emerald-100 text-emerald-800' }
  }
  return { label: 'QR Code', cls: 'bg-slate-100 text-slate-700' }
}

export function InstanceRow({
  item,
  allowedCount,
  savingId,
  onPermissions,
  onRename,
  onAutoLead,
  onReconnect,
  onDelete,
}: InstanceRowProps) {
  const isCloud = item.source === 'cloud_api'
  const status = statusBadge(item.status)
  const source = sourceBadge(item.source)
  const uazapi = item.uazapi

  return (
    <div className="p-3 lg:p-6 hover:bg-gray-50 transition-colors">
      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        <div className="flex items-start gap-2">
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${statusDotColor(item.status)}`} />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{item.display_name}</h4>
            <p className="text-xs text-gray-600">{formatPhone(item.phone_number)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${source.cls}`}>{source.label}</span>
          {status && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${status.cls}`}>{status.label}</span>
          )}
          {!isCloud && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
              {allowedCount} usuários
            </span>
          )}
          {uazapi?.auto_create_leads && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">Auto-lead</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {!isCloud && uazapi && (
            <>
              <button onClick={() => onPermissions(uazapi)} className="px-2 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-[10px] font-medium">
                Permissões
              </button>
              <button onClick={() => onRename(uazapi)} className="px-2 py-1.5 border border-purple-300 rounded text-purple-700 hover:bg-purple-50 text-[10px] font-medium">
                Renomear
              </button>
              <button onClick={() => onAutoLead(uazapi)} className="px-2 py-1.5 border border-blue-300 rounded text-blue-700 hover:bg-blue-50 text-[10px] font-medium">
                Auto-Lead
              </button>
              <button onClick={() => onReconnect(uazapi.id)} className="px-2 py-1.5 border border-green-300 rounded text-green-700 hover:bg-green-50 text-[10px] font-medium">
                Reconectar
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(item.id, item.source)}
            disabled={savingId === item.id}
            className={`px-2 py-1.5 border border-red-300 rounded text-red-600 hover:bg-red-50 disabled:opacity-50 text-[10px] font-medium ${isCloud ? 'col-span-3' : 'col-span-2'}`}
          >
            {savingId === item.id ? 'Removendo...' : isCloud ? 'Desconectar' : 'Excluir'}
          </button>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className={`w-3 h-3 rounded-full ${statusDotColor(item.status)}`} />
            <h4 className="text-lg font-semibold text-gray-900 truncate">{item.display_name}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${source.cls}`}>{source.label}</span>
            {uazapi?.display_name && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Renomeado</span>
            )}
            {!isCloud && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {allowedCount} usuários
              </span>
            )}
            {status && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>{status.label}</span>
            )}
            {uazapi?.auto_create_leads && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Auto-criação
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Número:</span> {formatPhone(item.phone_number)}
          </div>
          {isCloud && item.cloud?.verified_name && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Nome verificado:</span> {item.cloud.verified_name}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {!isCloud && uazapi && (
            <>
              <button onClick={() => onPermissions(uazapi)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm">
                <UserGroupIcon className="w-4 h-4" />
                <span>Permissões</span>
              </button>
              <button onClick={() => onRename(uazapi)} className="px-3 py-1.5 border border-purple-300 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Renomear</span>
              </button>
              <button onClick={() => onAutoLead(uazapi)} className="px-3 py-1.5 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1.5 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Auto-Lead</span>
              </button>
              <button onClick={() => onReconnect(uazapi.id)} className="px-3 py-1.5 border border-green-300 rounded-lg text-green-700 hover:bg-green-50 transition-colors text-sm">
                Reconectar
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(item.id, item.source)}
            disabled={savingId === item.id}
            className="px-3 py-1.5 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors text-sm"
          >
            {savingId === item.id ? 'Removendo...' : isCloud ? 'Desconectar' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}
