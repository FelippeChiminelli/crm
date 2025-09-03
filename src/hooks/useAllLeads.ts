import { useState, useCallback } from 'react'
import { getPipelines } from '../services/pipelineService'
import { getLeadsByPipeline } from '../services/leadService'
import type { Lead, Pipeline } from '../types'

interface UseAllLeadsReturn {
  allLeads: Lead[]
  pipelines: Pipeline[]
  loading: boolean
  error: string | null
  fetchAllLeads: () => Promise<void>
  refreshLeads: () => Promise<void>
  getLeadsByPipelineMap: () => { [pipelineName: string]: number }
}

export function useAllLeads(): UseAllLeadsReturn {
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Carregar pipelines
      const { data: pipelinesData, error: pipelinesError } = await getPipelines()
      if (pipelinesError) throw new Error(pipelinesError.message)
      
      const pipelinesList = pipelinesData || []
      setPipelines(pipelinesList)

      // Carregar leads de todos os pipelines
      let leadsAccumulator: Lead[] = []
      
      for (const pipeline of pipelinesList) {
        const { data: leadsData, error: leadsError } = await getLeadsByPipeline(pipeline.id)
        if (leadsError) {
          console.warn(`Erro ao carregar leads do pipeline ${pipeline.name}:`, leadsError)
          continue
        }
        if (leadsData) {
          leadsAccumulator = [...leadsAccumulator, ...leadsData]
        }
      }
      
      setAllLeads(leadsAccumulator)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar leads'
      setError(errorMessage)
      console.error('Erro em useAllLeads:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshLeads = fetchAllLeads

  const getLeadsByPipelineMap = useCallback(() => {
    const leadsByPipeline: { [pipelineName: string]: number } = {}
    
    pipelines.forEach(pipeline => {
      const pipelineLeads = allLeads.filter(lead => lead.pipeline_id === pipeline.id)
      leadsByPipeline[pipeline.name] = pipelineLeads.length
    })
    
    return leadsByPipeline
  }, [allLeads, pipelines])

  return {
    allLeads,
    pipelines,
    loading,
    error,
    fetchAllLeads,
    refreshLeads,
    getLeadsByPipelineMap
  }
} 