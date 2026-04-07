import { useEffect, useRef } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import type { WhatsAppInstance } from '../../types'

interface InstanceDropdownProps {
  isOpen: boolean
  onClose: () => void
  instances: WhatsAppInstance[]
  selectedInstanceId: string | 'ALL'
  onSelectInstance: (id: string | 'ALL') => void
  showAllOption: boolean
  onReconnect?: (instance: WhatsAppInstance) => void
}

const getStatusColor = (status: string) => {
  if (status === 'connected' || status === 'open') return 'bg-green-500'
  if (status === 'connecting') return 'bg-yellow-500'
  if (status === 'disconnected' || status === 'close') return 'bg-red-500'
  return 'bg-gray-400'
}

export function InstanceDropdown({
  isOpen,
  onClose,
  instances,
  selectedInstanceId,
  onSelectInstance,
  showAllOption,
  onReconnect,
}: InstanceDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleClick = (instance: WhatsAppInstance) => {
    const isDisconnected = instance.status === 'disconnected' || instance.status === 'close' || instance.status === 'connecting'
    if (isDisconnected && onReconnect) {
      onReconnect(instance)
    } else {
      onSelectInstance(instance.id)
    }
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1 max-h-[300px] overflow-y-auto"
    >
      {showAllOption && (
        <button
          onClick={() => { onSelectInstance('ALL'); onClose() }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
            selectedInstanceId === 'ALL' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span>Todas as instâncias</span>
        </button>
      )}
      {instances.map((instance) => (
        <button
          key={instance.id}
          onClick={() => handleClick(instance)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
            selectedInstanceId === instance.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(instance.status)}`} />
          <span className="truncate">{instance.display_name || instance.name}</span>
        </button>
      ))}
    </div>
  )
}

interface InstanceSelectorButtonProps {
  label: string
  onClick: () => void
  hasFilter: boolean
}

export function InstanceSelectorButton({ label, onClick, hasFilter }: InstanceSelectorButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors max-w-[150px] ${
        hasFilter
          ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
          : 'text-gray-600 hover:bg-gray-200/60'
      }`}
      title="Selecionar instância"
    >
      <span className="truncate">{label}</span>
      <ChevronDownIcon className="w-3 h-3 flex-shrink-0" />
    </button>
  )
}
