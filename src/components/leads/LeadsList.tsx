import { 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  CalendarIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import type { Lead, Pipeline, Stage } from '../../types'
import { InlinePipelineSelect } from './InlinePipelineSelect'
import { InlineStageSelect } from './InlineStageSelect'

interface LeadsListProps {
  leads: Lead[]
  pipelines?: Pipeline[]
  stages?: Stage[]
  onDeleteLead?: (leadId: string) => Promise<void>
  onViewLead?: (lead: Lead) => void
  onPipelineChange?: (leadId: string, pipelineId: string) => Promise<void>
  onStageChange?: (leadId: string, stageId: string) => Promise<void>
}

export function LeadsList({ 
  leads, 
  pipelines = [], 
  stages = [], 
  onDeleteLead, 
  onViewLead,
  onPipelineChange,
  onStageChange
}: LeadsListProps) {
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
    return new Date(dateString).toLocaleDateString('pt-BR')
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
        <p className="text-gray-600">
          Não há leads que correspondam aos filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <div className="min-w-full">
        {/* Cabeçalho da tabela */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider justify-items-start">
            <div className="col-span-1 text-left">Lead</div>
            <div className="col-span-1 text-left">Status</div>
            <div className="col-span-1 text-left">Contato</div>
            <div className="col-span-1 text-left">Pipeline</div>
            <div className="col-span-1 text-left">Etapa</div>
            <div className="col-span-1 text-left">Origem</div>
            <div className="col-span-1 text-left">Data</div>
            <div className="col-span-1 text-left">Ações</div>
          </div>
        </div>

        {/* Lista de leads */}
        <div className="bg-white divide-y divide-gray-200">
          {leads.map((lead) => {
            const isLost = !!lead.loss_reason_category
            const isSold = !!lead.sold_at
            
            return (
              <div 
                key={lead.id} 
                className={`
                  transition-colors
                  ${isLost 
                    ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-300' 
                    : isSold
                    ? 'bg-green-50 hover:bg-green-100 border-l-4 border-green-300'
                    : 'hover:bg-gray-50'
                  }
                `}
              >
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-4 items-center justify-items-start">
                {/* Nome e Email */}
                <div className="col-span-1">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <EnvelopeIcon className="w-4 h-4 mr-1" />
                        {lead.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                    {getStatusLabel(lead.status)}
                  </span>
                </div>

                {/* Telefone */}
                <div className="col-span-1">
                  <div className="text-sm text-gray-900 flex items-center">
                    <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {lead.phone || '-'}
                  </div>
                </div>

                {/* Pipeline */}
                <div className="col-span-1">
                  {onPipelineChange ? (
                    <InlinePipelineSelect
                      currentPipelineId={lead.pipeline_id}
                      pipelines={pipelines}
                      onPipelineChange={(pipelineId) => onPipelineChange(lead.id, pipelineId)}
                    />
                  ) : (
                    <div className="text-sm text-gray-900 truncate">
                      {lead.pipeline && typeof lead.pipeline === 'object' ? (lead.pipeline as any).name : '-'}
                    </div>
                  )}
                </div>

                {/* Etapa */}
                <div className="col-span-1">
                  {onStageChange ? (
                    <InlineStageSelect
                      currentStageId={lead.stage_id}
                      stages={stages}
                      pipelineId={lead.pipeline_id}
                      onStageChange={(stageId) => onStageChange(lead.id, stageId)}
                    />
                  ) : (
                    <div className="text-sm text-gray-900 truncate">
                      {(lead.stage as any)?.name || '-'}
                    </div>
                  )}
                </div>

                {/* Origem */}
                <div className="col-span-1">
                  <div className="text-sm text-gray-900 truncate">
                    {getOriginLabel(lead.origin)}
                  </div>
                </div>

                {/* Data de Criação */}
                <div className="col-span-1">
                  <div className="text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {formatDate(lead.created_at)}
                  </div>
                </div>

                {/* Ações */}
                <div className="col-span-1">
                  <div className="flex items-center space-x-2 whitespace-nowrap">
                    {onViewLead && (
                      <button
                        onClick={() => onViewLead(lead)}
                        className="text-gray-400 hover:text-orange-600 transition-colors p-1.5"
                        title="Ver detalhes"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteLead && (
                      <button
                        onClick={() => onDeleteLead(lead.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1.5"
                        title="Excluir"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
