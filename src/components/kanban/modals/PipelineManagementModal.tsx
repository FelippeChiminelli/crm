import { useState, useEffect } from 'react'
import { useToastContext } from '../../../contexts/ToastContext'
import { XMarkIcon, FunnelIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { StageManager } from './StageManager'
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

interface PipelineManagementModalProps {
  isOpen: boolean
  onClose: () => void
  pipelines: Pipeline[]
  onCreatePipeline: (data: PipelineWithStages) => Promise<any>
  onUpdatePipeline: (pipelineId: string, data: PipelineWithStages) => Promise<any>
  onDeletePipeline: (pipelineId: string, pipelineName: string) => Promise<void>
}

export function PipelineManagementModal({
  isOpen,
  onClose,
  pipelines,
  onCreatePipeline,
  onUpdatePipeline,
  onDeletePipeline
}: PipelineManagementModalProps) {
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [submittingPipeline, setSubmittingPipeline] = useState(false)
  const [pipelineFormData, setPipelineFormData] = useState({
    name: '',
    description: ''
  })
  const [stages, setStages] = useState<StageItem[]>([])
  const { showError } = useToastContext()

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEditingPipeline(null)
      setPipelineFormData({ name: '', description: '' })
      setStages([])
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!pipelineFormData.name.trim()) {
      showError('Nome do funil é obrigatório')
      return
    }

    if (stages.length === 0) {
      showError('Adicione pelo menos uma etapa ao funil')
      return
    }

    // Validar se todas as etapas têm nome
    const invalidStages = stages.filter(stage => !stage.name.trim())
    if (invalidStages.length > 0) {
      showError('Todas as etapas devem ter um nome')
      return
    }

    setSubmittingPipeline(true)
    try {
      const pipelineData = {
        ...pipelineFormData,
        stages
      }

      if (editingPipeline) {
        // Modo edição
        await onUpdatePipeline(editingPipeline.id, pipelineData)
      } else {
        // Modo criação
        await onCreatePipeline(pipelineData)
      }
      
      // Reset form
      setPipelineFormData({ name: '', description: '' })
      setStages([])
      setEditingPipeline(null)
    } catch (error) {
      console.error('Erro ao salvar pipeline:', error)
      showError(`Erro ao ${editingPipeline ? 'atualizar' : 'criar'} funil. Tente novamente.`)
    } finally {
      setSubmittingPipeline(false)
    }
  }

  const openEditMode = async (pipeline: Pipeline) => {
    setEditingPipeline(pipeline)
    setPipelineFormData({
      name: pipeline.name,
      description: pipeline.description || ''
    })
    
    // Carregar etapas existentes do pipeline
    try {
      const { getStagesByPipeline } = await import('../../../services/stageService')
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
    }
  }

  const cancelEdit = () => {
    setEditingPipeline(null)
    setPipelineFormData({ name: '', description: '' })
    setStages([])
  }

  const addDefaultStages = () => {
    const defaultStages: StageItem[] = [
      { id: `temp-${Date.now()}-1`, name: 'Prospecção', tempId: `temp-${Date.now()}-1` },
      { id: `temp-${Date.now()}-2`, name: 'Qualificação', tempId: `temp-${Date.now()}-2` },
      { id: `temp-${Date.now()}-3`, name: 'Proposta', tempId: `temp-${Date.now()}-3` },
      { id: `temp-${Date.now()}-4`, name: 'Negociação', tempId: `temp-${Date.now()}-4` },
      { id: `temp-${Date.now()}-5`, name: 'Fechamento', tempId: `temp-${Date.now()}-5` }
    ]
    setStages(defaultStages)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-[9999]">
      <div className="bg-white w-full sm:w-[500px] h-full overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Gerenciar Funis
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Formulário de criação/edição */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg space-y-6">
            <h4 className="font-medium text-gray-900">
              {editingPipeline ? 'Editar Funil' : 'Criar Novo Funil'}
            </h4>
            
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
                  placeholder="Ex: Vendas B2B, Leads Inbound..."
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
                  placeholder="Descreva o propósito deste funil..."
                />
              </div>
            </div>

            {/* Gerenciador de etapas */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h5 className="font-medium text-gray-900">Etapas do Funil</h5>
                  <p className="text-sm text-gray-500">
                    {editingPipeline 
                      ? 'Edite, adicione ou remova etapas deste funil' 
                      : 'Configure as etapas do processo de vendas'
                    }
                  </p>
                </div>
                {stages.length === 0 && (
                  <button
                    type="button"
                    onClick={addDefaultStages}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    + Padrão
                  </button>
                )}
              </div>

              <StageManager 
                stages={stages}
                onStagesChange={setStages}
                isEditing={!!editingPipeline}
                pipelineId={editingPipeline?.id}
              />
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 pt-4 border-t">
              <button
                onClick={handleSubmit}
                disabled={submittingPipeline || !pipelineFormData.name.trim() || stages.length === 0}
                className="flex-1 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingPipeline 
                  ? 'Salvando...' 
                  : editingPipeline 
                    ? `Atualizar Funil (${stages.length} etapas)` 
                    : `Criar Funil (${stages.length} etapas)`
                }
              </button>
              
              {editingPipeline && (
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Lista de pipelines existentes */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Funis Existentes</h4>
            <div className="space-y-2">
              {pipelines.map(pipeline => (
                <div
                  key={pipeline.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{pipeline.name}</span>
                      <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                        {pipeline.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {pipeline.description && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {pipeline.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => openEditMode(pipeline)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Editar funil e etapas"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeletePipeline(pipeline.id, pipeline.name)}
                      className="text-red-400 hover:text-red-600"
                      title="Excluir funil"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pipelines.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FunnelIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhum funil criado ainda</p>
                <p className="text-sm mt-1">Crie seu primeiro funil com etapas personalizadas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 