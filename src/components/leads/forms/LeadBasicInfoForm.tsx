import { useState } from 'react'
import type { CreateLeadData } from '../../../services/leadService'
import type { Pipeline, Stage } from '../../../types'
import { validateBrazilianPhone } from '../../../utils/validations'
import { StyledSelect } from '../../ui/StyledSelect'
import { ds } from '../../../utils/designSystem'

interface LeadBasicInfoFormProps {
  leadData: CreateLeadData
  onLeadDataChange: (data: CreateLeadData) => void
  pipelines: Pipeline[]
  availableStages: Stage[]
  loadingStages: boolean
  onPipelineChange: (pipelineId: string) => void
}

export function LeadBasicInfoForm({
  leadData,
  onLeadDataChange,
  pipelines,
  availableStages,
  loadingStages,
  onPipelineChange
}: LeadBasicInfoFormProps) {
  const [phoneError, setPhoneError] = useState('')

  const validatePhone = (phone: string): boolean => {
    if (!phone) {
      setPhoneError('')
      return true // Phone é opcional
    }

    const result = validateBrazilianPhone(phone)
    if (!result.isValid) {
      setPhoneError(result.errors[0])
      return false
    }

    setPhoneError('')
    return true
  }

  const handlePhoneChange = (value: string) => {
    validatePhone(value)
    onLeadDataChange({ ...leadData, phone: value })
  }

  const handleInputChange = (field: keyof CreateLeadData, value: any) => {
    onLeadDataChange({ ...leadData, [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* Grid de duas colunas para a maioria dos campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pipeline Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pipeline <span className="text-red-500">*</span>
          </label>
          <StyledSelect
            value={leadData.pipeline_id}
            onChange={(value) => {
              handleInputChange('pipeline_id', value)
              onPipelineChange(value)
            }}
            options={pipelines.map(p => ({ value: p.id, label: p.name }))}
            placeholder="Selecione um pipeline"
          />
        </div>

        {/* Stage Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Etapa <span className="text-red-500">*</span>
          </label>
          <StyledSelect
            value={leadData.stage_id}
            onChange={(value) => handleInputChange('stage_id', value)}
            options={(availableStages || []).map(s => ({ value: s.id, label: s.name }))}
            placeholder={loadingStages ? "Carregando etapas..." : "Selecione uma etapa"}
            disabled={!leadData.pipeline_id || loadingStages}
          />
        </div>

        {/* Lead Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Lead <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={leadData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={ds.input()}
            placeholder="Digite o nome do lead"
            required
          />
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          <input
            type="text"
            value={leadData.company || ''}
            onChange={(e) => handleInputChange('company', e.target.value)}
            className={ds.input()}
            placeholder="Digite o nome da empresa"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={leadData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={ds.input()}
            placeholder="Digite o email"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input
            type="tel"
            value={leadData.phone || ''}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={`${ds.input()} ${phoneError ? 'border-red-500' : ''}`}
            placeholder="Ex: 5511999999999"
          />
          {phoneError && (
            <p className="mt-1 text-sm text-red-600">{phoneError}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Formato: Código do país + DDD + número (Ex: 5511999999999)
          </p>
        </div>

        {/* Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
          <input
            type="number"
            value={leadData.value || ''}
            onChange={(e) => handleInputChange('value', e.target.value ? Number(e.target.value) : undefined)}
            className={ds.input()}
            placeholder="0,00"
            min="0"
            step="0.01"
          />
        </div>

        {/* Origin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
          <input
            type="text"
            value={leadData.origin || ''}
            onChange={(e) => handleInputChange('origin', e.target.value)}
            className={ds.input()}
            placeholder="Ex: Website, Facebook, Indicação..."
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <StyledSelect
            value={leadData.status || ''}
            onChange={(value) => handleInputChange('status', value || undefined)}
            options={[
              { value: '', label: 'Sem informação' },
              { value: 'quente', label: 'Quente' },
              { value: 'morno', label: 'Morno' },
              { value: 'frio', label: 'Frio' }
            ]}
            placeholder="Selecione o status"
          />
        </div>
      </div>

      {/* Observações - largura total */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea
          value={leadData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          className={ds.input()}
          placeholder="Digite observações sobre o lead"
          rows={3}
        />
      </div>
    </div>
  )
}
