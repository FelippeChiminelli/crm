import { useState, useEffect, useMemo } from 'react'
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import type { StageChangeFormField } from '../../../types'

// Metadados dos campos predefinidos
const FIELD_CONFIG: Record<StageChangeFormField, {
  label: string
  placeholder: string
  type: 'textarea' | 'text' | 'date'
}> = {
  observations: {
    label: 'Observações',
    placeholder: 'Descreva as observações sobre esta mudança de estágio...',
    type: 'textarea',
  },
  change_reason: {
    label: 'Motivo da Mudança',
    placeholder: 'Qual o motivo para mover este lead para a próxima etapa?',
    type: 'textarea',
  },
  next_action: {
    label: 'Próxima Ação',
    placeholder: 'Qual será a próxima ação a ser tomada?',
    type: 'text',
  },
  expected_date: {
    label: 'Data Prevista',
    placeholder: '',
    type: 'date',
  },
}

interface StageChangeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (formattedNotes: string) => void
  fromStageName: string
  toStageName: string
  leadName: string
  fields: StageChangeFormField[]
  isLoading?: boolean
}

export function StageChangeModal({
  isOpen,
  onClose,
  onConfirm,
  fromStageName,
  toStageName,
  leadName,
  fields,
  isLoading = false,
}: StageChangeModalProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {}
      fields.forEach((field) => {
        initial[field] = ''
      })
      setFormValues(initial)
    }
  }, [isOpen, fields])

  useEscapeKey(isOpen, onClose)

  // Verificar se todos os campos estão preenchidos
  const isFormValid = useMemo(() => {
    return fields.every((field) => {
      const value = formValues[field]?.trim()
      return value && value.length > 0
    })
  }, [formValues, fields])

  const updateField = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleConfirm = () => {
    if (!isFormValid) return

    // Formatar notas para salvar no histórico
    const parts: string[] = []

    fields.forEach((field) => {
      const config = FIELD_CONFIG[field]
      const value = formValues[field]?.trim()
      if (value) {
        if (field === 'expected_date') {
          const date = new Date(value + 'T00:00:00')
          const formatted = date.toLocaleDateString('pt-BR')
          parts.push(`${config.label}: ${formatted}`)
        } else {
          parts.push(`${config.label}: ${value}`)
        }
      }
    })

    const formattedNotes = parts.join('\n')
    onConfirm(formattedNotes)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Mudança de Estágio
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Info da transição */}
          <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-1">
              <span className="font-medium">Lead:</span> {leadName}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-600">{fromStageName}</span>
              <ArrowRightIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="font-medium text-blue-700">{toStageName}</span>
            </div>
          </div>

          {/* Campos dinâmicos */}
          <div className="space-y-4">
            {fields.map((field) => {
              const config = FIELD_CONFIG[field]
              if (!config) return null

              return (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {config.label} <span className="text-red-500">*</span>
                  </label>

                  {config.type === 'textarea' ? (
                    <textarea
                      value={formValues[field] || ''}
                      onChange={(e) => updateField(field, e.target.value)}
                      placeholder={config.placeholder}
                      rows={3}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                      autoFocus={fields[0] === field}
                    />
                  ) : config.type === 'date' ? (
                    <input
                      type="date"
                      value={formValues[field] || ''}
                      onChange={(e) => updateField(field, e.target.value)}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      autoFocus={fields[0] === field}
                    />
                  ) : (
                    <input
                      type="text"
                      value={formValues[field] || ''}
                      onChange={(e) => updateField(field, e.target.value)}
                      placeholder={config.placeholder}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      autoFocus={fields[0] === field}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Aviso */}
          <p className="text-xs text-gray-500 mt-4">
            Todos os campos são obrigatórios. As informações serão registradas no histórico do lead.
          </p>

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isFormValid || isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Movendo...' : 'Confirmar Mudança'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
