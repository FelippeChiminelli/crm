import { useState, useEffect } from 'react'
import { useToastContext } from '../../../contexts/ToastContext'
import { usePipelineContext } from '../../../contexts/PipelineContext'
import { useConfirm } from '../../../hooks/useConfirm'
import { getStagesByPipeline } from '../../../services/stageService'
import { updatePipelinesOrder } from '../../../services/pipelineService'
import { usePipelineManagement } from '../../../hooks/usePipelineManagement'
import { XMarkIcon, FunnelIcon, CogIcon, PencilIcon } from '@heroicons/react/24/outline'
import { StageManager } from './StageManager'
import { DraggablePipelineList } from './DraggablePipelineList'
import type { Pipeline } from '../../../types'

interface StageItem {
  id: string
  name: string
  tempId?: string
}

interface PipelineWithStages {
  name: string
  description: string
  stages: StageItem[]
}

interface ManagePipelinesModalProps {
  isOpen: boolean
  onClose: () => void
  pipelines: Pipeline[]
  onUpdatePipeline: (pipelineId: string, data: PipelineWithStages) => Promise<any>
  onDeletePipeline: (pipelineId: string, pipelineName: string) => Promise<any>
}

export function ManagePipelinesModal({
  isOpen,
  onClose,
  pipelines,
  onUpdatePipeline,
  onDeletePipeline
}: ManagePipelinesModalProps) {
  const { handleCreatePipeline } = usePipelineManagement()
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pipelineFormData, setPipelineFormData] = useState({
    name: '',
    description: ''
  })
  const [stages, setStages] = useState<StageItem[]>([])
  const [orderedPipelines, setOrderedPipelines] = useState<Pipeline[]>([])
  const [hasOrderChanged, setHasOrderChanged] = useState(false)
  const { showError, showSuccess } = useToastContext()
  const { dispatch } = usePipelineContext()
  const { confirm } = useConfirm()

  // Inicializar e ordenar pipelines
  useEffect(() => {
    if (isOpen && pipelines.length > 0) {
      // Ordenar pipelines por display_order (se existir) ou por created_at
      const sorted = [...pipelines].sort((a, b) => {
        // @ts-ignore - display_order pode não existir no tipo ainda
        const orderA = a.display_order ?? 0
        // @ts-ignore
        const orderB = b.display_order ?? 0
        return orderA - orderB
      })
      setOrderedPipelines(sorted)
      setHasOrderChanged(false)
    }
  }, [isOpen, pipelines])

  // Reset form quando modal fechar
  useEffect(() => {
    if (!isOpen) {
      setEditingPipeline(null)
      setPipelineFormData({ name: '', description: '' })
      setStages([])
      setHasOrderChanged(false)
    }
  }, [isOpen])

  const openEditMode = async (pipeline: Pipeline) => {
    setEditingPipeline(pipeline)
    setPipelineFormData({
      name: pipeline.name,
      description: pipeline.description || ''
    })
    
    // Carregar etapas existentes do pipeline
    try {
      const { data: existingStages } = await getStagesByPipeline(pipeline.id)
      
      if (existingStages) {
        const mappedStages: StageItem[] = existingStages.map(stage => ({
          id: stage.id,
          name: stage.name
        }))
        setStages(mappedStages)
      }
    } catch (error) {
      console.error('Erro ao carregar etapas:', error)
      showError('Erro ao carregar etapas do funil')
    }
  }

  const cancelEdit = () => {
    setEditingPipeline(null)
    setPipelineFormData({ name: '', description: '' })
    setStages([])
  }

  const handleUpdateSubmit = async () => {
    if (!editingPipeline) return

    if (!pipelineFormData.name.trim()) {
      showError('Nome do funil é obrigatório')
      return
    }

    if (stages.length === 0) {
      showError('O funil deve ter pelo menos uma etapa')
      return
    }

    // Validar se todas as etapas têm nome
    const invalidStages = stages.filter(stage => !stage.name.trim())
    if (invalidStages.length > 0) {
      showError('Todas as etapas devem ter um nome')
      return
    }

    setSubmitting(true)
    try {
      const pipelineData = {
        ...pipelineFormData,
        stages
      }

      await onUpdatePipeline(editingPipeline.id, pipelineData)
      
      // Reset form após sucesso
      cancelEdit()
      showSuccess('Funil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar pipeline:', error)
      showError('Erro ao atualizar funil. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (pipelineId: string, pipelineName: string) => {
    // Confirmação antes de deletar
    const confirmed = await confirm({
      title: 'Excluir Funil',
      message: `Tem certeza que deseja excluir o funil "${pipelineName}"?\n\n⚠️ ATENÇÃO: Todos os leads e etapas deste funil serão removidos permanentemente!`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    })
    
    if (!confirmed) {
      return
    }
    
    if (editingPipeline?.id === pipelineId) {
      cancelEdit() // Cancelar edição se estiver editando o funil que será excluído
    }
    await onDeletePipeline(pipelineId, pipelineName)
    showSuccess(`Funil "${pipelineName}" excluído com sucesso!`)
  }

  const handleDuplicate = async (pipeline: Pipeline) => {
    try {
      setSubmitting(true)
      const { data: existingStages } = await getStagesByPipeline(pipeline.id)
      const stagesToCreate = (existingStages || []).map(stage => ({ name: stage.name }))
      const newName = `${pipeline.name} (Cópia)`
      const result = await handleCreatePipeline({
        name: newName,
        description: pipeline.description || '',
        stages: stagesToCreate
      })
      if (result?.data?.pipeline) {
        dispatch({ type: 'ADD_PIPELINE', payload: result.data.pipeline })
      }
      showSuccess('Funil duplicado com sucesso!', `Funil "${pipeline.name}" duplicado com ${stagesToCreate.length} etapas`)
    } catch (error) {
      console.error('Erro ao duplicar funil:', error)
      showError('Erro ao duplicar funil. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePipelinesReorder = (reorderedPipelines: Pipeline[]) => {
    setOrderedPipelines(reorderedPipelines)
    setHasOrderChanged(true)
  }

  const handleSaveOrder = async () => {
    try {
      setSubmitting(true)
      
      // Mapear cada pipeline com sua nova posição
      const pipelineOrders = orderedPipelines.map((pipeline, index) => ({
        id: pipeline.id,
        display_order: index
      }))

      // Atualizar no banco de dados
      const { error } = await updatePipelinesOrder(pipelineOrders)
      
      if (error) {
        throw error
      }

      // Atualizar o contexto com a nova ordem
      orderedPipelines.forEach((pipeline, index) => {
        dispatch({ 
          type: 'UPDATE_PIPELINE', 
          payload: { 
            ...pipeline, 
            // @ts-ignore
            display_order: index 
          } 
        })
      })

      showSuccess('Ordem atualizada!', 'A ordem dos funis foi salva com sucesso.')
      setHasOrderChanged(false)
    } catch (error) {
      console.error('Erro ao salvar ordem dos pipelines:', error)
      showError('Erro ao salvar ordem', 'Não foi possível salvar a nova ordem dos funis.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-[9999]">
      <div className="bg-white w-full sm:w-[600px] h-full overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <CogIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gerenciar Funis</h3>
                <p className="text-sm text-gray-600">Edite ou exclua funis existentes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Formulário de edição (só aparece quando editando) */}
          {editingPipeline && (
            <div className="mb-6 p-4 border-2 border-primary-200 rounded-lg space-y-6 bg-primary-50">
              <div className="flex items-center gap-2">
                <PencilIcon className="w-5 h-5 text-primary-600" />
                <h4 className="font-medium text-primary-900">
                  Editando: {editingPipeline.name}
                </h4>
              </div>
              
              {/* Dados básicos do funil */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Funil *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={pipelineFormData.name}
                    onChange={(e) => setPipelineFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do funil..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={pipelineFormData.description}
                    onChange={(e) => setPipelineFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do funil..."
                  />
                </div>
              </div>

              {/* Gerenciador de etapas */}
              <div className="border-t border-primary-200 pt-4">
                <h5 className="font-medium text-gray-900 mb-4">Etapas do Funil</h5>
                <StageManager 
                  stages={stages}
                  onStagesChange={setStages}
                  isEditing={true}
                  pipelineId={editingPipeline.id}
                />
              </div>

              {/* Botões de ação da edição */}
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 pt-4 border-t border-primary-200">
                <button
                  onClick={handleUpdateSubmit}
                  disabled={submitting || !pipelineFormData.name.trim() || stages.length === 0}
                  className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting 
                    ? 'Salvando...' 
                    : `Salvar Alterações (${stages.length} etapas)`
                  }
                </button>
                
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de funis existentes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">Funis Existentes</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Arraste para reordenar • {orderedPipelines.length} funil{orderedPipelines.length !== 1 ? 's' : ''}
                </p>
              </div>
              {hasOrderChanged && (
                <button
                  onClick={handleSaveOrder}
                  disabled={submitting}
                  className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? 'Salvando...' : 'Salvar Ordem'}
                </button>
              )}
            </div>

            {orderedPipelines.length > 0 ? (
              <DraggablePipelineList
                pipelines={orderedPipelines}
                editingPipeline={editingPipeline}
                submitting={submitting}
                onPipelinesReorder={handlePipelinesReorder}
                onEdit={openEditMode}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FunnelIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Nenhum funil encontrado</p>
                <p className="text-sm mt-1">
                  Crie seu primeiro funil para começar a gerenciar seus leads
                </p>
              </div>
            )}
          </div>

          {/* Dica quando há funis mas nenhum sendo editado */}
          {orderedPipelines.length > 0 && !editingPipeline && (
            <div className="mt-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CogIcon className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary-900 mb-1">Como gerenciar funis</p>
                  <p className="text-primary-700">
                    <strong>Arrastar:</strong> Use o ícone ☰ para reordenar os funis. <br />
                    <strong>Editar:</strong> Clique no ícone de lápis para modificar nome, descrição e etapas. <br />
                    <strong>Duplicar:</strong> Clique no ícone de cópia para criar uma réplica. <br />
                    <strong>Excluir:</strong> Clique no ícone de lixeira para remover permanentemente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 