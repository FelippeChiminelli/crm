import { PlusIcon } from '@heroicons/react/24/outline'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { LeadCard } from '../LeadCard'
import type { Lead, Stage, LeadCardVisibleField, LeadCustomField, LeadCustomValue } from '../../types'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useMemo } from 'react'

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
  onMoveStage?: (leadId: string, direction: 'prev' | 'next') => Promise<void>
  hasPrevStage?: boolean
  hasNextStage?: boolean
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
  customValuesByLead = {},
  onMoveStage,
  hasPrevStage = false,
  hasNextStage = false
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
    estimateSize: () => 200, // altura estimada aumentada (180px card + 8px espaçamento)
    overscan: 3, // renderizar 3 cards extras acima/abaixo para scroll suave
  })

  // Threshold para ativar virtualização - decidir SE vamos usar o virtualizer
  const VIRTUALIZATION_THRESHOLD = 10
  const shouldVirtualize = leads.length > VIRTUALIZATION_THRESHOLD

  // Calcular soma dos valores dos leads do estágio
  const totalValue = useMemo(() => {
    return leads.reduce((sum, lead) => {
      return sum + (lead.value || 0)
    }, 0)
  }, [leads])

  // Formatar valor em reais
  const formattedTotalValue = useMemo(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(totalValue)
  }, [totalValue])
  
  return (
    <div className={`
      flex-shrink-0
      w-[280px] sm:w-64 lg:w-72
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
      snap-center lg:snap-align-none
    `}>
      {/* Header da etapa */}
      <div className="
        bg-gray-50
        px-2 py-1.5 sm:py-1
        border-b border-gray-200
        flex-shrink-0
      ">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Indicador simples da etapa */}
            <div 
              className="w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            ></div>
            <h3 
              className="font-semibold text-xs sm:text-sm leading-tight truncate min-w-0"
              style={{ color: stage.color }}
            >
              {stage.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              {totalValue > 0 && (
                <span className="
                  px-1.5 sm:px-2 py-0.5
                  text-[9px] sm:text-[10px] font-semibold
                  text-green-700
                  bg-green-100
                  rounded-full
                  whitespace-nowrap
                  hidden sm:inline-flex
                ">
                  {formattedTotalValue}
                </span>
              )}
              <span className="
                px-1.5 sm:px-2 py-0.5
                text-[10px] font-medium
                text-gray-600
                bg-gray-100
                rounded-full
                whitespace-nowrap
              ">
                {totalCount !== undefined ? totalCount : leads.length}
              </span>
            </div>
            <button
              onClick={() => onAddLead(stage.id)}
              className="
                p-1.5 sm:p-0.5 rounded
                text-gray-600 hover:text-gray-800
                hover:bg-gray-100
                active:bg-gray-200
                transition-colors
                bg-white
                flex-shrink-0
                w-[32px] h-[32px] sm:w-[24px] sm:h-[24px]
                flex items-center justify-center
                touch-manipulation
              "
              title="Adicionar lead"
              aria-label="Adicionar lead"
            >
              <PlusIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
          overflow-x-hidden
          min-h-0
        "
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6',
          maxHeight: '100%'
        }}
      >
        <SortableContext
          items={leads.map(lead => lead.id)}
          strategy={verticalListSortingStrategy}
        >
          <div 
            className={shouldVirtualize && virtualizer ? "" : "space-y-2 min-h-full"}
            style={shouldVirtualize && virtualizer ? {
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%'
            } : undefined}
          >
            {shouldVirtualize && virtualizer ? (
              // Renderização virtualizada
              virtualizer.getVirtualItems().map((virtualItem) => {
                const lead = leads[virtualItem.index]
                return (
                  <div
                    key={lead.id}
                    data-index={virtualItem.index}
                    ref={(el) => {
                      if (el) {
                        virtualizer.measureElement(el)
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                      paddingBottom: '8px', // Espaçamento entre cards
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
                      onMoveStage={onMoveStage}
                      hasPrevStage={hasPrevStage}
                      hasNextStage={hasNextStage}
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
                  onMoveStage={onMoveStage}
                  hasPrevStage={hasPrevStage}
                  hasNextStage={hasNextStage}
                />
              ))
            )}
            
            {/* Área de drop vazia */}
            {leads.length === 0 && (
              <div className="
                border-2 border-dashed border-gray-200
                rounded-lg p-3 sm:p-4
                text-center
                min-h-[80px] sm:min-h-[100px]
                flex items-center justify-center
                bg-white/50
                transition-all duration-200
                hover:bg-white/80
                hover:border-gray-300
              ">
                <div className="text-gray-500">
                  <div className="text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">
                    Nenhum lead
                  </div>
                  <div className="text-[10px] sm:text-xs hidden sm:block">
                    Arraste leads aqui ou clique no +
                  </div>
                  <div className="text-[10px] sm:hidden">
                    Toque no + para adicionar
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