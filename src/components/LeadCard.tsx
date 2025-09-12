import type { Lead } from '../types'
import { UserIcon, PhoneIcon, EnvelopeIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'

interface LeadCardProps {
  lead: Lead
  onEdit?: (lead: Lead) => void
  onDelete?: (leadId: string) => void
  onView?: (lead: Lead) => void
  isDragging?: boolean
}

export function LeadCard({ lead, onEdit, onDelete, onView }: LeadCardProps) {
  const [showActions, setShowActions] = useState(false)

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
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all cursor-move relative group w-full"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Cabeçalho com ações */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0" {...listeners}>
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{lead.name}</div>
            {lead.company && (
              <div className="text-xs sm:text-sm text-gray-500 truncate">{lead.company}</div>
            )}
          </div>
        </div>
        
        {/* Ações */}
        {showActions && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {onView && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onView(lead)
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                title="Ver detalhes"
              >
                <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(lead)
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
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
                className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700"
                title="Excluir"
              >
                <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Valor */}
      {lead.value && (
        <div className="mb-2">
          <span className="text-sm font-semibold text-orange-600">
            {formatCurrency(lead.value)}
          </span>
        </div>
      )}

      {/* Informações de contato */}
      <div className="space-y-1 mb-3">
        {lead.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <PhoneIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <EnvelopeIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
      </div>

      {/* Status, Origem e Data */}
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {lead.status && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(lead.status)}`}>
              {lead.status}
            </span>
          )}
          {lead.origin && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 truncate">
              {getOriginLabel(lead.origin)}
            </span>
          )}
        </div>
        {lead.created_at && (
          <span className="text-gray-400 truncate">
            {formatDate(lead.created_at)}
          </span>
        )}
      </div>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {lead.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs truncate max-w-20"
            >
              {tag}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs flex-shrink-0">
              +{lead.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Observações (se houver) */}
      {lead.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 line-clamp-2">
            {lead.notes}
          </div>
        </div>
      )}

      {/* Indicador de última interação */}
      {lead.last_contact_at && (
        <div className="mt-2 text-xs text-gray-400 truncate">
          Último contato: {formatDate(lead.last_contact_at)}
        </div>
      )}
    </div>
  )
} 