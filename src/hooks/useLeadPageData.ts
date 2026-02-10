import { useState, useEffect, useCallback } from 'react'
import { getLeadById, getLeadHistory } from '../services/leadService'
import { getPipelines } from '../services/pipelineService'
import { getStagesByPipeline } from '../services/stageService'
import { getEmpresaUsers } from '../services/empresaService'
import { getLeadTasks } from '../services/taskService'
import { getCustomFieldsByPipeline } from '../services/leadCustomFieldService'
import { getCustomValuesByLead } from '../services/leadCustomValueService'
import { getConversationsByLeadId } from '../services/chatService'
import { getLossReasons } from '../services/lossReasonService'
import type { Lead, Pipeline, Stage, LeadHistoryEntry, Task, LeadCustomField, LeadCustomValue, LossReason } from '../types'

interface LeadPageData {
  lead: Lead | null
  pipelines: Pipeline[]
  stages: Stage[]
  history: LeadHistoryEntry[]
  tasks: Task[]
  customFields: LeadCustomField[]
  customValues: LeadCustomValue[]
  conversations: any[]
  users: any[]
  lossReasons: LossReason[]
  loading: boolean
  error: string | null
}

export function useLeadPageData(leadId: string | undefined) {
  const [data, setData] = useState<LeadPageData>({
    lead: null,
    pipelines: [],
    stages: [],
    history: [],
    tasks: [],
    customFields: [],
    customValues: [],
    conversations: [],
    users: [],
    lossReasons: [],
    loading: true,
    error: null,
  })

  const loadLead = useCallback(async () => {
    if (!leadId) {
      setData(prev => ({ ...prev, loading: false, error: 'ID do lead não fornecido' }))
      return
    }

    setData(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Carregar lead principal
      const { data: leadData, error: leadError } = await getLeadById(leadId)
      if (leadError || !leadData) {
        throw new Error('Lead não encontrado')
      }

      // Carregar dados em paralelo
      const [
        pipelinesResult,
        stagesResult,
        historyResult,
        tasksData,
        customFieldsResult,
        customValuesResult,
        conversationsData,
        usersData,
        lossReasonsResult,
      ] = await Promise.all([
        getPipelines(),
        getStagesByPipeline(leadData.pipeline_id),
        getLeadHistory(leadId),
        getLeadTasks(leadId),
        getCustomFieldsByPipeline(leadData.pipeline_id),
        getCustomValuesByLead(leadId),
        getConversationsByLeadId(leadId).catch(() => []),
        getEmpresaUsers().catch(() => []),
        getLossReasons(leadData.pipeline_id).catch(() => ({ data: [] })),
      ])

      setData({
        lead: leadData as Lead,
        pipelines: (pipelinesResult?.data || []) as Pipeline[],
        stages: (stagesResult?.data || []) as Stage[],
        history: (historyResult?.data || []) as LeadHistoryEntry[],
        tasks: (tasksData || []) as Task[],
        customFields: (customFieldsResult?.data || []) as LeadCustomField[],
        customValues: (customValuesResult?.data || []) as LeadCustomValue[],
        conversations: conversationsData || [],
        users: usersData || [],
        lossReasons: ((lossReasonsResult as any)?.data || []) as LossReason[],
        loading: false,
        error: null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados do lead'
      setData(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [leadId])

  // Carregar dados ao montar
  useEffect(() => {
    loadLead()
  }, [loadLead])

  // Recarregar stages quando pipeline mudar
  const reloadStages = useCallback(async (pipelineId: string) => {
    const result = await getStagesByPipeline(pipelineId)
    setData(prev => ({ ...prev, stages: (result?.data || []) as Stage[] }))
  }, [])

  // Atualizar lead local
  const updateLeadLocal = useCallback((updatedLead: Lead) => {
    setData(prev => ({ ...prev, lead: updatedLead }))
  }, [])

  // Recarregar seções específicas
  const reloadHistory = useCallback(async () => {
    if (!leadId) return
    const result = await getLeadHistory(leadId)
    setData(prev => ({ ...prev, history: (result?.data || []) as LeadHistoryEntry[] }))
  }, [leadId])

  const reloadTasks = useCallback(async () => {
    if (!leadId) return
    const tasksData = await getLeadTasks(leadId)
    setData(prev => ({ ...prev, tasks: (tasksData || []) as Task[] }))
  }, [leadId])

  const reloadConversations = useCallback(async () => {
    if (!leadId) return
    try {
      const conversationsData = await getConversationsByLeadId(leadId)
      setData(prev => ({ ...prev, conversations: conversationsData || [] }))
    } catch {
      // silenciar erros de conversas
    }
  }, [leadId])

  const reloadCustomValues = useCallback(async () => {
    if (!leadId) return
    const result = await getCustomValuesByLead(leadId)
    setData(prev => ({ ...prev, customValues: (result?.data || []) as LeadCustomValue[] }))
  }, [leadId])

  return {
    ...data,
    reload: loadLead,
    reloadStages,
    reloadHistory,
    reloadTasks,
    reloadConversations,
    reloadCustomValues,
    updateLeadLocal,
  }
}
