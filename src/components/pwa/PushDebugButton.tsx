import { useState } from 'react'
import { subscribePush } from '../../lib/push'

/** TEMPORÁRIO (Fase 1): gera a inscrição de push para teste manual. Remover na Fase 3. */
export function PushDebugButton() {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    setBusy(true)
    try {
      const subscription = await subscribePush()
      const json = JSON.stringify(subscription.toJSON())
      console.log('[push-debug] subscription', json)
      try {
        await navigator.clipboard.writeText(json)
      } catch {
        // clipboard indisponível (ex.: iOS sem gesto válido); o alert ainda mostra o JSON
      }
      window.alert(json)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[push-debug] erro', error)
      window.alert(`Erro: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="fixed bottom-4 left-4 z-[99999] px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg disabled:opacity-50"
    >
      {busy ? 'Inscrevendo...' : 'Debug: inscrever push'}
    </button>
  )
}
