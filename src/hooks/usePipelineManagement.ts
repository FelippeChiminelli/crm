import { useToastContext } from '../contexts/ToastContext'
import { createPipelineWithStages, updatePipelineWithStages, deletePipeline } from '../services/pipelineService'
import type { PipelineWithStagesData } from '../services/pipelineService'

export function usePipelineManagement(dispatch?: React.Dispatch<any>) {
  const { showSuccess, showError } = useToastContext()

  const handleCreatePipeline = async (data: PipelineWithStagesData) => {
    try {
      const result = await createPipelineWithStages(data)
      
      if (result.error) {
        throw result.error
      }
      
      // Atualizar o contexto com o novo pipeline
      if (result.data?.pipeline && dispatch) {
        dispatch({ type: 'ADD_PIPELINE', payload: result.data.pipeline })
      }
      
      showSuccess(
        'Funil criado com sucesso',
        `Funil "${data.name}" criado com ${data.stages.length} etapas!`
      )
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      showError('Erro ao criar funil', errorMessage)
      throw error
    }
  }

  const handleUpdatePipeline = async (id: string, data: PipelineWithStagesData) => {
    try {
      const result = await updatePipelineWithStages(id, data)
      
      if (result.error) {
        throw result.error
      }
      
      // Atualizar o contexto com o pipeline atualizado
      if (result.data?.pipeline && dispatch) {
        dispatch({ type: 'UPDATE_PIPELINE', payload: result.data.pipeline })
      }
      
      showSuccess(
        'Funil atualizado com sucesso',
        `Funil "${data.name}" atualizado com ${data.stages.length} etapas!`
      )
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      showError('Erro ao atualizar funil', errorMessage)
      throw error
    }
  }

  const handleDeletePipeline = async (id: string, pipelineName: string) => {
    try {
      await deletePipeline(id)
      
      // Remover o pipeline do contexto
      if (dispatch) {
        dispatch({ type: 'DELETE_PIPELINE', payload: id })
      }
      
      showSuccess(
        'Funil excluído com sucesso',
        `Funil "${pipelineName}" excluído com sucesso!`
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      showError('Erro ao excluir funil', errorMessage)
      throw error
    }
  }

  return {
    handleCreatePipeline,
    handleUpdatePipeline,
    handleDeletePipeline
  }
} 