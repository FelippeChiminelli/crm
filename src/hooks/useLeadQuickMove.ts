import { useState } from 'react'
import type { Lead } from '../types'
import { updateLead } from '../services/leadService'
import { getStagesByPipeline } from '../services/stageService'
import { useToastContext } from '../contexts/ToastContext'

interface UseLeadQuickMoveArgs {
  currentLead: Lead | null
  isReadOnly: boolean
  setCurrentLead: (lead: Lead) => void
  setError: (message: string | null) => void
  loadHistory: () => Promise<void>
  onLeadUpdate?: (updatedLead: Lead) => void
  onInvalidateCache?: () => void
}

/**
 * Movimentações rápidas do lead (etapa/pipeline) fora do modo edição.
 */
export function useLeadQuickMove({
  currentLead,
  isReadOnly,
  setCurrentLead,
  setError,
  loadHistory,
  onLeadUpdate,
  onInvalidateCache,
}: UseLeadQuickMoveArgs) {
  const { showSuccess } = useToastContext()
  const [changingStageId, setChangingStageId] = useState<string | null>(null)
  const [changingPipeline, setChangingPipeline] = useState(false)

  const applyUpdate = async (payload: Partial<Lead>) => {
    if (!currentLead) return null
    const { data: updatedLead, error } = await updateLead(currentLead.id, payload as any)
    if (error) throw new Error(error.message)
    if (updatedLead) {
      setCurrentLead(updatedLead)
      if (onLeadUpdate) onLeadUpdate(updatedLead)
      if (onInvalidateCache) onInvalidateCache()
    }
    await loadHistory()
    return updatedLead
  }

  const handleQuickStageChange = async (stageId: string) => {
    if (!currentLead || isReadOnly || stageId === currentLead.stage_id) return
    try {
      setChangingStageId(stageId)
      await applyUpdate({ stage_id: stageId })
    } catch (err) {
      console.error('Erro ao mudar de etapa:', err)
      setError(err instanceof Error ? err.message : 'Erro ao mudar de etapa')
    } finally {
      setChangingStageId(null)
    }
  }

  // O lead entra na primeira etapa do pipeline de destino
  const handleQuickPipelineChange = async (pipelineId: string, pipelineName?: string) => {
    if (!currentLead || isReadOnly || !pipelineId || pipelineId === currentLead.pipeline_id) return
    try {
      setChangingPipeline(true)
      const { data: stages, error } = await getStagesByPipeline(pipelineId)
      if (error) throw new Error(error.message)
      const firstStage = stages?.[0]
      if (!firstStage) throw new Error('O pipeline selecionado não possui etapas')

      await applyUpdate({ pipeline_id: pipelineId, stage_id: firstStage.id })
      showSuccess('Pipeline atualizado', `Lead movido para o pipeline "${pipelineName || 'selecionado'}"`)
    } catch (err) {
      console.error('Erro ao mudar de pipeline:', err)
      setError(err instanceof Error ? err.message : 'Erro ao mudar de pipeline')
    } finally {
      setChangingPipeline(false)
    }
  }

  return {
    changingStageId,
    changingPipeline,
    handleQuickStageChange,
    handleQuickPipelineChange,
  }
}
