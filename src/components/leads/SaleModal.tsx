import { useState, useEffect } from 'react'
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface SaleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (soldValue: number, saleNotes: string) => Promise<void>
  leadName: string
  estimatedValue?: number
  isLoading?: boolean
}

export function SaleModal({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  estimatedValue,
  isLoading = false
}: SaleModalProps) {
  const [soldValue, setSoldValue] = useState<string>('')
  const [saleNotes, setSaleNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Preencher com valor estimado ao abrir
  useEffect(() => {
    if (isOpen && estimatedValue) {
      setSoldValue(estimatedValue.toString())
    }
  }, [isOpen, estimatedValue])

  // Resetar ao fechar
  useEffect(() => {
    if (!isOpen) {
      setSoldValue('')
      setSaleNotes('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    // Validações
    if (!soldValue || soldValue.trim() === '') {
      setError('O valor da venda é obrigatório')
      return
    }

    const valueNumber = parseFloat(soldValue)
    if (isNaN(valueNumber) || valueNumber < 0) {
      setError('Digite um valor válido maior ou igual a zero')
      return
    }

    setError(null)

    try {
      await onConfirm(valueNumber, saleNotes.trim())
    } catch (err) {
      console.error('Erro ao confirmar venda:', err)
      setError(err instanceof Error ? err.message : 'Erro ao confirmar venda')
    }
  }
  
  useEscapeKey(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Marcar como Venda Concluída
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Lead Info */}
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Lead:</span> {leadName}
            </p>
            {estimatedValue && estimatedValue > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Valor estimado:</span>{' '}
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(estimatedValue)}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Valor da Venda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Final da Venda <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  R$
                </span>
                <input
                  type="number"
                  value={soldValue}
                  onChange={(e) => setSoldValue(e.target.value)}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  disabled={isLoading}
                  className={`${ds.input()} pl-10`}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Valor pelo qual a venda foi fechada
              </p>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações sobre a venda
              </label>
              <textarea
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder="Ex: Pagamento à vista com desconto de 10%, entrega em 30 dias..."
                rows={4}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Forma de pagamento, condições especiais, prazo de entrega, etc
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Confirmar Venda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

