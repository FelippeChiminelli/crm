import React, { useState, useEffect } from 'react'
import { 
  LinkIcon, 
  ClipboardDocumentIcon, 
  CheckIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { validateSlugAvailability, generateSlugFromName } from '../../services/publicBookingService'

interface PublicSlugConfigProps {
  calendarId?: string
  calendarName: string
  isPublic: boolean
  publicSlug?: string
  minAdvanceHours: number
  maxAdvanceDays: number
  onUpdate: (data: {
    is_public?: boolean
    public_slug?: string
    min_advance_hours?: number
    max_advance_days?: number
  }) => void
  saving?: boolean
}

export const PublicSlugConfig: React.FC<PublicSlugConfigProps> = ({
  calendarId,
  calendarName,
  isPublic,
  publicSlug,
  minAdvanceHours,
  maxAdvanceDays,
  onUpdate,
  saving
}) => {
  const [slug, setSlug] = useState(publicSlug || '')
  const [slugValid, setSlugValid] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [copied, setCopied] = useState(false)

  // Gerar slug automaticamente se não existir
  useEffect(() => {
    if (!publicSlug && calendarName && !slug) {
      setSlug(generateSlugFromName(calendarName))
    }
  }, [calendarName, publicSlug, slug])

  // Validar slug quando mudar
  useEffect(() => {
    const validateSlug = async () => {
      if (!slug || slug.length < 3) {
        setSlugValid(null)
        return
      }

      setCheckingSlug(true)
      try {
        const isValid = await validateSlugAvailability(slug, calendarId)
        setSlugValid(isValid)
      } catch {
        setSlugValid(false)
      } finally {
        setCheckingSlug(false)
      }
    }

    const timeout = setTimeout(validateSlug, 500)
    return () => clearTimeout(timeout)
  }, [slug, calendarId])

  const handleSlugChange = (value: string) => {
    // Sanitizar slug: apenas letras minúsculas, números e hífens
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
    setSlug(sanitized)
  }

  const handleSave = () => {
    onUpdate({
      is_public: isPublic,
      public_slug: slug,
      min_advance_hours: minAdvanceHours,
      max_advance_days: maxAdvanceDays
    })
  }

  const getFullUrl = () => {
    const baseUrl = window.location.origin
    return `${baseUrl}/agendar/${slug}`
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getFullUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toggle Ativar Link Público */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isPublic ? 'bg-green-100' : 'bg-gray-200'}`}>
            <GlobeAltIcon className={`w-5 h-5 ${isPublic ? 'text-green-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <p className="font-medium text-gray-900">Link Público</p>
            <p className="text-sm text-gray-500">
              Permite que clientes agendem diretamente pelo link
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onUpdate({ is_public: !isPublic })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isPublic ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isPublic ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isPublic && (
        <>
          {/* Configuração do Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              URL do Link
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                    {window.location.origin}/agendar/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-r-lg focus:ring-2 focus:ring-indigo-200 transition-colors ${
                      slugValid === false 
                        ? 'border-red-300 focus:border-red-500' 
                        : slugValid === true 
                        ? 'border-green-300 focus:border-green-500' 
                        : 'border-gray-300 focus:border-indigo-500'
                    }`}
                    placeholder="minha-agenda"
                  />
                </div>
                {checkingSlug && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={!slug || slugValid === false}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Copiar link"
              >
                {copied ? (
                  <CheckIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
            
            {/* Feedback do slug */}
            {slug && slug.length < 3 && (
              <p className="mt-1 text-sm text-yellow-600">
                O slug deve ter pelo menos 3 caracteres
              </p>
            )}
            {slugValid === false && slug.length >= 3 && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Este slug já está em uso
              </p>
            )}
            {slugValid === true && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <CheckIcon className="w-4 h-4" />
                Slug disponível
              </p>
            )}
          </div>

          {/* Preview do Link */}
          {slug && slugValid !== false && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-xs text-indigo-600 font-medium mb-1">Preview do link:</p>
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-500" />
                <code className="text-sm text-indigo-700 break-all">{getFullUrl()}</code>
              </div>
            </div>
          )}

          {/* Limites de Antecedência */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Antecedência Mínima
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={minAdvanceHours}
                  onChange={(e) => onUpdate({ min_advance_hours: parseInt(e.target.value) || 2 })}
                  className={`${ds.input()} w-20`}
                />
                <span className="text-sm text-gray-500">horas</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Mínimo de horas antes do horário
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Antecedência Máxima
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={maxAdvanceDays}
                  onChange={(e) => onUpdate({ max_advance_days: parseInt(e.target.value) || 30 })}
                  className={`${ds.input()} w-20`}
                />
                <span className="text-sm text-gray-500">dias</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Máximo de dias no futuro
              </p>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !slug || slug.length < 3 || slugValid === false}
              className={ds.button('primary')}
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
