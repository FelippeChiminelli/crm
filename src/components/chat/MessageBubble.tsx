
import { format, parseISO } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ptBR } from 'date-fns/locale'
import { 
  DocumentIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'
import type { ChatMessage } from '../../types'

interface MessageBubbleProps {
  message: ChatMessage
  isOwnMessage: boolean
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const triedBlobFallbackRef = useRef(false)

  const playableUrl = useMemo(() => {
    const raw = (message.media_url || '').trim()
    if (!raw) return ''
    // Se já for URL assinada/pública, converte assinada -> pública
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw)
        if (u.pathname.includes('/storage/v1/object/sign/')) {
          u.pathname = u.pathname.replace('/storage/v1/object/sign/', '/storage/v1/object/public/')
          u.search = ''
        }
        return u.toString()
      } catch {
        return raw
      }
    }
    // Caso venha apenas a chave do arquivo (ex.: "5547..."), montar URL pública no bucket chatmedia
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    if (!supabaseUrl) return raw
    const base = supabaseUrl.replace(/\/$/, '')
    const path = raw.startsWith('chatmedia/') ? raw : `chatmedia/${raw}`
    const encodedPath = path
      .split('/')
      .map((p) => encodeURIComponent(p))
      .join('/')
    return `${base}/storage/v1/object/public/${encodedPath}`
  }, [message.media_url])

  useEffect(() => {
    // Reset ao trocar de mensagem
    triedBlobFallbackRef.current = false
    setBlobUrl(null)
    setAudioError(null)
    setIsPlaying(false)
  }, [message.id])

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
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
      const isOgg = header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53 // 'OggS'
      const isId3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33 // 'ID3'
      const isMp3Frame = header[0] === 0xff && (header[1] & 0xe0) === 0xe0
      const inferredType = isOgg
        ? 'audio/ogg'
        : (isId3 || isMp3Frame || playableUrl.toLowerCase().includes('.mp3'))
          ? 'audio/mpeg'
          : 'audio/ogg'
      const blob = new Blob([arrayBuffer], { type: inferredType })
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setAudioError(null)
      // Pequeno atraso para o elemento receber o src
      requestAnimationFrame(() => {
        if (audioRef.current) {
          audioRef.current.load()
        }
      })
    } catch (e) {
      console.error('[Chat] Fallback blob falhou', e)
    }
  }

  const formatTime = (timestamp: string) => {
    // parseISO garante que timestamps UTC sejam interpretados corretamente
    const date = parseISO(timestamp)
    return format(date, 'HH:mm', { locale: ptBR })
  }

  const getStatusIcon = () => {
    if (message.status === 'failed') {
      return <ExclamationTriangleIcon className="w-3 h-3 text-orange-500" />
    }
    return null
  }

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="text-sm">
            {message.content}
          </div>
        )
      
      case 'image':
        return (
          <div className="space-y-2">
            <img 
              src={playableUrl || message.media_url} 
              alt="Imagem" 
              className="max-w-xs rounded-lg"
            />
            {message.content && (
              <div className="text-sm">{message.content}</div>
            )}
          </div>
        )
      
      case 'audio':
        return (
          <div className="space-y-2">
            {message.media_url ? (
              <div
                className="space-y-2"
                onClick={() => {
                  if (!audioRef.current) return
                  if (audioRef.current.paused) {
                    audioRef.current.play()
                  } else {
                    audioRef.current.pause()
                  }
                }}
              >
                <audio
                  ref={audioRef}
                  controls
                  preload="metadata"
                  className="w-full min-w-[200px] sm:min-w-[250px] md:min-w-[300px]"
                  playsInline
                  src={blobUrl || message.media_url || playableUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onCanPlay={() => setAudioError(null)}
                  onError={(e) => {
                    const target = e.currentTarget
                    const err = (target as HTMLMediaElement).error
                    const code = err?.code
                    let msg = 'Erro ao carregar o áudio'
                    if (code === 1) msg = 'Carga abortada'
                    if (code === 2) msg = 'Erro de rede ao carregar áudio'
                    if (code === 3) msg = 'Erro de decodificação (formato/codec não suportado)'
                    if (code === 4) msg = 'Fonte de mídia não suportada'
                    setAudioError(msg)
                    console.error('[Chat] Falha no áudio', {
                      src: playableUrl,
                      networkState: target.networkState,
                      readyState: target.readyState,
                      errorCode: code
                    })
                    // Tentar fallback via Blob apenas uma vez
                    tryBlobFallback()
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Seu navegador não suporta reprodução de áudio.
                </audio>
                {audioError && (
                  <div className={`text-xs ${isOwnMessage ? 'text-white/90' : 'text-red-600'}`}>{audioError}</div>
                )}
                <button
                  type="button"
                  className={`text-xs font-medium px-2 py-1 rounded border ${
                    isOwnMessage
                      ? 'border-white/40 text-white/90 hover:bg-white/10'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!audioRef.current) return
                    if (audioRef.current.paused) {
                      audioRef.current.play()
                    } else {
                      audioRef.current.pause()
                    }
                  }}
                >
                  {isPlaying ? 'Pausar' : 'Reproduzir'}
                </button>
              </div>
            ) : (
              <div className="text-sm">Áudio indisponível</div>
            )}
            {message.content && (
              <div className="text-sm">{message.content}</div>
            )}
          </div>
        )
      
      case 'document':
        return (
          <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
            <DocumentIcon className="w-5 h-5 text-blue-500" />
            <span className="text-sm">Documento</span>
          </div>
        )
      
      default:
        return <div className="text-sm">{message.content}</div>
    }
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 lg:mb-4`}>
      <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        <div
          className={`px-3 py-2 lg:px-4 lg:py-3 rounded-2xl shadow-sm overflow-visible ${
            isOwnMessage
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white' // Mensagens recebidas (inbound) - lado direito - azul
              : 'bg-white text-gray-900 border border-gray-200' // Mensagens enviadas (outbound) - lado esquerdo - branco
          }`}
        >
          {renderMessageContent()}
          
          <div className={`flex items-center justify-between mt-1.5 lg:mt-2 ${
            isOwnMessage ? 'text-white/80' : 'text-gray-500'
          }`}>
            <span className="text-[10px] lg:text-xs">{formatTime(message.timestamp)}</span>
            {getStatusIcon()}
          </div>
        </div>
      </div>
    </div>
  )
} 