import { Bars3Icon } from '@heroicons/react/24/outline'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable'
import { SortableStageItem } from './SortableStageItem'

interface StageItem {
  id: string
  name: string
  tempId?: string
}

interface StageListProps {
  stages: StageItem[]
  onDragEnd: (event: DragEndEvent) => void
  onEditStage: (id: string, name: string) => void
  onRemoveStage: (id: string) => void
  isTemporaryStage: (stage: StageItem) => boolean
}

export function StageList({ 
  stages, 
  onDragEnd, 
  onEditStage, 
  onRemoveStage, 
  isTemporaryStage 
}: StageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (stages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-sm">
          <p>Nenhuma etapa adicionada</p>
          <p className="mt-1">Adicione etapas para estruturar seu funil de vendas</p>
        </div>
      </div>
    )
  }

  const temporaryStages = stages.filter(isTemporaryStage)
  const stageIds = stages.map(s => s.id)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Bars3Icon className="w-4 h-4" />
        <span>Arraste para reordenar as etapas</span>
        {temporaryStages.length > 0 && (
          <span className="text-yellow-600">
            • Etapas amarelas serão criadas ao salvar
          </span>
        )}
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={stageIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <SortableStageItem
                key={stage.id}
                stage={stage}
                index={index}
                onEdit={onEditStage}
                onRemove={onRemoveStage}
                isTemporary={isTemporaryStage(stage)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
} 