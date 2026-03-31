import { FaWhatsapp } from 'react-icons/fa'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { formatBrazilianPhone } from '../../utils/validations'

interface WhatsAppChoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onExternal: () => void
  onInternal: () => void
  phone?: string
  loading?: boolean
}

export function WhatsAppChoiceModal({
  isOpen,
  onClose,
  onExternal,
  onInternal,
  phone,
  loading = false,
}: WhatsAppChoiceModalProps) {
  useEscapeKey(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xs overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 text-center">
          <p className="text-sm font-semibold text-gray-900">Como deseja abrir?</p>
          {phone && (
            <p className="mt-1 text-xs text-gray-500 select-text">{formatBrazilianPhone(phone)}</p>
          )}
        </div>

        <div className="px-4 pb-4 space-y-2">
          <button
            onClick={() => { onExternal(); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors text-left"
          >
            <FaWhatsapp className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">WhatsApp Externo</p>
              <p className="text-xs text-gray-500">Abrir no app do WhatsApp</p>
            </div>
          </button>

          <button
            onClick={() => { onInternal(); onClose() }}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left disabled:opacity-60"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Chat Interno CRM</p>
              <p className="text-xs text-gray-500">Conversar pelo CRM</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
