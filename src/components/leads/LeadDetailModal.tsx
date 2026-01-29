import { useState, useEffect, useCallback } from 'react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { 
  XMarkIcon, 
  PencilIcon, 
  UserIcon,
  ChatBubbleLeftEllipsisIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  RectangleStackIcon,
  ArrowPathIcon,
  ClockIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { parseISO } from 'date-fns'
import type { Lead, Pipeline, Stage, LeadHistoryEntry } from '../../types'
import { updateLead, getLeadHistory, markLeadAsLost, reactivateLead, markLeadAsSold, unmarkSale } from '../../services/leadService'
import { getPipelines, getAllPipelinesForTransfer } from '../../services/pipelineService'
import { getStagesByPipeline } from '../../services/stageService'
import { getEmpresaUsers } from '../../services/empresaService'
import { getLeadTasks, updateTask } from '../../services/taskService'
import type { Task } from '../../types'
import { StyledSelect } from '../ui/StyledSelect'
import { NewTaskModal } from '../tasks/NewTaskModal'
import EditTaskModal from '../tasks/EditTaskModal'
import { statusColors } from '../../utils/designSystem'
import { useTagsInput } from '../../hooks/useTagsInput'
import { PhoneInput } from '../ui/PhoneInput'
import { getCustomFieldsByPipeline } from '../../services/leadCustomFieldService'
import { getCustomValuesByLead, createCustomValue, updateCustomValue } from '../../services/leadCustomValueService'
import { findOrCreateConversationByPhone, getConversationsByLeadId } from '../../services/chatService'
import { getAllowedInstanceIdsForCurrentUser} from '../../services/instancePermissionService'
import { SelectInstanceModal } from '../chat/SelectInstanceModal'
import { SelectConversationModal } from '../chat/SelectConversationModal'
import { ConversationViewModal } from '../chat/ConversationViewModal'
import type { ChatConversation } from '../../types'
import { useAuthContext } from '../../contexts/AuthContext'
import type { LeadCustomField, LeadCustomValue } from '../../types'
import { useToastContext } from '../../contexts/ToastContext'
import { LossReasonModal } from './LossReasonModal'
import { SaleModal } from './SaleModal'
import { getLossReasonLabel } from '../../utils/constants'
import { format } from 'date-fns'
import { getLossReasons } from '../../services/lossReasonService'
import type { LossReason, Vehicle } from '../../types'
import { VehicleSelector } from './forms/VehicleSelector'
import { getVehicles } from '../../services/vehicleService'
import { FiPackage } from 'react-icons/fi'
import { formatCurrency } from '../../utils/validation'

// Componente para exibir veículos vinculados em modo visualização
function VehicleFieldDisplay({ vehicleIds, empresaId }: { vehicleIds: string; empresaId: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadVehicles() {
      if (!vehicleIds || !empresaId) {
        setVehicles([])
        setLoading(false)
        return
      }

      try {
        const ids = vehicleIds.split(',').filter(id => id.trim())
        if (ids.length === 0) {
          setVehicles([])
          setLoading(false)
          return
        }

        const { vehicles: allVehicles } = await getVehicles(empresaId, undefined, 1000, 0)
        const selected = allVehicles.filter(v => ids.includes(v.id))
        setVehicles(selected)
      } catch (err) {
        console.error('Erro ao carregar veículos:', err)
      } finally {
        setLoading(false)
      }
    }

    loadVehicles()
  }, [vehicleIds, empresaId])

  if (loading) {
    return <span className="text-gray-400 text-sm">Carregando...</span>
  }

  if (vehicles.length === 0) {
    return <span className="text-gray-500">Nenhum veículo vinculado</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {vehicles.map(vehicle => {
        const image = vehicle.images && vehicle.images.length > 0 
          ? [...vehicle.images].sort((a, b) => a.position - b.position)[0].url 
          : null
        const title = vehicle.titulo_veiculo || `${vehicle.marca_veiculo || ''} ${vehicle.modelo_veiculo || ''}`.trim() || 'Veículo'
        
        return (
          <div
            key={vehicle.id}
            className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-1.5 pr-2"
          >
            <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {image ? (
                <img src={image} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiPackage size={14} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{title}</p>
              <p className="text-xs text-orange-600 font-semibold">
                {vehicle.price_veiculo ? formatCurrency(vehicle.price_veiculo) : '-'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface LeadDetailModalProps {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  onLeadUpdate?: (updatedLead: Lead) => void
  onInvalidateCache?: () => void
  allLeads?: Lead[] // Lista completa de leads para navegação
  onNavigateLead?: (leadId: string) => void // Callback para notificar navegação
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
  tags: string[]
  responsible_uuid: string
}

export function LeadDetailModal({ lead, isOpen, onClose, onLeadUpdate, onInvalidateCache, allLeads = [], onNavigateLead }: LeadDetailModalProps) {
  const { isAdmin, profile } = useAuthContext()
  const [currentLead, setCurrentLead] = useState<Lead | null>(null)
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
    stage_id: '',
    tags: [],
    responsible_uuid: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para pipelines e stages
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [allPipelinesForTransfer, setAllPipelinesForTransfer] = useState<Pipeline[]>([])
  const [availableStages, setAvailableStages] = useState<Stage[]>([])
  const [currentLeadStages, setCurrentLeadStages] = useState<Stage[]>([])
  const [loadingStages, setLoadingStages] = useState(false)
  
  // Estados para usuários (responsáveis)
  const [users, setUsers] = useState<Array<{ uuid: string; full_name: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Campos personalizados
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [customValues, setCustomValues] = useState<{ [fieldId: string]: LeadCustomValue }>({})
  const [customFieldInputs, setCustomFieldInputs] = useState<{ [fieldId: string]: any }>({})
  const [customFieldErrors, setCustomFieldErrors] = useState<{ [fieldId: string]: string }>({})
  const [phoneError, setPhoneError] = useState<string>('')
  
  // Hook para gerenciar tags
  const {
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    handleTagKeyPress
  } = useTagsInput()
  
  // Estado para histórico de alterações
  const [leadHistory, setLeadHistory] = useState<LeadHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Estado para motivos de perda (para exibição)
  const [lossReasons, setLossReasons] = useState<LossReason[]>([])

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
  const [showSelectInstance, setShowSelectInstance] = useState(false)
  const [allowedInstanceIds, setAllowedInstanceIds] = useState<string[] | null>(null)
  const [pendingChatPhone, setPendingChatPhone] = useState<string | null>(null)
  
  // States para visualização de conversas
  const [showConversationView, setShowConversationView] = useState(false)
  const [availableConversations, setAvailableConversations] = useState<ChatConversation[]>([])
  const [selectedViewConversation, setSelectedViewConversation] = useState<ChatConversation | null>(null)
  const [showSelectConversation, setShowSelectConversation] = useState(false)
  const [hasExistingConversations, setHasExistingConversations] = useState(false)
  const [checkingConversations, setCheckingConversations] = useState(false)
  
  // States para modal de motivo de perda
  const [showLossReasonModal, setShowLossReasonModal] = useState(false)
  const [markingAsLost, setMarkingAsLost] = useState(false)
  
  // States para reativação de lead
  const [showReactivateModal, setShowReactivateModal] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [reactivationNotes, setReactivationNotes] = useState('')
  
  // States para venda concluída
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [markingAsSold, setMarkingAsSold] = useState(false)
  
  // States para desmarcar venda
  const [showUnmarkSaleModal, setShowUnmarkSaleModal] = useState(false)
  const [unmarkingSale, setUnmarkingSale] = useState(false)
  const [unmarkSaleNotes, setUnmarkSaleNotes] = useState('')
  
  // Estado para tarefas do lead
  const [leadTasks, setLeadTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  
  // Estados para modal de edição de tarefa
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  
  const { showError } = useToastContext()
  
  useEscapeKey(isOpen, onClose)

  // Carregar pipelines e usuários quando o modal abrir
  useEffect(() => {
    const loadPipelines = async () => {
      if (isOpen) {
        try {
          // Carregar pipelines com permissão (para visualização)
          const { data: pipelinesData, error } = await getPipelines()
          if (error) throw new Error(error.message)
          setPipelines(pipelinesData || [])

          // Carregar TODOS os pipelines (para transferência na edição)
          const { data: allPipelinesData, error: allError } = await getAllPipelinesForTransfer()
          if (allError) throw new Error(allError.message)
          setAllPipelinesForTransfer(allPipelinesData || [])
        } catch (err) {
          console.error('Erro ao carregar pipelines:', err)
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

  // Sincronizar currentLead com prop lead quando mudar
  useEffect(() => {
    if (isOpen && lead) {
      setCurrentLead(lead)
    }
  }, [isOpen, lead])

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

  // Função para carregar tarefas do lead
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

  // Carregar tarefas do lead quando o modal abrir ou o lead mudar
  useEffect(() => {
    if (isOpen && currentLead?.id) {
      loadLeadTasksData()
    } else {
      setLeadTasks([])
    }
  }, [isOpen, currentLead?.id, loadLeadTasksData])

  // Carregar histórico do lead
  useEffect(() => {
    async function loadHistory() {
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
    }
    
    if (isOpen && currentLead) {
      loadHistory()
    }
  }, [isOpen, currentLead?.id])

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
    async function loadCustomFieldsAndValues() {
      if (!currentLead || !currentLead.id) return
      
      // Buscar campos globais + específicos do pipeline (o serviço já retorna ambos)
      // Se pipeline_id for undefined, buscar apenas campos globais
      const { data: fields } = await getCustomFieldsByPipeline(currentLead.pipeline_id || 'null')
      const allFields = fields as LeadCustomField[] || []
      setCustomFields(allFields)
      
      // Buscar valores do lead
      const { data: values } = await getCustomValuesByLead(currentLead.id)
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
        } else if (field.type === 'date') {
          // Para campos de data, converter ISO string para formato YYYY-MM-DD
          if (val) {
            try {
              const date = new Date(val)
              // Usar getFullYear, getMonth, getDate para evitar problemas de timezone
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
      setCustomFieldInputs(inputMap)
      setCustomFieldErrors({})
    }
    if (isOpen && currentLead) loadCustomFieldsAndValues()
  }, [isOpen, currentLead])

  // Resetar estados quando o modal abrir/fechar
  useEffect(() => {
    if (isOpen && currentLead) {
      setEditedFields({
        name: currentLead.name || '',
        company: currentLead.company || '',
        email: currentLead.email || '',
        phone: currentLead.phone || '',
        value: currentLead.value || 0,
        status: currentLead.status || '',
        origin: currentLead.origin || '',
        notes: currentLead.notes || '',
        pipeline_id: currentLead.pipeline_id || '',
        stage_id: currentLead.stage_id || '',
        tags: currentLead.tags || [],
        responsible_uuid: currentLead.responsible_uuid || ''
      })
      setIsEditing(false)
      setError(null)
    }
  }, [isOpen, currentLead])

  if (!isOpen || !currentLead) return null

  // Lógica de navegação entre leads
  const getCurrentLeadIndex = (): number => {
    if (!allLeads || allLeads.length === 0 || !currentLead) return -1
    return allLeads.findIndex(l => l.id === currentLead.id)
  }

  const currentLeadIndex = getCurrentLeadIndex()
  const canNavigatePrevious = currentLeadIndex > 0 && allLeads.length > 0
  const canNavigateNext = currentLeadIndex >= 0 && currentLeadIndex < allLeads.length - 1

  const handleNavigatePrevious = () => {
    if (!canNavigatePrevious || !allLeads || allLeads.length === 0) return
    
    const previousIndex = currentLeadIndex - 1
    const previousLead = allLeads[previousIndex]
    
    if (previousLead) {
      setCurrentLead(previousLead)
      if (onNavigateLead) {
        onNavigateLead(previousLead.id)
      }
      // Resetar estados de edição ao navegar
      setIsEditing(false)
      setError(null)
    }
  }

  const handleNavigateNext = () => {
    if (!canNavigateNext || !allLeads || allLeads.length === 0) return
    
    const nextIndex = currentLeadIndex + 1
    const nextLead = allLeads[nextIndex]
    
    if (nextLead) {
      setCurrentLead(nextLead)
      if (onNavigateLead) {
        onNavigateLead(nextLead.id)
      }
      // Resetar estados de edição ao navegar
      setIsEditing(false)
      setError(null)
    }
  }

  // Função para formatar o status para exibição
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

  // Handlers de tags com callback para atualizar editedFields
  const handleAddTag = () => {
    addTag(editedFields.tags, (newTags) => {
      setEditedFields(prev => ({ ...prev, tags: newTags }))
    })
  }

  const handleRemoveTag = (tagToRemove: string) => {
    removeTag(tagToRemove, editedFields.tags, (newTags) => {
      setEditedFields(prev => ({ ...prev, tags: newTags }))
    })
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleTagKeyPress(e, editedFields.tags, (newTags) => {
      setEditedFields(prev => ({ ...prev, tags: newTags }))
    })
  }

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
      // Normalizar campos vazios para null
      const updatePayload: any = {
        ...editedFields,
        status: editedFields.status === '' ? null : editedFields.status,
        responsible_uuid: editedFields.responsible_uuid === '' ? null : editedFields.responsible_uuid
      }

      console.log('💾 Salvando lead com responsável:', updatePayload.responsible_uuid)
      const { data: updatedLead, error } = await updateLead(currentLead.id, updatePayload as any)
      if (error) {
        throw new Error(error.message)
      }
      // Salvar campos personalizados
      for (const field of customFields) {
        const value = customFieldInputs[field.id]
        if (value !== undefined && value !== null && value !== '') {
          let valueStr: string
          
          if (field.type === 'date' && value) {
            // Para campos de data, converter YYYY-MM-DD para ISO string com timezone local
            const date = new Date(value + 'T00:00:00') // Forçar horário local
            valueStr = date.toISOString()
          } else {
            valueStr = Array.isArray(value) ? value.join(',') : String(value)
          }
          
          if (customValues[field.id]) {
            await updateCustomValue(customValues[field.id].id, { value: valueStr })
          } else {
            await createCustomValue({ lead_id: currentLead.id, field_id: field.id, value: valueStr })
          }
        }
      }
      
      if (updatedLead) {
        console.log('✅ Lead atualizado com sucesso:', updatedLead.responsible_uuid)
        // Atualizar o lead interno do modal
        setCurrentLead(updatedLead)
        
        // Notificar o componente pai
        if (onLeadUpdate) {
          onLeadUpdate(updatedLead)
        }
        
        // Invalidar cache para garantir dados frescos
        if (onInvalidateCache) {
          onInvalidateCache()
        }
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
    if (currentLead) {
      setEditedFields({
        name: currentLead.name || '',
        company: currentLead.company || '',
        email: currentLead.email || '',
        phone: currentLead.phone || '',
        value: currentLead.value || 0,
        status: currentLead.status || '',
        origin: currentLead.origin || '',
        notes: currentLead.notes || '',
        pipeline_id: currentLead.pipeline_id || '',
        stage_id: currentLead.stage_id || '',
        tags: currentLead.tags || [],
        responsible_uuid: currentLead.responsible_uuid || ''
      })
    }
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

  // Handler para marcar lead como perdido
  const handleMarkAsLost = async (category: string, notes: string) => {
    if (!currentLead) return
    
    try {
      setMarkingAsLost(true)
      const { data: updatedLead, error } = await markLeadAsLost(
        currentLead.id,
        category,
        notes
      )
      
      if (error) {
        throw new Error(error.message)
      }
      
      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) {
          onLeadUpdate(updatedLead)
        }
        if (onInvalidateCache) {
          onInvalidateCache()
        }
      }
      
      setShowLossReasonModal(false)
    } catch (err) {
      console.error('Erro ao marcar lead como perdido:', err)
      setError(err instanceof Error ? err.message : 'Erro ao marcar lead como perdido')
    } finally {
      setMarkingAsLost(false)
    }
  }
  
  // Handler para reativar lead
  const handleReactivate = async () => {
    if (!currentLead) return
    
    try {
      setReactivating(true)
      const { data: updatedLead, error } = await reactivateLead(
        currentLead.id,
        reactivationNotes.trim() || undefined
      )
      
      if (error) {
        throw new Error(error.message)
      }
      
      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) {
          onLeadUpdate(updatedLead)
        }
        if (onInvalidateCache) {
          onInvalidateCache()
        }
      }
      
      setShowReactivateModal(false)
      setReactivationNotes('')
    } catch (err) {
      console.error('Erro ao reativar lead:', err)
      setError(err instanceof Error ? err.message : 'Erro ao reativar lead')
    } finally {
      setReactivating(false)
    }
  }
  
  // Handler para marcar lead como venda concluída
  const handleMarkAsSold = async (soldValue: number, saleNotes: string) => {
    if (!currentLead) return
    
    try {
      setMarkingAsSold(true)
      const { data: updatedLead, error } = await markLeadAsSold(
        currentLead.id,
        soldValue,
        saleNotes
      )
      
      if (error) {
        throw new Error(error.message)
      }
      
      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) {
          onLeadUpdate(updatedLead)
        }
        if (onInvalidateCache) {
          onInvalidateCache()
        }
      }
      
      setShowSaleModal(false)
    } catch (err) {
      console.error('Erro ao marcar lead como vendido:', err)
      setError(err instanceof Error ? err.message : 'Erro ao marcar lead como vendido')
    } finally {
      setMarkingAsSold(false)
    }
  }
  
  // Handler para desmarcar venda
  const handleUnmarkSale = async () => {
    if (!currentLead) return
    
    try {
      setUnmarkingSale(true)
      const { data: updatedLead, error } = await unmarkSale(
        currentLead.id,
        unmarkSaleNotes.trim() || undefined
      )
      
      if (error) {
        throw new Error(error.message)
      }
      
      if (updatedLead) {
        setCurrentLead(updatedLead)
        if (onLeadUpdate) {
          onLeadUpdate(updatedLead)
        }
        if (onInvalidateCache) {
          onInvalidateCache()
        }
      }
      
      setShowUnmarkSaleModal(false)
      setUnmarkSaleNotes('')
    } catch (err) {
      console.error('Erro ao desmarcar venda:', err)
      setError(err instanceof Error ? err.message : 'Erro ao desmarcar venda')
    } finally {
      setUnmarkingSale(false)
    }
  }

  // Handler unificado para conversa (iniciar ou visualizar)
  const handleConversation = async () => {
    if (!currentLead?.phone) return
    
    // Se já tem conversas, visualizar
    if (hasExistingConversations && availableConversations.length > 0) {
      if (availableConversations.length === 1) {
        // Se há apenas uma conversa, abrir diretamente
        setSelectedViewConversation(availableConversations[0])
        setShowConversationView(true)
      } else {
        // Se há múltiplas conversas, mostrar modal de seleção
        setShowSelectConversation(true)
      }
    } else {
      // Se não tem conversas, iniciar nova
      try {
        setStartingChat(true)
        // Buscar instâncias permitidas para o usuário atual
        const { data: allowed } = await getAllowedInstanceIdsForCurrentUser()
        const ids = allowed || []

        if (!isAdmin && ids.length === 0) {
          throw new Error('Você não tem permissão para nenhuma instância de WhatsApp')
        }

        // Sempre abrir o seletor
        setAllowedInstanceIds(isAdmin ? undefined as unknown as string[] : ids)
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

  // Validação dos campos personalizados obrigatórios
  const validateCustomFields = () => {
    const errors: { [fieldId: string]: string } = {}
    for (const field of customFields) {
      const value = customFieldInputs[field.id]
      
      // Validar campo obrigatório
      if (field.required) {
        if (
          value === undefined || value === null ||
          (typeof value === 'string' && value.trim() === '') ||
          (Array.isArray(value) && value.length === 0)
        ) {
          errors[field.id] = 'Campo obrigatório'
        }
      }
      
      // Validar formato de URL para campos tipo link
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

  // Encontrar stage atual
  const currentStage = (isEditing ? availableStages : currentLeadStages).find(s => s.id === (isEditing ? editedFields.stage_id : currentLead.stage_id))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-[9999]" style={{ margin: 0, padding: 0 }}>
      <div 
        className={`bg-white h-screen flex flex-col max-w-full transition-all duration-300 ${
          showConversationView 
            ? 'w-full sm:w-full md:w-[600px] lg:w-[700px] mr-0 sm:mr-[50%] lg:mr-[40%] xl:mr-[33.333%]' 
            : 'w-full sm:w-full md:w-[600px] lg:w-[700px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-3 lg:p-4 border-b border-gray-200 flex-shrink-0 gap-2">
          {/* Título e nome do lead */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 lg:p-2 bg-orange-100 rounded-lg flex-shrink-0">
              <UserIcon className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 truncate">{currentLead.name}</h3>
              <p className="text-[10px] lg:text-xs text-gray-500 truncate hidden sm:block">Detalhes do Lead</p>
            </div>
          </div>
          
          {/* Botões de ação - sempre visíveis em linha */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Navegação */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={handleNavigatePrevious}
                disabled={!canNavigatePrevious}
                className={`p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation ${
                  canNavigatePrevious
                    ? 'text-gray-600 hover:bg-white hover:text-orange-600 active:bg-gray-200'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title={canNavigatePrevious ? 'Lead anterior' : 'Primeiro lead'}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleNavigateNext}
                disabled={!canNavigateNext}
                className={`p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation ${
                  canNavigateNext
                    ? 'text-gray-600 hover:bg-white hover:text-orange-600 active:bg-gray-200'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title={canNavigateNext ? 'Próximo lead' : 'Último lead'}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
            
            {/* Lead normal (não perdido e não vendido) */}
            {!isEditing && !currentLead.loss_reason_category && !currentLead.sold_at && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation flex items-center gap-1"
                  title="Editar lead"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  onClick={() => setShowSaleModal(true)}
                  className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation flex items-center gap-1"
                  title="Marcar como venda concluída"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Vendido</span>
                </button>
                <button
                  onClick={() => setShowLossReasonModal(true)}
                  className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation flex items-center gap-1"
                  title="Marcar lead como perdido"
                >
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Perdido</span>
                </button>
              </div>
            )}
            
            {/* Lead perdido */}
            {!isEditing && currentLead.loss_reason_category && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation flex items-center gap-1"
                  title="Editar lead"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  onClick={() => setShowReactivateModal(true)}
                  className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation flex items-center gap-1"
                  title="Reativar lead"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Reativar</span>
                </button>
              </div>
            )}
            
            {/* Lead vendido */}
            {!isEditing && currentLead.sold_at && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation flex items-center gap-1"
                  title="Editar lead"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  onClick={() => setShowUnmarkSaleModal(true)}
                  className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 active:bg-yellow-800 transition-colors touch-manipulation flex items-center gap-1"
                  title="Desmarcar venda"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Desmarcar</span>
                </button>
              </div>
            )}
            
            {/* Botão fechar */}
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
              title="Fechar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollável */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-6 min-h-0">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-4 mb-4 lg:mb-6">
              <p className="text-xs sm:text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Modo de Edição - Destaque Visual */}
          {isEditing && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 sm:p-4 mb-4 lg:mb-6">
              <div className="flex items-center gap-2">
                <PencilIcon className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                <h4 className="font-medium text-orange-900 text-xs sm:text-sm lg:text-base truncate">
                  Editando: {currentLead.name}
                </h4>
              </div>
            </div>
          )}

          <div className="space-y-4 lg:space-y-6">
            {/* Seção: Informações Básicas */}
            <div className={`${isEditing ? 'bg-orange-50' : 'bg-gray-50'} rounded-lg p-2 sm:p-3 lg:p-4`}>
              <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                Informações Básicas
              </h4>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                  {/* Nome */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                      Nome
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedFields.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs sm:text-sm"
                        placeholder="Nome"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm truncate">{currentLead.name || '-'}</p>
                    )}
                  </div>

                  {/* Empresa */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                      Empresa
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedFields.company}
                        onChange={(e) => updateField('company', e.target.value)}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs sm:text-sm"
                        placeholder="Empresa"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm truncate">{currentLead.company || '-'}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedFields.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs sm:text-sm"
                        placeholder="email@exemplo.com"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm truncate">{currentLead.email || '-'}</p>
                    )}
                  </div>

                  {/* Telefone */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                      Telefone
                    </label>
                    {isEditing ? (
                      <PhoneInput
                        value={editedFields.phone}
                        onChange={(value) => updateField('phone', value)}
                        error={phoneError}
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm truncate">{currentLead.phone || '-'}</p>
                    )}
                  </div>

                  {/* Valor */}
                  <div>
                    <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                      Valor
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedFields.value}
                        onChange={(e) => updateField('value', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs sm:text-sm"
                        placeholder="0.00"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm truncate">
                        {currentLead.value ? `R$ ${currentLead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                      Status
                    </label>
                    {isEditing ? (
                      <StyledSelect
                        value={editedFields.status || ''}
                        onChange={(value) => updateField('status', value)}
                        options={[
                          { value: '', label: 'Sem info' },
                          { value: 'quente', label: 'Quente' },
                          { value: 'morno', label: 'Morno' },
                          { value: 'frio', label: 'Frio' }
                        ]}
                        placeholder="Status"
                        size="sm"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm">{formatStatusDisplay(currentLead.status)}</p>
                    )}
                  </div>

                  {/* Origem */}
                  <div>
                    <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                      Origem
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedFields.origin || ''}
                        onChange={(e) => updateField('origin', e.target.value)}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs sm:text-sm"
                        placeholder="Origem"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm truncate">{currentLead.origin || '-'}</p>
                    )}
                  </div>

                  {/* Responsável */}
                  <div>
                    <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                      Responsável
                    </label>
                    {isEditing ? (
                      <StyledSelect
                        value={editedFields.responsible_uuid || ''}
                        onChange={(value) => updateField('responsible_uuid', value)}
                        options={[
                          { value: '', label: 'Nenhum' },
                          ...users.map((user) => ({ 
                            value: user.uuid, 
                            label: user.full_name 
                          }))
                        ]}
                        placeholder="Responsável"
                        disabled={loadingUsers}
                        size="sm"
                      />
                    ) : (
                      <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm truncate">
                        {currentLead.responsible_uuid 
                          ? users.find(u => u.uuid === currentLead.responsible_uuid)?.full_name || '-'
                          : 'Nenhum'
                        }
                      </p>
                    )}
                  </div>
              </div>

              {/* Notas */}
              <div className="mt-2 sm:mt-4">
                <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                  Notas
                </label>
                {isEditing ? (
                  <textarea
                    value={editedFields.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-[60px] sm:min-h-[80px] text-xs sm:text-sm"
                    placeholder="Observações..."
                    rows={2}
                  />
                ) : (
                  <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white min-h-[60px] sm:min-h-[80px] text-xs sm:text-sm">{currentLead.notes || 'Nenhuma'}</p>
                )}
              </div>

              {/* Tags */}
              <div className="mt-2 sm:mt-4">
                <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                  <TagIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-0.5 sm:mr-1" />
                  Tags
                </label>
                {isEditing ? (
                  <div className="space-y-1.5 sm:space-y-2">
                    {/* Input para adicionar tags */}
                    <div className="flex gap-1.5 sm:gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagKeyDown}
                        className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs sm:text-sm"
                        placeholder="Tag + Enter"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-2 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-[10px] sm:text-sm font-medium whitespace-nowrap"
                      >
                        +
                      </button>
                    </div>
                    
                    {/* Lista de tags */}
                    {editedFields.tags && editedFields.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {editedFields.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] sm:text-sm font-medium"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-orange-900 transition-colors"
                            >
                              <XMarkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white min-h-[32px] sm:min-h-[40px]">
                    {currentLead.tags && currentLead.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {currentLead.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] sm:text-sm font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs sm:text-sm">Nenhuma tag</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Seção: Motivo de Perda - Mostrar apenas se o lead foi perdido */}
            {currentLead.loss_reason_category && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2 sm:p-3 lg:p-4">
                <h4 className="text-xs sm:text-sm font-medium text-red-900 mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  Lead Perdido
                </h4>
                
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-medium text-red-700 mb-0.5 sm:mb-1">
                      Motivo
                    </label>
                    <p className="text-[10px] sm:text-sm text-red-900 bg-white border border-red-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 font-medium">
                      {getLossReasonLabel(currentLead.loss_reason_category, lossReasons)}
                    </p>
                  </div>
                  
                  {currentLead.loss_reason_notes && (
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium text-red-700 mb-0.5 sm:mb-1">
                        Detalhes
                      </label>
                      <p className="text-[10px] sm:text-sm text-red-900 bg-white border border-red-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 whitespace-pre-wrap">
                        {currentLead.loss_reason_notes}
                      </p>
                    </div>
                  )}
                  
                  {currentLead.lost_at && (
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium text-red-700 mb-0.5 sm:mb-1">
                        Data
                      </label>
                      <p className="text-[10px] sm:text-sm text-red-900 bg-white border border-red-200 rounded px-2 sm:px-3 py-1.5 sm:py-2">
                        {format(parseISO(currentLead.lost_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seção: Venda Concluída - Mostrar apenas se o lead foi vendido */}
            {currentLead.sold_at && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-2 sm:p-3 lg:p-4">
                <h4 className="text-xs sm:text-sm font-medium text-green-900 mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  Venda Concluída
                </h4>
                
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-medium text-green-700 mb-0.5 sm:mb-1">
                      Valor
                    </label>
                    <p className="text-[10px] sm:text-sm text-green-900 bg-white border border-green-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 font-medium">
                      {currentLead.sold_value 
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentLead.sold_value)
                        : '-'
                      }
                    </p>
                  </div>
                  
                  {currentLead.sale_notes && (
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium text-green-700 mb-0.5 sm:mb-1">
                        Observações
                      </label>
                      <p className="text-[10px] sm:text-sm text-green-900 bg-white border border-green-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 whitespace-pre-wrap">
                        {currentLead.sale_notes}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-[10px] sm:text-xs font-medium text-green-700 mb-0.5 sm:mb-1">
                      Data
                    </label>
                    <p className="text-[10px] sm:text-sm text-green-900 bg-white border border-green-200 rounded px-2 sm:px-3 py-1.5 sm:py-2">
                      {format(parseISO(currentLead.sold_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Seção: Pipeline e Stage */}
            <div className={`${isEditing ? 'bg-orange-50' : 'bg-gray-50'} rounded-lg p-2 sm:p-3 lg:p-4`}>
              <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                <RectangleStackIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                Pipeline e Stage
              </h4>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                {/* Pipeline */}
                <div>
                  <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                    Pipeline
                  </label>
                  {isEditing ? (
                    <StyledSelect
                      value={editedFields.pipeline_id || ''}
                      onChange={(value) => updateField('pipeline_id', value)}
                      options={allPipelinesForTransfer.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder="Pipeline"
                      disabled={loadingStages}
                      size="sm"
                    />
                  ) : (
                    <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm truncate">
                      {allPipelinesForTransfer.find(p => p.id === currentLead.pipeline_id)?.name || 
                       pipelines.find(p => p.id === currentLead.pipeline_id)?.name || 
                       '-'}
                    </p>
                  )}
                </div>

                {/* Stage */}
                <div>
                  <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                    Stage
                  </label>
                  {isEditing ? (
                    <StyledSelect
                      value={editedFields.stage_id || ''}
                      onChange={(value) => updateField('stage_id', value)}
                      options={availableStages.map((s) => ({ value: s.id, label: s.name }))}
                      placeholder="Stage"
                      disabled={loadingStages || !editedFields.pipeline_id}
                      size="sm"
                    />
                  ) : (
                    <p className="text-gray-900 border border-gray-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-xs sm:text-sm truncate">
                      {currentStage?.name || '-'}
                    </p>
                  )}
                </div>
              </div>

              {/* Indicador de Stage */}
              {!isEditing && currentStage && (
                <div className="mt-2 sm:mt-4 p-2 sm:p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-sm font-medium text-gray-700">Progresso</span>
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      {currentLeadStages.findIndex(s => s.id === currentStage.id) + 1}/{currentLeadStages.length}
                    </span>
                  </div>
                  <div className="mt-1 sm:mt-2 w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className="bg-orange-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
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
              <div className={`${isEditing ? 'bg-orange-50' : 'bg-gray-50'} rounded-lg p-2 sm:p-3 lg:p-4`}>
                <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <ClipboardDocumentListIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                  Campos Personalizados
                </h4>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
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
                          
                          {field.type === 'number' && (
                            <input
                              type="number"
                              value={customFieldInputs[field.id] || ''}
                              onChange={(e) => updateCustomField(field.id, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                customFieldErrors[field.id] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder=""
                              required={field.required}
                            />
                          )}
                          
                          {field.type === 'date' && (
                            <input
                              type="date"
                              value={customFieldInputs[field.id] || ''}
                              onChange={(e) => updateCustomField(field.id, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                customFieldErrors[field.id] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              required={field.required}
                            />
                          )}
                          
                          {field.type === 'select' && (
                            <StyledSelect
                              value={customFieldInputs[field.id] || ''}
                              onChange={(value) => updateCustomField(field.id, value)}
                              options={[
                                { value: '', label: 'Selecionar...' },
                                ...(field.options?.map((option) => ({
                                  value: option,
                                  label: option
                                })) || [])
                              ]}
                              placeholder="Selecionar..."
                              size="sm"
                            />
                          )}
                          
                          {field.type === 'multiselect' && (
                            <div className={`border rounded-lg p-2 bg-white ${
                              customFieldErrors[field.id] ? 'border-red-300' : 'border-gray-300'
                            }`}>
                              <div className="flex flex-wrap gap-2">
                                {field.options?.map((option) => {
                                  const isSelected = (customFieldInputs[field.id] || []).includes(option)
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => {
                                        const current = customFieldInputs[field.id] || []
                                        const newValue = isSelected
                                          ? current.filter((v: string) => v !== option)
                                          : [...current, option]
                                        updateCustomField(field.id, newValue)
                                      }}
                                      className={`
                                        px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                        ${isSelected
                                          ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }
                                      `}
                                    >
                                      {option}
                                    </button>
                                  )
                                })}
                              </div>
                              {(customFieldInputs[field.id]?.length || 0) > 0 && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {customFieldInputs[field.id]?.length} selecionado(s)
                                </p>
                              )}
                            </div>
                          )}
                          
                          {field.type === 'link' && (
                            <input
                              type="url"
                              value={customFieldInputs[field.id] || ''}
                              onChange={(e) => updateCustomField(field.id, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                customFieldErrors[field.id] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="https://exemplo.com"
                              required={field.required}
                            />
                          )}
                          
                          {field.type === 'vehicle' && profile?.empresa_id && (
                            <VehicleSelector
                              value={customFieldInputs[field.id] || ''}
                              onChange={(value) => updateCustomField(field.id, value)}
                              empresaId={profile.empresa_id}
                              error={!!customFieldErrors[field.id]}
                            />
                          )}
                          
                          {customFieldErrors[field.id] && (
                            <p className="text-red-600 text-xs mt-1">{customFieldErrors[field.id]}</p>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-900 border border-gray-200 rounded px-3 py-2 bg-white">
                          {(() => {
                            const value = customValues[field.id]?.value
                            if (!value) return <span>Não informado</span>
                            
                            // Formatar data
                            if (field.type === 'date') {
                              try {
                                const date = new Date(value)
                                // Usar getFullYear, getMonth, getDate para evitar problemas de timezone
                                const year = date.getFullYear()
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const day = String(date.getDate()).padStart(2, '0')
                                return <span>{`${day}/${month}/${year}`}</span>
                              } catch {
                                return <span>{value}</span>
                              }
                            }
                            
                            // Formatar multiselect
                            if (field.type === 'multiselect') {
                              return <span>{value.split(',').join(', ')}</span>
                            }
                            
                            // Formatar link como clicável
                            if (field.type === 'link') {
                              const url = value.startsWith('http://') || value.startsWith('https://') 
                                ? value 
                                : `https://${value}`
                              
                              let displayText = value
                              try {
                                const urlObj = new URL(url)
                                displayText = urlObj.hostname.replace('www.', '')
                              } catch (e) {
                                displayText = value
                              }
                              
                              return (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  <span>{displayText}</span>
                                </a>
                              )
                            }
                            
                            // Exibir veículos vinculados
                            if (field.type === 'vehicle') {
                              return <VehicleFieldDisplay vehicleIds={value} empresaId={profile?.empresa_id || ''} />
                            }
                            
                            return <span>{value}</span>
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seção: Tarefas */}
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3 lg:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-4 gap-2">
                <h4 className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2">
                  <ClipboardDocumentListIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                  <span className="hidden sm:inline">Tarefas</span>
                </h4>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {currentLead.phone && (
                    <button
                      onClick={handleConversation}
                      className={`px-2 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-colors min-h-[32px] sm:min-h-[36px] whitespace-nowrap ${
                        hasExistingConversations
                          ? 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100'
                          : 'text-white bg-green-600 border border-green-600 hover:bg-green-700'
                      }`}
                      title={hasExistingConversations ? 'Visualizar conversas' : 'Iniciar conversa'}
                      disabled={checkingConversations || startingChat}
                    >
                      {(checkingConversations || startingChat) ? (
                        <ArrowPathIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline animate-spin" />
                      ) : (
                        <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline sm:mr-1" />
                      )}
                      <span className="hidden sm:inline">
                        {hasExistingConversations ? 'Chat' : 'Conversa'}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowNewTaskModal(true)}
                    className="px-2 py-1.5 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[32px] sm:min-h-[36px] whitespace-nowrap"
                  >
                    <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline sm:mr-1" />
                    <span className="hidden sm:inline">Tarefa</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2 max-h-36 sm:max-h-48 overflow-y-auto">
                {loadingTasks ? (
                  <div className={`${statusColors.secondary.bg} rounded-lg p-4 text-center`}>
                    <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Carregando tarefas...</p>
                  </div>
                ) : leadTasks.length === 0 ? (
                  <div className={`${statusColors.secondary.bg} rounded-lg p-4 text-center`}>
                    <p className="text-gray-500 text-sm">Nenhuma tarefa criada para este lead</p>
                  </div>
                ) : (
                  leadTasks.map((task) => (
                    <div 
                      key={task.id} 
                      onClick={() => {
                        setSelectedTaskForEdit(task)
                        setShowEditTaskModal(true)
                      }}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 text-sm flex-1">{task.title}</h4>
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
                          task.status === 'concluida' ? 'bg-green-100 text-green-700' :
                          task.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                          task.status === 'atrasada' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.status === 'concluida' ? '✓ Concluída' :
                           task.status === 'em_andamento' ? '⏳ Em andamento' :
                           task.status === 'atrasada' ? '⚠️ Atrasada' :
                           task.status === 'cancelada' ? '✕ Cancelada' :
                           '○ Pendente'}
                        </span>
                      </div>
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Vencimento: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Informações de Sistema */}
            <div className={`${statusColors.secondary.bg} rounded-lg p-2 sm:p-3 lg:p-4`}>
              <h4 className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                Sistema
              </h4>
              
              <div className="space-y-2 sm:space-y-4">
                <div className="text-[10px] sm:text-sm text-gray-600">
                  <span className="font-medium">Criado:</span>{' '}
                  {currentLead.created_at 
                    ? parseISO(currentLead.created_at).toLocaleString('pt-BR')
                    : '-'
                  }
                </div>

                {/* Histórico de Alterações */}
                <div className="border-t border-gray-200 pt-2 sm:pt-4">
                  <h5 className="text-[10px] sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Histórico</h5>
                  
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-3 sm:py-4">
                      <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 animate-spin" />
                      <span className="ml-2 text-[10px] sm:text-sm text-gray-500">Carregando...</span>
                    </div>
                  ) : leadHistory.length === 0 ? (
                    <div className="text-[10px] sm:text-sm text-gray-500 text-center py-2 sm:py-3 bg-gray-50 rounded">
                      Nenhuma alteração
                    </div>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
                      {leadHistory.map((history) => (
                        <div key={history.id} className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200 text-[10px] sm:text-sm">
                          <div className="flex items-start justify-between mb-1 sm:mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-[10px] sm:text-sm truncate">
                                {history.change_type === 'created' && '🎉 Criado'}
                                {history.change_type === 'stage_changed' && '🔄 Stage'}
                                {history.change_type === 'pipeline_changed' && '📋 Pipeline'}
                                {history.change_type === 'both_changed' && '🔀 Pipeline/Stage'}
                                {history.change_type === 'marked_as_lost' && '❌ Perdido'}
                                {history.change_type === 'reactivated' && '✅ Reativado'}
                                {history.change_type === 'marked_as_sold' && '💰 Vendido'}
                                {history.change_type === 'sale_unmarked' && '⚠️ Desmarcado'}
                              </div>
                              <div className="text-[9px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">
                                {history.changed_at 
                                  ? parseISO(history.changed_at).toLocaleString('pt-BR')
                                  : '-'
                                }
                                {history.changed_by_user?.full_name && (
                                  <span className="ml-1 sm:ml-2">
                                    por <span className="font-medium">{history.changed_by_user.full_name}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-0.5 sm:space-y-1 text-[9px] sm:text-xs">
                            {/* Mudança de Pipeline */}
                            {(history.change_type === 'pipeline_changed' || history.change_type === 'both_changed') && (
                              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                <span className="text-gray-500">Pipeline:</span>
                                {history.previous_pipeline?.name && (
                                  <span className="text-red-600 line-through truncate max-w-[80px] sm:max-w-none">{history.previous_pipeline.name}</span>
                                )}
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600 font-medium truncate max-w-[80px] sm:max-w-none">{history.pipeline?.name || 'N/A'}</span>
                              </div>
                            )}
                            
                            {/* Mudança de Stage */}
                            {(history.change_type === 'stage_changed' || history.change_type === 'both_changed' || history.change_type === 'created') && (
                              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                <span className="text-gray-500">Stage:</span>
                                {history.previous_stage?.name && history.change_type !== 'created' && (
                                  <span className="text-red-600 line-through truncate max-w-[80px] sm:max-w-none">{history.previous_stage.name}</span>
                                )}
                                {history.previous_stage?.name && history.change_type !== 'created' && (
                                  <span className="text-gray-400">→</span>
                                )}
                                <span className="text-green-600 font-medium truncate max-w-[80px] sm:max-w-none">{history.stage?.name || 'N/A'}</span>
                              </div>
                            )}
                            
                            {/* Notas adicionais */}
                            {history.notes && history.notes !== 'Registro inicial criado pela migration' && (
                              <div className="mt-1 sm:mt-2 p-1.5 sm:p-2 bg-gray-50 rounded text-gray-600 italic text-[9px] sm:text-xs">
                                {history.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Sempre visível */}
        {isEditing && (
          <div className="flex gap-2 p-2 sm:p-3 lg:p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={handleCancel}
              className="flex-1 px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-orange-500 border border-transparent rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          leadId={currentLead?.id}
          onTaskCreated={() => {
            console.log('🔄 Tarefa criada para lead, recarregando tarefas...')
            loadLeadTasksData()
          }}
        />

        {/* Modal de Edição de Tarefa */}
        <EditTaskModal
          isOpen={showEditTaskModal}
          task={selectedTaskForEdit}
          onClose={() => {
            setShowEditTaskModal(false)
            setSelectedTaskForEdit(null)
          }}
          onSubmit={async (taskData: Partial<Task>) => {
            if (!selectedTaskForEdit) return
            
            try {
              await updateTask(selectedTaskForEdit.id, taskData)
              console.log('✅ Tarefa atualizada, recarregando tarefas...')
              await loadLeadTasksData()
              setShowEditTaskModal(false)
              setSelectedTaskForEdit(null)
            } catch (error) {
              console.error('Erro ao atualizar tarefa:', error)
              showError('Erro ao atualizar tarefa')
            }
          }}
        />

      {/* Modal de seleção de instância para iniciar conversa */}
      <SelectInstanceModal
        isOpen={showSelectInstance}
        onClose={() => setShowSelectInstance(false)}
        allowedInstanceIds={allowedInstanceIds || undefined}
        onSelect={async (instanceId) => {
          try {
            if (!pendingChatPhone || !currentLead?.id) return
            setShowSelectInstance(false)
            setStartingChat(true)
            const conversation = await findOrCreateConversationByPhone(pendingChatPhone, currentLead.id, instanceId)
            if (conversation) {
              window.open(`/chat?conversation=${conversation.id}`, '_blank')
            }
          } catch (error) {
            console.error('Erro ao iniciar conversa com instância selecionada:', error)
            showError('Erro ao iniciar conversa. Tente novamente.')
          } finally {
            setStartingChat(false)
            setPendingChatPhone(null)
            setAllowedInstanceIds(null)
          }
        }}
      />

      {/* Modal de motivo de perda */}
      {currentLead && (
        <LossReasonModal
          isOpen={showLossReasonModal}
          onClose={() => setShowLossReasonModal(false)}
          onConfirm={handleMarkAsLost}
          leadName={currentLead.name}
          pipelineId={currentLead.pipeline_id}
          isLoading={markingAsLost}
        />
      )}

      {/* Modal de reativação de lead */}
      {showReactivateModal && currentLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reativar Lead
              </h3>
              
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Lead:</strong> {currentLead.name}
                </p>
                <p className="text-sm text-yellow-800 mt-2">
                  <strong>Motivo da perda:</strong>{' '}
                  {getLossReasonLabel(currentLead.loss_reason_category, lossReasons)}
                </p>
                {currentLead.loss_reason_notes && (
                  <p className="text-sm text-yellow-800 mt-1">
                    {currentLead.loss_reason_notes}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo da reativação (opcional)
                </label>
                <textarea
                  value={reactivationNotes}
                  onChange={(e) => setReactivationNotes(e.target.value)}
                  placeholder="Ex: Cliente retornou interesse, nova oportunidade identificada..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={reactivating}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReactivateModal(false)
                    setReactivationNotes('')
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  disabled={reactivating}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReactivate}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={reactivating}
                >
                  {reactivating ? 'Reativando...' : 'Reativar Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de venda concluída */}
      {currentLead && (
        <SaleModal
          isOpen={showSaleModal}
          onClose={() => setShowSaleModal(false)}
          onConfirm={handleMarkAsSold}
          leadName={currentLead.name}
          estimatedValue={currentLead.value}
          isLoading={markingAsSold}
        />
      )}

      {/* Modal de desmarcar venda */}
      {showUnmarkSaleModal && currentLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Desmarcar Venda
              </h3>
              
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Lead:</strong> {currentLead.name}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Valor da venda:</strong>{' '}
                  {currentLead.sold_value ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(currentLead.sold_value) : 'N/A'}
                </p>
                {currentLead.sale_notes && (
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Observações:</strong> {currentLead.sale_notes}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo da desmarcação (opcional)
                </label>
                <textarea
                  value={unmarkSaleNotes}
                  onChange={(e) => setUnmarkSaleNotes(e.target.value)}
                  placeholder="Ex: Venda cancelada, erro na marcação..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={unmarkingSale}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUnmarkSaleModal(false)
                    setUnmarkSaleNotes('')
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  disabled={unmarkingSale}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUnmarkSale}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={unmarkingSale}
                >
                  {unmarkingSale ? 'Desmarcando...' : 'Desmarcar Venda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de seleção de conversa (múltiplas conversas) */}
      <SelectConversationModal
        isOpen={showSelectConversation}
        onClose={() => setShowSelectConversation(false)}
        conversations={availableConversations}
        onSelect={(conversation) => {
          setSelectedViewConversation(conversation)
          setShowConversationView(true)
        }}
      />

      {/* Modal de visualização de conversa */}
      <ConversationViewModal
        isOpen={showConversationView}
        onClose={() => {
          setShowConversationView(false)
          setSelectedViewConversation(null)
        }}
        conversation={selectedViewConversation}
      />
      </div>
    </div>
  )
} 