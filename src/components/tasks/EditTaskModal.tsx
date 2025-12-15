import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  PencilIcon,
  UserIcon,
  TagIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import type { Task, TaskPriority, TaskStatus, Lead, Pipeline } from '../../types'
import { getAllProfiles } from '../../services/profileService'
import { getLeads } from '../../services/leadService'
import { getPipelines } from '../../services/pipelineService'
import { useTasksLogic } from '../../hooks/useTasksLogic'
import { StyledSelect } from '../ui/StyledSelect'
import { useAuthContext } from '../../contexts/AuthContext'

interface EditTaskModalProps {
  isOpen: boolean
  task: Task | null
  onClose: () => void
  onSubmit: (taskData: Partial<Task>) => Promise<void>
}

export default function EditTaskModal({
  isOpen,
  task,
  onClose,
  onSubmit
}: EditTaskModalProps) {
  const { taskTypes } = useTasksLogic()
  const { isAdmin } = useAuthContext()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'media' as TaskPriority,
    status: 'pendente' as TaskStatus,
    due_date: '',
    due_time: '',
    task_type_id: '',
    lead_id: '',
    pipeline_id: '',
    tags: [] as string[]
  })
  const [profiles, setProfiles] = useState<{ uuid: string; full_name: string; email: string }[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined)
  const [tagInput, setTagInput] = useState('')

  // Carregar perfis quando o modal abrir
  useEffect(() => {
    const loadProfiles = async () => {
      if (isOpen) {
        try {
          const { data: profilesData, error } = await getAllProfiles()
          if (error) throw new Error(error.message)
          setProfiles(profilesData || [])
        } catch (err) {
          console.error('Erro ao carregar perfis:', err)
        }
      }
    }

    const loadRelated = async () => {
      if (isOpen) {
        try {
          const [leadsRes, pipelinesRes] = await Promise.all([
            getLeads(),
            getPipelines()
          ])
          setLeads(leadsRes.data || [])
          setPipelines(pipelinesRes.data || [])
        } catch (err) {
          console.error('Erro ao carregar leads/pipelines:', err)
          setLeads([])
          setPipelines([])
        }
      }
    }

    loadProfiles()
    loadRelated()
  }, [isOpen])

  // Preencher formulário quando task mudar
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assigned_to: task.assigned_to || '',
        priority: task.priority || 'media',
        status: task.status || 'pendente',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        due_time: task.due_time || '',
        task_type_id: task.task_type_id || '',
        lead_id: task.lead_id || '',
        pipeline_id: task.pipeline_id || '',
        tags: task.tags || []
      })
      setEstimatedMinutes(task.estimated_hours ? Math.round(task.estimated_hours * 60) : undefined)
      setErrors({})
      setIsEditing(false)
    }
  }, [task])

  // Sincronizar pipeline automaticamente ao trocar o Lead (em modo edição)
  useEffect(() => {
    if (!isEditing) return
    if (formData.lead_id) {
      const selected = leads.find(l => l.id === formData.lead_id)
      if (selected && selected.pipeline_id !== formData.pipeline_id) {
        setFormData(prev => ({ ...prev, pipeline_id: selected.pipeline_id || '' }))
      }
    } else if (formData.pipeline_id) {
      setFormData(prev => ({ ...prev, pipeline_id: '' }))
    }
  }, [isEditing, formData.lead_id, leads])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    
    try {
      const taskData: Partial<Task> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assigned_to: formData.assigned_to || undefined,
        priority: formData.priority,
        status: formData.status,
        due_date: formData.due_date || undefined,
        due_time: formData.due_time || undefined,
        task_type_id: formData.task_type_id || undefined,
        lead_id: formData.lead_id || undefined,
        pipeline_id: formData.pipeline_id || undefined,
        tags: (formData.tags && formData.tags.length > 0) ? formData.tags : undefined,
        estimated_hours: estimatedMinutes ? estimatedMinutes / 60 : undefined
      }

      await onSubmit(taskData)
      onClose()
    } catch (error) {
      console.error('Erro ao editar tarefa:', error)
      setErrors({ submit: 'Erro ao salvar tarefa. Tente novamente.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const handleMarkCompleted = async () => {
    if (!task) return
    setIsSubmitting(true)
    try {
      await onSubmit({ status: 'concluida' })
      onClose()
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error)
      setErrors({ submit: 'Erro ao concluir tarefa. Tente novamente.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetToTask = () => {
    if (!task) return
    setFormData({
      title: task.title || '',
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority || 'media',
      status: task.status || 'pendente',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      due_time: task.due_time || '',
      task_type_id: task.task_type_id || '',
      lead_id: task.lead_id || '',
      pipeline_id: task.pipeline_id || '',
      tags: task.tags || []
    })
    setEstimatedMinutes(task.estimated_hours ? Math.round(task.estimated_hours * 60) : undefined)
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-[9999]" style={{ margin: 0, padding: 0 }}>
      <div className="bg-white w-full sm:w-[600px] md:w-[700px] lg:w-[780px] h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PencilIcon className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Detalhes da Tarefa</h3>
              <p className="text-sm text-gray-600">{task.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4 inline mr-1" />
                    Editar
                  </button>
                )}
                <button
                  onClick={handleMarkCompleted}
                  disabled={isSubmitting || task.status === 'concluida'}
                  className="px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckIcon className="w-4 h-4 inline mr-1" />
                  Concluir tarefa
                </button>
              </>
            )}
            <button 
              onClick={handleClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollável */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {!isEditing ? (
            <div className="space-y-6">
              {/* Seção: Informações Básicas */}
              <div className={`rounded-lg p-4 ${isEditing ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-orange-600" />
                  Informações Básicas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Título</label>
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{formData.title || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Responsável</label>
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{profiles.find(p => p.uuid === formData.assigned_to)?.full_name || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{taskTypes.find(t => t.id === formData.task_type_id)?.name || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Lead</label>
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{(leads.find(l => l.id === formData.lead_id)?.name) || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pipeline</label>
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{(pipelines.find(p => p.id === formData.pipeline_id)?.name) || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Status</label>
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white capitalize">{formData.status.replace('_',' ')}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prioridade</label>
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white capitalize">{formData.priority}</p>
                  </div>
                </div>
              </div>

              {/* Seção: Prazo e Estimativa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-orange-600" />
                    Prazo
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Data de Vencimento</label>
                      <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{formData.due_date ? new Date(formData.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Horário</label>
                      <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{formData.due_time || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-orange-600" />
                    Estimativa
                  </h4>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Estimativa (minutos)</label>
                    <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">{estimatedMinutes ?? 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Seção: Descrição e Tags */}
              <div className="rounded-lg p-4 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-orange-600" />
                  Descrição
                </h4>
                <p className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white whitespace-pre-wrap min-h-[60px]">{formData.description || 'Nenhuma descrição'}</p>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-orange-600" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações Básicas */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Informações Básicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Título */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <UserIcon className="w-4 h-4 inline mr-1" />
                    Título da Tarefa *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.title ? 'border-red-300' : ''
                    }`}
                    placeholder="Digite o título da tarefa..."
                    disabled={isSubmitting}
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                  )}
                </div>

                {/* Responsável */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <UserIcon className="w-4 h-4 inline mr-1" />
                    Responsável
                  </label>
                  <StyledSelect
                    options={[{ value: '', label: 'Selecionar responsável' }, ...profiles.map(p => ({ value: p.uuid, label: p.full_name || p.email }))]}
                    value={formData.assigned_to || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, assigned_to: val }))}
                  />
                </div>

                {/* Tipo de Tarefa */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Tarefa
                  </label>
                  <StyledSelect
                    options={[{ value: '', label: 'Selecionar tipo' }, ...(taskTypes || []).map(t => ({ value: t.id, label: `${t.icon} ${t.name}` }))]}
                    value={formData.task_type_id || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, task_type_id: val }))}
                  />
                </div>

                {/* Lead Relacionado */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Relacionado
                  </label>
                  <StyledSelect
                    options={[{ value: '', label: 'Selecionar lead' }, ...leads.map(l => ({ value: l.id, label: `${l.name}${l.company ? ` (${l.company})` : ''}` }))]}
                    value={formData.lead_id || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, lead_id: val }))}
                  />
                </div>

                {/* Pipeline Relacionado (somente leitura, auto pelo Lead) */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pipeline Relacionado
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pipelines.find(p => p.id === formData.pipeline_id)?.name || (formData.lead_id ? 'Carregando...' : 'Selecione um lead')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
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

                {/* Descrição */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <ChatBubbleLeftEllipsisIcon className="w-4 h-4 inline mr-1" />
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-[80px]"
                    placeholder="Descreva detalhes da tarefa..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Status e Prioridade */}
            <div className="space-y-4 md:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Status e Prioridade
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TagIcon className="w-4 h-4 inline mr-1" />
                    Status
                  </label>
                  <StyledSelect
                    options={[
                      { value: 'pendente', label: 'Pendente' },
                      { value: 'em_andamento', label: 'Em Andamento' },
                      { value: 'concluida', label: 'Concluída' },
                      { value: 'atrasada', label: 'Atrasada' },
                      { value: 'cancelada', label: 'Cancelada' }
                    ]}
                    value={formData.status}
                    onChange={(val) => setFormData(prev => ({ ...prev, status: val as TaskStatus }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                    Prioridade
                  </label>
                  <StyledSelect
                    options={[
                      { value: 'baixa', label: 'Baixa' },
                      { value: 'media', label: 'Média' },
                      { value: 'alta', label: 'Alta' },
                      { value: 'urgente', label: 'Urgente' }
                    ]}
                    value={formData.priority}
                    onChange={(val) => setFormData(prev => ({ ...prev, priority: val as TaskPriority }))}
                  />
                </div>
              </div>
            </div>

            {/* Prazo (Data e Hora) */}
            <div className="space-y-4 md:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Prazo
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    <span className="whitespace-nowrap">Data de Vencimento</span>
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <ClockIcon className="w-4 h-4 inline mr-1" />
                    <span className="whitespace-nowrap">Horário</span>
                  </label>
                  <input
                    type="time"
                    value={formData.due_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Estimativa */}
            <div className="space-y-4 md:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 ">
              <ClockIcon className="w-4 h-4 inline mr-1" />
                Estimativa (minutos)
              </h3>
              <input
                type="number"
                min="0"
                max="1440"
                step="10"
                value={estimatedMinutes || ''}
                onChange={(e) => setEstimatedMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Ex: 30, 60, 120"
                disabled={isSubmitting}
              />
              {estimatedMinutes && estimatedMinutes > 0 && (
                <p className="mt-1 text-sm font-medium text-orange-600">
                  {Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}min
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2 md:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Tags
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), tagInput.trim() && setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] })), setTagInput(''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Digite uma tag e pressione Enter"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => { if (tagInput.trim()) { setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] })); setTagInput('') } }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  disabled={isSubmitting}
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
                        onClick={() => setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }))}
                        className="ml-1 text-orange-600 hover:text-orange-800"
                        disabled={isSubmitting}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Preview da Tarefa */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Preview da Tarefa
              </h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{formData.title || 'Título da tarefa'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 capitalize">{formData.status.replace('_', ' ')}</span>
                </div>
                {formData.assigned_to && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Responsável: {profiles.find(p => p.uuid === formData.assigned_to)?.full_name || 'N/A'}
                    </span>
                  </div>
                )}
                {formData.due_date && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Vence em: {new Date((formData.due_date || '') + 'T00:00:00').toLocaleDateString('pt-BR')} {formData.due_time && `às ${formData.due_time}`}
                    </span>
                  </div>
                )}
                {formData.description && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{formData.description}</p>
                  </div>
                )}
              </div>
            </div>
          </form>
          )}
        </div>

        {/* Footer - Sempre visível */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0 sm:justify-end">
          {!isEditing ? (
            <button
              onClick={handleClose}
              className="w-full sm:w-auto px-5 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors min-w-[160px]"
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                onClick={() => { resetToTask(); setIsEditing(false) }}
                className="w-full sm:w-auto px-5 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors min-w-[160px]"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="w-full sm:w-auto bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors min-w-[160px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 