import { useCallback, useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { StageInput } from '../stage-manager/StageInput'
import { QuickSuggestions } from '../stage-manager/QuickSuggestions'
import { StageList } from '../stage-manager/StageList'

interface StageItem {
  id: string
  name: string
  tempId?: string
}

interface StageManagerProps {
  stages: StageItem[]
  onStagesChange: (stages: StageItem[]) => void
  isEditing?: boolean
  pipelineId?: string
}

// Função para gerar IDs únicos
const generateUniqueId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Função para verificar se é uma etapa temporária
const isTemporaryStage = (stage: StageItem) => Boolean(stage.tempId) || stage.id.startsWith('temp-')

export function StageManager({ 
  stages, 
  onStagesChange, 
  isEditing = false, 
  pipelineId 
}: StageManagerProps) {
  
  const addStage = useCallback((name: string) => {
    // Verificar se já existe uma etapa com esse nome
    if (stages.some(stage => stage.name.toLowerCase() === name.toLowerCase())) {
      return
    }
    
    const newStage: StageItem = {
      id: generateUniqueId(),
      name: name,
      tempId: generateUniqueId()
    }
    
    onStagesChange([...stages, newStage])
  }, [stages, onStagesChange])

  const removeStage = useCallback((stageId: string) => {
    onStagesChange(stages.filter(stage => stage.id !== stageId))
  }, [stages, onStagesChange])

  const editStage = useCallback((stageId: string, newName: string) => {
    onStagesChange(stages.map(stage => 
      stage.id === stageId ? { ...stage, name: newName } : stage
    ))
  }, [stages, onStagesChange])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = stages.findIndex(stage => stage.id === active.id)
    const newIndex = stages.findIndex(stage => stage.id === over.id)
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedStages = arrayMove(stages, oldIndex, newIndex)
      onStagesChange(reorderedStages)

      // TODO: Implementar updateStagePositions no stageService se necessário
      // Se está editando um pipeline existente, atualizar posições no banco
      if (isEditing && pipelineId) {
        console.log('🔄 Etapas reordenadas - posições serão atualizadas no próximo salvamento')
      }
    }
  }, [stages, onStagesChange, isEditing, pipelineId])

  // Separar etapas temporárias
  const temporaryStages = useMemo(() => stages.filter(isTemporaryStage), [stages])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {temporaryStages.length > 0 && (
            <span className="text-yellow-600">
              {temporaryStages.length} nova(s)
            </span>
          )}
          <span>{stages.length} etapa(s) total</span>
        </div>
      </div>

      {/* Input para adicionar nova etapa */}
      <StageInput onAddStage={addStage} />

      {/* Sugestões rápidas */}
      <QuickSuggestions stages={stages} onAddStage={addStage} />

      {/* Lista de etapas */}
      <StageList
        stages={stages}
        onDragEnd={handleDragEnd}
        onEditStage={editStage}
        onRemoveStage={removeStage}
        isTemporaryStage={isTemporaryStage}
      />

      {/* Informações sobre o estado */}
      {isEditing && stages.length > 0 && (
        <div className="text-xs text-gray-500 bg-primary-50 p-3 rounded-lg">
          <p className="font-medium text-primary-700 mb-1"> Como funciona:</p>
          <ul className="space-y-1 text-primary-600">
            <li>• <strong>Etapas cinzas:</strong> Já existem no banco de dados</li>
            <li>• <strong>Etapas amarelas:</strong> Serão criadas ao salvar</li>
            <li>• <strong>Reordenação:</strong> Etapas existentes são atualizadas automaticamente</li>
          </ul>
        </div>
      )}
    </div>
  )
} 