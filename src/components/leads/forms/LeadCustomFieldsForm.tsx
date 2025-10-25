import { useState, useEffect } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { getCustomFieldsByPipeline, createCustomField } from '../../../services/leadCustomFieldService'
import { createCustomValue } from '../../../services/leadCustomValueService'
import { usePermissions } from '../../../hooks/usePermissions'
import { useToastContext } from '../../../contexts/ToastContext'
import { StyledSelect } from '../../ui/StyledSelect'
import { ds } from '../../../utils/designSystem'

interface LeadCustomFieldsFormProps {
  pipelineId: string | null
  customFieldValues: { [fieldId: string]: any }
  onCustomFieldValuesChange: (values: { [fieldId: string]: any }) => void
  onFieldCreated?: () => void
}

interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'select' | 'date' | 'multiselect' | 'link'
  required: boolean
  options?: string[]
}

export function LeadCustomFieldsForm({
  pipelineId,
  customFieldValues,
  onCustomFieldValuesChange,
  onFieldCreated
}: LeadCustomFieldsFormProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customFieldErrors, setCustomFieldErrors] = useState<{ [fieldId: string]: string }>({})
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false)
  const [newField, setNewField] = useState({
    name: '',
    type: 'text' as 'text' | 'number' | 'select' | 'date' | 'multiselect' | 'link',
    required: false,
    options: ''
  })
  const [creatingField, setCreatingField] = useState(false)
  
  const { hasPermission } = usePermissions()
  const { showError } = useToastContext()

  // Carregar campos personalizados sempre (independente do pipeline)
  useEffect(() => {
    loadCustomFields()
  }, [pipelineId])

  const loadCustomFields = async () => {
    try {
      // Se há pipeline específico, carregar campos do pipeline + campos globais
      // Se não há pipeline, carregar apenas campos globais (pipeline_id = null)
      const { data: fields, error } = await getCustomFieldsByPipeline(pipelineId || 'null')
      if (error) throw error
      
      setCustomFields(fields || [])
    } catch (error) {
      console.error('Erro ao carregar campos personalizados:', error)
    }
  }

  // Criar novo campo personalizado
  const handleCreateCustomField = async () => {
    if (!newField.name.trim()) {
      showError('Nome do campo é obrigatório')
      return
    }

    setCreatingField(true)
    try {
      const fieldData = {
        pipeline_id: pipelineId || null, // null para campos globais
        name: newField.name.trim(),
        type: newField.type,
        required: newField.required,
        options: (newField.type === 'select' || newField.type === 'multiselect')
          ? newField.options.split(',').map(opt => opt.trim()).filter(opt => opt)
          : undefined,
        position: 0
      }

      await createCustomField(fieldData)
      
      // Resetar form
      setNewField({
        name: '',
        type: 'text' as 'text' | 'number' | 'select' | 'date' | 'multiselect' | 'link',
        required: false,
        options: ''
      })
      
      setShowCustomFieldModal(false)
      await loadCustomFields()
      onFieldCreated?.()
    } catch (error: any) {
      showError(error.message || 'Erro ao criar campo personalizado')
    } finally {
      setCreatingField(false)
    }
  }

  // Validar campo personalizado
  const validateCustomField = (field: CustomField, value: any): string => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.name} é obrigatório`
    }

    if (field.type === 'number' && value && isNaN(Number(value))) {
      return `${field.name} deve ser um número`
    }

    if (field.type === 'date' && value) {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        return `${field.name} deve ser uma data válida`
      }
    }

    if (field.type === 'link' && value) {
      // Validação básica de URL
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
      if (!urlPattern.test(value.trim())) {
        return `${field.name} deve ser uma URL válida`
      }
    }

    return ''
  }

  // Atualizar valor do campo personalizado
  const handleCustomFieldChange = (fieldId: string, value: any) => {
    const field = customFields.find(f => f.id === fieldId)
    if (!field) return

    // Validar
    const error = validateCustomField(field, value)
    setCustomFieldErrors(prev => ({
      ...prev,
      [fieldId]: error
    }))

    // Atualizar valor
    onCustomFieldValuesChange({
      ...customFieldValues,
      [fieldId]: value
    })
  }

  // Renderizar campo baseado no tipo
  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.id] || ''
    const error = customFieldErrors[field.id]

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className={`${ds.input()} ${error ? 'border-red-500' : ''}`}
            placeholder={`Digite ${field.name.toLowerCase()}`}
            required={field.required}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className={`${ds.input()} ${error ? 'border-red-500' : ''}`}
            placeholder={`Digite ${field.name.toLowerCase()}`}
            required={field.required}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className={`${ds.input()} ${error ? 'border-red-500' : ''}`}
            required={field.required}
          />
        )

      case 'link':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className={`${ds.input()} ${error ? 'border-red-500' : ''}`}
            placeholder="https://exemplo.com"
            required={field.required}
          />
        )

      case 'multiselect':
        return (
          <StyledSelect
            value={value}
            onChange={(newValue) => handleCustomFieldChange(field.id, newValue)}
            options={field.options?.map(opt => ({ value: opt, label: opt })) || []}
            placeholder={`Selecione ${field.name.toLowerCase()}`}
          />
        )

      case 'select':
        return (
          <StyledSelect
            value={value}
            onChange={(newValue) => handleCustomFieldChange(field.id, newValue)}
            options={field.options?.map(opt => ({ value: opt, label: opt })) || []}
            placeholder={`Selecione ${field.name.toLowerCase()}`}
          />
        )

      default:
        return null
    }
  }

  // Sempre mostrar a seção de campos personalizados

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Campos Personalizados</h3>
          {!pipelineId && (
            <p className="text-sm text-gray-500">Campos globais (todos os pipelines)</p>
          )}
        </div>
        
        {hasPermission('custom_fields.create') && (
          <button
            type="button"
            onClick={() => setShowCustomFieldModal(true)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Adicionar Campo
          </button>
        )}
      </div>

      {/* Campos personalizados existentes - Grid de duas colunas */}
      {customFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customFields.map(field => (
            <div key={field.id}>
              <label className={"block text-sm font-medium text-gray-700 mb-1"}>
                {field.name}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderCustomField(field)}
              {customFieldErrors[field.id] && (
                <p className="mt-1 text-sm text-red-600">{customFieldErrors[field.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {customFields.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          {pipelineId 
            ? 'Nenhum campo personalizado configurado para este pipeline.' 
            : 'Nenhum campo personalizado global configurado.'}
        </p>
      )}

      {/* Modal para criar novo campo */}
      {showCustomFieldModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Criar Campo Personalizado
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className={"block text-sm font-medium text-gray-700 mb-1"}>Nome do Campo</label>
                    <input
                      type="text"
                      value={newField.name}
                      onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                      className={ds.input()}
                      placeholder="Digite o nome do campo"
                    />
                  </div>
                  
                  <div>
                    <label className={"block text-sm font-medium text-gray-700 mb-1"}>Tipo do Campo</label>
                    <StyledSelect
                      value={newField.type}
                      onChange={(value) => setNewField({ ...newField, type: value as any })}
                      options={[
                        { value: 'text', label: 'Texto' },
                        { value: 'number', label: 'Número' },
                        { value: 'date', label: 'Data' },
                        { value: 'link', label: 'Link (URL clicável)' },
                        { value: 'select', label: 'Lista de Opções' },
                        { value: 'multiselect', label: 'Múltipla Seleção' }
                      ]}
                    />
                  </div>
                  
                  {(newField.type === 'select' || newField.type === 'multiselect') && (
                    <div>
                      <label className={"block text-sm font-medium text-gray-700 mb-1"}>Opções (separadas por vírgula)</label>
                      <input
                        type="text"
                        value={newField.options}
                        onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                        className={ds.input()}
                        placeholder="Ex: Opção 1, Opção 2, Opção 3"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="required"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                      Campo obrigatório
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleCreateCustomField}
                  disabled={creatingField || !newField.name.trim()}
                  className={`${ds.button()} col-start-2`}
                >
                  {creatingField ? 'Criando...' : 'Criar Campo'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomFieldModal(false)}
                  className={`${ds.button('secondary')} col-start-1`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Função para salvar valores dos campos personalizados
const saveCustomFieldValuesExternal = async (leadId: string, customFieldValues: { [fieldId: string]: any }) => {
  const promises = Object.entries(customFieldValues)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([fieldId, value]) => 
      createCustomValue({
        lead_id: leadId,
        field_id: fieldId,
        value: String(value)
      })
    )

  await Promise.all(promises)
}

// Exportar função para salvar valores (para uso no componente pai)
(LeadCustomFieldsForm as any).saveValues = saveCustomFieldValuesExternal