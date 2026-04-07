import { format, parseISO } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ptBR } from 'date-fns/locale'
import { DocumentIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { ChatMessage } from '../../types'

interface MessageBubbleProps {
  message: ChatMessage
  isOwnMessage: boolean
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const triedBlobFallbackRef = useRef(false)

  const playableUrl = useMemo(() => {
    const raw = (message.media_url || '').trim()
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw)
        if (u.pathname.includes('/storage/v1/object/sign/')) {
          u.pathname = u.pathname.replace('/storage/v1/object/sign/', '/storage/v1/object/public/')
          u.search = ''
        }
        return u.toString()
      } catch { return raw }
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    if (!supabaseUrl) return raw
    const base = supabaseUrl.replace(/\/$/, '')
    const path = raw.startsWith('chatmedia/') ? raw : `chatmedia/${raw}`
    const encodedPath = path.split('/').map((p) => encodeURIComponent(p)).join('/')
    return `${base}/storage/v1/object/public/${encodedPath}`
  }, [message.media_url])

  useEffect(() => {
    triedBlobFallbackRef.current = false
    setBlobUrl(null)
    setAudioError(null)
  }, [message.id])

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [blobUrl])

  const tryBlobFallback = async () => {
    if (triedBlobFallbackRef.current) return
    triedBlobFallbackRef.current = true
    if (!playableUrl) return
    try {
      const res = await fetch(playableUrl, { mode: 'cors' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arrayBuffer = await res.arrayBuffer()
      const header = new Uint8Array(arrayBuffer.slice(0, 4))
      const isOgg = header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53
      const isId3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33
      const isMp3Frame = header[0] === 0xff && (header[1] & 0xe0) === 0xe0
      const inferredType = isOgg ? 'audio/ogg' : (isId3 || isMp3Frame || playableUrl.toLowerCase().includes('.mp3')) ? 'audio/mpeg' : 'audio/ogg'
      const blob = new Blob([arrayBuffer], { type: inferredType })
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setAudioError(null)
      requestAnimationFrame(() => { audioRef.current?.load() })
    } catch (e) {
      console.error('[Chat] Fallback blob falhou', e)
    }
  }

  const formatTime = (timestamp: string) => format(parseISO(timestamp), 'HH:mm', { locale: ptBR })

  const renderStatusIcon = () => {
    if (message.status === 'failed') return <ExclamationTriangleIcon className="w-3 h-3 text-red-400" />
    return null
  }

  const renderContent = () => {
    switch (message.message_type) {
      case 'text':
        return <span className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{message.content}</span>

      case 'image':
        return (
          <div className="space-y-1">
            <img src={playableUrl || message.media_url} alt="Imagem" className="max-w-[300px] rounded-lg" />
            {message.content && <span className="text-[14.2px] leading-[19px]">{message.content}</span>}
          </div>
        )

      case 'audio':
        return (
          <div className="min-w-[240px]">
            {message.media_url ? (
              <>
                <audio
                  ref={audioRef}
                  controls
                  preload="metadata"
                  className="w-full h-10"
                  playsInline
                  src={blobUrl || message.media_url || playableUrl}
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
              </>
            ) : (
              <span className="text-sm text-gray-400">Áudio indisponível</span>
            )}
          </div>
        )

      case 'document':
        return (
          <div className="flex items-center gap-2 p-2 bg-black/5 rounded-lg min-w-[200px]">
            <DocumentIcon className="w-8 h-8 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">Documento</p>
              <p className="text-[11px] text-gray-400">Arquivo anexado</p>
            </div>
          </div>
        )

      default:
        return <span className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{message.content}</span>
    }
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`relative max-w-[65%] px-2.5 py-1.5 rounded-lg shadow-sm ${
          isOwnMessage
            ? 'bg-primary-50 text-gray-900'
            : 'bg-white text-gray-900'
        }`}
        style={isOwnMessage
          ? { borderTopRightRadius: '3px' }
          : { borderTopLeftRadius: '3px' }
        }
      >
        {/* Tail (rabinho) */}
        <div
          className={`absolute top-0 w-0 h-0 ${
            isOwnMessage
              ? '-right-2 border-l-[8px] border-t-[8px] border-l-transparent border-t-primary-50'
              : '-left-2 border-r-[8px] border-t-[8px] border-r-transparent border-t-white'
          }`}
        />

        {/* Conteúdo */}
        <div>
          {renderContent()}
        </div>

        {/* Timestamp + status */}
        <div className="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
          <span className="text-[11px] text-gray-400 leading-none">{formatTime(message.timestamp)}</span>
          {renderStatusIcon()}
        </div>
      </div>
    </div>
  )
}
