import { useEffect, useState } from 'react'
import { getPipelines } from '../services/pipelineService'
import { getStagesByPipeline } from '../services/stageService'
import type { Pipeline, Stage } from '../types'

export function usePipelines() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<Record<string, Stage[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const { data: pipelinesData, error: pipelinesError } = await getPipelines()
        if (pipelinesError) throw new Error(pipelinesError.message)
        setPipelines(pipelinesData || [])
        // Buscar stages para cada pipeline
        const stagesObj: Record<string, Stage[]> = {}
        for (const pipeline of pipelinesData || []) {
          const { data: stagesData, error: stagesError } = await getStagesByPipeline(pipeline.id)
          if (stagesError) throw new Error(stagesError.message)
          stagesObj[pipeline.id] = stagesData || []
        }
        setStages(stagesObj)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar funis')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return { pipelines, stages, loading, error }
} 