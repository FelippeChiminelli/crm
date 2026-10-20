import { useState } from 'react'
import { useAuthContext } from '../../../contexts/AuthContext'
import { useToastContext } from '../../../contexts/ToastContext'
import { usePushStatus } from '../../../hooks/usePushStatus'
import { disablePush, enablePush } from '../../../lib/push'
import { Switch } from '../../ui/Switch'

function DeniedInstructions() {
  return (
    <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800 space-y-2">
      <p className="font-semibold">As notificações foram bloqueadas neste aparelho.</p>
      <p>
        <strong>Android (Chrome):</strong> toque no cadeado ao lado do endereço (ou, no app instalado, segure o
        ícone → Informações do app) → Notificações → Permitir.
      </p>
      <p>
        <strong>iPhone (app instalado):</strong> Ajustes → Notificações → Aucta → Permitir Notificações.
      </p>
      <p>Depois, volte aqui e ative novamente.</p>
    </div>
  )
}

function UnsupportedMessage({ ios, standalone }: { ios: boolean; standalone: boolean }) {
  const message =
    ios && !standalone
      ? 'No iPhone, instale o app (Safari → Compartilhar → Adicionar à Tela de Início) e abra pelo ícone para ativar.'
      : 'Este navegador não suporta notificações push.'
  return <p className="mt-2 text-xs text-gray-500">{message}</p>
}

/** Toggle geral: ativa/desativa a inscrição DESTE aparelho, refletindo o estado real. */
export function DevicePushSection() {
  const { profile } = useAuthContext()
  const { showError, showSuccess } = useToastContext()
  const status = usePushStatus()
  const [busy, setBusy] = useState(false)

  const enabled = status.permission === 'granted' && status.subscribed
  const canToggle = status.supported && status.permission !== 'denied' && !status.loading && !busy

  const handleToggle = async (next: boolean) => {
    if (!profile?.empresa_id) return
    setBusy(true)
    try {
      if (next) {
        await enablePush(profile.empresa_id)
        showSuccess('Notificações ativadas neste aparelho')
      } else {
        await disablePush()
        showSuccess('Notificações desativadas neste aparelho')
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao alterar notificações')
    } finally {
      await status.refresh()
      setBusy(false)
    }
  }

  return (
    <section className="p-3 lg:p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Notificações neste aparelho</h3>
          <p className="text-xs text-gray-500 mt-0.5">Receba avisos mesmo com o app fechado.</p>
        </div>
        <Switch checked={enabled} onChange={handleToggle} disabled={!canToggle} label="Notificações neste aparelho" />
      </div>
      {!status.supported && <UnsupportedMessage ios={status.ios} standalone={status.standalone} />}
      {status.permission === 'denied' && <DeniedInstructions />}
    </section>
  )
}
