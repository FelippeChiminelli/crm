import { useEffect, useRef, useState } from 'react'

interface MessageAudioProps {
  /** Reinicia o estado quando a bolha passa a renderizar outra mensagem. */
  messageId: string
  mediaUrl?: string
  resolvedUrl: string
}

export function MessageAudio({ messageId, mediaUrl, resolvedUrl }: MessageAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const triedBlobFallbackRef = useRef(false)

  useEffect(() => {
    triedBlobFallbackRef.current = false
    setBlobUrl(null)
    setAudioError(null)
  }, [messageId])

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [blobUrl])

  /** Alguns arquivos vêm sem content-type útil; inferimos pelo header binário. */
  const tryBlobFallback = async () => {
    if (triedBlobFallbackRef.current) return
    triedBlobFallbackRef.current = true
    if (!resolvedUrl) return
    try {
      const res = await fetch(resolvedUrl, { mode: 'cors' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arrayBuffer = await res.arrayBuffer()
      const header = new Uint8Array(arrayBuffer.slice(0, 4))
      const isOgg = header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53
      const isId3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33
      const isMp3Frame = header[0] === 0xff && (header[1] & 0xe0) === 0xe0
      const inferredType = isOgg ? 'audio/ogg' : (isId3 || isMp3Frame || resolvedUrl.toLowerCase().includes('.mp3')) ? 'audio/mpeg' : 'audio/ogg'
      const blob = new Blob([arrayBuffer], { type: inferredType })
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setAudioError(null)
      requestAnimationFrame(() => { audioRef.current?.load() })
    } catch (e) {
      console.error('[Chat] Fallback blob falhou', e)
    }
  }

  if (!mediaUrl) {
    return <span className="text-sm text-gray-400">Áudio indisponível</span>
  }

  return (
    <div className="min-w-[240px]">
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        className="w-full h-10"
        playsInline
        src={blobUrl || mediaUrl || resolvedUrl}
        onCanPlay={() => setAudioError(null)}
        onError={(e) => {
          const target = e.currentTarget as HTMLMediaElement
          const code = target.error?.code
          let msg = 'Erro ao carregar o áudio'
          if (code === 1) msg = 'Carga abortada'
          if (code === 2) msg = 'Erro de rede'
          if (code === 3) msg = 'Codec não suportado'
          if (code === 4) msg = 'Fonte não suportada'
          setAudioError(msg)
          tryBlobFallback()
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {audioError && <p className="text-[11px] text-red-500 mt-1">{audioError}</p>}
    </div>
  )
}
