import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { LeadFilterSelector } from '../LeadFilterSelector'
import { SalesFilterSelector } from '../SalesFilterSelector'
import { ChatFilterSelector } from '../ChatFilterSelector'
import { TaskFilterSelector } from '../TaskFilterSelector'
import type { AnalyticsView } from './AnalyticsSidebar'
import type { LeadAnalyticsFilters, ChatAnalyticsFilters, TaskAnalyticsFilters, SalesAnalyticsFilters } from '../../../types'

interface FiltersModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: () => void
  activeView: AnalyticsView
  draftLeadFilters: LeadAnalyticsFilters
  onLeadFiltersChange: (filters: LeadAnalyticsFilters) => void
  draftSalesFilters: SalesAnalyticsFilters
  onSalesFiltersChange: (filters: SalesAnalyticsFilters) => void
  draftChatFilters: ChatAnalyticsFilters
  onChatFiltersChange: (filters: ChatAnalyticsFilters) => void
  draftTaskFilters: TaskAnalyticsFilters
  onTaskFiltersChange: (filters: TaskAnalyticsFilters) => void
}

function getFilterContent(
  activeView: AnalyticsView,
  props: FiltersModalProps
): React.ReactNode | null {
  switch (activeView) {
    case 'overview':
    case 'pipeline':
    case 'funnel':
      return (
        <LeadFilterSelector
          filters={props.draftLeadFilters}
          onFiltersChange={props.onLeadFiltersChange}
        />
      )
    case 'sales':
    case 'losses':
      return (
        <SalesFilterSelector
          filters={props.draftSalesFilters}
          onFiltersChange={props.onSalesFiltersChange}
        />
      )
    case 'chat':
      return (
        <ChatFilterSelector
          filters={props.draftChatFilters}
          onFiltersChange={props.onChatFiltersChange}
        />
      )
    case 'tasks':
      return (
        <TaskFilterSelector
          filters={props.draftTaskFilters}
          onFiltersChange={props.onTaskFiltersChange}
        />
      )
    default:
      return null
  }
}

export function FiltersModal(props: FiltersModalProps) {
  const { isOpen, onClose, onApply, activeView } = props

  if (!isOpen) return null

  const filterContent = getFilterContent(activeView, props)
  if (!filterContent) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filterContent}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  )
}
