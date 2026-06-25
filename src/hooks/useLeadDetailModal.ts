import { useState, useEffect, useCallback, useRef } from 'react'
import { useEscapeKey } from './useEscapeKey'
import { useTagsInput } from './useTagsInput'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import { useDeleteConfirmation } from './useDeleteConfirmation'
import type {
  Lead,
  Pipeline,
  Stage,
  LeadHistoryEntry,
  Task,
  LeadCustomField,
  LeadCustomValue,
  ChatConversation,
  LossReason,
  LeadAttachment,
} from '../types'
import { updateLead, getLeadHistory, markLeadAsLost, reactivateLead, markLeadAsSold, unmarkSale } from '../services/leadService'
import { getPipelines, getAllPipelinesForTransfer } from '../services/pipelineService'
import { getStagesByPipeline } from '../services/stageService'
import { getEmpresaUsers } from '../services/empresaService'
import { getLeadTasks, updateTask, deleteTask } from '../services/taskService'
import { getCustomFieldsByPipeline } from '../services/leadCustomFieldService'
import { getCustomValuesByLead, createCustomValue, updateCustomValue } from '../services/leadCustomValueService'
import { findOrCreateConversationByPhone, getConversationsByLeadId } from '../services/chatService'
import { getAllowedInstanceIdsForCurrentUser } from '../services/instancePermissionService'
import { getLossReasons } from '../services/lossReasonService'
import { getAllowedOrigins } from '../services/originOptionsService'
import { getAttachmentsByLead, uploadLeadAttachment, deleteLeadAttachment } from '../services/leadAttachmentService'

export interface EditableFields {
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
  tags: string[]
  responsible_uuid: string
}

export interface UseLeadDetailModalArgs {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  onLeadUpdate?: (updatedLead: Lead) => void
  onInvalidateCache?: () => void
  allLeads?: Lead[]
  onNavigateLead?: (leadId: string) => void
}

const buildEditableFields = (lead: Lead): EditableFields => ({
  name: lead.name || '',
  company: lead.company || '',
  email: lead.email || '',
  phone: lead.phone || '',
  value: lead.value || 0,
  status: lead.status || '',
  origin: lead.origin || '',
  notes: lead.notes || '',
  pipeline_id: lead.pipeline_id || '',
  stage_id: lead.stage_id || '',
  tags: lead.tags || [],
  responsible_uuid: lead.responsible_uuid || '',
})

const mapCustomInputs = (
  fields: LeadCustomField[],
  valueMap: { [fieldId: string]: LeadCustomValue }
): { [fieldId: string]: any } => {
  const inputMap: { [fieldId: string]: any } = {}
  for (const field of fields) {
    const val = valueMap[field.id]?.value
    if (field.type === 'multiselect') {
      inputMap[field.id] = val ? val.split(',') : []
    } else if (field.type === 'date') {
      if (val) {
        try {
          const date = new Date(val)
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          inputMap[field.id] = `${year}-${month}-${day}`
        } catch {
          inputMap[field.id] = val
        }
      } else {
        inputMap[field.id] = ''
      }
    } else {
      inputMap[field.id] = val || ''
    }
  }
  return inputMap
}

/**
 * Encapsula todo o estado, carregamentos e handlers do modal de detalhes do lead.
 * Mantém o componente de UI fino e focado na apresentação.
 */
export function useLeadDetailModal({
  lead,
  isOpen,
  onClose,
  onLeadUpdate,
  onInvalidateCache,
  allLeads = [],
  onNavigateLead,
}: UseLeadDetailModalArgs) {
  const { isAdmin, profile, user } = useAuthContext()
  const hasFullLeadAccess = isAdmin || !!profile?.ver_todos_leads
  const { showError, showSuccess } = useToastContext()
  const { executeDelete } = useDeleteConfirmation({
    defaultConfirmMessage: 'Tem certeza que deseja excluir esta tarefa?',
    defaultErrorContext: 'ao excluir tarefa',
  })

  const [currentLead, setCurrentLead] = useState<Lead | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<EditableFields>({
    name: '', company: '', email: '', phone: '', value: 0, status: '', origin: '',
    notes: '', pipeline_id: '', stage_id: '', tags: [], responsible_uuid: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const isSavingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const [loadingCustomFieldsData, setLoadingCustomFieldsData] = useState(true)
  const [loadingPipelinesData, setLoadingPipelinesData] = useState(true)

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [allPipelinesForTransfer, setAllPipelinesForTransfer] = useState<Pipeline[]>([])
  const [availableStages, setAvailableStages] = useState<Stage[]>([])
  const [currentLeadStages, setCurrentLeadStages] = useState<Stage[]>([])
  const [loadingStages, setLoadingStages] = useState(false)

  const [users, setUsers] = useState<Array<{ uuid: string; full_name: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const isInitialLoading = loadingCustomFieldsData || loadingPipelinesData || loadingUsers

  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [customValues, setCustomValues] = useState<{ [fieldId: string]: LeadCustomValue }>({})
  const [customFieldInputs, setCustomFieldInputs] = useState<{ [fieldId: string]: any }>({})
  const [customFieldErrors, setCustomFieldErrors] = useState<{ [fieldId: string]: string }>({})
  const [phoneError, setPhoneError] = useState<string>('')

  const { tagInput, setTagInput, addTag, removeTag, handleTagKeyPress } = useTagsInput()

  const [leadHistory, setLeadHistory] = useState<LeadHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [lossReasons, setLossReasons] = useState<LossReason[]>([])
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([])

  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [startingChat, setStartingChat] = useState(false)
  const [showSelectInstance, setShowSelectInstance] = useState(false)
  const [allowedInstanceIds, setAllowedInstanceIds] = useState<string[] | null>(null)
  const [pendingChatPhone, setPendingChatPhone] = useState<string | null>(null)

  const [showConversationView, setShowConversationView] = useState(false)
  const [availableConversations, setAvailableConversations] = useState<ChatConversation[]>([])
  const [hasExistingConversations, setHasExistingConversations] = useState(false)
  const [checkingConversations, setCheckingConversations] = useState(false)

  const [showLossReasonModal, setShowLossReasonModal] = useState(false)
  const [markingAsLost, setMarkingAsLost] = useState(false)

  const [showReactivateModal, setShowReactivateModal] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [reactivationNotes, setReactivationNotes] = useState('')

  const [showSaleModal, setShowSaleModal] = useState(false)
  const [markingAsSold, setMarkingAsSold] = useState(false)

  const [showUnmarkSaleModal, setShowUnmarkSaleModal] = useState(false)
  const [unmarkingSale, setUnmarkingSale] = useState(false)
  const [unmarkSaleNotes, setUnmarkSaleNotes] = useState('')

  const [leadTasks, setLeadTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  const [leadAttachments, setLeadAttachments] = useState<LeadAttachment[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)

  const [changingStageId, setChangingStageId] = useState<string | null>(null)

  useEscapeKey(isOpen, onClose)

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 13) {
      setPhoneError('Telefone deve ter exatamente 13 dígitos (55 + DDD + número)')
      return false
    }
    if (!cleanPhone.startsWith('55')) {
      setPhoneError('Telefone deve começar com 55 (código do Brasil)')
      return false
    }
    const ddd = cleanPhone.substring(2, 4)
    const dddNum = parseInt(ddd)
    if (dddNum < 11 || dddNum > 99) {
      setPhoneError('DDD deve estar entre 11 e 99')
      return false
    }
    const number = cleanPhone.substring(4)
    if (number.length < 8 || number.length > 9) {
      setPhoneError('Número deve ter 8 ou 9 dígitos')
      return false
    }
    setPhoneError('')
    return true
  }

  // Carregar pipelines e usuários quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setLoadingPipelinesData(true)
      setLoadingUsers(true)
    }

    const loadPipelines = async () => {
      if (isOpen) {
        try {
          const { data: pipelinesData, error } = await getPipelines()
          if (error) throw new Error(error.message)
          setPipelines(pipelinesData || [])

          const { data: allPipelinesData, error: allError } = await getAllPipelinesForTransfer()
          if (allError) throw new Error(allError.message)
          setAllPipelinesForTransfer(allPipelinesData || [])
        } catch (err) {
          console.error('Erro ao carregar pipelines:', err)
        } finally {
          setLoadingPipelinesData(false)
        }
      }
    }

    const loadUsers = async () => {
      if (isOpen) {
        try {
          setLoadingUsers(true)
          const usersData = await getEmpresaUsers()
          setUsers(usersData || [])
        } catch (err) {
          console.error('Erro ao carregar usuários:', err)
          setUsers([])
        } finally {
          setLoadingUsers(false)
        }
      }
    }

    loadPipelines()
    loadUsers()
  }, [isOpen])

  // Carregar motivos de perda quando o modal abrir
  useEffect(() => {
    const loadLossReasons = async () => {
      if (isOpen && currentLead?.pipeline_id) {
        try {
          const { data, error } = await getLossReasons(currentLead.pipeline_id)
          if (error) throw error
          setLossReasons(data || [])
        } catch (err) {
          console.error('Erro ao carregar motivos de perda:', err)
          setLossReasons([])
        }
      }
    }
    loadLossReasons()
  }, [isOpen, currentLead?.pipeline_id])

  useEffect(() => {
    const load = async () => {
      if (!isOpen) return
      try {
        const origins = await getAllowedOrigins()
        setAllowedOrigins(origins || [])
      } catch {
        setAllowedOrigins([])
      }
    }
    load()
  }, [isOpen])

  // Carregar stages quando pipeline for alterado (modo edição)
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

  // Sincronizar currentLead com prop lead quando mudar
  useEffect(() => {
    if (isOpen && lead) {
      setCurrentLead(prev => {
        if (prev?.id === lead.id) return prev
        return lead
      })
    }
  }, [isOpen, lead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar stages do lead atual (para exibição)
  useEffect(() => {
    const loadCurrentLeadStages = async () => {
      if (currentLead?.pipeline_id) {
        try {
          const { data: stagesData, error } = await getStagesByPipeline(currentLead.pipeline_id)
          if (error) throw new Error(error.message)
          setCurrentLeadStages(stagesData || [])
        } catch (err) {
          console.error('Erro ao carregar stages do lead:', err)
          setCurrentLeadStages([])
        }
      }
    }

    if (isOpen && currentLead) {
      loadCurrentLeadStages()
    }
  }, [isOpen, currentLead?.pipeline_id])

  const loadLeadTasksData = useCallback(async () => {
    if (!currentLead?.id) {
      setLeadTasks([])
      return
    }

    setLoadingTasks(true)
    try {
      const tasks = await getLeadTasks(currentLead.id)
      setLeadTasks(tasks || [])
    } catch (err) {
      console.error('Erro ao carregar tarefas do lead:', err)
      setLeadTasks([])
      showError('Erro ao carregar tarefas do lead')
    } finally {
      setLoadingTasks(false)
    }
  }, [currentLead?.id, showError])

  useEffect(() => {
    if (isOpen && currentLead?.id) {
      loadLeadTasksData()
    } else {
      setLeadTasks([])
    }
  }, [isOpen, currentLead?.id, loadLeadTasksData])

  const loadAttachments = useCallback(async () => {
    if (!currentLead?.id) {
      setLeadAttachments([])
      return
    }

    setLoadingAttachments(true)
    try {
      const attachments = await getAttachmentsByLead(currentLead.id)
      setLeadAttachments(attachments || [])
    } catch (err) {
      console.error('Erro ao carregar anexos do lead:', err)
      setLeadAttachments([])
      showError('Erro ao carregar anexos do lead')
    } finally {
      setLoadingAttachments(false)
    }
  }, [currentLead?.id, showError])

  useEffect(() => {
    if (isOpen && currentLead?.id) {
      loadAttachments()
    } else {
      setLeadAttachments([])
    }
  }, [isOpen, currentLead?.id, loadAttachments])

  const handleUploadAttachment = useCallback(async (files: FileList) => {
    if (!currentLead?.id) return

    setUploadingAttachment(true)
    try {
      const fileList = Array.from(files)
      for (const file of fileList) {
        await uploadLeadAttachment(currentLead.id, file)
      }
      await loadAttachments()
      showSuccess(
        fileList.length > 1 ? 'Anexos enviados com sucesso' : 'Anexo enviado com sucesso'
      )
    } catch (err: any) {
      console.error('Erro ao enviar anexo do lead:', err)
      showError(err?.message || 'Erro ao enviar anexo')
    } finally {
      setUploadingAttachment(false)
    }
  }, [currentLead?.id, loadAttachments, showError, showSuccess])

  const handleDeleteAttachment = useCallback(async (attachment: LeadAttachment) => {
    const confirmed = await executeDelete(
      () => deleteLeadAttachment(attachment.id),
      `Tem certeza que deseja excluir "${attachment.file_name}"?`,
      'ao excluir anexo'
    )
    if (confirmed) {
      setLeadAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
      showSuccess('Anexo excluído com sucesso')
    }
  }, [executeDelete, showSuccess])

  // Carregar histórico do lead
  const loadHistory = useCallback(async () => {
    if (!currentLead?.id) return

    setLoadingHistory(true)
    try {
      const { data, error } = await getLeadHistory(currentLead.id)
      if (error) {
        console.error('Erro ao carregar histórico:', error)
        setLeadHistory([])
      } else {
        setLeadHistory(data || [])
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
      setLeadHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [currentLead?.id])

  useEffect(() => {
    if (isOpen && currentLead?.id) {
      loadHistory()
    }
  }, [isOpen, currentLead?.id, loadHistory])

  // Verificar se existem conversas para o lead
  useEffect(() => {
    async function checkConversations() {
      if (!currentLead?.id || !currentLead?.phone) {
        setHasExistingConversations(false)
        return
      }

      setCheckingConversations(true)
      try {
        const conversations = await getConversationsByLeadId(currentLead.id)
        setHasExistingConversations(conversations.length > 0)
        setAvailableConversations(conversations)
      } catch (err) {
        console.error('Erro ao verificar conversas:', err)
        setHasExistingConversations(false)
      } finally {
        setCheckingConversations(false)
      }
    }

    if (isOpen && currentLead) {
      checkConversations()
    }
  }, [isOpen, currentLead?.id, currentLead?.phone])

  // Carregar campos personalizados e valores ao abrir modal
  useEffect(() => {
    let cancelled = false
    setLoadingCustomFieldsData(true)

    async function loadCustomFieldsAndValues() {
      if (!currentLead || !currentLead.id) return

      try {
        const { data: fields } = await getCustomFieldsByPipeline(currentLead.pipeline_id || 'null')
        if (cancelled) return

        const allFields = (fields as LeadCustomField[]) || []
        setCustomFields(allFields)

        const { data: values, error: valuesError } = await getCustomValuesByLead(currentLead.id)
        if (cancelled) return
        if (valuesError) {
          console.error('Erro ao carregar custom values, mantendo dados existentes:', valuesError)
          return
        }

        const valueMap: { [fieldId: string]: LeadCustomValue } = {}
        if (values) {
          for (const v of values) valueMap[v.field_id] = v
        }
        setCustomValues(valueMap)
        setCustomFieldInputs(mapCustomInputs(allFields, valueMap))
        setCustomFieldErrors({})
      } catch (err) {
        console.error('Erro ao carregar campos personalizados:', err)
      } finally {
        if (!cancelled) setLoadingCustomFieldsData(false)
      }
    }
    if (isOpen && currentLead) loadCustomFieldsAndValues()

    return () => { cancelled = true }
  }, [isOpen, currentLead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resetar estados quando o modal abrir/fechar
  useEffect(() => {
    if (isOpen && currentLead) {
      setEditedFields(buildEditableFields(currentLead))
      setIsEditing(false)
      setError(null)
    }
  }, [isOpen, currentLead])

  // ----- Derivados -----
  const getCurrentLeadIndex = (): number => {
    if (!allLeads || allLeads.length === 0 || !currentLead) return -1
    return allLeads.findIndex(l => l.id === currentLead.id)
  }

  const currentLeadIndex = getCurrentLeadIndex()
  const canNavigatePrevious = currentLeadIndex > 0 && allLeads.length > 0
  const canNavigateNext = currentLeadIndex >= 0 && currentLeadIndex < allLeads.length - 1

  const handleNavigatePrevious = () => {
    if (!canNavigatePrevious || !allLeads || allLeads.length === 0) return
    const previousLead = allLeads[currentLeadIndex - 1]
    if (previousLead) {
      setCurrentLead(previousLead)
      if (onNavigateLead) onNavigateLead(previousLead.id)
      setIsEditing(false)
      setError(null)
    }
  }

  const handleNavigateNext = () => {
    if (!canNavigateNext || !allLeads || allLeads.length === 0) return
    const nextLead = allLeads[currentLeadIndex + 1]
    if (nextLead) {
      setCurrentLead(nextLead)
      if (onNavigateLead) onNavigateLead(nextLead.id)
      setIsEditing(false)
      setError(null)
    }
  }

  const formatStatusDisplay = (status?: string) => {
    if (!status) return 'Não informado'
    switch (status) {
      case 'quente': return 'Quente'
      case 'morno': return 'Morno'
      case 'frio': return 'Frio'
      case 'venda_confirmada': return 'Venda Confirmada'
      case 'perdido': return 'Perdido'
      default: return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }

  const handleAddTag = () => {
    addTag(editedFields.tags, (newTags) => setEditedFields(prev => ({ ...prev, tags: newTags })))
  }

  const handleRemoveTag = (tagToRemove: string) => {
    removeTag(tagToRemove, editedFields.tags, (newTags) => setEditedFields(prev => ({ ...prev, tags: newTags })))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleTagKeyPress(e, editedFields.tags, (newTags) => setEditedFields(prev => ({ ...prev, tags: newTags })))
  }

  const validateCustomFields = () => {
    const errors: { [fieldId: string]: string } = {}
    for (const field of customFields) {
      const value = customFieldInputs[field.id]

      if (field.required) {
        if (
          value === undefined || value === null ||
          (typeof value === 'string' && value.trim() === '') ||
          (Array.isArray(value) && value.length === 0)
        ) {
          errors[field.id] = 'Campo obrigatório'
        }
      }

      if (field.type === 'link' && value && typeof value === 'string' && value.trim() !== '') {
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
        if (!urlPattern.test(value.trim())) {
          errors[field.id] = 'URL inválida'
        }
      }
    }
    setCustomFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (isSavingRef.current) return
    if (!hasFullLeadAccess && currentLead?.responsible_uuid && currentLead.responsible_uuid !== user?.id) {
      setError('Você não é responsável por este lead e não pode editá-lo.')
      return
    }
    if (!currentLead) return
    isSavingRef.current = true
    try {
      setIsSaving(true)
      setError(null)

      if (editedFields.phone && !validatePhone(editedFields.phone)) {
        setIsSaving(false)
        return
      }

      if (!validateCustomFields()) {
        setIsSaving(false)
        return
      }

      const updatePayload: any = {
        ...editedFields,
        status: editedFields.status === '' ? null : editedFields.status,
        responsible_uuid: editedFields.responsible_uuid === '' ? null : editedFields.responsible_uuid,
      }

      const { data: updatedLead, error } = await updateLead(currentLead.id, updatePayload as any)
      if (error) {
        throw new Error(error.message)
      }

      for (const field of customFields) {
        const value = customFieldInputs[field.id]
        const hasValue = value !== undefined && value !== null && value !== ''
        const existingCv = customValues[field.id]

        if (hasValue) {
          let valueStr: string
          if (field.type === 'date' && value) {
            const date = new Date(value + 'T00:00:00')
            valueStr = date.toISOString()
          } else {
            valueStr = Array.isArray(value) ? value.join(',') : String(value)
          }
          if (existingCv) {
            await updateCustomValue(existingCv.id, { value: valueStr })
          } else {
            await createCustomValue({ lead_id: currentLead.id, field_id: field.id, value: valueStr })
          }
        } else if (existingCv) {
          await updateCustomValue(existingCv.id, { value: '' })
        }
      }

      const { data: freshValues } = await getCustomValuesByLead(currentLead.id)
      if (freshValues) {
        const valueMap: { [fieldId: string]: LeadCustomValue } = {}
        for (const v of freshValues) valueMap[v.field_id] = v
        setCustomValues(valueMap)
        setCustomFieldInputs(prev => ({ ...prev, ...mapCustomInputs(customFields, valueMap) }))
      }

      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) onLeadUpdate(updatedLead)
        if (onInvalidateCache) onInvalidateCache()
      }

      // Recarregar o histórico para refletir os eventos gerados pela edição
      // (field_updated, responsible_changed, custom_field_changed).
      await loadHistory()

      setIsEditing(false)
    } catch (err) {
      console.error('Erro ao salvar lead:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsSaving(false)
      isSavingRef.current = false
    }
  }

  const handleCancel = () => {
    if (currentLead) {
      setEditedFields(buildEditableFields(currentLead))
    }
    setIsEditing(false)
    setError(null)
  }

  const updateField = (field: keyof EditableFields, value: string | number) => {
    setEditedFields(prev => ({ ...prev, [field]: value }))
  }

  const updateCustomField = (fieldId: string, value: any) => {
    setCustomFieldInputs(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleMarkAsLost = async (category: string, notes: string) => {
    if (!currentLead) return
    try {
      setMarkingAsLost(true)
      const { data: updatedLead, error } = await markLeadAsLost(currentLead.id, category, notes)
      if (error) throw new Error(error.message)
      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) onLeadUpdate(updatedLead)
        if (onInvalidateCache) onInvalidateCache()
      }
      await loadHistory()
      setShowLossReasonModal(false)
    } catch (err) {
      console.error('Erro ao marcar lead como perdido:', err)
      setError(err instanceof Error ? err.message : 'Erro ao marcar lead como perdido')
    } finally {
      setMarkingAsLost(false)
    }
  }

  const handleReactivate = async () => {
    if (!currentLead) return
    try {
      setReactivating(true)
      const { data: updatedLead, error } = await reactivateLead(currentLead.id, reactivationNotes.trim() || undefined)
      if (error) throw new Error(error.message)
      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) onLeadUpdate(updatedLead)
        if (onInvalidateCache) onInvalidateCache()
      }
      await loadHistory()
      setShowReactivateModal(false)
      setReactivationNotes('')
    } catch (err) {
      console.error('Erro ao reativar lead:', err)
      setError(err instanceof Error ? err.message : 'Erro ao reativar lead')
    } finally {
      setReactivating(false)
    }
  }

  const handleMarkAsSold = async (
    soldValue: number,
    saleNotes: string,
    soldAt: string,
    responsibleUuid?: string
  ) => {
    if (!currentLead) return
    try {
      setMarkingAsSold(true)
      const { data: updatedLead, error } = await markLeadAsSold(currentLead.id, soldValue, saleNotes, false, soldAt, responsibleUuid)
      if (error) throw new Error(error.message)
      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) onLeadUpdate(updatedLead)
        if (onInvalidateCache) onInvalidateCache()
      }
      await loadHistory()
      setShowSaleModal(false)
    } catch (err) {
      console.error('Erro ao marcar lead como vendido:', err)
      setError(err instanceof Error ? err.message : 'Erro ao marcar lead como vendido')
    } finally {
      setMarkingAsSold(false)
    }
  }

  const handleUnmarkSale = async () => {
    if (!currentLead) return
    try {
      setUnmarkingSale(true)
      const { data: updatedLead, error } = await unmarkSale(currentLead.id, unmarkSaleNotes.trim() || undefined)
      if (error) throw new Error(error.message)
      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) onLeadUpdate(updatedLead)
        if (onInvalidateCache) onInvalidateCache()
      }
      await loadHistory()
      setShowUnmarkSaleModal(false)
      setUnmarkSaleNotes('')
    } catch (err) {
      console.error('Erro ao desmarcar venda:', err)
      setError(err instanceof Error ? err.message : 'Erro ao desmarcar venda')
    } finally {
      setUnmarkingSale(false)
    }
  }

  const handleConversation = async () => {
    if (!currentLead?.phone) return

    if (hasExistingConversations && availableConversations.length > 0) {
      setShowConversationView(true)
    } else {
      try {
        setStartingChat(true)
        const { data: allowed } = await getAllowedInstanceIdsForCurrentUser()
        const ids = allowed || []

        if (!isAdmin && ids.length === 0) {
          throw new Error('Você não tem permissão para nenhuma instância de WhatsApp')
        }

        setAllowedInstanceIds(isAdmin ? (undefined as unknown as string[]) : ids)
        setPendingChatPhone(currentLead.phone)
        setShowSelectInstance(true)
      } catch (error) {
        console.error('Erro ao iniciar conversa:', error)
        showError('Erro ao iniciar conversa. Tente novamente.')
      } finally {
        setStartingChat(false)
      }
    }
  }

  const handleSelectInstance = async (instanceId: string) => {
    try {
      if (!pendingChatPhone || !currentLead?.id) return
      setShowSelectInstance(false)
      setStartingChat(true)
      const conversation = await findOrCreateConversationByPhone(pendingChatPhone, currentLead.id, instanceId)
      if (conversation) {
        setAvailableConversations(prev => (prev.some(c => c.id === conversation.id) ? prev : [...prev, conversation]))
        setHasExistingConversations(true)
        setShowConversationView(true)
      }
    } catch (error) {
      console.error('Erro ao iniciar conversa com instância selecionada:', error)
      showError('Erro ao iniciar conversa. Tente novamente.')
    } finally {
      setStartingChat(false)
      setPendingChatPhone(null)
      setAllowedInstanceIds(null)
    }
  }

  const handleEditTaskSubmit = async (taskData: Partial<Task>) => {
    if (!selectedTaskForEdit) return
    try {
      await updateTask(selectedTaskForEdit.id, taskData)
      await loadLeadTasksData()
      setShowEditTaskModal(false)
      setSelectedTaskForEdit(null)
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
      showError('Erro ao atualizar tarefa')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const res = await executeDelete(
      () => deleteTask(taskId),
      'Tem certeza que deseja excluir esta tarefa?',
      'ao excluir tarefa'
    )
    if (res) {
      await loadLeadTasksData()
      setShowEditTaskModal(false)
      setSelectedTaskForEdit(null)
    }
  }

  const openEditTask = (task: Task) => {
    setSelectedTaskForEdit(task)
    setShowEditTaskModal(true)
  }

  // Mudança rápida de etapa (clique no stepper, fora do modo edição)
  const handleQuickStageChange = async (stageId: string) => {
    if (!currentLead) return
    if (!hasFullLeadAccess && currentLead.responsible_uuid && currentLead.responsible_uuid !== user?.id) return
    if (stageId === currentLead.stage_id) return
    try {
      setChangingStageId(stageId)
      const { data: updatedLead, error } = await updateLead(currentLead.id, { stage_id: stageId } as any)
      if (error) throw new Error(error.message)
      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) onLeadUpdate(updatedLead)
        if (onInvalidateCache) onInvalidateCache()
      }
      await loadHistory()
    } catch (err) {
      console.error('Erro ao mudar de etapa:', err)
      setError(err instanceof Error ? err.message : 'Erro ao mudar de etapa')
    } finally {
      setChangingStageId(null)
    }
  }

  const currentStage = (isEditing ? availableStages : currentLeadStages).find(
    s => s.id === (isEditing ? editedFields.stage_id : currentLead?.stage_id)
  )

  const isReadOnly = !hasFullLeadAccess
    && !!currentLead?.responsible_uuid
    && currentLead.responsible_uuid !== user?.id

  return {
    // contexto / permissões
    isAdmin,
    profile,
    user,
    isReadOnly,
    // lead atual + estados base
    currentLead,
    isEditing,
    setIsEditing,
    editedFields,
    isSaving,
    error,
    isInitialLoading,
    // dados
    pipelines,
    allPipelinesForTransfer,
    availableStages,
    currentLeadStages,
    currentStage,
    loadingStages,
    changingStageId,
    handleQuickStageChange,
    users,
    loadingUsers,
    customFields,
    customValues,
    customFieldInputs,
    customFieldErrors,
    phoneError,
    leadHistory,
    loadingHistory,
    loadHistory,
    lossReasons,
    allowedOrigins,
    leadTasks,
    loadingTasks,
    // anexos
    leadAttachments,
    loadingAttachments,
    uploadingAttachment,
    handleUploadAttachment,
    handleDeleteAttachment,
    // navegação
    canNavigatePrevious,
    canNavigateNext,
    handleNavigatePrevious,
    handleNavigateNext,
    // tags
    tagInput,
    setTagInput,
    handleAddTag,
    handleRemoveTag,
    handleTagKeyDown,
    // edição
    updateField,
    updateCustomField,
    formatStatusDisplay,
    handleSave,
    handleCancel,
    // ações de status
    handleMarkAsLost,
    handleReactivate,
    handleMarkAsSold,
    handleUnmarkSale,
    markingAsLost,
    markingAsSold,
    reactivating,
    unmarkingSale,
    reactivationNotes,
    setReactivationNotes,
    unmarkSaleNotes,
    setUnmarkSaleNotes,
    // modais de status
    showLossReasonModal,
    setShowLossReasonModal,
    showReactivateModal,
    setShowReactivateModal,
    showSaleModal,
    setShowSaleModal,
    showUnmarkSaleModal,
    setShowUnmarkSaleModal,
    // conversa
    hasExistingConversations,
    checkingConversations,
    startingChat,
    handleConversation,
    showSelectInstance,
    setShowSelectInstance,
    allowedInstanceIds,
    handleSelectInstance,
    showConversationView,
    setShowConversationView,
    availableConversations,
    // tarefas
    loadLeadTasksData,
    showNewTaskModal,
    setShowNewTaskModal,
    showEditTaskModal,
    setShowEditTaskModal,
    selectedTaskForEdit,
    setSelectedTaskForEdit,
    openEditTask,
    handleEditTaskSubmit,
    handleDeleteTask,
  }
}
