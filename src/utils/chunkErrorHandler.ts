const RELOAD_TS_KEY = 'adv_crm_chunk_reload_ts'
const RELOAD_COUNT_KEY = 'adv_crm_chunk_reload_count'
const MAX_RELOADS = 2
const RELOAD_WINDOW_MS = 60_000
const CACHE_CLEAR_TIMEOUT_MS = 3_000

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false

  const message = error instanceof Error ? error.message : String(error)
  const name = error instanceof Error ? error.name : ''

  return (
    name === 'ChunkLoadError' ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError') ||
    message.includes('dynamically imported module')
  )
}

// O registro do SW não é removido: isso cancelaria a inscrição de Web Push.
// Sem cache, o precache do Workbox cai para a rede e busca a versão atual.
async function clearServiceWorkerCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    registrations.forEach((registration) => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
    })
  }

  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
}

/** Equivalente programático ao Ctrl+Shift+R para caches do PWA. */
export async function hardReloadApp(): Promise<void> {
  try {
    await Promise.race([
      clearServiceWorkerCaches(),
      new Promise((resolve) => window.setTimeout(resolve, CACHE_CLEAR_TIMEOUT_MS)),
    ])
  } catch {
    /* recarrega mesmo assim */
  }
  window.location.reload()
}

/** Evita loop infinito de reload em deploy quebrado ou rede instável. */
export function safeReloadForChunkError(): boolean {
  try {
    const now = Date.now()
    const lastTs = Number.parseInt(sessionStorage.getItem(RELOAD_TS_KEY) || '0', 10)
    let count = Number.parseInt(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0', 10)

    if (!lastTs || now - lastTs > RELOAD_WINDOW_MS) {
      count = 0
    }

    if (count >= MAX_RELOADS) {
      return false
    }

    sessionStorage.setItem(RELOAD_TS_KEY, String(now))
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(count + 1))
  } catch {
    /* sessionStorage indisponível: segue sem contador */
  }
  void hardReloadApp()
  return true
}

export function resetChunkReloadCounter(): void {
  try {
    sessionStorage.removeItem(RELOAD_TS_KEY)
    sessionStorage.removeItem(RELOAD_COUNT_KEY)
  } catch {
    /* ignore */
  }
}

export function setupChunkErrorHandler(): void {
  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return
    event.preventDefault()
    safeReloadForChunkError()
  })
}
