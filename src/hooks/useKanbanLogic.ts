import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import { useDeleteConfirmation } from './useDeleteConfirmation'
import { getLeadsByPipeline, getLeadsByStage, createLead, deleteLead } from '../services/leadService'
import type { CreateLeadData } from '../services/leadService'
import type { Lead } from '../types'

interface UseKanbanLogicProps {
  selectedPipeline: string
  stages: any[]
}

export function useKanbanLogic({ selectedPipeline, stages }: UseKanbanLogicProps) {
  const { user } = useAuthContext()
  const { showError } = useToastContext()
  const { executeDelete } = useDeleteConfirmation({
    defaultConfirmMessage: 'Tem certeza que deseja excluir este lead?',
    defaultErrorContext: 'ao excluir lead'
  })
  const [leadsByStage, setLeadsByStage] = useState<{ [key: string]: Lead[] }>({})
  const [leadsLimitReached, setLeadsLimitReached] = useState(false)
  const [totalLeads, setTotalLeads] = useState(0)
  const [leadsLoading, setLeadsLoading] = useState(false)
  // Flag para controlar se já estamos carregando leads (evita duplicação)
  const [isLoadingLeads, setIsLoadingLeads] = useState(false)
  // Ref para armazenar o último estado carregado (pipeline + stages)
  const lastLoadedStateRef = useRef<string>('')

  // Estados do modal de criação de lead
  const [showNewLeadForm, setShowNewLeadForm] = useState(false)
  const [newLeadStageId, setNewLeadStageId] = useState<string>('')

  // Criar identificador único para a combinação pipeline + stages
  const currentStateId = useMemo(() => {
    if (!selectedPipeline || stages.length === 0) return ''
    return `${selectedPipeline}:${stages.map(s => s.id).sort().join(',')}`
  }, [selectedPipeline, stages])

  // Estados do formulário de criação
  const [newLeadData, setNewLeadData] = useState<CreateLeadData>({
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

  // OTIMIZAÇÃO: Carregar leads uma única vez quando pipeline ou stages mudarem
  useEffect(() => {
    async function loadPipelineLeads() {
      // Não carregar se não há pipeline ou não há stages ainda
      if (!selectedPipeline || stages.length === 0) {
        // Limpar leads sempre que não houver pipeline ou stages
        // Isso garante que não exibimos leads do pipeline anterior durante a troca
        setLeadsByStage({})
        if (!selectedPipeline) {
          lastLoadedStateRef.current = ''
        }
        console.log('⏸️ Aguardando pipeline e stages...', { selectedPipeline, stagesCount: stages.length })
        setLeadsLoading(false)
        return
      }

      // Verificar se já carregamos este estado exato
      if (lastLoadedStateRef.current === currentStateId) {
        console.log('✅ Leads já carregados para este estado, pulando...', currentStateId)
        return
      }

      // Se já estamos carregando E é para um estado diferente, 
      // significa que o usuário trocou de pipeline durante o carregamento
      // Neste caso, vamos resetar e permitir que o novo carregamento prossiga
      if (isLoadingLeads && lastLoadedStateRef.current !== currentStateId) {
        console.log('🔄 Pipeline/stages mudaram durante carregamento. Cancelando carregamento anterior...')
        setIsLoadingLeads(false)
        // Permitir que o novo carregamento prossiga
      }

      console.log('🔄 INÍCIO - Carregando leads do pipeline:', selectedPipeline)
      console.log('📊 Stages disponíveis:', stages.length, stages.map(s => s.name))
      console.log('🆔 Estado atual:', currentStateId)
      
      const startTime = performance.now()

      try {
        setIsLoadingLeads(true)
        setLeadsLoading(true)
        
        // Buscar todos os leads do pipeline de uma vez
        console.log('⚡ Buscando todos os leads do pipeline')
        const { data: allLeads, reachedLimit, total } = await getLeadsByPipeline(selectedPipeline)
        
        setLeadsLimitReached(!!reachedLimit)
        setTotalLeads(total || 0)
        console.log('✅ Leads carregados:', allLeads?.length || 0, 'Limite atingido:', reachedLimit, 'Total:', total)
        
        // Agrupar leads por stage no frontend
        const leadsMap: { [key: string]: Lead[] } = {}
        
        // Inicializar todos os stages com array vazio
        stages.forEach(stage => {
          leadsMap[stage.id] = []
        })
        
        // Distribuir leads nos stages correspondentes
        if (allLeads) {
          allLeads.forEach(lead => {
            if (lead.stage_id && leadsMap[lead.stage_id]) {
              leadsMap[lead.stage_id].push(lead)
            }
          })
        }
        
        // Log dos resultados por stage
        console.log('📈 Distribuição de leads por stage:')
        Object.entries(leadsMap).forEach(([stageId, stageLeads]) => {
          const stageName = stages.find(s => s.id === stageId)?.name || 'Desconhecido'
          console.log(`  - ${stageName}: ${stageLeads.length} leads`)
        })
        
        setLeadsByStage(leadsMap)
        
        // Marcar este estado como carregado
        lastLoadedStateRef.current = currentStateId
        
      } catch (error) {
        console.error('❌ Erro ao carregar leads do pipeline:', error)
        // Limpar em caso de erro para permitir retry
        lastLoadedStateRef.current = ''
        
        // Fallback: Se a consulta otimizada falhar, usar o método antigo como backup
        console.log('🔄 Tentando método de fallback com consultas individuais...')
        const leadsMap: { [key: string]: Lead[] } = {}
        
        // Usar Promise.all para consultas paralelas em vez de sequenciais
        const leadPromises = stages.map(async (stage) => {
          try {
            const { data } = await getLeadsByStage(stage.id)
            return { stageId: stage.id, leads: data || [] }
          } catch (err) {
            console.error(`❌ Erro ao carregar leads do stage ${stage.name}:`, err)
            return { stageId: stage.id, leads: [] }
          }
        })
        
        const results = await Promise.all(leadPromises)
        
        results.forEach(({ stageId, leads }) => {
          leadsMap[stageId] = leads
        })
        
        setLeadsByStage(leadsMap)
      } finally {
        const endTime = performance.now()
        console.log(`⏱️ CONCLUÍDO - Tempo total de carregamento: ${(endTime - startTime).toFixed(2)}ms`)
        setLeadsLoading(false)
        setIsLoadingLeads(false)
      }
    }

    loadPipelineLeads()
  }, [currentStateId]) // Reagir quando o estado único mudar (pipeline + stages)

  // Função para recarregar leads manualmente
  const reloadLeads = useCallback(async () => {
    if (!stages.length || !selectedPipeline) {
      return
    }

    console.log('🔄 Recarregando leads manualmente...')
    // Limpar cache para forçar reload
    lastLoadedStateRef.current = ''
    const startTime = performance.now()

    try {
      setLeadsLoading(true)
      setIsLoadingLeads(true)
      // OTIMIZAÇÃO: Buscar todos os leads do pipeline de uma vez
      const { data: allLeads, reachedLimit, total } = await getLeadsByPipeline(selectedPipeline)
      setLeadsLimitReached(!!reachedLimit)
      setTotalLeads(total || 0)
      console.log('✅ Leads recarregados:', allLeads?.length || 0, 'Limite atingido:', reachedLimit, 'Total:', total)
      
      // Agrupar leads por stage no frontend
      const leadsMap: { [key: string]: Lead[] } = {}
      
      // Inicializar todos os stages com array vazio
      stages.forEach(stage => {
        leadsMap[stage.id] = []
      })
      
      // Distribuir leads nos stages correspondentes
      if (allLeads) {
        allLeads.forEach(lead => {
          if (leadsMap[lead.stage_id]) {
            leadsMap[lead.stage_id].push(lead)
          }
        })
      }

      setLeadsByStage(leadsMap)
      
      // Log da distribuição
      console.log('📈 Distribuição de leads por stage:')
      stages.forEach(stage => {
        console.log(`  - ${stage.name}: ${leadsMap[stage.id]?.length || 0} leads`)
      })
      
      const endTime = performance.now()
      console.log(`⏱️ RECARREGAMENTO CONCLUÍDO - Tempo: ${(endTime - startTime).toFixed(2)}ms`)
      
      // Atualizar cache com o estado atual
      if (currentStateId) {
        lastLoadedStateRef.current = currentStateId
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar leads:', error)
      lastLoadedStateRef.current = ''
    } finally {
      setLeadsLoading(false)
      setIsLoadingLeads(false)
    }
  }, [stages, selectedPipeline, currentStateId])

  const handleCreateLead = async () => {
    if (!user) return
    
    try {
      const { data } = await createLead({
        ...newLeadData,
        stage_id: newLeadStageId,
        pipeline_id: selectedPipeline,
        responsible_uuid: user.id
      })
      
      if (data) {
        setLeadsByStage(prev => ({
          ...prev,
          [newLeadStageId]: [...(prev[newLeadStageId] || []), data]
        }))
        
        // Reset form
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
          responsible_uuid: user.id
        })
        setShowNewLeadForm(false)
      }
    } catch (error) {
      console.error('Erro ao criar lead:', error)
      showError('Erro ao criar lead', 'Tente novamente.')
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    const result = await executeDelete(
      () => deleteLead(leadId),
      'Tem certeza que deseja excluir este lead?',
      'ao excluir lead'
    )
    
    if (result !== null) {
      // Remover do estado local
      setLeadsByStage(prev => {
        const newState = { ...prev }
        
        Object.keys(newState).forEach(stageId => {
          newState[stageId] = newState[stageId].filter(lead => lead.id !== leadId)
        })
        
        return newState
      })
    }
  }

  const openNewLeadForm = (stageId: string) => {
    setNewLeadStageId(stageId)
    setShowNewLeadForm(true)
  }

  const closeNewLeadForm = () => {
    setShowNewLeadForm(false)
    setNewLeadStageId('')
  }

  return {
    // Estados
    leadsByStage,
    setLeadsByStage,
    leadsLimitReached,
    totalLeads,
    leadsLoading,
    newLeadStageId,
    
    // Modal de criação
    showNewLeadForm,
    newLeadData,
    setNewLeadData,
    
    // Funções
    handleCreateLead,
    handleDeleteLead,
    openNewLeadForm,
    closeNewLeadForm,
    reloadLeads
  }
} 