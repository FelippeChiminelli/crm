import { useState, useEffect } from 'react'
import { useToastContext } from '../../../contexts/ToastContext'
import { useConfirm } from '../../../hooks/useConfirm'
import { getStagesByPipeline } from '../../../services/stageService'
import { XMarkIcon, FunnelIcon, PencilIcon, TrashIcon, CogIcon } from '@heroicons/react/24/outline'
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
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pipelineFormData, setPipelineFormData] = useState({
    name: '',
    description: ''
  })
  const [stages, setStages] = useState<StageItem[]>([])
  const { showError, showSuccess } = useToastContext()
  const { confirm } = useConfirm()

  // Reset form quando modal fechar
  useEffect(() => {
    if (!isOpen) {
      setEditingPipeline(null)
      setPipelineFormData({ name: '', description: '' })
      setStages([])
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
              <h4 className="font-medium text-gray-900">Funis Existentes</h4>
              <span className="text-sm text-gray-500">
                {pipelines.length} funil{pipelines.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {pipelines.map(pipeline => (
                <div
                  key={pipeline.id}
                  className={`p-4 border rounded-lg transition-all ${
                    editingPipeline?.id === pipeline.id 
                      ? 'border-primary-300 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900 truncate">
                          {pipeline.name}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          pipeline.active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {pipeline.active ? 'Ativo' : 'Inativo'}
                        </span>
                        {editingPipeline?.id === pipeline.id && (
                          <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                            Editando
                          </span>
                        )}
                      </div>
                      {pipeline.description && (
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {pipeline.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => openEditMode(pipeline)}
                        disabled={!!editingPipeline}
                        className={`p-2 rounded-lg ${
                          editingPipeline?.id === pipeline.id
                            ? 'bg-primary-100 text-primary-600'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Editar funil e etapas"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(pipeline.id, pipeline.name)}
                        disabled={!!editingPipeline}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Excluir funil"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pipelines.length === 0 && (
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
          {pipelines.length > 0 && !editingPipeline && (
            <div className="mt-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CogIcon className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary-900 mb-1">Como gerenciar funis</p>
                  <p className="text-primary-700">
                    Clique no ícone de edição para modificar um funil e suas etapas, 
                    ou no ícone de lixeira para excluir um funil permanentemente.
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