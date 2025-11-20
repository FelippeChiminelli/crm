import { PlusIcon } from '@heroicons/react/24/outline'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { LeadCard } from '../LeadCard'
import type { Lead, Stage, LeadCardVisibleField, LeadCustomField } from '../../types'

interface StageColumnProps {
  stage: Stage
  leads: Lead[]
  activeId: string | null
  onAddLead: (stageId: string) => void
  onEditLead: (lead: Lead) => void
  onDeleteLead?: (leadId: string) => void
  onViewLead?: (lead: Lead) => void
  stageIndex?: number
  visibleFields?: LeadCardVisibleField[]
  customFields?: LeadCustomField[]
}

export function StageColumn({ 
  stage, 
  leads, 
  activeId, 
  onAddLead, 
  onEditLead, 
  onDeleteLead,
  onViewLead,
  stageIndex = 0,
  visibleFields,
  customFields = []
}: StageColumnProps) {
  // Configurar área de drop
  const { setNodeRef } = useDroppable({
    id: stage.id,
  })

  // Apenas um destaque sutil para diferenciação
  const isFirstStage = stageIndex === 0
  const isLastStage = stageIndex >= 3 // Assumindo que a última etapa é "concluído"
  
  return (
    <div className={`
      w-full
      sm:flex-shrink-0 sm:w-72
      bg-white
      border border-gray-200
      rounded-lg
      shadow-sm
      transition-all duration-200
      hover:shadow-md
      hover:border-gray-300
      overflow-hidden
      flex flex-col
      h-full
      max-h-full
    `}>
      {/* Header da etapa */}
      <div className={`
        bg-gray-50
        p-3
        border-b border-gray-200
        flex-shrink-0
        ${isFirstStage ? 'bg-primary-50' : ''}
        ${isLastStage ? 'bg-green-50' : ''}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Indicador simples da etapa */}
            <div className={`
              w-2 h-2 rounded-full
              ${isFirstStage ? 'bg-primary-500' : ''}
              ${isLastStage ? 'bg-green-500' : ''}
              ${!isFirstStage && !isLastStage ? 'bg-gray-400' : ''}
            `}></div>
            <h3 className={`
              font-semibold text-sm sm:text-base
              ${isFirstStage ? 'text-primary-700' : ''}
              ${isLastStage ? 'text-green-700' : ''}
              ${!isFirstStage && !isLastStage ? 'text-gray-700' : ''}
            `}>
              {stage.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="
              px-2 py-1
              text-xs font-medium
              text-gray-600
              bg-gray-100
              rounded-full
              border border-gray-200
            ">
              {leads.length}
            </span>
            <button
              onClick={() => onAddLead(stage.id)}
              className="
                p-1.5 rounded-lg
                text-gray-600 hover:text-gray-800
                hover:bg-gray-100
                transition-colors
                border border-gray-200
                bg-white
              "
              title="Adicionar lead"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Área de leads */}
      <div 
        ref={setNodeRef}
        className="
          bg-gray-50/30
          p-2
          flex-1
          overflow-y-auto
          min-h-0
        "
        style={{ 
          maxHeight: 'calc(100vh - 280px)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6'
        }}
      >
        <SortableContext
          items={leads.map(lead => lead.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-full">
            {leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isDragging={activeId === lead.id}
                onEdit={onEditLead}
                onDelete={onDeleteLead}
                onView={onViewLead}
                visibleFields={visibleFields}
                customFields={customFields}
              />
            ))}
            
            {/* Área de drop vazia */}
            {leads.length === 0 && (
              <div className="
                border-2 border-dashed border-gray-200
                rounded-lg p-4
                text-center
                min-h-[100px]
                flex items-center justify-center
                bg-white/50
                transition-all duration-200
                hover:bg-white/80
                hover:border-gray-300
              ">
                <div className="text-gray-500">
                  <div className="text-sm font-medium mb-1">
                    Nenhum lead nesta etapa
                  </div>
                  <div className="text-xs">
                    Arraste leads aqui ou clique no + para adicionar
                  </div>
                </div>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
} 