import { useEffect, useRef, useState } from 'react'
import { useAuthContext } from '../../contexts/AuthContext'
import { useImpersonation } from '../../contexts/ImpersonationContext'
import { isIOS, isStandalone, pushSupported, renewPushIfGranted } from '../../lib/push'
import { isSnoozed } from '../../lib/promptSnooze'
import { PushPrompt, PUSH_PROMPT_SNOOZE_KEY } from './PushPrompt'
import { IosInstallBanner, IOS_INSTALL_SNOOZE_KEY } from './IosInstallBanner'

type PromptKind = 'push' | 'iosInstall' | null

function resolvePrompt(): PromptKind {
  if (isIOS() && !isStandalone()) {
    return isSnoozed(IOS_INSTALL_SNOOZE_KEY) ? null : 'iosInstall'
  }
  if (pushSupported() && Notification.permission === 'default' && !isSnoozed(PUSH_PROMPT_SNOOZE_KEY)) {
    return 'push'
  }
  return null
}

/**
 * Orquestra o push do usuário logado: renovação silenciosa da inscrição e
 * exibição do soft ask / banner de instalação no iOS.
 * Desligado durante impersonação para não inscrever o aparelho do parceiro.
 */
export function PushNotificationsManager() {
  const { isAuthenticated, profile } = useAuthContext()
  const { isImpersonating } = useImpersonation()
  const empresaId = isAuthenticated && !isImpersonating ? profile?.empresa_id ?? null : null
  const [prompt, setPrompt] = useState<PromptKind>(null)
  const renewedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!empresaId || !profile?.uuid) {
      setPrompt(null)
      return
    }
    setPrompt(resolvePrompt())

    const renewKey = `${profile.uuid}:${empresaId}`
    if (renewedForRef.current === renewKey) return
    renewedForRef.current = renewKey
    renewPushIfGranted(empresaId).catch((error: unknown) => {
      console.warn('[push] renovação silenciosa falhou:', error)
    })
  }, [empresaId, profile?.uuid])

  if (!empresaId) return null
  if (prompt === 'push') return <PushPrompt empresaId={empresaId} onClose={() => setPrompt(null)} />
  if (prompt === 'iosInstall') return <IosInstallBanner onClose={() => setPrompt(null)} />
  return null
}
