import { PlusIcon } from '@heroicons/react/24/outline'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { LeadCard } from '../LeadCard'
import type { Lead, Stage, LeadCardVisibleField, LeadCustomField, LeadCustomValue } from '../../types'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface StageColumnProps {
  stage: Stage
  leads: Lead[]
  totalCount?: number
  activeId: string | null
  onAddLead: (stageId: string) => void
  onEditLead: (lead: Lead) => void
  onDeleteLead?: (leadId: string) => void
  onViewLead?: (lead: Lead) => void
  visibleFields?: LeadCardVisibleField[]
  customFields?: LeadCustomField[]
  customValuesByLead?: { [leadId: string]: { [fieldId: string]: LeadCustomValue } }
}

export function StageColumn({ 
  stage, 
  leads, 
  totalCount,
  activeId, 
  onAddLead, 
  onEditLead, 
  onDeleteLead,
  onViewLead,
  visibleFields,
  customFields = [],
  customValuesByLead = {}
}: StageColumnProps) {
  // Configurar área de drop
  const { setNodeRef } = useDroppable({
    id: stage.id,
  })

  // Ref para o container de scroll
  const parentRef = useRef<HTMLDivElement>(null)

  // IMPORTANTE: Sempre chamar useVirtualizer (regra dos Hooks - não pode ser condicional)
  const virtualizer = useVirtualizer({
    count: leads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // altura estimada do LeadCard em pixels
    overscan: 3, // renderizar 3 cards extras acima/abaixo para scroll suave
  })

  // Threshold para ativar virtualização - decidir SE vamos usar o virtualizer
  const VIRTUALIZATION_THRESHOLD = 10
  const shouldVirtualize = leads.length > VIRTUALIZATION_THRESHOLD
  
  return (
    <div className={`
      w-full
      sm:flex-shrink-0 sm:w-64 md:w-72
      min-w-[240px] sm:min-w-[256px] md:min-w-[288px]
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
      <div className="
        bg-gray-50
        p-3
        border-b border-gray-200
        flex-shrink-0
      ">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Indicador simples da etapa */}
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: stage.color }}
            ></div>
            <h3 
              className="font-semibold text-xs sm:text-sm"
              style={{ color: stage.color }}
            >
              {stage.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="
              px-2 py-1
              text-[10px] font-medium
              text-gray-600
              bg-gray-100
              rounded-full
              border border-gray-200
            ">
              {totalCount !== undefined ? totalCount : leads.length}
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
        ref={(node) => {
          setNodeRef(node)
          if (parentRef.current !== node) {
            parentRef.current = node
          }
        }}
        className="
          bg-gray-50/30
          p-2
          flex-1
          overflow-y-auto
          min-h-0
        "
        style={{ 
          height: '100%',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6'
        }}
      >
        <SortableContext
          items={leads.map(lead => lead.id)}
          strategy={verticalListSortingStrategy}
        >
          <div 
            className="space-y-2 min-h-full"
            style={shouldVirtualize && virtualizer ? {
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative'
            } : undefined}
          >
            {shouldVirtualize && virtualizer ? (
              // Renderização virtualizada
              virtualizer.getVirtualItems().map((virtualItem) => {
                const lead = leads[virtualItem.index]
                return (
                  <div
                    key={lead.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <LeadCard
                      lead={lead}
                      isDragging={activeId === lead.id}
                      onEdit={onEditLead}
                      onDelete={onDeleteLead}
                      onView={onViewLead}
                      visibleFields={visibleFields}
                      customFields={customFields}
                      customValuesByLead={customValuesByLead[lead.id]}
                    />
                  </div>
                )
              })
            ) : (
              // Renderização normal (sem virtualização)
              leads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  isDragging={activeId === lead.id}
                  onEdit={onEditLead}
                  onDelete={onDeleteLead}
                  onView={onViewLead}
                  visibleFields={visibleFields}
                  customFields={customFields}
                  customValuesByLead={customValuesByLead[lead.id]}
                />
              ))
            )}
            
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