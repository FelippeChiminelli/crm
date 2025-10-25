import { useState, useEffect } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import type { LeadCardVisibleField, LeadCustomField } from '../../types'
import { getCustomFieldsByPipeline } from '../../services/leadCustomFieldService'

interface CardFieldOption {
  value: LeadCardVisibleField
  label: string
  description: string
  alwaysVisible?: boolean
}

const FIELD_OPTIONS: CardFieldOption[] = [
  {
    value: 'company',
    label: 'Empresa',
    description: 'Nome da empresa do lead'
  },
  {
    value: 'value',
    label: 'Valor',
    description: 'Valor estimado do negócio'
  },
  {
    value: 'phone',
    label: 'Telefone',
    description: 'Número de telefone do lead'
  },
  {
    value: 'email',
    label: 'E-mail',
    description: 'Endereço de e-mail do lead'
  },
  {
    value: 'status',
    label: 'Status',
    description: 'Status do lead (quente, morno, frio)'
  },
  {
    value: 'origin',
    label: 'Origem',
    description: 'De onde o lead veio'
  },
  {
    value: 'created_at',
    label: 'Data de Criação',
    description: 'Quando o lead foi cadastrado'
  },
  {
    value: 'tags',
    label: 'Tags',
    description: 'Etiquetas do lead'
  },
  {
    value: 'notes',
    label: 'Observações',
    description: 'Notas e observações sobre o lead'
  },
  {
    value: 'last_contact_at',
    label: 'Último Contato',
    description: 'Data do último contato com o lead'
  }
]

interface CardFieldSelectorProps {
  selectedFields: LeadCardVisibleField[]
  onChange: (fields: LeadCardVisibleField[]) => void
  pipelineId?: string
}

export function CardFieldSelector({ selectedFields, onChange, pipelineId }: CardFieldSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [loadingCustomFields, setLoadingCustomFields] = useState(false)

  // Carregar campos personalizados do pipeline
  useEffect(() => {
    const loadCustomFields = async () => {
      if (!pipelineId) return
      
      setLoadingCustomFields(true)
      try {
        const { data: fields } = await getCustomFieldsByPipeline(pipelineId)
        setCustomFields(fields || [])
      } catch (error) {
        console.error('Erro ao carregar campos personalizados:', error)
        setCustomFields([])
      } finally {
        setLoadingCustomFields(false)
      }
    }

    loadCustomFields()
  }, [pipelineId])

  const toggleField = (field: LeadCardVisibleField) => {
    if (selectedFields.includes(field)) {
      onChange(selectedFields.filter(f => f !== field))
    } else {
      onChange([...selectedFields, field])
    }
  }

  const selectAll = () => {
    const allStandardFields = FIELD_OPTIONS.map(opt => opt.value)
    const allCustomFieldIds = customFields.map(cf => `custom_field_${cf.id}` as LeadCardVisibleField)
    onChange([...allStandardFields, ...allCustomFieldIds])
  }

  const clearAll = () => {
    onChange([])
  }

  // Total de campos disponíveis
  const totalFields = FIELD_OPTIONS.length + customFields.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Campos Visíveis no Card
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Escolha quais informações aparecem nos cards do kanban
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {isExpanded ? 'Recolher' : 'Expandir'}
        </button>
      </div>

      {/* Resumo quando recolhido */}
      {!isExpanded && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {selectedFields.length} campo{selectedFields.length !== 1 ? 's' : ''} selecionado{selectedFields.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Editar
            </button>
          </div>
          {selectedFields.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedFields.slice(0, 5).map(field => {
                const option = FIELD_OPTIONS.find(opt => opt.value === field)
                return option ? (
                  <span
                    key={field}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-700"
                  >
                    {option.label}
                  </span>
                ) : null
              })}
              {selectedFields.length > 5 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                  +{selectedFields.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lista completa quando expandido */}
      {isExpanded && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Ações rápidas */}
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              {selectedFields.length} de {totalFields} selecionados
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Selecionar Todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-gray-600 hover:text-gray-700 font-medium"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Lista de campos */}
          <div className="max-h-64 overflow-y-auto">
            {/* Campos padrão */}
            {FIELD_OPTIONS.map((option) => {
              const isSelected = selectedFields.includes(option.value)
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleField(option.value)}
                  className={`
                    w-full px-4 py-3 text-left transition-colors
                    hover:bg-gray-50 border-b border-gray-100
                    ${isSelected ? 'bg-primary-50' : 'bg-white'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox visual */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center
                          ${isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'bg-white border-gray-300'
                          }
                        `}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Info do campo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <EyeIcon className="w-4 h-4 text-primary-600" />
                        ) : (
                          <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Separador para campos personalizados */}
            {customFields.length > 0 && (
              <div className="bg-gray-100 px-4 py-2 border-y border-gray-200">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Campos Personalizados
                </span>
              </div>
            )}

            {/* Campos personalizados */}
            {customFields.map((customField) => {
              const fieldId = `custom_field_${customField.id}` as LeadCardVisibleField
              const isSelected = selectedFields.includes(fieldId)
              
              // Descrição baseada no tipo de campo
              const getFieldTypeLabel = (type: string) => {
                switch (type) {
                  case 'text': return 'Texto'
                  case 'number': return 'Número'
                  case 'date': return 'Data'
                  case 'select': return 'Seleção única'
                  case 'multiselect': return 'Múltipla escolha'
                  case 'link': return 'Link (clicável)'
                  default: return type
                }
              }
              
              return (
                <button
                  key={fieldId}
                  type="button"
                  onClick={() => toggleField(fieldId)}
                  className={`
                    w-full px-4 py-3 text-left transition-colors
                    hover:bg-gray-50 border-b border-gray-100 last:border-b-0
                    ${isSelected ? 'bg-primary-50' : 'bg-white'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox visual */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center
                          ${isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'bg-white border-gray-300'
                          }
                        `}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Info do campo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <EyeIcon className="w-4 h-4 text-primary-600" />
                        ) : (
                          <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                          {customField.name}
                        </span>
                        {customField.required && (
                          <span className="text-xs text-red-500">*</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Campo personalizado • {getFieldTypeLabel(customField.type)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Loading state para campos personalizados */}
            {loadingCustomFields && (
              <div className="px-4 py-3 text-center border-b border-gray-100">
                <span className="text-xs text-gray-500">Carregando campos personalizados...</span>
              </div>
            )}
          </div>

          {/* Nota informativa */}
          <div className="bg-blue-50 border-t border-blue-100 px-4 py-3">
            <div className="flex gap-2">
              <div className="flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-blue-800">
                  <strong>Dica:</strong> O nome do lead sempre será exibido. 
                  Campos vazios não ocuparão espaço no card.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

