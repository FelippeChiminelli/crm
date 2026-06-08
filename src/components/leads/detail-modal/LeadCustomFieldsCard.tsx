import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import type { LeadCustomField, LeadCustomValue } from '../../../types'
import { StyledSelect } from '../../ui/StyledSelect'
import { VehicleSelector } from '../forms/VehicleSelector'
import { ProductSelector } from '../forms/ProductSelector'
import { ProductFieldDisplay } from '../forms/ProductFieldDisplay'
import { VehicleFieldDisplay } from './VehicleFieldDisplay'
import { SectionCard } from './SectionCard'
import { fieldLabel, fieldInput, fieldInputError } from './fieldStyles'

interface LeadCustomFieldsCardProps {
  customFields: LeadCustomField[]
  customValues: { [fieldId: string]: LeadCustomValue }
  customFieldInputs: { [fieldId: string]: any }
  customFieldErrors: { [fieldId: string]: string }
  isEditing: boolean
  updateCustomField: (fieldId: string, value: any) => void
  empresaId?: string
}

function CustomFieldView({ field, value, empresaId }: {
  field: LeadCustomField
  value: string | undefined
  empresaId?: string
}) {
  if (!value) return <span className="text-gray-500">Não informado</span>

  if (field.type === 'date') {
    try {
      const date = new Date(value)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return <span>{`${day}/${month}/${year}`}</span>
    } catch {
      return <span>{value}</span>
    }
  }

  if (field.type === 'multiselect') {
    return <span>{value.split(',').join(', ')}</span>
  }

  if (field.type === 'link') {
    const url = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`
    let displayText = value
    try {
      displayText = new URL(url).hostname.replace('www.', '')
    } catch {
      displayText = value
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <span>{displayText}</span>
      </a>
    )
  }

  if (field.type === 'vehicle') {
    return <VehicleFieldDisplay vehicleIds={value} empresaId={empresaId || ''} />
  }

  if (field.type === 'product') {
    return <ProductFieldDisplay productIds={value} empresaId={empresaId || ''} />
  }

  return <span>{value}</span>
}

export function LeadCustomFieldsCard(props: LeadCustomFieldsCardProps) {
  const { customFields, customValues, customFieldInputs, customFieldErrors, isEditing, updateCustomField, empresaId } = props

  if (customFields.length === 0) return null

  const inputClass = (fieldId: string) => `${fieldInput} ${customFieldErrors[fieldId] ? fieldInputError : ''}`

  return (
    <SectionCard title="Personalizados" theme="purple" icon={ClipboardDocumentListIcon} active={isEditing}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {customFields.map((field) => (
          <div key={field.id}>
            <label className={fieldLabel}>
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {isEditing ? (
              <div>
                {field.type === 'text' && (
                  <input type="text" value={customFieldInputs[field.id] || ''} onChange={(e) => updateCustomField(field.id, e.target.value)} className={inputClass(field.id)} required={field.required} />
                )}
                {field.type === 'number' && (
                  <input type="number" value={customFieldInputs[field.id] || ''} onChange={(e) => updateCustomField(field.id, e.target.value)} className={inputClass(field.id)} required={field.required} />
                )}
                {field.type === 'date' && (
                  <input type="date" value={customFieldInputs[field.id] || ''} onChange={(e) => updateCustomField(field.id, e.target.value)} className={inputClass(field.id)} required={field.required} />
                )}
                {field.type === 'select' && (
                  <StyledSelect
                    value={customFieldInputs[field.id] || ''}
                    onChange={(value) => updateCustomField(field.id, value)}
                    options={[{ value: '', label: 'Selecionar...' }, ...(field.options?.map((option) => ({ value: option, label: option })) || [])]}
                    placeholder="Selecionar..."
                    size="sm"
                  />
                )}
                {field.type === 'multiselect' && (
                  <div className={`border rounded-lg p-2 bg-white ${customFieldErrors[field.id] ? 'border-red-300' : 'border-gray-300'}`}>
                    <div className="flex flex-wrap gap-2">
                      {field.options?.map((option) => {
                        const isSelected = (customFieldInputs[field.id] || []).includes(option)
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              const current = customFieldInputs[field.id] || []
                              const newValue = isSelected ? current.filter((v: string) => v !== option) : [...current, option]
                              updateCustomField(field.id, newValue)
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>
                    {(customFieldInputs[field.id]?.length || 0) > 0 && (
                      <p className="text-xs text-gray-500 mt-2">{customFieldInputs[field.id]?.length} selecionado(s)</p>
                    )}
                  </div>
                )}
                {field.type === 'link' && (
                  <input type="url" value={customFieldInputs[field.id] || ''} onChange={(e) => updateCustomField(field.id, e.target.value)} className={inputClass(field.id)} placeholder="https://exemplo.com" required={field.required} />
                )}
                {field.type === 'vehicle' && empresaId && (
                  <VehicleSelector value={customFieldInputs[field.id] || ''} onChange={(value) => updateCustomField(field.id, value)} empresaId={empresaId} error={!!customFieldErrors[field.id]} />
                )}
                {field.type === 'product' && empresaId && (
                  <ProductSelector value={customFieldInputs[field.id] || ''} onChange={(value) => updateCustomField(field.id, value)} empresaId={empresaId} error={!!customFieldErrors[field.id]} />
                )}
                {customFieldErrors[field.id] && <p className="text-red-600 text-xs mt-1">{customFieldErrors[field.id]}</p>}
              </div>
            ) : (
              <div className="text-sm text-gray-900">
                <CustomFieldView field={field} value={customValues[field.id]?.value} empresaId={empresaId} />
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
