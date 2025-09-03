import { useState, useEffect, useCallback } from 'react'
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
  // Cache de leads por pipeline para pré-busca paralela com stages
  const [allLeadsCache, setAllLeadsCache] = useState<Lead[] | null>(null)

  // Estados do modal de criação de lead
  const [showNewLeadForm, setShowNewLeadForm] = useState(false)
  const [newLeadStageId, setNewLeadStageId] = useState<string>('')

  // Estados do formulário de criação
  const [newLeadData, setNewLeadData] = useState<CreateLeadData>({
    name: '',
    company: '',
    value: 0,
    phone: '',
    email: '',
    origin: '',
    status: 'quente',
    notes: '',
    pipeline_id: '',
    stage_id: '',
    responsible_uuid: user?.id || ''
  })

  // Pré-buscar todos os leads assim que o pipeline for selecionado (em paralelo aos stages)
  useEffect(() => {
    async function prefetchPipelineLeads() {
      if (!selectedPipeline) {
        setAllLeadsCache(null)
        return
      }

      try {
        setLeadsLoading(true)
        const { data: allLeads, reachedLimit, total } = await getLeadsByPipeline(selectedPipeline)
        setAllLeadsCache(allLeads || [])
        setLeadsLimitReached(!!reachedLimit)
        setTotalLeads(total || 0)

        // Se os stages já estão carregados, mapear imediatamente
        if (stages.length > 0 && allLeads) {
          const leadsMap: { [key: string]: Lead[] } = {}
          stages.forEach(stage => { leadsMap[stage.id] = [] })
          allLeads.forEach(lead => { if (lead.stage_id && leadsMap[lead.stage_id]) leadsMap[lead.stage_id].push(lead) })
          setLeadsByStage(leadsMap)
        }
      } catch (error) {
        console.error('❌ Pré-busca de leads falhou:', error)
        setAllLeadsCache(null)
      } finally {
        setLeadsLoading(false)
      }
    }

    prefetchPipelineLeads()
  }, [selectedPipeline])

  // Carregar leads quando stages mudarem - VERSÃO OTIMIZADA (usa cache se disponível)
  useEffect(() => {
    async function loadLeadsForStages() {
      if (!selectedPipeline) {
        console.log('⚠️ Não há stages ou pipeline selecionado')
        return
      }

      console.log('🔄 INÍCIO - Carregando leads do pipeline:', selectedPipeline)
      console.log('📊 Stages a carregar:', stages.length, stages.map(s => s.name))
      
      const startTime = performance.now()

      try {
        setLeadsLoading(true)
        // Se já temos cache (pré-busca), usar imediatamente para mapear
        let allLeads = allLeadsCache
        if (!allLeads) {
          console.log('⚡ Sem cache — buscando todos os leads do pipeline')
          const fetched = await getLeadsByPipeline(selectedPipeline)
          allLeads = fetched.data || []
          setLeadsLimitReached(!!fetched.reachedLimit)
          setTotalLeads(fetched.total || 0)
          setAllLeadsCache(allLeads)
        } else {
          console.log('⚡ Usando cache pré-carregado de leads')
        }
        console.log('✅ Leads prontos para mapear:', allLeads?.length || 0)
        
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
        
      } catch (error) {
        console.error('❌ Erro ao carregar leads do pipeline:', error)
        
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
      }
      
      const endTime = performance.now()
      console.log(`⏱️ CONCLUÍDO - Tempo total de carregamento: ${(endTime - startTime).toFixed(2)}ms`)
      setLeadsLoading(false)
    }

    loadLeadsForStages()
  }, [stages, selectedPipeline, allLeadsCache])

  // Função para recarregar leads manualmente
  const reloadLeads = useCallback(async () => {
    if (!stages.length || !selectedPipeline) {
      return
    }

    console.log('🔄 Recarregando leads manualmente...')
    const startTime = performance.now()

    try {
      setLeadsLoading(true)
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
    } catch (error) {
      console.error('❌ Erro ao recarregar leads:', error)
    }
    setLeadsLoading(false)
  }, [stages, selectedPipeline])

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
          status: 'quente',
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