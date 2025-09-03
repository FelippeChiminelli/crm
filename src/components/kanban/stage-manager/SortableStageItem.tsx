import { useState, useCallback } from 'react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface StageItem {
  id: string
  name: string
  tempId?: string
}

interface SortableStageItemProps {
  stage: StageItem
  index: number
  onEdit: (id: string, name: string) => void
  onRemove: (id: string) => void
  isTemporary: boolean
}

export function SortableStageItem({ 
  stage, 
  index, 
  onEdit, 
  onRemove, 
  isTemporary 
}: SortableStageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(stage.name)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: stage.id,
    disabled: isEditing
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }

  const handleEditSubmit = useCallback(() => {
    if (editName.trim() && editName.trim() !== stage.name) {
      onEdit(stage.id, editName.trim())
    }
    setIsEditing(false)
  }, [editName, stage.id, stage.name, onEdit])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit()
    } else if (e.key === 'Escape') {
      setEditName(stage.name)
      setIsEditing(false)
    }
  }, [handleEditSubmit, stage.name])

  const handleEditClick = useCallback(() => {
    setEditName(stage.name)
    setIsEditing(true)
  }, [stage.name])

  const handleRemoveClick = useCallback(() => {
    onRemove(stage.id)
  }, [stage.id, onRemove])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-colors group
        ${isTemporary 
          ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' 
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        }
      `}
    >
      {/* Drag Handle */}
      <div 
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
        title="Arrastar para reordenar"
      >
        <Bars3Icon className="w-5 h-5" />
      </div>

      {/* Número da etapa */}
      <div className={`
        flex-shrink-0 w-6 h-6 text-white text-xs font-bold rounded-full flex items-center justify-center
        ${isTemporary ? 'bg-yellow-500' : 'bg-primary-500'}
      `}>
        {index + 1}
      </div>

      {/* Nome da etapa */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleKeyPress}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus
            placeholder="Nome da etapa..."
          />
        ) : (
          <div className="flex items-center gap-2">
            <span 
              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-primary-600"
              onClick={handleEditClick}
              title="Clique para editar"
            >
              {stage.name}
            </span>
            {isTemporary && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                Nova
              </span>
            )}
          </div>
        )}
      </div>

      {/* Botão remover */}
      <button
        onClick={handleRemoveClick}
        className="flex-shrink-0 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remover etapa"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
} 