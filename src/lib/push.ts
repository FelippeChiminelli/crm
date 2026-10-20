/**
 * Web Push (VAPID) — detecção de suporte e inscrição do aparelho.
 *
 * `subscribePush()` dispara o diálogo nativo de permissão e por isso só pode
 * ser chamada a partir de um gesto do usuário (clique). Nunca no carregamento.
 */
import { supabase } from '../services/supabaseClient'

interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorStandalone).standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ se apresenta como Mac; o touch diferencia.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

function getVapidPublicKey(): string {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!key) throw new Error('VITE_VAPID_PUBLIC_KEY não está definida nas variáveis de ambiente')
  return key
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  // getRegistration() em vez de `ready`: não fica pendente se o SW ainda não registrou.
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

async function getOrCreateSubscription(): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey())
  })
}

/** Pede permissão e devolve a inscrição existente ou uma nova. Chamar só em clique. */
export async function subscribePush(): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error('Push não é suportado neste navegador')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permissão de notificação negada')

  return getOrCreateSubscription()
}

// ---------- Persistência em push_subscriptions ----------

async function saveSubscription(subscription: PushSubscription, empresaId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Usuário não autenticado')

  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys?.auth) throw new Error('Inscrição de push inválida')

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      empresa_id: empresaId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: navigator.userAgent
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw new Error(`Erro ao salvar inscrição de push: ${error.message}`)
}

/** Ativa o push neste aparelho. Chamar só em clique (abre o diálogo nativo). */
export async function enablePush(empresaId: string): Promise<void> {
  const subscription = await subscribePush()
  await saveSubscription(subscription, empresaId)
}

/** Remove a inscrição deste aparelho do banco e do navegador. */
export async function disablePush(): Promise<void> {
  const subscription = await getCurrentSubscription()
  if (!subscription) return

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint)
  if (error) console.warn('[push] erro ao remover inscrição do banco:', error.message)

  await subscription.unsubscribe()
}

/** Renovação silenciosa no login: só age se a permissão já foi concedida. */
export async function renewPushIfGranted(empresaId: string): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const subscription = await getOrCreateSubscription()
  await saveSubscription(subscription, empresaId)
}
