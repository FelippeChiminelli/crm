import React, { useState, useEffect } from 'react'
import { useAuthContext } from '../../contexts/AuthContext'
import { useTasksLogic } from '../../hooks/useTasksLogic'
import { getAllProfiles } from '../../services/profileService'
import { getLeads, getLeadById } from '../../services/leadService'
import { getPipelines } from '../../services/pipelineService'
import {
  XMarkIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import type { 
  Lead, 
  Pipeline, 
  CreateTaskData, 
  TaskPriority 
} from '../../types'
import { ds } from '../../utils/designSystem'
import { StyledSelect } from '../ui/StyledSelect'

interface NewTaskModalProps {
  isOpen: boolean
  onClose: () => void
  leadId?: string // Para criar tarefa vinculada a lead específico
  pipelineId?: string // Para criar tarefa vinculada a pipeline específico
  onTaskCreated?: () => void // Callback para notificar que uma tarefa foi criada
}

export function NewTaskModal({
  isOpen,
  onClose,
  leadId,
  pipelineId,
  onTaskCreated
}: NewTaskModalProps) {
  const { user } = useAuthContext()
  const { createNewTask, taskTypes, loading } = useTasksLogic()

  // Estados do formulário
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    assigned_to: user?.id || '',
    lead_id: leadId || '',
    pipeline_id: pipelineId || '',
    task_type_id: '',
    priority: 'media',
    due_date: '',
    due_time: '',
    tags: [],
    estimated_hours: undefined
  })

  // Estado local para estimativa em minutos (mais fácil compreensão)
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined)

  // Estados para dados relacionados
  const [profiles, setProfiles] = useState<{ uuid: string; full_name: string; email: string }[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')

  // Carregar dados relacionados quando modal abrir
  useEffect(() => {
    if (isOpen) {
      loadRelatedData()
    }
  }, [isOpen])

  // Debug: Log quando taskTypes mudar
  useEffect(() => {
    console.log('📋 TaskTypes atualizados:', taskTypes?.length || 0, taskTypes)
  }, [taskTypes])

  // Carregar dados do lead e pré-selecionar pipeline quando leadId mudar
  useEffect(() => {
    async function loadLeadData() {
      if (leadId && isOpen) {
        try {
          console.log('🔍 Carregando dados do lead:', leadId)
          const { data: leadData, error } = await getLeadById(leadId)
          
          if (error) {
            console.error('❌ Erro ao carregar lead:', error)
            return
          }

          if (leadData) {
            console.log('✅ Lead encontrado:', leadData.name, 'Pipeline:', leadData.pipeline_id)
            // Pré-selecionar o pipeline do lead
            setFormData(prev => ({
              ...prev,
              lead_id: leadId,
              pipeline_id: leadData.pipeline_id || ''
            }))
          }
        } catch (error) {
          console.error('❌ Erro ao buscar dados do lead:', error)
        }
      }
    }

    loadLeadData()
  }, [leadId, isOpen])

  // Sempre que o usuário escolher um lead manualmente, definir pipeline automaticamente
  useEffect(() => {
    if (!isOpen) return
    if (formData.lead_id) {
      const selected = leads.find(l => l.id === formData.lead_id)
      if (selected && selected.pipeline_id !== formData.pipeline_id) {
        setFormData(prev => ({ ...prev, pipeline_id: selected.pipeline_id || '' }))
      }
    } else if (formData.pipeline_id) {
      setFormData(prev => ({ ...prev, pipeline_id: '' }))
    }
  }, [formData.lead_id, leads, isOpen])

  const loadRelatedData = async () => {
    try {
      console.log('📡 Carregando dados relacionados...')
      const [leadsData, pipelinesData, profilesData] = await Promise.all([
        getLeads(),
        getPipelines(),
        getAllProfiles()
      ])
      
      console.log('👥 Profiles:', profilesData.data?.length || 0)
      console.log('🎯 Leads:', leadsData.data?.length || 0)
      console.log('🔄 Pipelines:', pipelinesData.data?.length || 0)
      console.log('📋 Task Types:', taskTypes.length)
      
      setProfiles(profilesData.data || [])
      setLeads(leadsData.data || [])
      setPipelines(pipelinesData.data || [])
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
    }
  }

  // Limpar formulário (mantendo leadId e pipelineId se fornecidos)
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assigned_to: user?.id || '',
      lead_id: leadId || '',
      pipeline_id: pipelineId || '', // Será sobrescrito pelo useEffect se leadId estiver presente
      task_type_id: '',
      priority: 'media',
      due_date: '',
      due_time: '',
      tags: [],
      estimated_hours: undefined
    })
    setEstimatedMinutes(undefined)
    setTagInput('')
    setErrors({})
  }

  // Validar formulário
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title?.trim()) {
      newErrors.title = 'Título é obrigatório'
    }

    if (formData.title && formData.title.length > 200) {
      newErrors.title = 'Título deve ter no máximo 200 caracteres'
    }

    if (estimatedMinutes && estimatedMinutes < 0) {
      newErrors.estimated_minutes = 'Estimativa deve ser positiva'
    }

    if (estimatedMinutes && estimatedMinutes > 1440) { // 24 horas = 1440 minutos
      newErrors.estimated_minutes = 'Estimativa não pode ser maior que 24 horas (1440 minutos)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Adicionar tag
  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  // Remover tag
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('📝 Iniciando criação de tarefa...')
    console.log('📋 Dados do formulário:', formData)
    
    if (!validateForm()) {
      console.log('❌ Validação falhou')
      return
    }

    setSaving(true)
    
    try {
      // Preparar dados limpos
      const taskData: CreateTaskData = {
        ...formData,
        // Remover campos vazios
        assigned_to: formData.assigned_to || undefined,
        lead_id: formData.lead_id || undefined,
        pipeline_id: formData.pipeline_id || undefined,
        task_type_id: formData.task_type_id || undefined,
        due_date: formData.due_date || undefined,
        due_time: formData.due_time || undefined,
        // Converter minutos para horas (formato do banco)
        estimated_hours: estimatedMinutes ? estimatedMinutes / 60 : undefined,
        tags: formData.tags?.length ? formData.tags : undefined
      }

      console.log('📤 Enviando dados para criação:', taskData)
      const newTask = await createNewTask(taskData)
      
      if (newTask) {
        console.log('✅ Tarefa criada com sucesso:', newTask.id)
        resetForm()
        onClose()
        
        // Notificar que uma tarefa foi criada para atualizar a página
        if (onTaskCreated) {
          console.log('🔄 Notificando criação de tarefa para atualizar página')
          onTaskCreated()
        }
      } else {
        console.log('⚠️ createNewTask retornou null')
        setErrors({ submit: 'Erro inesperado ao criar tarefa.' })
      }
    } catch (error) {
      console.error('❌ Erro ao criar tarefa:', error)
      setErrors({ submit: 'Erro ao criar tarefa. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  // Lidar com mudanças no formulário
  const handleInputChange = (field: keyof CreateTaskData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Lidar com mudanças na estimativa em minutos
  const handleEstimatedMinutesChange = (value: string) => {
    const minutes = value ? parseInt(value) : undefined
    setEstimatedMinutes(minutes)
    // Limpar erro quando usuário começar a digitar
    if (errors.estimated_minutes) {
      setErrors(prev => ({ ...prev, estimated_minutes: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[90%] sm:w-[600px] lg:w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Nova Tarefa</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollável */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título da Tarefa *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={ds.input(!!errors.title)}
                placeholder="Ex: Ligar para cliente João"
                required
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`${ds.input()} min-h-[80px]`}
                placeholder="Descreva detalhes da tarefa..."
                rows={3}
              />
            </div>

            {/* Linha 1: Responsável e Prioridade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <UserIcon className="h-4 w-4 inline mr-1" />
                  Responsável
                </label>
                <StyledSelect
                  options={[{ value: '', label: 'Selecionar responsável' }, ...profiles.map(p => ({ value: p.uuid, label: p.full_name || p.email }))]}
                  value={formData.assigned_to || ''}
                  onChange={(val) => handleInputChange('assigned_to', val)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                  Prioridade
                </label>
                <StyledSelect
                  options={[
                    { value: 'baixa', label: 'Baixa' },
                    { value: 'media', label: 'Média' },
                    { value: 'alta', label: 'Alta' },
                    { value: 'urgente', label: 'Urgente' }
                  ]}
                  value={formData.priority || 'media'}
                  onChange={(val) => handleInputChange('priority', val as TaskPriority)}
                />
              </div>
            </div>

            {/* Linha 2: Tipo e Lead */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Tarefa
                </label>
                <StyledSelect
                  options={[{ value: '', label: 'Selecionar tipo' }, ...(taskTypes || []).map(t => ({ value: t.id, label: `${t.icon} ${t.name}` }))]}
                  value={formData.task_type_id || ''}
                  onChange={(val) => handleInputChange('task_type_id', val)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Relacionado
                </label>
                {leadId ? (
                  // Campo somente leitura quando tarefa está vinculada a um lead específico
                  <div className="relative">
                    <input
                      type="text"
                      value={(() => {
                        const lead = leads.find(l => l.id === formData.lead_id)
                        return lead ? `${lead.name}${lead.company ? ` (${lead.company})` : ''}` : 'Carregando...'
                      })()}
                      className={`${ds.input()} bg-gray-50 cursor-not-allowed`}
                      disabled
                      readOnly
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs text-gray-500 bg-orange-100 px-2 py-1 rounded">
                        Auto
                      </span>
                    </div>
                  </div>
                ) : (
                  // Campo editável quando não há lead pré-selecionado
                  <StyledSelect
                    options={[{ value: '', label: 'Selecionar lead' }, ...leads.map(l => ({ value: l.id, label: `${l.name}${l.company ? ` (${l.company})` : ''}` }))]}
                    value={formData.lead_id || ''}
                    onChange={(val) => handleInputChange('lead_id', val)}
                  />
                )}
              </div>
            </div>

            {/* Pipeline (sempre automático com base no Lead) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pipeline Relacionado
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={pipelines.find(p => p.id === formData.pipeline_id)?.name || (formData.lead_id ? 'Carregando...' : 'Selecione um lead')}
                  className={`${ds.input()} bg-gray-50 cursor-not-allowed`}
                  disabled
                  readOnly
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-xs text-gray-500 bg-orange-100 px-2 py-1 rounded">
                    Auto
                  </span>
                </div>
              </div>
            </div>

            {/* Linha 3: Data, Hora e Estimativa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                  <span className="whitespace-nowrap">Data Vencimento</span>
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className={ds.input()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  <span className="whitespace-nowrap">Horário</span>
                </label>
                <input
                  type="time"
                  value={formData.due_time}
                  onChange={(e) => handleInputChange('due_time', e.target.value)}
                  className={ds.input()}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="whitespace-nowrap">Estimativa (minutos)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  step="10"
                  value={estimatedMinutes || ''}
                  onChange={(e) => handleEstimatedMinutesChange(e.target.value)}
                  className={ds.input(!!errors.estimated_minutes)}
                  placeholder="Ex: 30, 60, 120"
                />
                {estimatedMinutes && estimatedMinutes > 0 && (
                  <p className="mt-1 text-sm font-medium text-orange-600">
                    {Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}min
                  </p>
                )}
                {errors.estimated_minutes && (
                  <p className="mt-1 text-sm text-red-600">{errors.estimated_minutes}</p>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <TagIcon className="h-4 w-4 inline mr-1" />
                Tags
              </label>
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className={ds.input()}
                  placeholder="Digite uma tag e pressione Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className={`${ds.button('secondary')} whitespace-nowrap`}
                >
                  Adicionar
                </button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-orange-600 hover:text-orange-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Erro geral */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer - Sempre visível */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={ds.button('outline')}
            disabled={saving || loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className={ds.button('primary')}
            disabled={saving || loading}
          >
            {saving ? 'Criando...' : 'Criar Tarefa'}
          </button>
        </div>
      </div>
    </div>
  )
} 