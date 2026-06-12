import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  FireIcon,
  DocumentTextIcon,
  TagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { FaWhatsapp } from 'react-icons/fa'
import type { Lead } from '../../../types'
import { StyledSelect } from '../../ui/StyledSelect'
import { PhoneInput } from '../../ui/PhoneInput'
import { WhatsAppPhoneLink } from '../../chat/WhatsAppPhoneLink'
import { formatBrazilianPhone } from '../../../utils/validations'
import { SectionCard } from './SectionCard'
import { fieldLabel, fieldInput } from './fieldStyles'
import type { EditableFields } from '../../../hooks/useLeadDetailModal'

interface LeadBasicInfoCardProps {
  lead: Lead
  isEditing: boolean
  editedFields: EditableFields
  updateField: (field: keyof EditableFields, value: string | number) => void
  users: Array<{ uuid: string; full_name: string }>
  loadingUsers: boolean
  allowedOrigins: string[]
  phoneError: string
  formatStatusDisplay: (status?: string) => string
  tagInput: string
  setTagInput: (v: string) => void
  handleAddTag: () => void
  handleRemoveTag: (tag: string) => void
  handleTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

function ViewField({ icon: Icon, label, children }: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <div className="text-sm text-gray-900 break-words">{children}</div>
      </div>
    </div>
  )
}

export function LeadBasicInfoCard(props: LeadBasicInfoCardProps) {
  const {
    lead, isEditing, editedFields, updateField, users, loadingUsers,
    allowedOrigins, phoneError, formatStatusDisplay,
    tagInput, setTagInput, handleAddTag, handleRemoveTag, handleTagKeyDown,
  } = props

  const responsibleName = lead.responsible_uuid
    ? users.find(u => u.uuid === lead.responsible_uuid)?.full_name || '-'
    : 'Nenhum'

  return (
    <SectionCard title="Informações" theme="orange" icon={UserIcon} active={isEditing}>
      {isEditing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>Nome</label>
              <input type="text" value={editedFields.name} onChange={(e) => updateField('name', e.target.value)} className={fieldInput} placeholder="Nome" />
            </div>
            <div>
              <label className={fieldLabel}>Empresa</label>
              <input type="text" value={editedFields.company} onChange={(e) => updateField('company', e.target.value)} className={fieldInput} placeholder="Empresa" />
            </div>
            <div>
              <label className={fieldLabel}>Email</label>
              <input type="email" value={editedFields.email} onChange={(e) => updateField('email', e.target.value)} className={fieldInput} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className={fieldLabel}>Telefone</label>
              <PhoneInput value={editedFields.phone} onChange={(value) => updateField('phone', value)} error={phoneError} />
            </div>
            <div>
              <label className={fieldLabel}>Valor</label>
              <input type="number" step="0.01" min="0" value={editedFields.value} onChange={(e) => updateField('value', parseFloat(e.target.value) || 0)} className={fieldInput} placeholder="0.00" />
            </div>
            <div>
              <label className={fieldLabel}>Status</label>
              <StyledSelect
                value={editedFields.status || ''}
                onChange={(value) => updateField('status', value)}
                options={[
                  { value: '', label: 'Sem info' },
                  { value: 'quente', label: 'Quente' },
                  { value: 'morno', label: 'Morno' },
                  { value: 'frio', label: 'Frio' },
                ]}
                placeholder="Status"
                size="sm"
              />
            </div>
            <div>
              <label className={fieldLabel}>Origem</label>
              {allowedOrigins.length > 0 ? (
                <StyledSelect
                  value={editedFields.origin || ''}
                  onChange={(value) => updateField('origin', value)}
                  options={[{ value: '', label: 'Selecione...' }, ...allowedOrigins.map((o) => ({ value: o, label: o }))]}
                  placeholder="Origem"
                  size="sm"
                />
              ) : (
                <input type="text" value={editedFields.origin || ''} onChange={(e) => updateField('origin', e.target.value)} className={fieldInput} placeholder="Origem" />
              )}
            </div>
            <div>
              <label className={fieldLabel}>Responsável</label>
              <StyledSelect
                value={editedFields.responsible_uuid || ''}
                onChange={(value) => updateField('responsible_uuid', value)}
                options={[{ value: '', label: 'Nenhum' }, ...users.map((u) => ({ value: u.uuid, label: u.full_name }))]}
                placeholder="Responsável"
                disabled={loadingUsers}
                size="sm"
              />
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Observações</label>
            <textarea value={editedFields.notes} onChange={(e) => updateField('notes', e.target.value)} className={`${fieldInput} min-h-[72px] resize-none`} placeholder="Observações..." rows={3} />
          </div>

          <div>
            <label className={fieldLabel}><TagIcon className="w-3.5 h-3.5 inline mr-1" />Tags</label>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} className={fieldInput} placeholder="Tag + Enter" />
              <button type="button" onClick={handleAddTag} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium whitespace-nowrap">+</button>
            </div>
            {editedFields.tags && editedFields.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {editedFields.tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-orange-900 transition-colors">
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <ViewField icon={UserIcon} label="Nome">{lead.name || '-'}</ViewField>
            <ViewField icon={BuildingOfficeIcon} label="Empresa">{lead.company || '-'}</ViewField>
            <ViewField icon={EnvelopeIcon} label="Email">{lead.email || '-'}</ViewField>
            <ViewField icon={PhoneIcon} label="Telefone">
              {lead.phone ? (
                <WhatsAppPhoneLink
                  phone={lead.phone}
                  leadId={lead.id}
                  className="inline-flex items-center gap-1.5 text-green-700 hover:text-green-800 transition-colors"
                >
                  <span className="truncate">{formatBrazilianPhone(lead.phone)}</span>
                  <FaWhatsapp className="w-4 h-4 flex-shrink-0 text-green-600" aria-hidden />
                </WhatsAppPhoneLink>
              ) : '-'}
            </ViewField>
            <ViewField icon={CurrencyDollarIcon} label="Valor">
              {lead.value ? `R$ ${lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
            </ViewField>
            <ViewField icon={FireIcon} label="Status">{formatStatusDisplay(lead.status)}</ViewField>
            <ViewField icon={GlobeAltIcon} label="Origem">{lead.origin || '-'}</ViewField>
            <ViewField icon={UserIcon} label="Responsável">{responsibleName}</ViewField>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100">
            <ViewField icon={DocumentTextIcon} label="Observações">
              <span className="whitespace-pre-wrap">{lead.notes || 'Nenhuma'}</span>
            </ViewField>
          </div>

          <div className="mt-1">
            <ViewField icon={TagIcon} label="Tags">
              {lead.tags && lead.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {lead.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{tag}</span>
                  ))}
                </div>
              ) : <span className="text-gray-500">Nenhuma tag</span>}
            </ViewField>
          </div>
        </div>
      )}
    </SectionCard>
  )
}
