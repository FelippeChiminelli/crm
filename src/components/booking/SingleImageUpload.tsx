import React, { useRef, useState } from 'react'
import { PhotoIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'

interface SingleImageUploadProps {
  label?: string
  hint?: string
  sizeGuide?: {
    recommended: string
    ratio: string
    tips: string
  }
  currentUrl?: string | null
  disabled?: boolean
  onUpload: (file: File) => Promise<string>
  onRemove: () => Promise<void>
}

export const SingleImageUpload: React.FC<SingleImageUploadProps> = ({
  label = 'Imagem',
  hint = 'JPEG, PNG ou WebP. Máximo 2 MB.',
  sizeGuide,
  currentUrl,
  disabled = false,
  onUpload,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null)

  React.useEffect(() => {
    setPreviewUrl(currentUrl || null)
  }, [currentUrl])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)
    try {
      const url = await onUpload(file)
      setPreviewUrl(url)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar imagem')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setError(null)
    setRemoving(true)
    try {
      await onRemove()
      setPreviewUrl(null)
    } catch (err: any) {
      setError(err.message || 'Erro ao remover imagem')
    } finally {
      setRemoving(false)
    }
  }

  const isBusy = uploading || removing

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      <div className="flex items-start gap-4">
        <div className="w-28 h-28 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <PhotoIcon className="w-10 h-10 text-gray-300" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          {sizeGuide && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900 space-y-1">
              <p className="font-medium">Tamanho recomendado: {sizeGuide.recommended}</p>
              <p>Proporção: {sizeGuide.ratio}</p>
              <p className="text-blue-800">{sizeGuide.tips}</p>
            </div>
          )}
          <p className="text-xs text-gray-500">{hint}</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              {uploading ? 'Enviando...' : previewUrl ? 'Trocar imagem' : 'Enviar imagem'}
            </button>

            {previewUrl && (
              <button
                type="button"
                disabled={disabled || isBusy}
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <TrashIcon className="w-4 h-4" />
                {removing ? 'Removendo...' : 'Remover'}
              </button>
            )}
          </div>

          {disabled && (
            <p className="text-xs text-amber-600">
              Salve a agenda primeiro para enviar a imagem de capa.
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
