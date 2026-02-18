import { useCallback, useRef } from 'react'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
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

const GRID_COLS = 12
const ROW_HEIGHT = 120
const GRID_GAP: [number, number] = [16, 16]

interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

function buildLayout(widgets: DashboardWidget[]): LayoutItem[] {
  return widgets.map(w => {
    const typeDef = getWidgetTypeDefinition(w.widget_type)
    return {
      i: w.id,
      x: w.position_x,
      y: w.position_y,
      w: w.width,
      h: w.height,
      minW: typeDef?.minWidth ?? 1,
      minH: typeDef?.minHeight ?? 1,
      maxW: typeDef?.maxWidth ?? GRID_COLS,
      maxH: typeDef?.maxHeight ?? 6
    }
  })
}

export function DashboardGrid({
  widgets,
  period,
  canEdit,
  onAddWidget,
  onEditWidget,
  onDeleteWidget,
  onLayoutChange
}: DashboardGridProps) {
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 })
  const layoutChangeRef = useRef(false)

  const handleLayoutChange = useCallback((newLayout: readonly LayoutItem[]) => {
    if (!onLayoutChange || !canEdit) return

    const hasChanged = newLayout.some(item => {
      const widget = widgets.find(w => w.id === item.i)
      if (!widget) return false
      return widget.position_x !== item.x
        || widget.position_y !== item.y
        || widget.width !== item.w
        || widget.height !== item.h
    })

    if (!hasChanged) return

    if (layoutChangeRef.current) return
    layoutChangeRef.current = true
    requestAnimationFrame(() => { layoutChangeRef.current = false })

    const updated = newLayout
      .filter(item => widgets.some(w => w.id === item.i))
      .map(item => ({
        id: item.i,
        position_x: item.x,
        position_y: item.y,
        width: item.w,
        height: item.h
      }))

    onLayoutChange(updated)
  }, [widgets, onLayoutChange, canEdit])

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
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Adicionar Widget
          </button>
        )}
      </div>
    )
  }

  const layout = buildLayout(widgets)

  return (
    <div ref={containerRef} className="relative dashboard-grid">
      <ResponsiveGridLayout
        width={width}
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: GRID_COLS, md: GRID_COLS, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={ROW_HEIGHT}
        margin={GRID_GAP}
        dragConfig={{ enabled: canEdit, handle: '.widget-drag-handle' }}
        resizeConfig={{ enabled: canEdit, handles: ['se'] }}
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map(widget => (
          <div key={widget.id} className="h-full">
            <CustomWidget
              widget={widget}
              period={period}
              canEdit={canEdit}
              onEdit={onEditWidget}
              onDelete={onDeleteWidget}
            />
          </div>
        ))}
      </ResponsiveGridLayout>

      {canEdit && (
        <button
          onClick={onAddWidget}
          className="fixed bottom-6 right-6 p-4 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all hover:scale-110 z-50"
          title="Adicionar Widget"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}
