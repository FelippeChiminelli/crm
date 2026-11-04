import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FaWhatsapp } from 'react-icons/fa'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useImpersonation } from '../../contexts/ImpersonationContext'
import { getWhatsAppUrl } from '../../utils/validations'

const SUPPORT_WHATSAPP_NUMBER = '5547997495813'
const SUPPORT_INITIAL_MESSAGE = 'Olá! Preciso de ajuda com o Aucta CRM.'
const SUPPORT_WHATSAPP_URL = `${getWhatsAppUrl(SUPPORT_WHATSAPP_NUMBER)}?text=${encodeURIComponent(SUPPORT_INITIAL_MESSAGE)}`

// Rotas onde o botão cobriria controles fixos no canto inferior direito (ex.: envio de mensagem no chat)
const HIDDEN_ROUTES = ['/chat']

export function SupportWhatsAppButton() {
  const location = useLocation()
  const { isImpersonating } = useImpersonation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (HIDDEN_ROUTES.some((route) => location.pathname.startsWith(route))) return null

  return (
    <div
      ref={containerRef}
      className={`fixed right-4 z-40 flex flex-col items-end gap-3 sm:right-6 ${isImpersonating ? 'bottom-16' : 'bottom-4 sm:bottom-6'}`}
    >
      {open && (
        <div
          role="dialog"
          aria-label="Suporte via WhatsApp"
          className="w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-800">Iniciar conversa com o suporte?</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fechar"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5b]"
          >
            <FaWhatsapp className="h-4 w-4" />
            Abrir WhatsApp
          </a>
        </div>
      )}

      <div className="group relative">
        {!open && (
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
            Suporte
            <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-gray-900" />
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#1ebe5b]"
          aria-label="Falar com o suporte pelo WhatsApp"
          aria-expanded={open}
        >
          <FaWhatsapp className="h-7 w-7" />
        </button>
      </div>
    </div>
  )
}

export default SupportWhatsAppButton
