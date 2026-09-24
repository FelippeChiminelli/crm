import { useState, useEffect, useCallback } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { useToastContext } from '../../contexts/ToastContext'
import {
  getContractTemplates,
  activateContractTemplate,
  deactivateContractTemplate,
} from '../../services/contracts/contractTemplateService'
import { getCustomFieldsByEmpresa } from '../../services/leadCustomFieldService'
import { ContractTemplateList } from './contracts/ContractTemplateList'
import { ContractTemplateEditor } from './contracts/ContractTemplateEditor'
import type { ContractTemplate, LeadCustomField } from '../../types'

/**
 * Configuração dos modelos de contrato. A emissão acontece pela ação
 * `generate_contract` nas automações (evento "venda marcada") ou pelo botão
 * manual no lead vendido.
 */
export function ContractsTab() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ContractTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const { showSuccess, showError } = useToastContext()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [templatesResult, fieldsResult] = await Promise.all([
        getContractTemplates(),
        getCustomFieldsByEmpresa(),
      ])

      if (templatesResult.error) throw templatesResult.error
      if (fieldsResult.error) throw fieldsResult.error

      setTemplates((templatesResult.data || []) as ContractTemplate[])
      setCustomFields((fieldsResult.data || []) as LeadCustomField[])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar modelos de contrato')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggleActive = async (template: ContractTemplate) => {
    try {
      const { error: toggleError } = template.is_active
        ? await deactivateContractTemplate(template.id)
        : await activateContractTemplate(template.id)

      if (toggleError) throw toggleError

      showSuccess(template.is_active ? 'Modelo anulado' : 'Modelo reativado')
      await loadData()
    } catch (err: any) {
      showError('Erro ao alterar o modelo', err.message)
    }
  }

  const handleSaved = async () => {
    setEditing(null)
    setCreating(false)
    await loadData()
  }

  const closeEditor = () => {
    setEditing(null)
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Carregando modelos de contrato...</p>
        </div>
      </div>
    )
  }

  if (creating || editing) {
    return (
      <ContractTemplateEditor
        template={editing}
        customFields={customFields}
        onSaved={handleSaved}
        onCancel={closeEditor}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Contratos</h3>
          <p className="text-sm text-gray-600 mt-1">
            Modelos usados na emissão automática após a venda e no botão manual do lead
          </p>
        </div>
        <button onClick={() => setCreating(true)} className={ds.button('primary')}>
          <PlusIcon className="w-5 h-5" />
          Novo Modelo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <ContractTemplateList
        templates={templates}
        onEdit={setEditing}
        onToggleActive={handleToggleActive}
      />
    </div>
  )
}
