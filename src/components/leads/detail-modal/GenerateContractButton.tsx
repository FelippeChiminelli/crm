import { useEffect, useState } from 'react'
import { DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useToastContext } from '../../../contexts/ToastContext'
import { getContractTemplates } from '../../../services/contracts/contractTemplateService'
import { generateContract } from '../../../services/contracts/contractService'
import type { ContractTemplate } from '../../../types'

interface GenerateContractButtonProps {
  leadId: string
  /** Só emitimos contrato de lead com venda marcada. */
  soldAt?: string
  onGenerated: () => void
}

/**
 * Emissão manual de contrato para um lead vendido. Complementa a ação
 * `generate_contract` das automações, para quem prefere disparar na mão.
 */
export function GenerateContractButton({
  leadId,
  soldAt,
  onGenerated,
}: GenerateContractButtonProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [generating, setGenerating] = useState(false)
  const { showSuccess, showError, showWarning } = useToastContext()

  useEffect(() => {
    if (!soldAt) return

    let active = true
    getContractTemplates({ onlyActive: true })
      .then(({ data }) => {
        if (!active) return
        const list = (data as ContractTemplate[]) || []
        setTemplates(list)
        if (list.length === 1) setSelectedId(list[0].id)
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [soldAt])

  if (!soldAt || templates.length === 0) return null

  const handleGenerate = async () => {
    if (!selectedId) {
      showWarning('Selecione o modelo de contrato')
      return
    }

    setGenerating(true)
    try {
      const result = await generateContract({ leadId, templateId: selectedId })

      if (result.unknownTokens.length > 0) {
        showWarning(
          'Contrato gerado com variáveis não reconhecidas',
          result.unknownTokens.join(', ')
        )
      } else {
        showSuccess('Contrato gerado e anexado ao lead')
      }

      onGenerated()
    } catch (error: any) {
      showError('Erro ao gerar contrato', error.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {templates.length > 1 && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white max-w-[140px]"
        >
          <option value="">Modelo...</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={handleGenerate}
        disabled={generating}
        title="Gerar contrato em PDF e anexar ao lead"
        className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {generating ? (
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
        ) : (
          <DocumentTextIcon className="w-4 h-4" />
        )}
        <span>{generating ? 'Gerando...' : 'Gerar contrato'}</span>
      </button>
    </div>
  )
}
