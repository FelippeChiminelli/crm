import { useState } from 'react'

interface InteractionFormProps {
  // Preenchido ao editar uma interação existente
  initialDescription?: string
  saving: boolean
  submitLabel: string
  onSubmit: (description: string) => Promise<boolean>
  onCancel: () => void
}

/**
 * Formulário de registro/edição de interação. Só a anotação é informada: a data
 * da interação é carimbada pelo banco no momento do lançamento.
 * Compartilhado pelo card do modal e pela seção da página do lead.
 *
 * O valor inicial só é lido na montagem: quem usa deve passar `key` para
 * remontar ao trocar qual interação está sendo editada.
 */
export function InteractionForm({
  initialDescription = '',
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: InteractionFormProps) {
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Descreva a interação antes de registrar.')
      return
    }

    setError('')
    const ok = await onSubmit(description)
    if (ok) setDescription('')
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Anotação <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Liguei para o cliente, ele pediu para retornar na próxima semana..."
          rows={3}
          disabled={saving}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-60"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </div>
  )
}
