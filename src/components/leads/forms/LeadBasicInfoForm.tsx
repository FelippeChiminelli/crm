import { useState } from 'react'
import { XMarkIcon, TagIcon } from '@heroicons/react/24/outline'
import type { CreateLeadData } from '../../../services/leadService'
import type { Pipeline, Stage } from '../../../types'
import { validateBrazilianPhone } from '../../../utils/validations'
import { StyledSelect } from '../../ui/StyledSelect'
import { PhoneInput } from '../../ui/PhoneInput'
import { ds } from '../../../utils/designSystem'
import { useTagsInput } from '../../../hooks/useTagsInput'

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
  
  // Hook para gerenciar tags
  const {
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    handleTagKeyPress
  } = useTagsInput()

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

  // Handlers de tags com callback para atualizar leadData
  const handleAddTag = () => {
    addTag(leadData.tags || [], (newTags) => {
      onLeadDataChange({ ...leadData, tags: newTags })
    })
  }

  const handleRemoveTag = (tagToRemove: string) => {
    removeTag(tagToRemove, leadData.tags || [], (newTags) => {
      onLeadDataChange({ ...leadData, tags: newTags })
    })
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleTagKeyPress(e, leadData.tags || [], (newTags) => {
      onLeadDataChange({ ...leadData, tags: newTags })
    })
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
          <PhoneInput
            value={leadData.phone || ''}
            onChange={(value) => handlePhoneChange(value)}
            error={phoneError}
          />
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

      {/* Tags - largura total */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <TagIcon className="w-4 h-4 inline mr-1" />
          Tags
        </label>
        <div className="space-y-2">
          {/* Input para adicionar tags */}
          <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyDown}
                className={ds.input()}
                placeholder="Digite uma tag e pressione Enter"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Adicionar
              </button>
          </div>
          
          {/* Lista de tags */}
          {leadData.tags && leadData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {leadData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-orange-900 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </span>
              ))}
            </div>
          )}
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
