import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PencilIcon, TrashIcon, DocumentDuplicateIcon, Bars3Icon } from '@heroicons/react/24/outline'
import type { Pipeline } from '../../../types'

interface DraggablePipelineListProps {
  pipelines: Pipeline[]
  editingPipeline: Pipeline | null
  submitting: boolean
  onPipelinesReorder: (pipelines: Pipeline[]) => void
  onEdit: (pipeline: Pipeline) => void
  onDelete: (pipelineId: string, pipelineName: string) => void
  onDuplicate: (pipeline: Pipeline) => void
}

interface SortableItemProps {
  pipeline: Pipeline
  isEditing: boolean
  disabled: boolean
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

function SortableItem({ 
  pipeline, 
  isEditing, 
  disabled,
  onEdit, 
  onDelete, 
  onDuplicate 
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pipeline.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-lg transition-all ${
        isEditing
          ? 'border-primary-300 bg-primary-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          disabled={disabled}
          className={`p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Arrastar para reordenar"
        >
          <Bars3Icon className="w-5 h-5" />
        </button>

        {/* Pipeline Info */}
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
            {isEditing && (
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
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            disabled={disabled}
            className={`p-2 rounded-lg ${
              isEditing
                ? 'bg-primary-100 text-primary-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Editar funil e etapas"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDuplicate}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Duplicar funil"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={disabled}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Excluir funil"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function DraggablePipelineList({
  pipelines,
  editingPipeline,
  submitting,
  onPipelinesReorder,
  onEdit,
  onDelete,
  onDuplicate
}: DraggablePipelineListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = pipelines.findIndex(p => p.id === active.id)
      const newIndex = pipelines.findIndex(p => p.id === over.id)
      
      const reorderedPipelines = arrayMove(pipelines, oldIndex, newIndex)
      onPipelinesReorder(reorderedPipelines)
    }
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={pipelines.map(p => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {pipelines.map(pipeline => (
            <SortableItem
              key={pipeline.id}
              pipeline={pipeline}
              isEditing={editingPipeline?.id === pipeline.id}
              disabled={!!editingPipeline || submitting}
              onEdit={() => onEdit(pipeline)}
              onDelete={() => onDelete(pipeline.id, pipeline.name)}
              onDuplicate={() => onDuplicate(pipeline)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

