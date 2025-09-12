import { 
  UserIcon, 
  BuildingOfficeIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  CalendarIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import type { Lead } from '../../types'

interface LeadsListProps {
  leads: Lead[]
  onDeleteLead?: (leadId: string) => Promise<void>
  onViewLead?: (lead: Lead) => void
}

export function LeadsList({ leads, onDeleteLead, onViewLead }: LeadsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quente': return 'bg-red-100 text-red-800'
      case 'morno': return 'bg-yellow-100 text-yellow-800'
      case 'frio': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
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
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Lead</div>
            <div className="col-span-2">Empresa</div>
            <div className="col-span-2">Contato</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-1">Ações</div>
          </div>
        </div>

        {/* Lista de leads */}
        <div className="bg-white divide-y divide-gray-200">
          {leads.map((lead) => (
            <div key={lead.id} className="hover:bg-gray-50 transition-colors">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                {/* Nome e Email */}
                <div className="col-span-3">
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

                {/* Empresa */}
                <div className="col-span-2">
                  <div className="text-sm text-gray-900 flex items-center">
                    <BuildingOfficeIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {lead.company || '-'}
                  </div>
                </div>

                {/* Telefone */}
                <div className="col-span-2">
                  <div className="text-sm text-gray-900 flex items-center">
                    <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {lead.phone || '-'}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status || '')}`}>
                    {lead.status || '-'}
                  </span>
                </div>

                {/* Data de Criação */}
                <div className="col-span-2">
                  <div className="text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {formatDate(lead.created_at)}
                  </div>
                </div>

                {/* Ações */}
                <div className="col-span-1">
                  <div className="flex items-center space-x-2">
                    {onViewLead && (
                      <button
                        onClick={() => onViewLead(lead)}
                        className="text-gray-400 hover:text-orange-600 transition-colors"
                        title="Ver detalhes"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteLead && (
                      <button
                        onClick={() => onDeleteLead(lead.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
