import { useEffect, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

interface TruncatedTextProps {
  text: string
  /** Texto do tooltip, quando diferente do exibido */
  tooltip?: string
  className?: string
}

/** Igual ao max-w-xs do tooltip */
const TOOLTIP_MAX_WIDTH = 320

interface Position {
  top: number
  left: number
}

/**
 * Texto cortado com reticências que mostra o conteúdo completo ao passar o mouse.
 * O tooltip vai para o body (position: fixed) para não ser cortado por
 * containers com overflow, como tabelas roláveis e dropdowns.
 */
export function TruncatedText({ text, tooltip, className = '' }: TruncatedTextProps) {
  const [position, setPosition] = useState<Position | null>(null)
  const content = tooltip ?? text

  useEffect(() => {
    if (!position) return
    const hide = () => setPosition(null)
    window.addEventListener('scroll', hide, true)
    return () => window.removeEventListener('scroll', hide, true)
  }, [position])

  const show = (e: MouseEvent<HTMLSpanElement>) => {
    if (!content) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - TOOLTIP_MAX_WIDTH - 8))
    })
  }

  return (
    <>
      <span className={`truncate ${className}`} onMouseEnter={show} onMouseLeave={() => setPosition(null)}>
        {text}
      </span>
      {position && createPortal(
        <div
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          className="fixed z-[10000] max-w-xs px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none break-words"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
