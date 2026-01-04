import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { updateInstanceDisplayName } from '../../services/chatService'
import type { WhatsAppInstance } from '../../types'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface RenameInstanceModalProps {
  isOpen: boolean
  onClose: () => void
  instance: WhatsAppInstance | null
  onRenamed: () => void
}

export function RenameInstanceModal({
  isOpen,
  onClose,
  instance,
  onRenamed
}: RenameInstanceModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inicializar o campo quando o modal abrir
  useEffect(() => {
    if (isOpen && instance) {
      setDisplayName(instance.display_name || instance.name)
      setError(null)
    }
  }, [isOpen, instance])

  const handleSave = async () => {
    if (!instance) return

    try {
      setSaving(true)
      setError(null)

      const trimmed = displayName.trim()
      if (!trimmed) {
        setError('O nome de exibição não pode estar vazio')
        return
      }

      // Se o nome for igual ao original, enviar null para limpar o display_name
      const valueToSave = trimmed === instance.name ? null : trimmed

      await updateInstanceDisplayName(instance.id, valueToSave)
      
      onRenamed()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao renomear instância')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (instance) {
      setDisplayName(instance.name)
    }
  }
  
  useEscapeKey(isOpen && !!instance, onClose)

  if (!isOpen || !instance) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Renomear Instância
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Nome técnico: <span className="font-mono">{instance.name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome de Exibição
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Digite o nome de exibição"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-2">
                Este nome será usado apenas para exibição. O nome técnico usado pela Evolution API permanecerá inalterado.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {instance.display_name && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  ℹ️ Esta instância já possui um nome customizado. Você pode restaurar o nome original clicando em "Restaurar Original".
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Restaurar Original
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving || !displayName.trim()}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

