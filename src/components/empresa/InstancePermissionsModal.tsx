import { XMarkIcon } from '@heroicons/react/24/outline'
import { InstancePermissions } from './InstancePermissions'
import type { WhatsAppInstance } from '../../types'

interface InstancePermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  instance: WhatsAppInstance | null
  onChanged?: (instanceId: string) => void
}

export function InstancePermissionsModal({
  isOpen,
  onClose,
  instance,
  onChanged
}: InstancePermissionsModalProps) {
  if (!isOpen || !instance) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Gerenciar Permissões
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {instance.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <InstancePermissions 
              instance={instance}
              onChanged={async (instanceId) => {
                onChanged?.(instanceId)
              }}
            />
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

