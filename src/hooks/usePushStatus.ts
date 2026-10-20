import { useCallback, useEffect, useState } from 'react'
import { getCurrentSubscription, isIOS, isStandalone, pushSupported } from '../lib/push'

export type PushPermission = NotificationPermission | 'unsupported'

export interface PushStatus {
  supported: boolean
  standalone: boolean
  ios: boolean
  permission: PushPermission
  subscribed: boolean
  loading: boolean
  refresh: () => Promise<void>
}

/** Estado real do push neste aparelho (permissão + inscrição no navegador). */
export function usePushStatus(): PushStatus {
  const supported = pushSupported()
  const [permission, setPermission] = useState<PushPermission>(
    supported ? Notification.permission : 'unsupported'
  )
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(supported)

  const refresh = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      setPermission(Notification.permission)
      const subscription = await getCurrentSubscription()
      setSubscribed(Boolean(subscription))
    } catch {
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [supported])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    supported,
    standalone: isStandalone(),
    ios: isIOS(),
    permission,
    subscribed,
    loading,
    refresh
  }
}
