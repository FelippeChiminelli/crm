import { useEffect, useRef } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import type { WhatsAppInstance } from '../../types'

const INSTANCE_STATUS_HEX = {
  connected: '#22c55e',
  open: '#22c55e',
  active: '#22c55e',
  connecting: '#eab308',
  disconnected: '#ef4444',
  close: '#ef4444',
  error: '#ef4444',
  default: '#9ca3af',
} as const

export function getInstanceStatusHex(status?: WhatsAppInstance['status'] | string): string {
  const normalized = (status ?? '').toLowerCase().trim()
  if (normalized === 'connected' || normalized === 'open' || normalized === 'active') {
    return INSTANCE_STATUS_HEX.connected
  }
  if (normalized === 'connecting') return INSTANCE_STATUS_HEX.connecting
  if (normalized === 'disconnected' || normalized === 'close' || normalized === 'error') {
    return INSTANCE_STATUS_HEX.disconnected
  }
  return INSTANCE_STATUS_HEX.default
}

export function InstanceStatusDot({
  status,
  className = '',
  size = 'sm',
}: {
  status?: WhatsAppInstance['status'] | string
  className?: string
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ring-2 ring-white ${sizeClass} ${className}`}
      style={{ backgroundColor: getInstanceStatusHex(status) }}
      aria-hidden
    />
  )
}

interface InstanceDropdownProps {
  isOpen: boolean
  onClose: () => void
  instances: WhatsAppInstance[]
  selectedInstanceId: string
  onSelectInstance: (id: string) => void
  onReconnect?: (instance: WhatsAppInstance) => void
}

export function InstanceDropdown({
  isOpen,
  onClose,
  instances,
  selectedInstanceId,
  onSelectInstance,
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
    const normalized = (instance.status ?? '').toLowerCase().trim()
    const isDisconnected =
      normalized === 'disconnected' ||
      normalized === 'close' ||
      normalized === 'connecting' ||
      normalized === 'error'
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
      className="absolute top-full left-0 right-0 mt-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1 max-h-[300px] overflow-y-auto"
    >
      {instances.map((instance) => (
        <button
          key={instance.id}
          onClick={() => handleClick(instance)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
            selectedInstanceId === instance.id
              ? 'bg-gray-100 text-gray-900 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <InstanceStatusDot status={instance.status} />
          <span className="truncate">{instance.display_name || instance.name}</span>
        </button>
      ))}
    </div>
  )
}

interface InstanceSelectorButtonProps {
  label: string
  onClick: () => void
  status?: WhatsAppInstance['status'] | string
  isOpen?: boolean
}

export function InstanceSelectorButton({ label, onClick, status, isOpen = false }: InstanceSelectorButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white shadow-sm transition-all ${
        isOpen
          ? 'border-primary-300 ring-2 ring-primary-100 shadow-md'
          : 'border-gray-200 hover:border-primary-200 hover:shadow-md'
      }`}
      title="Selecionar instância"
    >
      <InstanceStatusDot status={status} size="md" />
      <div className="flex-1 min-w-0 text-left">
        <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold leading-none mb-1">
          Instância WhatsApp
        </span>
        <span className="block text-sm font-semibold text-gray-900 truncate leading-tight">{label}</span>
      </div>
      <ChevronDownIcon
        className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-primary-500' : ''}`}
      />
    </button>
  )
}
