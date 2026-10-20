/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

interface PushPayload {
  id?: string
  title?: string
  body?: string
  url?: string
  tag?: string
}

interface NotificationData {
  url: string
  id?: string
}

const NOTIFICATION_ICON = '/icons/icon-192x192.png'
const NOTIFICATION_BADGE = '/badge-72x72.png'

// ---------- Precache / ciclo de vida ----------
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

// registerType 'prompt': o PWAUpdatePrompt envia SKIP_WAITING ao clicar em "Atualizar agora".
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

// ---------- Runtime caching ----------
// Áudio/vídeo ficam fora do SW: o player usa requisições Range (206) e o iOS
// em modo standalone falha ao reproduzir mídia respondida via respondWith.
const isMediaRequest = (request: Request) =>
  request.destination === 'audio' || request.destination === 'video' || request.headers.has('range')

// APIs do Supabase sempre na rede (chamadas autenticadas dinâmicas).
registerRoute(
  ({ url, request }) => /^https:\/\/.*\.supabase\.co\/.*/i.test(url.href) && !isMediaRequest(request),
  new NetworkOnly()
)

registerRoute(
  ({ url }) => /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 })]
  })
)

// ---------- Web Push ----------
function parsePushPayload(event: PushEvent): PushPayload {
  if (!event.data) return {}
  try {
    return event.data.json() as PushPayload
  } catch {
    return { body: event.data.text() }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event)
  const data: NotificationData = { url: payload.url || '/', id: payload.id }
  // `renotify` existe no spec mas ainda não está no lib.dom do TS.
  const options: NotificationOptions & { renotify?: boolean } = {
    body: payload.body,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_BADGE,
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    data
  }
  event.waitUntil(self.registration.showNotification(payload.title || 'Aucta CRM', options))
})

async function openOrFocus(url: string): Promise<void> {
  const target = new URL(url, self.location.origin).href
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const existing = windows.find((client) => client.url.startsWith(self.location.origin))
  if (existing) {
    try {
      const focused = await existing.focus()
      // navigate() só funciona em janelas controladas por este SW.
      await focused.navigate(target)
      return
    } catch {
      // cai no openWindow abaixo
    }
  }
  await self.clients.openWindow(target)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as NotificationData | undefined
  event.waitUntil(openOrFocus(data?.url || '/'))
})
