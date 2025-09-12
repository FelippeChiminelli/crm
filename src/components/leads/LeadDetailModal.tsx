import { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  PencilIcon, 
  UserIcon,
  ChatBubbleLeftEllipsisIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  RectangleStackIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import type { Lead, Pipeline, Stage } from '../../types'
import { updateLead } from '../../services/leadService'
import { getPipelines } from '../../services/pipelineService'
import { getStagesByPipeline } from '../../services/stageService'
import { useTasksLogic } from '../../hooks/useTasksLogic'
import { StyledSelect } from '../ui/StyledSelect'
import { NewTaskModal } from '../tasks/NewTaskModal'
import { statusColors } from '../../utils/designSystem'
import { getCustomFieldsByPipeline } from '../../services/leadCustomFieldService'
import { getCustomValuesByLead, createCustomValue, updateCustomValue } from '../../services/leadCustomValueService'
import { findOrCreateConversationByPhone } from '../../services/chatService'
import type { LeadCustomField, LeadCustomValue } from '../../types'
import { useToastContext } from '../../contexts/ToastContext'

interface LeadDetailModalProps {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  onLeadUpdate?: (updatedLead: Lead) => void
}

interface EditableFields {
  name: string
  company: string
  email: string
  phone: string
  value: number
  status: string
  origin: string
  notes: string
  pipeline_id: string
  stage_id: string
}

export function LeadDetailModal({ lead, isOpen, onClose, onLeadUpdate }: LeadDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<EditableFields>({
    name: '',
    company: '',
    email: '',
    phone: '',
    value: 0,
    status: '',
    origin: '',
    notes: '',
    pipeline_id: '',
    stage_id: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para pipelines e stages
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [availableStages, setAvailableStages] = useState<Stage[]>([])
  const [currentLeadStages, setCurrentLeadStages] = useState<Stage[]>([])
  const [loadingStages, setLoadingStages] = useState(false)

  // Campos personalizados
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [customValues, setCustomValues] = useState<{ [fieldId: string]: LeadCustomValue }>({})
  const [customFieldInputs, setCustomFieldInputs] = useState<{ [fieldId: string]: any }>({})
  const [customFieldErrors, setCustomFieldErrors] = useState<{ [fieldId: string]: string }>({})
  const [phoneError, setPhoneError] = useState<string>('')

  // Função para validar telefone brasileiro
  const validatePhone = (phone: string): boolean => {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Verifica se tem exatamente 13 dígitos
    if (cleanPhone.length !== 13) {
      setPhoneError('Telefone deve ter exatamente 13 dígitos (55 + DDD + número)')
      return false
    }
    
    // Verifica se começa com 55 (código do Brasil)
    if (!cleanPhone.startsWith('55')) {
      setPhoneError('Telefone deve começar com 55 (código do Brasil)')
      return false
    }
    
    // Verifica se o DDD é válido (11-99)
    const ddd = cleanPhone.substring(2, 4)
    const dddNum = parseInt(ddd)
    if (dddNum < 11 || dddNum > 99) {
      setPhoneError('DDD deve estar entre 11 e 99')
      return false
    }
    
    // Verifica se o número tem 8 ou 9 dígitos
    const number = cleanPhone.substring(4)
    if (number.length < 8 || number.length > 9) {
      setPhoneError('Número deve ter 8 ou 9 dígitos')
      return false
    }
    
    setPhoneError('')
    return true
  }

  // States para modal de nova tarefa
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [startingChat, setStartingChat] = useState(false)
  
  // Hook para gerenciar tarefas
  const { tasks, loadLeadTasks } = useTasksLogic()
  const { showError } = useToastContext()

  // Carregar pipelines quando o modal abrir
  useEffect(() => {
    const loadPipelines = async () => {
      if (isOpen) {
        try {
          const { data: pipelinesData, error } = await getPipelines()
          if (error) throw new Error(error.message)
          setPipelines(pipelinesData || [])
        } catch (err) {
          console.error('Erro ao carregar pipelines:', err)
        }
      }
    }

    loadPipelines()
  }, [isOpen])

  // Carregar stages quando pipeline for alterado
  useEffect(() => {
    const loadStages = async () => {
      if (!editedFields.pipeline_id) {
        setAvailableStages([])
        return
      }

      setLoadingStages(true)
      try {
        const { data: stagesData, error } = await getStagesByPipeline(editedFields.pipeline_id)
        if (error) throw new Error(error.message)
        setAvailableStages(stagesData || [])

        // Se o stage atual não existe neste pipeline, limpar
        if (editedFields.stage_id && stagesData) {
          const stageExists = stagesData.some(stage => stage.id === editedFields.stage_id)
          if (!stageExists) {
            setEditedFields(prev => ({ ...prev, stage_id: '' }))
          }
        }
      } catch (err) {
        console.error('Erro ao carregar stages:', err)
        setAvailableStages([])
      } finally {
        setLoadingStages(false)
      }
    }

    if (isEditing) {
      loadStages()
    }
  }, [editedFields.pipeline_id, isEditing])

  // Carregar stages do lead atual (para exibição)
  useEffect(() => {
    const loadCurrentLeadStages = async () => {
      if (lead?.pipeline_id) {
        try {
          const { data: stagesData, error } = await getStagesByPipeline(lead.pipeline_id)
          if (error) throw new Error(error.message)
          setCurrentLeadStages(stagesData || [])
        } catch (err) {
          console.error('Erro ao carregar stages do lead:', err)
          setCurrentLeadStages([])
        }
      }
    }

    if (isOpen && lead) {
      loadCurrentLeadStages()
    }
  }, [isOpen, lead])

  // Carregar tarefas do lead
  useEffect(() => {
    if (isOpen && lead?.id) {
      loadLeadTasks(lead.id)
    }
  }, [isOpen, lead?.id, loadLeadTasks])

  // Carregar campos personalizados e valores ao abrir modal
  useEffect(() => {
    async function loadCustomFieldsAndValues() {
      if (!lead) return
      // Buscar campos globais + específicos do pipeline (o serviço já retorna ambos)
      const { data: fields } = await getCustomFieldsByPipeline(lead.pipeline_id)
      const allFields = fields as LeadCustomField[] || []
      setCustomFields(allFields)
      // Buscar valores do lead
      const { data: values } = await getCustomValuesByLead(lead.id)
      const valueMap: { [fieldId: string]: LeadCustomValue } = {}
      if (values) {
        for (const v of values) valueMap[v.field_id] = v
      }
      setCustomValues(valueMap)
      // Preencher inputs para edição
      const inputMap: { [fieldId: string]: any } = {}
      for (const field of allFields) {
        const val = valueMap[field.id]?.value
        if (field.type === 'multiselect') {
          inputMap[field.id] = val ? val.split(',') : []
        } else {
          inputMap[field.id] = val || ''
        }
      }
      setCustomFieldInputs(inputMap)
      setCustomFieldErrors({})
    }
    if (isOpen && lead) loadCustomFieldsAndValues()
  }, [isOpen, lead])

  // Resetar estados quando o modal abrir/fechar
  useEffect(() => {
    if (isOpen && lead) {
      setEditedFields({
        name: lead.name || '',
        company: lead.company || '',
        email: lead.email || '',
        phone: lead.phone || '',
        value: lead.value || 0,
        status: lead.status || '',
        origin: lead.origin || '',
        notes: lead.notes || '',
        pipeline_id: lead.pipeline_id || '',
        stage_id: lead.stage_id || ''
      })
      setIsEditing(false)
      setError(null)
    }
  }, [isOpen, lead])

  if (!isOpen || !lead) return null

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      
      // Validar telefone
      if (editedFields.phone && !validatePhone(editedFields.phone)) {
        setIsSaving(false)
        return
      }
      
      if (!validateCustomFields()) {
        setIsSaving(false)
        return
      }
      // Normalizar status vazio para null (remover informação)
      const updatePayload: any = {
        ...editedFields,
        status: editedFields.status === '' ? null : editedFields.status
      }

      const { data: updatedLead, error } = await updateLead(lead.id, updatePayload as any)
      if (error) {
        throw new Error(error.message)
      }
      // Salvar campos personalizados
      for (const field of customFields) {
        const value = customFieldInputs[field.id]
        if (value !== undefined && value !== null && value !== '') {
          const valueStr = Array.isArray(value) ? value.join(',') : String(value)
          if (customValues[field.id]) {
            await updateCustomValue(customValues[field.id].id, { value: valueStr })
          } else {
            await createCustomValue({ lead_id: lead.id, field_id: field.id, value: valueStr })
          }
        }
      }
      if (updatedLead && onLeadUpdate) {
        onLeadUpdate(updatedLead)
      }
      setIsEditing(false)
    } catch (err) {
      console.error('Erro ao salvar lead:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedFields({
      name: lead.name || '',
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      value: lead.value || 0,
      status: lead.status || '',
      origin: lead.origin || '',
      notes: lead.notes || '',
      pipeline_id: lead.pipeline_id || '',
      stage_id: lead.stage_id || ''
    })
    setIsEditing(false)
    setError(null)
  }

  const updateField = (field: keyof EditableFields, value: string | number) => {
    setEditedFields(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Atualizar input de campo personalizado
  const updateCustomField = (fieldId: string, value: any) => {
    setCustomFieldInputs(prev => ({ ...prev, [fieldId]: value }))
  }

  // Validação dos campos personalizados obrigatórios
  const validateCustomFields = () => {
    const errors: { [fieldId: string]: string } = {}
    for (const field of customFields) {
      if (field.required) {
        const value = customFieldInputs[field.id]
        if (
          value === undefined || value === null ||
          (typeof value === 'string' && value.trim() === '') ||
          (Array.isArray(value) && value.length === 0)
        ) {
          errors[field.id] = 'Campo obrigatório'
        }
      }
    }
    setCustomFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Encontrar stage atual
  const currentStage = (isEditing ? availableStages : currentLeadStages).find(s => s.id === (isEditing ? editedFields.stage_id : lead.stage_id))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="bg-white w-full sm:w-[700px] h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserIcon className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Detalhes do Lead</h3>
              <p className="text-sm text-gray-600">{lead.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                <PencilIcon className="w-4 h-4 inline mr-1" />
                Editar
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollável */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Modo de Edição - Destaque Visual */}
          {isEditing && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <PencilIcon className="w-5 h-5 text-orange-600" />
                <h4 className="font-medium text-orange-900">
                  Editando: {lead.name}
                </h4>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Seção: Informações Básicas */}
            <div className={`${isEditing ? 'bg-orange-50' : 'bg-gray-50'} rounded-lg p-4`}>
              <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-orange-600" />
                Informações Básicas
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedFields.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Nome do lead"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{lead.name || 'Não informado'}</p>
                    )}
                  </div>

                  {/* Empresa */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Empresa
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedFields.company}
                        onChange={(e) => updateField('company', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Nome da empresa"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{lead.company || 'Não informado'}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedFields.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="email@exemplo.com"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{lead.email || 'Não informado'}</p>
                    )}
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    {isEditing ? (
                      <div>
                        <input
                          type="tel"
                          value={editedFields.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                            phoneError ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="(11) 99999-9999"
                        />
                        {phoneError && (
                          <p className="text-red-600 text-xs mt-1">{phoneError}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{lead.phone || 'Não informado'}</p>
                    )}
                  </div>

                  {/* Valor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedFields.value}
                        onChange={(e) => updateField('value', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">
                        {lead.value ? `R$ ${lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    {isEditing ? (
                      <StyledSelect
                        value={editedFields.status || ''}
                        onChange={(value) => updateField('status', value)}
                        options={[
                          { value: '', label: 'Sem informação' },
                          { value: 'quente', label: 'Quente' },
                          { value: 'morno', label: 'Morno' },
                          { value: 'frio', label: 'Frio' }
                        ]}
                        placeholder="Selecione o status"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white capitalize">{lead.status || 'Não informado'}</p>
                    )}
                  </div>

                  {/* Origem */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Origem
                    </label>
                    {isEditing ? (
                      <StyledSelect
                        value={editedFields.origin || ''}
                        onChange={(value) => updateField('origin', value)}
                        options={[
                          { value: 'website', label: 'Website' },
                          { value: 'redes_sociais', label: 'Redes Sociais' },
                          { value: 'indicacao', label: 'Indicação' },
                          { value: 'telefone', label: 'Telefone' },
                          { value: 'email', label: 'Email' },
                          { value: 'evento', label: 'Evento' },
                          { value: 'outros', label: 'Outros' }
                        ]}
                        placeholder="Selecione a origem"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white capitalize">{lead.origin || 'Não informado'}</p>
                    )}
                  </div>
              </div>

              {/* Notas */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                {isEditing ? (
                  <textarea
                    value={editedFields.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-[80px]"
                    placeholder="Observações sobre o lead..."
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white min-h-[80px]">{lead.notes || 'Nenhuma observação'}</p>
                )}
              </div>
            </div>

            {/* Seção: Pipeline e Stage */}
            <div className={`${isEditing ? 'bg-orange-50' : 'bg-gray-50'} rounded-lg p-4`}>
              <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                <RectangleStackIcon className="w-4 h-4 text-orange-600" />
                Pipeline e Stage
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pipeline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pipeline
                  </label>
                  {isEditing ? (
                    <StyledSelect
                      value={editedFields.pipeline_id || ''}
                      onChange={(value) => updateField('pipeline_id', value)}
                      options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder="Selecionar pipeline"
                      disabled={loadingStages}
                    />
                  ) : (
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">
                      {pipelines.find(p => p.id === lead.pipeline_id)?.name || 'Não informado'}
                    </p>
                  )}
                </div>

                {/* Stage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stage
                  </label>
                  {isEditing ? (
                    <StyledSelect
                      value={editedFields.stage_id || ''}
                      onChange={(value) => updateField('stage_id', value)}
                      options={availableStages.map((s) => ({ value: s.id, label: s.name }))}
                      placeholder="Selecionar stage"
                      disabled={loadingStages || !editedFields.pipeline_id}
                    />
                  ) : (
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">
                      {currentStage?.name || 'Não informado'}
                    </p>
                  )}
                </div>
              </div>

              {/* Indicador de Stage */}
              {!isEditing && currentStage && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Progresso no Pipeline</span>
                    <span className="text-xs text-gray-500">
                      {currentLeadStages.findIndex(s => s.id === currentStage.id) + 1} de {currentLeadStages.length}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${((currentLeadStages.findIndex(s => s.id === currentStage.id) + 1) / currentLeadStages.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Seção: Campos Personalizados */}
            {customFields.length > 0 && (
              <div className={`${isEditing ? 'bg-orange-50' : 'bg-gray-50'} rounded-lg p-4`}>
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-4 h-4 text-orange-600" />
                  Campos Personalizados
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {isEditing ? (
                        <div>
                          {field.type === 'text' && (
                            <input
                              type="text"
                              value={customFieldInputs[field.id] || ''}
                              onChange={(e) => updateCustomField(field.id, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                customFieldErrors[field.id] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder=""
                              required={field.required}
                            />
                          )}
                          
                          {field.type === 'select' && (
                            <select
                              value={customFieldInputs[field.id] || ''}
                              onChange={(e) => updateCustomField(field.id, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                customFieldErrors[field.id] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              required={field.required}
                            >
                              <option value="">Selecionar...</option>
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}
                          
                          {field.type === 'multiselect' && (
                            <select
                              multiple
                              value={customFieldInputs[field.id] || []}
                              onChange={(e) => {
                                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                                updateCustomField(field.id, selectedOptions)
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                customFieldErrors[field.id] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              required={field.required}
                            >
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}
                          
                          {customFieldErrors[field.id] && (
                            <p className="text-red-600 text-xs mt-1">{customFieldErrors[field.id]}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">
                          {(() => {
                            const value = customValues[field.id]?.value
                            if (!value) return 'Não informado'
                            if (field.type === 'multiselect') {
                              return value.split(',').join(', ')
                            }
                            return value
                          })()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seção: Tarefas */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-4 h-4 text-orange-600" />
                  Tarefas Relacionadas
                </h4>
                <div className="flex items-center gap-2">
                  {lead.phone && (
                    <button
                      onClick={async () => {
                        if (!lead.phone) return
                        setStartingChat(true)
                        try {
                          const conversation = await findOrCreateConversationByPhone(lead.phone, lead.id)
                          if (conversation) {
                            // Aqui você pode redirecionar para o chat ou abrir em nova aba
                            window.open(`/chat?conversation=${conversation.id}`, '_blank')
                          }
                        } catch (error) {
                          console.error('Erro ao iniciar conversa:', error)
                          showError('Erro ao iniciar conversa. Tente novamente.')
                        } finally {
                          setStartingChat(false)
                        }
                      }}
                      className="px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                      title="Iniciar conversa via WhatsApp"
                      disabled={startingChat}
                    >
                      {startingChat ? (
                        <ArrowPathIcon className="w-4 h-4 inline mr-1 animate-spin" />
                      ) : (
                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4 inline mr-1" />
                      )}
                      {startingChat ? 'Iniciando...' : 'Iniciar Conversa'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowNewTaskModal(true)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4 inline mr-1" />
                    Nova Tarefa
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tasks.length === 0 ? (
                  <div className={`${statusColors.secondary.bg} rounded-lg p-4 text-center`}>
                    <p className="text-gray-500 text-sm">Nenhuma tarefa criada para este lead</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                          {task.description && (
                            <p className="text-gray-600 text-xs mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Status: {task.status}</span>
                            <span>Prioridade: {task.priority}</span>
                            {task.due_date && (
                              <span>Vence: {new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Informações de Sistema */}
            <div className={`${statusColors.secondary.bg} rounded-lg p-4`}>
              <h4 className="font-medium text-gray-900 mb-2">Informações do Sistema</h4>
              <div className="grid grid-cols-1 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Criado em:</span>
                  <br />
                  {new Date(lead.created_at).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Sempre visível */}
        {isEditing && (
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-500 border border-transparent rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}

        {/* Modal de Nova Tarefa */}
        <NewTaskModal
          isOpen={showNewTaskModal}
          onClose={() => setShowNewTaskModal(false)}
          leadId={lead?.id}
          onTaskCreated={() => {
            console.log('🔄 Tarefa criada para lead, recarregando dados...')
          }}
        />
      </div>
    </div>
  )
} 