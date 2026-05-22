import { useEffect, useRef, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { connectWhatsAppCloud } from '../../services/whatsappCloudService'
import { getUserEmpresaId } from '../../services/authService'
import { supabase } from '../../services/supabaseClient'
import SecureLogger from '../../utils/logger'
import type { ConnectWabaResponse } from '../../types'

interface ConnectWhatsAppOfficialModalProps {
  isOpen: boolean
  onClose: () => void
  onConnected?: () => void
}

type Status = 'idle' | 'connecting' | 'finishing' | 'success' | 'error'

interface CapturedSignup {
  waba_id: string
  phone_number_id: string
  code?: string
}

const META_EMBEDDED_SIGNUP_URL = import.meta.env
  .VITE_META_EMBEDDED_SIGNUP_URL as string | undefined

const ALLOWED_META_ORIGINS = new Set([
  'https://business.facebook.com',
  'https://www.facebook.com',
  'https://web.facebook.com',
])

const POPUP_FEATURES = 'width=620,height=760,left=200,top=100,scrollbars=yes'

const WhatsAppIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.52 3.48A11.79 11.79 0 0 0 12.02 0C5.4 0 .03 5.37.03 12c0 2.12.56 4.18 1.62 6L0 24l6.18-1.62A11.94 11.94 0 0 0 12.02 24C18.64 24 24 18.63 24 12c0-3.2-1.24-6.2-3.48-8.52Zm-8.5 18.4a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.67.96.98-3.58-.24-.37a9.9 9.9 0 0 1-1.52-5.3c0-5.49 4.47-9.95 9.96-9.95 2.66 0 5.16 1.04 7.04 2.92a9.87 9.87 0 0 1 2.92 7.03c0 5.49-4.47 9.88-9.96 9.88Zm5.45-7.43c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.42-1.5a9.1 9.1 0 0 1-1.67-2.07c-.17-.3-.02-.46.13-.6.13-.13.3-.34.45-.5.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.1 4.5 1.74.73 2.42.79 3.28.66.53-.08 1.62-.66 1.85-1.3.23-.65.23-1.2.16-1.31-.07-.13-.27-.2-.57-.35Z" />
  </svg>
)

export function ConnectWhatsAppOfficialModal({
  isOpen,
  onClose,
  onConnected,
}: ConnectWhatsAppOfficialModalProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectedInfo, setConnectedInfo] = useState<ConnectWabaResponse | null>(null)
  const popupRef = useRef<Window | null>(null)
  const capturedRef = useRef<CapturedSignup | null>(null)

  useEscapeKey(isOpen, onClose)

  useEffect(() => {
    if (!isOpen) return

    const handleMessage = (event: MessageEvent) => {
      if (!ALLOWED_META_ORIGINS.has(event.origin)) return
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return

        const event_name = data?.event
        if (event_name === 'FINISH' || event_name === 'FINISH_ONLY_WABA') {
          const inner = data?.data ?? {}
          capturedRef.current = {
            waba_id: inner.waba_id,
            phone_number_id: inner.phone_number_id,
            code: data?.authResponse?.code ?? inner.code,
          }
          SecureLogger.info('Embedded Signup capturado', capturedRef.current)
          finishConnection().catch((err) => {
            SecureLogger.error('Erro ao finalizar conexão', err)
          })
        } else if (event_name === 'CANCEL') {
          setStatus('error')
          setErrorMessage('Conexão cancelada pelo usuário no popup da Meta')
        }
      } catch (err) {
        SecureLogger.warn('Não foi possível parsear postMessage da Meta', err)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (isOpen) return
    setStatus('idle')
    setErrorMessage(null)
    setConnectedInfo(null)
    capturedRef.current = null
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }
    popupRef.current = null
  }, [isOpen])

  const finishConnection = async () => {
    const captured = capturedRef.current
    if (!captured?.waba_id || !captured?.phone_number_id) {
      setStatus('error')
      setErrorMessage('Não foi possível capturar waba_id/phone_number_id do popup da Meta')
      return
    }
    try {
      setStatus('finishing')
      const empresaId = await getUserEmpresaId()
      const { data: userResp } = await supabase.auth.getUser()
      const userId = userResp.user?.id
      if (!empresaId || !userId) {
        throw new Error('Sessão inválida — refaça login e tente novamente')
      }
      const result = await connectWhatsAppCloud({
        waba_id: captured.waba_id,
        phone_number_id: captured.phone_number_id,
        code: captured.code,
        empresa_id: empresaId,
        user_id: userId,
      })
      setConnectedInfo(result)
      setStatus('success')
      onConnected?.()
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close()
      }
    } catch (err) {
      SecureLogger.error('Erro em connectWhatsAppCloud (n8n)', err)
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao conectar WhatsApp')
    }
  }

  const handleConnect = () => {
    if (!META_EMBEDDED_SIGNUP_URL) {
      setErrorMessage('VITE_META_EMBEDDED_SIGNUP_URL não está definida')
      setStatus('error')
      return
    }
    capturedRef.current = null
    setErrorMessage(null)
    setStatus('connecting')

    const popup = window.open(META_EMBEDDED_SIGNUP_URL, 'meta-onboard', POPUP_FEATURES)
    if (!popup) {
      setStatus('error')
      setErrorMessage('Popup bloqueado pelo navegador. Permita pop-ups para este site e tente novamente.')
      return
    }
    popupRef.current = popup
  }

  if (!isOpen) return null

  const buttonDisabled = status === 'connecting' || status === 'finishing'
  const buttonLabel =
    status === 'connecting'
      ? 'Aguardando conexão na Meta...'
      : status === 'finishing'
        ? 'Finalizando...'
        : 'Conectar via Meta'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <WhatsAppIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Conectar WhatsApp Oficial</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {status === 'success' && connectedInfo && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-green-800">Conectado com sucesso</h4>
              <p className="text-sm text-green-700 mt-1">
                <span className="font-medium">Nome verificado:</span>{' '}
                {connectedInfo.verified_name ?? '—'}
              </p>
              <p className="text-sm text-green-700">
                <span className="font-medium">Número:</span>{' '}
                {connectedInfo.display_phone_number ?? '—'}
              </p>
              <p className="text-xs text-green-600 mt-1">
                phone_number_id: <code>{connectedInfo.phone_number_id}</code>
              </p>
            </div>
          )}

          {status === 'error' && errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}

          {status !== 'success' && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Será aberta uma janela com o fluxo oficial da Meta para você selecionar (ou criar) o
                WhatsApp Business Account e o número que deseja conectar. Ao final, os dados são
                enviados automaticamente para o orquestrador do CRM concluir a configuração.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={buttonDisabled}
                  className="flex-1 px-4 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {buttonLabel}
                </button>
              </div>
            </>
          )}

          {status === 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
