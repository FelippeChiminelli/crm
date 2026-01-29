import type { Lead, LeadCardVisibleField, LeadCustomField, LeadCustomValue } from '../types'
import { UserIcon, PhoneIcon, EnvelopeIcon, TrashIcon, EyeIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, memo, useMemo } from 'react'
import { LOSS_REASON_MAP } from '../utils/constants'
import { getWhatsAppUrl } from '../utils/validations'
import { FiPackage } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

interface LeadCardProps {
  lead: Lead
  onEdit?: (lead: Lead) => void
  onDelete?: (leadId: string) => void
  onView?: (lead: Lead) => void
  isDragging?: boolean
  visibleFields?: LeadCardVisibleField[]
  customFields?: LeadCustomField[]  // Receber do parent para evitar múltiplas requisições
  customValuesByLead?: { [fieldId: string]: LeadCustomValue }  // Receber valores já carregados em batch
  onMoveStage?: (leadId: string, direction: 'prev' | 'next') => Promise<void>
  hasPrevStage?: boolean
  hasNextStage?: boolean
}

const LeadCardComponent = ({ 
  lead, 
  onDelete, 
  onView,
  visibleFields = ['company', 'value', 'phone', 'email', 'status', 'origin', 'created_at'],
  customFields = [],
  customValuesByLead = {},
  onMoveStage,
  hasPrevStage = false,
  hasNextStage = false
}: LeadCardProps) => {
  const [isMoving, setIsMoving] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id })

  // Criar listeners customizados que excluem botões (otimizado para performance)
  const customListeners = useMemo(() => {
    return {
      ...listeners,
      onPointerDown: (e: React.PointerEvent) => {
        // Verificar se o clique foi em um botão ou elemento interativo
        const target = e.target as HTMLElement
        
        // Verificação rápida usando classes e tags
        if (
          target.tagName === 'BUTTON' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'A' ||
          target.closest('button') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('textarea') ||
          target.closest('a')
        ) {
          return // Não iniciar drag se clicar em elemento interativo
        }
        
        // Chamar o listener original se não for um botão
        if (listeners?.onPointerDown) {
          listeners.onPointerDown(e)
        }
      }
    }
  }, [listeners])

  const style = {
    transform: CSS.Transform.toString(transform),
    // Remover transição durante o drag para melhor performance
    transition: isSortableDragging ? 'none' : transition,
    opacity: isSortableDragging ? 0.5 : 1,
    // Otimizar performance do drag
    willChange: isSortableDragging ? 'transform' : 'auto',
  }

  // Helper para verificar se um campo deve ser mostrado
  const shouldShowField = (field: LeadCardVisibleField) => {
    return visibleFields.includes(field)
  }

  // Helper para formatar valor de campo personalizado
  const formatCustomFieldValue = (field: LeadCustomField, value: string) => {
    if (!value) return ''

    switch (field.type) {
      case 'date':
        try {
          const date = new Date(value)
          // Usar getFullYear, getMonth, getDate para evitar problemas de timezone
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${day}/${month}/${year}`
        } catch {
          return value
        }
      case 'number':
        return parseFloat(value).toLocaleString('pt-BR')
      case 'multiselect':
        return value.split(',').join(', ')
      case 'vehicle':
        // Para veículos, retornar contagem
        const vehicleIds = value.split(',').filter(id => id.trim())
        return vehicleIds.length === 1 ? '1 veículo' : `${vehicleIds.length} veículos`
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
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-700 truncate max-w-full"
            >
              {val}
            </span>
          ))}
          {values.length > 2 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600">
              +{values.length - 2}
            </span>
          )}
        </div>
      )
    }

    // Para número, destacar com cor
    if (field.type === 'number') {
      return (
        <span className="text-[10px] font-semibold text-blue-600" title={formattedValue}>
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
          className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
          title={`Abrir: ${value}`}
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="truncate">{displayText}</span>
        </a>
      )
    }

    // Para vehicle, exibir com ícone de carro/pacote
    if (field.type === 'vehicle') {
      const vehicleIds = value.split(',').filter(id => id.trim())
      const count = vehicleIds.length
      
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600" title={`${count} veículo(s) vinculado(s)`}>
          <FiPackage className="w-3 h-3 flex-shrink-0" />
          <span>{count === 1 ? '1 veículo' : `${count} veículos`}</span>
        </span>
      )
    }

    // Padrão
    return (
      <span className="text-[10px] text-gray-800 truncate" title={formattedValue}>
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

  // Verificar se o lead foi perdido ou vendido
  const isLost = !!lead.loss_reason_category
  const isSold = !!lead.sold_at

  // Handler para movimentação entre stages
  const handleMoveStage = async (direction: 'prev' | 'next') => {
    if (!onMoveStage || isMoving) return
    
    setIsMoving(true)
    try {
      await onMoveStage(lead.id, direction)
    } catch (error) {
      console.error('Erro ao mover lead:', error)
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...customListeners}
      className={`
        rounded-lg shadow-sm border p-3 hover:shadow-md relative group w-full
        ${isSortableDragging ? 'cursor-grabbing transition-none' : 'cursor-grab transition-all'}
        ${isLost 
          ? 'bg-red-50 border-red-200 opacity-75' 
          : isSold
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200'
        }
      `}
    >
      {/* Cabeçalho com ações */}
      <div className="flex items-start justify-between mb-2 gap-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 lg:w-7 lg:h-7 bg-orange-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <div className="font-semibold text-gray-900 text-xs lg:text-xs truncate">{lead.name}</div>
              {isLost && (
                <span 
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-700 flex-shrink-0"
                  title={`Motivo: ${lead.loss_reason_category ? LOSS_REASON_MAP[lead.loss_reason_category as keyof typeof LOSS_REASON_MAP] : 'Não informado'}`}
                >
                  Perdido
                </span>
              )}
              {isSold && (
                <span 
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 flex-shrink-0"
                  title={`Valor: ${lead.sold_value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.sold_value) : 'Não informado'}`}
                >
                  Vendido
                </span>
              )}
            </div>
            {shouldShowField('company') && lead.company && (
              <div className="text-[10px] text-gray-500 truncate mt-0.5">{lead.company}</div>
            )}
          </div>
        </div>
        
        {/* Ações - sempre visíveis em mobile, hover em desktop */}
        <div className="flex items-center gap-0.5 flex-shrink-0 transition-opacity opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onView(lead)
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              className="p-1.5 lg:p-1.5 rounded hover:bg-gray-100 active:bg-gray-200 text-gray-400 hover:text-gray-600 relative z-10 min-w-[36px] min-h-[36px] lg:min-w-[32px] lg:min-h-[32px] flex items-center justify-center"
              title="Ver detalhes"
              aria-label="Ver detalhes"
            >
              <EyeIcon className="w-5 h-5 lg:w-4 lg:h-4" />
            </button>
          )}
          {onDelete && (
            <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onDelete(lead.id)
                }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                }}
                className="p-1.5 lg:p-1.5 rounded hover:bg-red-50 active:bg-red-100 text-gray-400 hover:text-red-600 relative z-10 min-w-[36px] min-h-[36px] lg:min-w-[32px] lg:min-h-[32px] flex items-center justify-center"
                title="Excluir"
                aria-label="Excluir"
              >
                <TrashIcon className="w-5 h-5 lg:w-4 lg:h-4" />
              </button>
            )}
        </div>
      </div>

      {/* Valor */}
      {shouldShowField('value') && lead.value && (
        <div className="mb-2">
          <span className="text-[10px] font-bold text-orange-600">
            {formatCurrency(lead.value)}
          </span>
        </div>
      )}

      {/* Navegação entre stages - Apenas Mobile */}
      {onMoveStage && (hasPrevStage || hasNextStage) && (
        <div className="lg:hidden mb-2 flex items-center gap-1.5 py-1.5 border-t border-b border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleMoveStage('prev')
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!hasPrevStage || isMoving}
            className={`flex-1 flex items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-medium transition-all touch-manipulation ${
              hasPrevStage && !isMoving
                ? 'bg-orange-100 text-orange-700 active:bg-orange-200 active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={hasPrevStage ? 'Voltar etapa' : 'Primeira etapa'}
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleMoveStage('next')
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!hasNextStage || isMoving}
            className={`flex-1 flex items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-medium transition-all touch-manipulation ${
              hasNextStage && !isMoving
                ? 'bg-orange-100 text-orange-700 active:bg-orange-200 active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={hasNextStage ? 'Avançar etapa' : 'Última etapa'}
          >
            <span>Próxima</span>
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Informações de contato - Layout compacto */}
      {(shouldShowField('phone') || shouldShowField('email')) && (
        <div className="space-y-0.5 mb-2">
          {shouldShowField('phone') && lead.phone && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <PhoneIcon className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <a
                href={getWhatsAppUrl(lead.phone)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 min-w-0 truncate text-green-600 hover:text-green-700 hover:underline"
                title="Abrir conversa no WhatsApp"
              >
                <span className="truncate">{lead.phone}</span>
                <FaWhatsapp className="w-3 h-3 flex-shrink-0 text-green-600" aria-hidden />
              </a>
            </div>
          )}
          {shouldShowField('email') && lead.email && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <EnvelopeIcon className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Status, Origem e Data - Layout em linha compacto */}
      {(shouldShowField('status') || shouldShowField('origin') || shouldShowField('created_at')) && (
        <div className="flex items-center flex-wrap gap-1 text-[10px] mb-2">
          {shouldShowField('status') && lead.status && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${getStatusColor(lead.status)}`}>
              {lead.status}
            </span>
          )}
          {shouldShowField('origin') && lead.origin && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 uppercase truncate max-w-[100px]">
              {getOriginLabel(lead.origin)}
            </span>
          )}
          {shouldShowField('created_at') && lead.created_at && (
            <span className="text-[9px] text-gray-400 ml-auto">
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
              className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-medium truncate max-w-20"
            >
              {tag}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-medium">
              +{lead.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Observações (se houver) */}
      {shouldShowField('notes') && lead.notes && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
            {lead.notes}
          </div>
        </div>
      )}

      {/* Indicador de última interação */}
      {shouldShowField('last_contact_at') && lead.last_contact_at && (
        <div className="mt-1.5 text-[9px] text-gray-400">
          Último: {formatDate(lead.last_contact_at)}
        </div>
      )}

      {/* Campos personalizados */}
      {customFields.length > 0 && customFields.some(cf => {
        const fieldId = `custom_field_${cf.id}` as LeadCardVisibleField
        return shouldShowField(fieldId) && customValuesByLead[cf.id]?.value
      }) && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {/* Grid responsivo para melhor distribuição */}
          <div className="grid grid-cols-2 gap-1.5">
            {customFields.map(customField => {
              const fieldId = `custom_field_${customField.id}` as LeadCardVisibleField
              const customValue = customValuesByLead[customField.id]

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
                    <span className="text-[8px] uppercase tracking-wider font-semibold text-gray-400">
                      {customField.name}
                    </span>
                    <div className="flex items-center text-[10px]">
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

// Exportar com memo para evitar re-renders desnecessários
export const LeadCard = memo(LeadCardComponent) 