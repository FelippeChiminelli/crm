import { 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  CalendarIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import type { Lead } from '../../types'
import { cn } from '../../utils/designSystem'

interface LeadsListMobileProps {
  leads: Lead[]
  onDeleteLead?: (leadId: string) => Promise<void>
  onViewLead?: (lead: Lead) => void
}

/**
 * Versão mobile-friendly da lista de leads
 * Exibe leads em cards verticais ao invés de tabela
 */
export function LeadsListMobile({ 
  leads, 
  onDeleteLead, 
  onViewLead
}: LeadsListMobileProps) {
  const getOriginLabel = (origin?: string) => {
    switch (origin) {
      case 'website': return 'Website'
      case 'redes_sociais': return 'Redes Sociais'
      case 'indicacao': return 'Indicação'
      case 'telefone': return 'Telefone'
      case 'email': return 'Email'
      case 'evento': return 'Evento'
      case 'outros': return 'Outros'
      default: return origin || '-'
    }
  }
  
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'quente': return 'Quente'
      case 'morno': return 'Morno'
      case 'frio': return 'Frio'
      case 'venda_confirmada': return 'Venda Confirmada'
      case 'perdido': return 'Perdido'
      default: return status || '-'
    }
  }
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'quente': return 'bg-red-100 text-red-700'
      case 'morno': return 'bg-yellow-100 text-yellow-700'
      case 'frio': return 'bg-blue-100 text-blue-700'
      case 'venda_confirmada': return 'bg-green-100 text-green-700'
      case 'perdido': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-500'
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto text-gray-400 mb-4">
          <UserIcon className="w-full h-full" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhum lead encontrado
        </h3>
        <p className="text-gray-600 text-sm">
          Não há leads que correspondam aos filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-2">
      {leads.map((lead) => {
        const isLost = !!lead.loss_reason_category
        const isSold = !!lead.sold_at

        return (
          <div 
            key={lead.id} 
            className={cn(
              "bg-white rounded-xl shadow border p-4 transition-all duration-200",
              isLost 
                ? 'border-red-300 bg-red-50' 
                : isSold
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 hover:shadow-lg active:shadow-md'
            )}
          >
            {/* Header do Card */}
            <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                    <UserIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate mb-1">
                    {lead.name}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center truncate">
                    <EnvelopeIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    {lead.email || 'Sem email'}
                  </p>
                </div>
              </div>
              {lead.status && (
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2",
                  getStatusColor(lead.status)
                )}>
                  {getStatusLabel(lead.status)}
                </span>
              )}
            </div>

            {/* Grid de Informações */}
            <div className="space-y-2.5 mb-3">
              {/* Telefone */}
              <div className="flex items-center text-sm">
                <PhoneIcon className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{lead.phone || 'Sem telefone'}</span>
              </div>

              {/* Data */}
              <div className="flex items-center text-sm">
                <CalendarIcon className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{formatDate(lead.created_at)}</span>
              </div>

              {/* Pipeline e Etapa em linha única */}
              {(lead.pipeline || lead.stage) && (
                <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg p-2">
                  {lead.pipeline && typeof lead.pipeline === 'object' && (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-gray-500 font-medium flex-shrink-0">Pipeline:</span>
                      <span className="text-gray-900 font-semibold truncate">
                        {(lead.pipeline as any).name}
                      </span>
                    </div>
                  )}
                  {lead.stage && (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-gray-500 font-medium flex-shrink-0">Etapa:</span>
                      <span className="text-gray-900 font-semibold truncate">
                        {(lead.stage as any).name}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Origem */}
              {lead.origin && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-medium">Origem:</span>
                  <span className="text-gray-700 font-medium">
                    {getOriginLabel(lead.origin)}
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              {onViewLead && (
                <button
                  onClick={() => onViewLead(lead)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all duration-200 text-sm font-semibold min-h-[48px] shadow-sm"
                >
                  <EyeIcon className="w-5 h-5" />
                  Ver Detalhes
                </button>
              )}
              {onDeleteLead && (
                <button
                  onClick={() => onDeleteLead(lead.id)}
                  className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95 min-h-[48px] min-w-[48px] flex items-center justify-center border border-gray-200"
                  title="Excluir"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
