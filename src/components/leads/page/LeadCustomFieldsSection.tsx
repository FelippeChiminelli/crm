import { Squares2X2Icon } from '@heroicons/react/24/outline'
import { StyledSelect } from '../../ui/StyledSelect'
import type { LeadCustomField, LeadCustomValue } from '../../../types'

interface LeadCustomFieldsSectionProps {
  customFields: LeadCustomField[]
  customValues: LeadCustomValue[]
  isEditing: boolean
  editedCustomValues: Record<string, string>
  onCustomValueChange: (fieldId: string, value: string) => void
}

function getDisplayValue(field: LeadCustomField, value: string | undefined): string {
  if (!value) return '-'

  switch (field.type) {
    case 'date': {
      try {
        return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR')
      } catch {
        return value
      }
    }
    case 'number': {
      return Number(value).toLocaleString('pt-BR')
    }
    case 'multiselect': {
      try {
        const arr = JSON.parse(value)
        return Array.isArray(arr) ? arr.join(', ') : value
      } catch {
        return value
      }
    }
    case 'link': {
      return value
    }
    default:
      return value
  }
}

export function LeadCustomFieldsSection({
  customFields,
  customValues,
  isEditing,
  editedCustomValues,
  onCustomValueChange,
}: LeadCustomFieldsSectionProps) {
  if (customFields.length === 0) return null

  const getValueForField = (fieldId: string): string => {
    if (isEditing) {
      return editedCustomValues[fieldId] || ''
    }
    return customValues.find(cv => cv.field_id === fieldId)?.value || ''
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Squares2X2Icon className="w-4 h-4 text-gray-500" />
        Campos Personalizados
      </h3>

      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {customFields.map(field => {
            const value = getValueForField(field.id)

            return (
              <div key={field.id}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {field.name} {field.required && <span className="text-red-500">*</span>}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onCustomValueChange(field.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => onCustomValueChange(field.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}

                {field.type === 'date' && (
                  <input
                    type="date"
                    value={value}
                    onChange={(e) => onCustomValueChange(field.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}

                {field.type === 'link' && (
                  <input
                    type="url"
                    value={value}
                    onChange={(e) => onCustomValueChange(field.id, e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}

                {field.type === 'select' && (
                  <StyledSelect
                    value={value}
                    onChange={(val) => onCustomValueChange(field.id, val)}
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...(field.options || []).map(opt => ({ value: opt, label: opt })),
                    ]}
                    size="sm"
                  />
                )}

                {field.type === 'multiselect' && (
                  <div className="space-y-1">
                    {(field.options || []).map(opt => {
                      let selected: string[] = []
                      try { selected = JSON.parse(value) || [] } catch { /* ignore */ }

                      const isChecked = selected.includes(opt)
                      return (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const newArr = isChecked ? selected.filter(s => s !== opt) : [...selected, opt]
                              onCustomValueChange(field.id, JSON.stringify(newArr))
                            }}
                            className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {customFields.map(field => {
            const rawValue = getValueForField(field.id)
            const displayValue = getDisplayValue(field, rawValue)
            const isLink = field.type === 'link' && rawValue

            return (
              <div key={field.id} className="py-2">
                <p className="text-xs text-gray-500">{field.name}</p>
                {isLink ? (
                  <a
                    href={rawValue}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:underline break-all"
                  >
                    {displayValue}
                  </a>
                ) : (
                  <p className="text-sm text-gray-900">{displayValue}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
