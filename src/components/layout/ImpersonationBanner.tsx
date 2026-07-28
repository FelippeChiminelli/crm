import { useState } from 'react'
import { ArrowLeftOnRectangleIcon, EyeIcon } from '@heroicons/react/24/outline'
import { useImpersonation } from '../../contexts/ImpersonationContext'

/**
 * Faixa fixa exibida enquanto o parceiro acessa (impersona) uma empresa.
 *
 * Aditivo: nao altera nenhuma tela de tenant; apenas indica o modo de acesso e
 * oferece o "Sair da impersonacao", que restaura a sessao do parceiro.
 */
export function ImpersonationBanner() {
  const { isImpersonating, empresaNome, exit } = useImpersonation()
  const [leaving, setLeaving] = useState(false)

  if (!isImpersonating) return null

  const handleExit = async () => {
    if (leaving) return
    setLeaving(true)
    try {
      await exit()
      // Reload "hard": reinicializa o app ja com a sessao do parceiro restaurada.
      window.location.assign('/partner')
    } catch {
      setLeaving(false)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-3 border-t border-amber-500 bg-amber-400 px-4 py-2 text-sm text-amber-950 shadow-lg">
      <EyeIcon className="h-5 w-5 flex-shrink-0" />
      <span className="min-w-0 truncate font-medium">
        Modo parceiro — acessando <strong>{empresaNome ?? 'empresa'}</strong>
      </span>
      <button
        type="button"
        onClick={handleExit}
        disabled={leaving}
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-50 transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ArrowLeftOnRectangleIcon className="h-4 w-4" />
        {leaving ? 'Saindo...' : 'Sair da impersonação'}
      </button>
    </div>
  )
}

export default ImpersonationBanner
