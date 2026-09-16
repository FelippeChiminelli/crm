import { useMemo } from 'react'

/**
 * Resolve o `media_url` de uma mensagem para uma URL carregável no navegador.
 *
 * A coluna recebe três formatos distintos dependendo da origem: URL pública
 * completa, URL assinada (convertida para pública, pois `chatmedia` é público)
 * ou apenas o nome do objeto no bucket.
 */
export function useResolvedMediaUrl(mediaUrl?: string | null): string {
  return useMemo(() => {
    const raw = (mediaUrl || '').trim()
    if (!raw) return ''

    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw)
        if (url.pathname.includes('/storage/v1/object/sign/')) {
          url.pathname = url.pathname.replace('/storage/v1/object/sign/', '/storage/v1/object/public/')
          url.search = ''
        }
        return url.toString()
      } catch {
        return raw
      }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    if (!supabaseUrl) return raw

    const base = supabaseUrl.replace(/\/$/, '')
    const path = raw.startsWith('chatmedia/') ? raw : `chatmedia/${raw}`
    const encodedPath = path.split('/').map((part) => encodeURIComponent(part)).join('/')
    return `${base}/storage/v1/object/public/${encodedPath}`
  }, [mediaUrl])
}
