interface MessageVideoProps {
  url: string
  caption?: string | null
}

export function MessageVideo({ url, caption }: MessageVideoProps) {
  if (!url) {
    return <span className="text-sm text-gray-400">Vídeo indisponível</span>
  }

  return (
    <div className="space-y-1">
      <video
        controls
        preload="metadata"
        playsInline
        src={url}
        className="max-w-[300px] rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      {caption && <span className="text-[14.2px] leading-[19px]">{caption}</span>}
    </div>
  )
}
