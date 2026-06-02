import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import type { ChatConversation, WhatsAppInstance } from '../../types'

interface InstanceSendPickerProps {
  conversations: ChatConversation[]
  selectedConversationId: string
  onSelect: (conversationId: string) => void
  labelConversations?: ChatConversation[]
  extraInstances?: WhatsAppInstance[]
  onSelectExtraInstance?: (instanceId: string) => void
  pendingInstanceId?: string
  pendingInstanceLabel?: string
  canSend?: boolean
  creating?: boolean
}

export function InstanceSendPicker({
  conversations,
  selectedConversationId,
  onSelect,
  labelConversations,
  extraInstances = [],
  onSelectExtraInstance,
  pendingInstanceId,
  pendingInstanceLabel,
  canSend = true,
  creating = false,
}: InstanceSendPickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const labelSource = labelConversations ?? conversations
  const selectedConv = labelSource.find(c => c.id === selectedConversationId)
  const displayLabel =
    selectedConv?.nome_instancia ||
    pendingInstanceLabel ||
    'Selecionar instância'
  const activeInstanceId = selectedConv?.instance_id || pendingInstanceId

  useEffect(() => {
    if (!showPicker) return
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  return (
    <div className="px-3 pt-2 pb-1 relative" ref={pickerRef}>
      {canSend ? (
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors w-full justify-between ${
            selectedConv || pendingInstanceLabel ? 'text-gray-700 bg-white hover:bg-gray-50' : 'text-gray-400 bg-white'
          }`}
        >
          <span className="truncate flex items-center gap-1.5 min-w-0">
            Enviando por: {displayLabel}
            {creating && pendingInstanceLabel && (
              <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin flex-shrink-0" />
            )}
          </span>
          <ChevronDownIcon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${showPicker ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded-lg w-full">
          <LockClosedIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Sem permissão para enviar mensagens</span>
        </div>
      )}

      {showPicker && canSend && (
        <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.id}
              type="button"
              onClick={() => { onSelect(conv.id); setShowPicker(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                conv.id === selectedConversationId
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {conv.nome_instancia || 'Instância'}
            </button>
          ))}

          {extraInstances.length > 0 && onSelectExtraInstance && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-t border-gray-100 bg-gray-50">
                Outros números
              </div>
              {extraInstances.map(inst => (
                <button
                  key={inst.id}
                  type="button"
                  disabled={creating}
                  onClick={() => { onSelectExtraInstance(inst.id); setShowPicker(false) }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors disabled:opacity-50 flex items-center justify-between gap-2 ${
                    inst.id === activeInstanceId
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{inst.display_name || inst.name}</span>
                    {inst.source === 'cloud_api' && (
                      <span className="text-[9px] font-medium px-1 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
                        Oficial
                      </span>
                    )}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    inst.status === 'connected' || inst.status === 'open' || inst.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {inst.status === 'connected' || inst.status === 'open' || inst.status === 'active' ? 'online' : inst.status}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
