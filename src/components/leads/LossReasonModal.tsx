import { useState, useEffect } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { LOSS_REASONS } from '../../utils/constants'
import { StyledSelect } from '../ui/StyledSelect'
import { ds } from '../../utils/designSystem'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { getLossReasons } from '../../services/lossReasonService'
import type { LossReason } from '../../types'

interface LossReasonModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (category: string, notes: string) => void
  leadName: string
  pipelineId?: string | null
  isLoading?: boolean
}

export function LossReasonModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  leadName,
  pipelineId,
  isLoading = false 
}: LossReasonModalProps) {
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [lossReasons, setLossReasons] = useState<LossReason[]>([])
  const [loadingReasons, setLoadingReasons] = useState(false)

  // Buscar motivos do banco quando modal abrir
  useEffect(() => {
    if (isOpen) {
      loadLossReasons()
    }
  }, [isOpen, pipelineId])

  const loadLossReasons = async () => {
    setLoadingReasons(true)
    try {
      const { data, error } = await getLossReasons(pipelineId || null)
      if (error) throw error
      setLossReasons(data || [])
    } catch (error) {
      console.error('Erro ao carregar motivos de perda:', error)
      // Em caso de erro, usar motivos fixos como fallback
      setLossReasons([])
    } finally {
      setLoadingReasons(false)
    }
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory('')
      setNotes('')
      setError('')
    }
  }, [isOpen])

  // Preparar opções: motivos do banco + fallback para motivos fixos
  const getOptions = () => {
    const options: Array<{ value: string; label: string }> = [
      { value: '', label: 'Selecione o motivo...' }
    ]

    // Se há motivos no banco, usar eles
    if (lossReasons.length > 0) {
      options.push(...lossReasons.map(reason => ({
        value: reason.id,
        label: reason.name
      })))
    } else {
      // Fallback: usar motivos fixos (compatibilidade)
      options.push(...LOSS_REASONS.map(reason => ({
        value: reason.value,
        label: reason.label
      })))
    }

    return options
  }

  const handleConfirm = () => {
    setError('')

    // Validar categoria
    if (!category) {
      setError('Por favor, selecione o motivo da perda')
      return
    }

    // Se categoria for "outro" (valor antigo), notas são obrigatórias
    // Para novos motivos (UUIDs), não validamos isso pois não há mais "outro" específico
    if (category === 'outro' && !notes.trim()) {
      setError('Para "Outro motivo", é obrigatório informar os detalhes')
      return
    }

    onConfirm(category, notes)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && category) {
      e.preventDefault()
      handleConfirm()
    }
  }
  
  useEscapeKey(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-[90%] sm:w-[500px] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Marcar Lead como Perdido
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {leadName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Mensagem de aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Atenção:</strong> Informar o motivo da perda é fundamental para 
              análise e melhoria contínua do seu processo de vendas.
            </p>
          </div>

          {/* Campo de categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Por que este lead foi perdido? <span className="text-red-500">*</span>
            </label>
            <StyledSelect
              value={category}
              onChange={(value) => {
                setCategory(value)
                setError('')
              }}
              options={getOptions()}
              placeholder={loadingReasons ? "Carregando motivos..." : "Escolha uma categoria"}
              disabled={isLoading || loadingReasons}
            />
          </div>

          {/* Campo de notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detalhes adicionais
              {category === 'outro' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setError('')
              }}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              placeholder={
                category === 'outro' 
                  ? 'Descreva o motivo da perda (obrigatório para "Outro motivo")...'
                  : 'Adicione informações complementares sobre a perda (opcional)...'
              }
              rows={4}
              className={`${ds.input()} resize-none`}
            />
            <p className="mt-1 text-xs text-gray-500">
              {category === 'outro' 
                ? 'Este campo é obrigatório quando a categoria é "Outro motivo"'
                : 'Este campo é opcional, mas pode fornecer insights valiosos'
              }
            </p>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !category}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Salvando...
              </>
            ) : (
              'Confirmar Perda'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

