import { DocumentIcon } from '@heroicons/react/24/outline'

interface MessageDocumentProps {
  url: string
  caption?: string | null
}

/** O nome original do arquivo não é persistido, então só exibimos quando a URL o preserva. */
function getDocumentName(url: string): string {
  try {
    const lastSegment = decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
    return /\.[a-z0-9]{2,5}$/i.test(lastSegment) ? lastSegment : 'Documento'
  } catch {
    return 'Documento'
  }
}

export function MessageDocument({ url, caption }: MessageDocumentProps) {
  if (!url) {
    return <span className="text-sm text-gray-400">Documento indisponível</span>
  }

  return (
    <div className="space-y-1">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-2 p-2 bg-black/5 hover:bg-black/10 rounded-lg min-w-[200px] transition-colors"
      >
        <DocumentIcon className="w-8 h-8 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{getDocumentName(url)}</p>
          <p className="text-[11px] text-gray-400">Clique para abrir</p>
        </div>
      </a>
      {caption && <span className="text-[14.2px] leading-[19px]">{caption}</span>}
    </div>
  )
}
