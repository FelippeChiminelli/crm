import { useState, useCallback, useEffect } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import { usePagination } from './usePagination'
import { useDeleteConfirmation } from './useDeleteConfirmation'
import { getStagesByPipeline } from '../services/stageService'
import { getLeads, deleteLead, createLead, type GetLeadsParams, type CreateLeadData } from '../services/leadService'
import { getPipelines } from '../services/pipelineService'
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
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')

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
        created_at: selectedDate || undefined
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
      console.error('Erro ao carregar leads:', err)
    } finally {
      setLoading(false)
    }
  }, [pagination.pagination.page, pagination.pagination.limit, searchTerm, selectedStatus, selectedPipeline, selectedStage, selectedDate])

  // Função para aplicar filtros manualmente
  const applyFilters = useCallback((filters: {
    search: string
    pipeline: string
    stage: string
    status: string
    date: string
  }) => {
    setSearchTerm(filters.search)
    setSelectedPipeline(filters.pipeline)
    setSelectedStage(filters.stage)
    setSelectedStatus(filters.status)
    setSelectedDate(filters.date)
    pagination.setPage(1) // Resetar para primeira página
  }, [pagination])

  // Função para carregar pipelines
  const loadPipelines = useCallback(async () => {
    try {
      const result = await getPipelines()
      if (result.error) {
        console.error('Erro ao carregar pipelines:', result.error)
        return
      }
      setPipelines(result.data || [])
      
      // Carregar todos os stages de todos os pipelines para os seletores inline
      if (result.data && result.data.length > 0) {
        const allStages: Stage[] = []
        for (const pipeline of result.data) {
          const { data: stagesData } = await getStagesByPipeline(pipeline.id)
          if (stagesData) {
            allStages.push(...stagesData)
          }
        }
        setStages(allStages)
      }
    } catch (err) {
      console.error('Erro ao carregar pipelines:', err)
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
      
      console.log('📤 Enviando dados para createLead:', leadToCreate)
      console.log('📤 stage_id sendo enviado:', leadToCreate.stage_id)
      console.log('📤 pipeline_id sendo enviado:', leadToCreate.pipeline_id)
      const result = await createLead(leadToCreate)
      console.log('🔍 Resultado completo do createLead:', result)
      console.log('🔍 result.data:', result.data)
      console.log('🔍 result.error:', result.error)
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      console.log('✅ Lead criado com sucesso no submitCreateLead:', result.data)
      console.log('✅ Tipo do lead criado:', typeof result.data)
      console.log('✅ Lead tem ID?', result.data?.id ? 'Sim' : 'Não')
      console.log('✅ ID do lead:', result.data?.id)
      
      // Retornar o lead criado para que o modal possa acessar o ID
      // O modal fechará e recarregará a página após salvar os campos personalizados
      console.log('🔄 Retornando lead criado:', result.data)
      return result.data
    } catch (err: any) {
      console.error('Erro ao criar lead:', err)
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
    setSelectedDate('')
    pagination.reset()
  }



  return {
    // Estados
    leads,
    pipelines,
    stages,
    loading,
    error,
    searchTerm,
    selectedPipeline,
    selectedStage,
    selectedStatus,
    selectedDate,

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