import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  TagIcon,
  DocumentTextIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { PhoneInput } from '../../ui/PhoneInput'
import { StyledSelect } from '../../ui/StyledSelect'
import type { Lead } from '../../../types'

interface LeadBasicInfoSectionProps {
  lead: Lead
  isEditing: boolean
  editedFields: Partial<Lead>
  onFieldChange: (field: string, value: any) => void
  users: any[]
}

// Helper para formatar telefone para exibição
function formatPhoneDisplay(phone: string | undefined): string {
  if (!phone) return '-'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
  }
  if (cleaned.length === 12) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`
  }
  return phone
}

// Campo individual para visualização
function InfoField({ icon: Icon, label, value, href }: {
  icon: React.ElementType
  label: string
  value: string | number | undefined | null
  href?: string
}) {
  const displayValue = value !== undefined && value !== null && value !== '' ? String(value) : '-'

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline break-all">
            {displayValue}
          </a>
        ) : (
          <p className="text-sm text-gray-900 break-all">{displayValue}</p>
        )}
      </div>
    </div>
  )
}

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'quente', label: 'Quente' },
  { value: 'morno', label: 'Morno' },
  { value: 'frio', label: 'Frio' },
]

export function LeadBasicInfoSection({
  lead,
  isEditing,
  editedFields,
  onFieldChange,
  users,
}: LeadBasicInfoSectionProps) {
  const responsibleName = users.find(u => u.uuid === lead.responsible_uuid)?.full_name

  const valueFormatted = lead.value
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)
    : undefined

  const whatsappLink = lead.phone
    ? `https://wa.me/${lead.phone.replace(/\D/g, '')}`
    : undefined

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-500" />
          Informações Básicas
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input
              type="text"
              value={editedFields.name || ''}
              onChange={(e) => onFieldChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
            <input
              type="text"
              value={editedFields.company || ''}
              onChange={(e) => onFieldChange('company', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={editedFields.email || ''}
              onChange={(e) => onFieldChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
            <PhoneInput
              value={editedFields.phone || ''}
              onChange={(val) => onFieldChange('phone', val)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Valor</label>
            <input
              type="number"
              value={editedFields.value || ''}
              onChange={(e) => onFieldChange('value', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <StyledSelect
              value={editedFields.status || 'novo'}
              onChange={(val) => onFieldChange('status', val)}
              options={STATUS_OPTIONS}
              size="sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Origem</label>
            <input
              type="text"
              value={editedFields.origin || ''}
              onChange={(e) => onFieldChange('origin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
            <StyledSelect
              value={editedFields.responsible_uuid || ''}
              onChange={(val) => onFieldChange('responsible_uuid', val)}
              options={[
                { value: '', label: 'Sem responsável' },
                ...users.map((u: any) => ({ value: u.uuid, label: u.full_name })),
              ]}
              size="sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
          <textarea
            value={editedFields.notes || ''}
            onChange={(e) => onFieldChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <UserIcon className="w-4 h-4 text-gray-500" />
        Informações Básicas
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <InfoField icon={UserIcon} label="Nome" value={lead.name} />
        <InfoField icon={BuildingOfficeIcon} label="Empresa" value={lead.company} />
        <InfoField icon={EnvelopeIcon} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
        <InfoField icon={PhoneIcon} label="Telefone" value={formatPhoneDisplay(lead.phone)} href={whatsappLink} />
        <InfoField icon={CurrencyDollarIcon} label="Valor" value={valueFormatted} />
        <InfoField icon={TagIcon} label="Status" value={lead.status} />
        <InfoField icon={GlobeAltIcon} label="Origem" value={lead.origin} />
        <InfoField icon={UserIcon} label="Responsável" value={responsibleName} />
      </div>

      {lead.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Observações</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          </div>
        </div>
      )}

      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-start gap-3">
            <TagIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {lead.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
