import type { Lead, LeadCardVisibleField, LeadCustomField, LeadCustomValue } from '../types'
import { UserIcon, PhoneIcon, EnvelopeIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, useEffect } from 'react'
import { getCustomFieldsByPipeline } from '../services/leadCustomFieldService'
import { getCustomValuesByLead } from '../services/leadCustomValueService'

interface LeadCardProps {
  lead: Lead
  onEdit?: (lead: Lead) => void
  onDelete?: (leadId: string) => void
  onView?: (lead: Lead) => void
  isDragging?: boolean
  visibleFields?: LeadCardVisibleField[]
}

export function LeadCard({ 
  lead, 
  onEdit, 
  onDelete, 
  onView,
  visibleFields = ['company', 'value', 'phone', 'email', 'status', 'origin', 'created_at']
}: LeadCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [customValues, setCustomValues] = useState<{ [fieldId: string]: LeadCustomValue }>({})

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  // Carregar campos personalizados e seus valores
  useEffect(() => {
    const loadCustomFieldsData = async () => {
      if (!lead.pipeline_id) return

      try {
        // Buscar campos personalizados do pipeline
        const { data: fields } = await getCustomFieldsByPipeline(lead.pipeline_id)
        if (fields) {
          setCustomFields(fields)
        }

        // Buscar valores dos campos personalizados para este lead
        const { data: values } = await getCustomValuesByLead(lead.id)
        if (values) {
          const valueMap: { [fieldId: string]: LeadCustomValue } = {}
          values.forEach(v => {
            valueMap[v.field_id] = v
          })
          setCustomValues(valueMap)
        }
      } catch (error) {
        console.error('Erro ao carregar campos personalizados:', error)
      }
    }

    loadCustomFieldsData()
  }, [lead.id, lead.pipeline_id])

  // Helper para verificar se um campo deve ser mostrado
  const shouldShowField = (field: LeadCardVisibleField) => {
    return visibleFields.includes(field)
  }

  // Helper para formatar valor de campo personalizado
  const formatCustomFieldValue = (field: LeadCustomField, value: string) => {
    if (!value) return ''

    switch (field.type) {
      case 'date':
        return new Date(value).toLocaleDateString('pt-BR')
      case 'number':
        return parseFloat(value).toLocaleString('pt-BR')
      case 'multiselect':
        return value.split(',').join(', ')
      default:
        return value
    }
  }

  // Renderizar campo personalizado com estilo adequado
  const renderCustomFieldValue = (field: LeadCustomField, value: string) => {
    const formattedValue = formatCustomFieldValue(field, value)

    // Para select e multiselect, usar badges
    if (field.type === 'select' || field.type === 'multiselect') {
      const values = field.type === 'multiselect' 
        ? value.split(',').map(v => v.trim()).filter(Boolean)
        : [value]

      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {values.slice(0, 2).map((val, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 truncate max-w-full"
            >
              {val}
            </span>
          ))}
          {values.length > 2 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              +{values.length - 2}
            </span>
          )}
        </div>
      )
    }

    // Para número, destacar com cor
    if (field.type === 'number') {
      return (
        <span className="text-xs font-semibold text-blue-600" title={formattedValue}>
          {formattedValue}
        </span>
      )
    }

    // Para link, renderizar como link clicável
    if (field.type === 'link') {
      // Garantir que o link tenha protocolo
      const url = value.startsWith('http://') || value.startsWith('https://') 
        ? value 
        : `https://${value}`

      // Extrair domínio para exibição
      let displayText = value
      try {
        const urlObj = new URL(url)
        displayText = urlObj.hostname.replace('www.', '')
      } catch (e) {
        displayText = value
      }

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
          title={`Abrir: ${value}`}
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="truncate">{displayText}</span>
        </a>
      )
    }

    // Padrão
    return (
      <span className="text-xs text-gray-800 truncate" title={formattedValue}>
        {formattedValue}
      </span>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'quente': return 'bg-red-100 text-red-800'
      case 'morno': return 'bg-yellow-100 text-yellow-800'
      case 'frio': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOriginLabel = (origin?: string) => {
    switch (origin) {
      case 'website': return 'Website'
      case 'redes_sociais': return 'Redes Sociais'
      case 'indicacao': return 'Indicação'
      case 'telefone': return 'Telefone'
      case 'email': return 'Email'
      case 'evento': return 'Evento'
      case 'outros': return 'Outros'
      default: return origin || ''
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all cursor-move relative group w-full"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Cabeçalho com ações */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0" {...listeners}>
          <div className="flex-shrink-0 w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{lead.name}</div>
            {shouldShowField('company') && lead.company && (
              <div className="text-xs text-gray-500 truncate">{lead.company}</div>
            )}
          </div>
        </div>
        
        {/* Ações */}
        {showActions && (
          <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
            {onView && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onView(lead)
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                title="Ver detalhes"
              >
                <EyeIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(lead)
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                title="Editar"
              >
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(lead.id)
                }}
                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                title="Excluir"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Valor */}
      {shouldShowField('value') && lead.value && (
        <div className="mb-2">
          <span className="text-xs font-bold text-orange-600">
            {formatCurrency(lead.value)}
          </span>
        </div>
      )}

      {/* Informações de contato - Layout compacto */}
      {(shouldShowField('phone') || shouldShowField('email')) && (
        <div className="space-y-0.5 mb-2">
          {shouldShowField('phone') && lead.phone && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <PhoneIcon className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {shouldShowField('email') && lead.email && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <EnvelopeIcon className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Status, Origem e Data - Layout em linha compacto */}
      {(shouldShowField('status') || shouldShowField('origin') || shouldShowField('created_at')) && (
        <div className="flex items-center flex-wrap gap-1 text-xs mb-2">
          {shouldShowField('status') && lead.status && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${getStatusColor(lead.status)}`}>
              {lead.status}
            </span>
          )}
          {shouldShowField('origin') && lead.origin && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase truncate max-w-[100px]">
              {getOriginLabel(lead.origin)}
            </span>
          )}
          {shouldShowField('created_at') && lead.created_at && (
            <span className="text-[10px] text-gray-400 ml-auto">
              {formatDate(lead.created_at)}
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {shouldShowField('tags') && lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {lead.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium truncate max-w-20"
            >
              {tag}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
              +{lead.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Observações (se houver) */}
      {shouldShowField('notes') && lead.notes && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-[11px] text-gray-500 line-clamp-2 leading-tight">
            {lead.notes}
          </div>
        </div>
      )}

      {/* Indicador de última interação */}
      {shouldShowField('last_contact_at') && lead.last_contact_at && (
        <div className="mt-1.5 text-[10px] text-gray-400">
          Último: {formatDate(lead.last_contact_at)}
        </div>
      )}

      {/* Campos personalizados */}
      {customFields.length > 0 && customFields.some(cf => {
        const fieldId = `custom_field_${cf.id}` as LeadCardVisibleField
        return shouldShowField(fieldId) && customValues[cf.id]?.value
      }) && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {/* Grid responsivo para melhor distribuição */}
          <div className="grid grid-cols-2 gap-1.5">
            {customFields.map(customField => {
              const fieldId = `custom_field_${customField.id}` as LeadCardVisibleField
              const customValue = customValues[customField.id]

              // Só mostrar se estiver selecionado e tiver valor
              if (!shouldShowField(fieldId) || !customValue?.value) {
                return null
              }

              const formattedValue = formatCustomFieldValue(customField, customValue.value)
              const isLongValue = formattedValue.length > 20
              const isSelectType = customField.type === 'select' || customField.type === 'multiselect'

              return (
                <div 
                  key={customField.id} 
                  className={`
                    min-w-0
                    ${isLongValue && !isSelectType ? 'col-span-2' : 'col-span-1'}
                  `}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-400">
                      {customField.name}
                    </span>
                    <div className="flex items-center text-xs">
                      {renderCustomFieldValue(customField, customValue.value)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
} 