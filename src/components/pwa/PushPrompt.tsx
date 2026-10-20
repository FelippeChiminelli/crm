import { useState } from 'react'
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { enablePush } from '../../lib/push'
import { snooze } from '../../lib/promptSnooze'

export const PUSH_PROMPT_SNOOZE_KEY = 'aucta.pushPrompt.snoozedAt'

interface PushPromptProps {
  empresaId: string
  onClose: () => void
}

/**
 * Soft ask: explica o benefício antes do diálogo nativo. O diálogo nativo só é
 * aberto pelo clique em "Ativar" (enablePush → Notification.requestPermission).
 */
export function PushPrompt({ empresaId, onClose }: PushPromptProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEnable = async () => {
    setBusy(true)
    setError(null)
    try {
      await enablePush(empresaId)
      onClose()
    } catch (err) {
      if (Notification.permission === 'denied') {
        onClose()
        return
      }
      setError(err instanceof Error ? err.message : 'Não foi possível ativar as notificações')
    } finally {
      setBusy(false)
    }
  }

  const handleLater = () => {
    snooze(PUSH_PROMPT_SNOOZE_KEY)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[99998] flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-orange-100 rounded-lg">
            <BellAlertIcon className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-gray-900">Receba seus leads na hora</h4>
            <p className="text-sm text-gray-600 mt-1">
              Ative as notificações para saber assim que um lead for atribuído a você ou enviar uma mensagem.
            </p>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </div>
          <button
            type="button"
            onClick={handleLater}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {busy ? 'Ativando...' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={handleLater}
            disabled={busy}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
