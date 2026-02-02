import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PlusIcon } from '@heroicons/react/24/outline'
import type { DashboardWidget, AnalyticsPeriod } from '../../../types'
import { CustomWidget } from './widgets/CustomWidget'
import { getWidgetTypeDefinition } from './widgets/index'

interface DashboardGridProps {
  widgets: DashboardWidget[]
  period: AnalyticsPeriod
  canEdit: boolean
  onAddWidget?: () => void
  onEditWidget?: (widget: DashboardWidget) => void
  onDeleteWidget?: (widgetId: string) => void
  onLayoutChange?: (widgets: Array<{ id: string; position_x: number; position_y: number; width: number; height: number }>) => void
}

// Configuração do grid
const GRID_COLS = 12
const ROW_HEIGHT = 120 // pixels por unidade de altura
const GRID_GAP = 16 // gap entre widgets

export function DashboardGrid({
  widgets,
  period,
  canEdit,
  onAddWidget,
  onEditWidget,
  onDeleteWidget,
  onLayoutChange
}: DashboardGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Calcular largura da coluna
  const colWidth = containerWidth > 0 
    ? (containerWidth - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS 
    : 0

  // Sensores para drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Observar mudanças de tamanho do container
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Handlers de drag
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    // Encontrar índices
    const oldIndex = widgets.findIndex(w => w.id === active.id)
    const newIndex = widgets.findIndex(w => w.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Reorganizar widgets
    const newWidgets = [...widgets]
    const [movedWidget] = newWidgets.splice(oldIndex, 1)
    newWidgets.splice(newIndex, 0, movedWidget)

    // Recalcular posições baseado na nova ordem
    const updatedPositions = calculatePositions(newWidgets)
    onLayoutChange?.(updatedPositions)
  }, [widgets, onLayoutChange])

  // Widget ativo para overlay
  const activeWidget = activeId ? widgets.find(w => w.id === activeId) : null

  // Calcular altura total do grid
  const gridHeight = calculateGridHeight(widgets)

  // Se não há widgets
  if (widgets.length === 0) {
    return (
      <div 
        ref={containerRef}
        className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
      >
        <p className="text-gray-500 mb-4">Nenhum widget adicionado ainda</p>
        {canEdit && (
          <button
            onClick={onAddWidget}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Adicionar Widget
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map(w => w.id)}
          strategy={rectSortingStrategy}
        >
          <div 
            className="relative"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
              gap: `${GRID_GAP}px`,
              minHeight: `${gridHeight}px`
            }}
          >
            {widgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                period={period}
                canEdit={canEdit}
                colWidth={colWidth}
                onEdit={onEditWidget}
                onDelete={onDeleteWidget}
                onResize={canEdit ? (newSize) => handleResize(widget.id, newSize) : undefined}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget && (
            <div 
              className="opacity-80"
              style={{
                width: activeWidget.width * colWidth + (activeWidget.width - 1) * GRID_GAP,
                height: activeWidget.height * ROW_HEIGHT + (activeWidget.height - 1) * GRID_GAP
              }}
            >
              <CustomWidget
                widget={activeWidget}
                period={period}
                canEdit={false}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Botão flutuante para adicionar */}
      {canEdit && (
        <button
          onClick={onAddWidget}
          className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-50"
          title="Adicionar Widget"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  )

  // Handler de resize
  function handleResize(widgetId: string, newSize: { width: number; height: number }) {
    const widgetDef = widgets.find(w => w.id === widgetId)
    if (!widgetDef) return

    const typeDef = getWidgetTypeDefinition(widgetDef.widget_type)
    if (!typeDef) return

    // Aplicar limites
    const width = Math.max(typeDef.minWidth, Math.min(typeDef.maxWidth, newSize.width))
    const height = Math.max(typeDef.minHeight, Math.min(typeDef.maxHeight, newSize.height))

    if (width === widgetDef.width && height === widgetDef.height) return

    // Atualizar apenas o widget redimensionado
    const updated = widgets.map(w => 
      w.id === widgetId 
        ? { id: w.id, position_x: w.position_x, position_y: w.position_y, width, height }
        : { id: w.id, position_x: w.position_x, position_y: w.position_y, width: w.width, height: w.height }
    )

    onLayoutChange?.(updated)
  }
}

// =====================================================
// WIDGET SORTABLE
// =====================================================

interface SortableWidgetProps {
  widget: DashboardWidget
  period: AnalyticsPeriod
  canEdit: boolean
  colWidth: number
  onEdit?: (widget: DashboardWidget) => void
  onDelete?: (widgetId: string) => void
  onResize?: (newSize: { width: number; height: number }) => void
}

function SortableWidget({
  widget,
  period,
  canEdit,
  colWidth,
  onEdit,
  onDelete,
  onResize
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: widget.id })

  const [isResizing, setIsResizing] = useState(false)
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 })
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${widget.width}`,
    gridRow: `span ${widget.height}`,
    height: `${widget.height * ROW_HEIGHT + (widget.height - 1) * GRID_GAP}px`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1
  }

  // Handlers de resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    setResizeStartSize({ width: widget.width, height: widget.height })
    setResizeStartPos({ x: e.clientX, y: e.clientY })
  }, [widget.width, widget.height])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartPos.x
      const deltaY = e.clientY - resizeStartPos.y

      // Calcular novas dimensões em unidades de grid
      const newWidth = Math.round(resizeStartSize.width + deltaX / (colWidth + GRID_GAP))
      const newHeight = Math.round(resizeStartSize.height + deltaY / ROW_HEIGHT)

      // Limitar ao máximo do grid
      const finalWidth = Math.max(1, Math.min(GRID_COLS, newWidth))
      const finalHeight = Math.max(1, Math.min(6, newHeight))

      if (finalWidth !== widget.width || finalHeight !== widget.height) {
        onResize?.({ width: finalWidth, height: finalHeight })
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizeStartPos, resizeStartSize, colWidth, widget.width, widget.height, onResize])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isResizing ? 'cursor-se-resize' : ''}`}
    >
      {/* Widget com drag handle */}
      <div 
        className="h-full"
        {...(canEdit ? { ...attributes, ...listeners } : {})}
      >
        <CustomWidget
          widget={widget}
          period={period}
          canEdit={canEdit}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {/* Resize handle */}
      {canEdit && onResize && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-blue-500 rounded-tl-lg transition-colors"
          onMouseDown={handleResizeStart}
          style={{ zIndex: 10 }}
        />
      )}
    </div>
  )
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Calcular altura total do grid baseado nos widgets
 */
function calculateGridHeight(widgets: DashboardWidget[]): number {
  if (widgets.length === 0) return 200

  // Encontrar a posição Y máxima + altura
  let maxY = 0
  widgets.forEach(widget => {
    const bottom = widget.position_y + widget.height
    if (bottom > maxY) maxY = bottom
  })

  return maxY * ROW_HEIGHT + (maxY - 1) * GRID_GAP + 100 // margem extra
}

/**
 * Recalcular posições dos widgets após reorganização
 */
function calculatePositions(widgets: DashboardWidget[]): Array<{
  id: string
  position_x: number
  position_y: number
  width: number
  height: number
}> {
  const result: Array<{
    id: string
    position_x: number
    position_y: number
    width: number
    height: number
  }> = []

  // Grid ocupado
  const occupied: boolean[][] = []

  // Garantir que temos linhas suficientes
  const ensureRows = (row: number) => {
    while (occupied.length <= row) {
      occupied.push(new Array(GRID_COLS).fill(false))
    }
  }

  // Verificar se posição está livre
  const isFree = (x: number, y: number, width: number, height: number): boolean => {
    ensureRows(y + height - 1)
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        if (col >= GRID_COLS || occupied[row][col]) return false
      }
    }
    return true
  }

  // Ocupar posição
  const occupy = (x: number, y: number, width: number, height: number) => {
    ensureRows(y + height - 1)
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        occupied[row][col] = true
      }
    }
  }

  // Posicionar cada widget
  widgets.forEach(widget => {
    let placed = false
    let row = 0

    while (!placed) {
      ensureRows(row)
      for (let col = 0; col <= GRID_COLS - widget.width; col++) {
        if (isFree(col, row, widget.width, widget.height)) {
          result.push({
            id: widget.id,
            position_x: col,
            position_y: row,
            width: widget.width,
            height: widget.height
          })
          occupy(col, row, widget.width, widget.height)
          placed = true
          break
        }
      }
      if (!placed) row++
    }
  })

  return result
}
