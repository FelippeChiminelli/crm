import { LeadCard } from '../LeadCard'
import type { Lead } from '../../types'
import { UserGroupIcon } from '@heroicons/react/24/outline'

interface LeadsGridProps {
  leads: Lead[]
  onEditLead: (lead: Lead) => void
  onDeleteLead?: (leadId: string) => Promise<void>
  onViewLead?: (lead: Lead) => void
}

export function LeadsGrid({ leads, onEditLead, onDeleteLead, onViewLead }: LeadsGridProps) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-8">
        <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6 w-full min-w-max min-h-full">
      {leads.map(lead => (
        <LeadCard
          key={lead.id}
          lead={lead}
          onEdit={() => onEditLead(lead)}
          onDelete={onDeleteLead ? () => onDeleteLead(lead.id) : undefined}
          onView={onViewLead ? () => onViewLead(lead) : undefined}
        />
      ))}
    </div>
  )
} 