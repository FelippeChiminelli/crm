/** Adiamento de prompts ("Agora não") persistido no localStorage. */

const DEFAULT_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

export function isSnoozed(key: string, durationMs: number = DEFAULT_SNOOZE_MS): boolean {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return false
    const at = Number(raw)
    return Number.isFinite(at) && Date.now() - at < durationMs
  } catch {
    return false
  }
}

export function snooze(key: string): void {
  try {
    window.localStorage.setItem(key, String(Date.now()))
  } catch {
    // localStorage indisponível (modo privado etc.): o prompt volta a aparecer
  }
}
