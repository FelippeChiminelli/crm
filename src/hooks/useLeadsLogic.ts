import { useState, useCallback, useEffect } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import { usePagination } from './usePagination'
import { useDeleteConfirmation } from './useDeleteConfirmation'
import { getLeads, deleteLead, createLead, type GetLeadsParams, type CreateLeadData, type CustomFieldFilter } from '../services/leadService'
import { getPipelines, getAllPipelinesForTransfer } from '../services/pipelineService'
import { supabase } from '../services/supabaseClient'
import SecureLogger from '../utils/logger'
import type { Lead, Stage, Pipeline } from '../types'

export function useLeadsLogic() {
  const { user } = useAuthContext()
  const { showError } = useToastContext()
  const { executeDelete } = useDeleteConfirmation({
    defaultConfirmMessage: 'Tem certeza que deseja excluir este lead?',
    defaultErrorContext: 'ao deletar lead'
  })
  
  // Estados para dados
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [allPipelinesForTransfer, setAllPipelinesForTransfer] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedDateFrom, setSelectedDateFrom] = useState<string>('')
  const [selectedDateTo, setSelectedDateTo] = useState<string>('')
  const [selectedResponsible, setSelectedResponsible] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedOrigin, setSelectedOrigin] = useState<string>('')
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilter[]>([])
  const [showLostLeads, setShowLostLeads] = useState(false)
  const [showSoldLeads, setShowSoldLeads] = useState(false)
  const [selectedLossReasons, setSelectedLossReasons] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'origin' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Estados do modal de criação de lead
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)
  const [newLeadData, setNewLeadData] = useState<any>({
    name: '',
    company: '',
    value: 0,
    phone: '',
    email: '',
    origin: '',
    status: undefined,
    notes: '',
    pipeline_id: '',
    stage_id: '',
    responsible_uuid: user?.id || ''
  })
  const [isCreatingLead, setIsCreatingLead] = useState(false)

  // Paginação
  const pagination = usePagination({ initialLimit: 25 })

  // Função para carregar leads
  const loadLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params: GetLeadsParams = {
        page: pagination.pagination.page,
        limit: pagination.pagination.limit,
        search: searchTerm || undefined,
        status: selectedStatus || undefined,
        pipeline_id: selectedPipeline || undefined,
        stage_id: selectedStage || undefined,
        dateFrom: selectedDateFrom || undefined,
        dateTo: selectedDateTo || undefined,
        responsible_uuid: selectedResponsible || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        origin: selectedOrigin || undefined,
        customFieldFilters: customFieldFilters.length > 0 ? customFieldFilters : undefined,
        showLostLeads,
        showSoldLeads,
        selectedLossReasons: selectedLossReasons.length > 0 ? selectedLossReasons : undefined,
        sortBy,
        sortOrder
      }
      


      const result = await getLeads(params)
      
      if (result.error) {
        setError(result.error.message)
        return
      }

      setLeads(result.data || [])
      pagination.setTotal(result.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar leads')
      SecureLogger.error('Erro ao carregar leads:', err)
    } finally {
      setLoading(false)
    }
  }, [pagination.pagination.page, pagination.pagination.limit, searchTerm, selectedStatus, selectedPipeline, selectedStage, selectedDateFrom, selectedDateTo, selectedResponsible, selectedTags, selectedOrigin, customFieldFilters, showLostLeads, showSoldLeads, selectedLossReasons, sortBy, sortOrder])

  // Função para aplicar filtros manualmente
  const applyFilters = useCallback((filters: {
    search: string
    pipeline: string
    stage: string
    status: string
    dateFrom?: string
    dateTo?: string
    responsible?: string
    tags?: string[]
    origin?: string
    customFieldFilters?: CustomFieldFilter[]
    showLostLeads?: boolean
    showSoldLeads?: boolean
    selectedLossReasons?: string[]
  }) => {
    setSearchTerm(filters.search)
    setSelectedPipeline(filters.pipeline)
    setSelectedStage(filters.stage)
    setSelectedStatus(filters.status)
    setSelectedDateFrom(filters.dateFrom || '')
    setSelectedDateTo(filters.dateTo || '')
    setSelectedResponsible(filters.responsible || '')
    setSelectedTags(filters.tags || [])
    setSelectedOrigin(filters.origin || '')
    setCustomFieldFilters(filters.customFieldFilters || [])
    setShowLostLeads(filters.showLostLeads ?? false)
    setShowSoldLeads(filters.showSoldLeads ?? false)
    setSelectedLossReasons(filters.selectedLossReasons || [])
    pagination.setPage(1) // Resetar para primeira página
  }, [pagination])

  // Função para carregar pipelines
  const loadPipelines = useCallback(async () => {
    try {
      // Carregar pipelines com permissão (para visualização e criação)
      const result = await getPipelines()
      if (result.error) {
        SecureLogger.error('Erro ao carregar pipelines:', result.error)
        return
      }
      setPipelines(result.data || [])
      
      // Carregar TODOS os pipelines (para transferência inline)
      const allResult = await getAllPipelinesForTransfer()
      if (allResult.error) {
        SecureLogger.error('Erro ao carregar pipelines para transferência:', allResult.error)
      } else {
        setAllPipelinesForTransfer(allResult.data || [])
      }
      
      // ✅ OTIMIZAÇÃO: Carregar todos os stages em uma única query (em vez de loop N+1)
      if (allResult.data && allResult.data.length > 0) {
        const pipelineIds = allResult.data.map(p => p.id)
        const { data: allStages } = await supabase
          .from('stages')
          .select('*')
          .in('pipeline_id', pipelineIds)
          .order('pipeline_id, position')
        
        setStages(allStages || [])
      }
    } catch (err) {
      SecureLogger.error('Erro ao carregar pipelines:', err)
    }
  }, [])

  // Carregar dados iniciais
  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  useEffect(() => {
    loadPipelines()
  }, [loadPipelines])

  // Nota: Os stages agora são carregados junto com os pipelines
  // Este useEffect foi removido pois os stages são carregados globalmente

  // Atualizar responsible_uuid quando usuário mudar
  useEffect(() => {
    if (user?.id) {
      setNewLeadData((prev: CreateLeadData) => ({
        ...prev,
        responsible_uuid: user.id
      }))
    }
  }, [user?.id])

  // Função para abrir modal de criação de lead
  const handleCreateLead = async () => {
    // Resetar dados do formulário
    setNewLeadData({
      name: '',
      company: '',
      value: 0,
      phone: '',
      email: '',
      origin: '',
      status: undefined,
      notes: '',
      pipeline_id: '',
      stage_id: '',
      responsible_uuid: user?.id || ''
    })
    setShowNewLeadModal(true)
  }

  // Função para fechar modal de criação
  const closeNewLeadModal = () => {
    setShowNewLeadModal(false)
    setNewLeadData({
      name: '',
      company: '',
      value: 0,
      phone: '',
      email: '',
      origin: '',
      status: undefined,
      notes: '',
      pipeline_id: '',
      stage_id: '',
      responsible_uuid: user?.id || ''
    })
  }

  // Função para criar lead
  const submitCreateLead = async () => {
    if (!newLeadData.name.trim()) {
      showError('Nome obrigatório', 'Nome do lead é obrigatório')
      return
    }

    if (!newLeadData.pipeline_id) {
      showError('Pipeline obrigatório', 'Selecione um funil')
      return
    }

    if (!newLeadData.stage_id) {
      showError('Etapa obrigatória', 'Selecione uma etapa')
      return
    }

    if (!user) {
      showError('Usuário não encontrado', 'Usuário não encontrado')
      return
    }

    setIsCreatingLead(true)
    try {
      const leadToCreate: CreateLeadData = {
        ...newLeadData,
        responsible_uuid: user.id
      }
      
      SecureLogger.log('📤 Enviando dados para createLead:', leadToCreate)
      SecureLogger.log('📤 stage_id sendo enviado:', leadToCreate.stage_id)
      SecureLogger.log('📤 pipeline_id sendo enviado:', leadToCreate.pipeline_id)
      const result = await createLead(leadToCreate)
      SecureLogger.log('🔍 Resultado completo do createLead:', result)
      SecureLogger.log('🔍 result.data:', result.data)
      SecureLogger.log('🔍 result.error:', result.error)
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      SecureLogger.log('✅ Lead criado com sucesso no submitCreateLead:', result.data)
      SecureLogger.log('✅ Tipo do lead criado:', typeof result.data)
      SecureLogger.log('✅ Lead tem ID?', result.data?.id ? 'Sim' : 'Não')
      SecureLogger.log('✅ ID do lead:', result.data?.id)
      
      // Retornar o lead criado para que o modal possa acessar o ID
      // O modal fechará e recarregará a página após salvar os campos personalizados
      SecureLogger.log('🔄 Retornando lead criado:', result.data)
      return result.data
    } catch (err: any) {
      SecureLogger.error('Erro ao criar lead:', err)
      setError(err.message || 'Erro ao criar lead')
      showError('Erro ao criar lead', err.message || 'Erro desconhecido')
      return null
    } finally {
      setIsCreatingLead(false)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    const result = await executeDelete(
      () => deleteLead(leadId),
      'Tem certeza que deseja excluir este lead?',
      'ao deletar lead'
    )
    
    if (result !== null) {
      await loadLeads() // Recarregar dados após deletar
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedPipeline('')
    setSelectedStage('')
    setSelectedStatus('')
    setSelectedDateFrom('')
    setSelectedDateTo('')
    setSelectedResponsible('')
    setSelectedTags([])
    setSelectedOrigin('')
    setCustomFieldFilters([])
    setShowLostLeads(false)
    setShowSoldLeads(false)
    setSelectedLossReasons([])
    pagination.reset()
  }



  return {
    // Estados
    leads,
    pipelines,
    allPipelinesForTransfer,
    stages,
    loading,
    error,
    searchTerm,
    selectedPipeline,
    selectedStage,
    selectedStatus,
    selectedDateFrom,
    selectedDateTo,
    selectedResponsible,
    selectedTags,
    selectedOrigin,
    customFieldFilters,
    showLostLeads,
    setShowLostLeads,
    showSoldLeads,
    setShowSoldLeads,
    selectedLossReasons,
    setSelectedLossReasons,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Estados do modal de criação
    showNewLeadModal,
    newLeadData,
    setNewLeadData,
    isCreatingLead,

    // Paginação
    pagination: pagination.pagination,
    setPage: pagination.setPage,
    setLimit: pagination.setLimit,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
    canNextPage: pagination.canNextPage,
    canPrevPage: pagination.canPrevPage,

    // Setters
    setLeads,
    setSearchTerm,

    // Handlers
    applyFilters,
    handleCreateLead,
    closeNewLeadModal,
    submitCreateLead,
    handleDeleteLead,
    clearFilters,
    refreshLeads: loadLeads,
    loadLeads
  }
} 