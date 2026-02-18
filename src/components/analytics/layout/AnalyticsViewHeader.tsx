import { AdjustmentsHorizontalIcon, Bars3Icon } from '@heroicons/react/24/outline'

interface AnalyticsViewHeaderProps {
  title: string
  subtitle: string
  period?: string
  activeFiltersCount?: number
  onOpenMobileMenu?: () => void
  onOpenFilters: () => void
}

export function AnalyticsViewHeader({
  title,
  subtitle,
  period,
  activeFiltersCount = 0,
  onOpenMobileMenu,
  onOpenFilters
}: AnalyticsViewHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-3 lg:px-6 py-3 lg:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <button
              onClick={onOpenMobileMenu}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden flex-shrink-0"
            >
              <Bars3Icon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">{title}</h1>
              <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1 truncate">
                <span className="hidden sm:inline">{subtitle}</span>
                {period && <span className="font-medium text-blue-600 sm:ml-2"><span className="hidden sm:inline">• </span>{period}</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenFilters}
            className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-1.5 lg:py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium text-xs lg:text-sm flex-shrink-0"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 lg:px-2 py-0.5 bg-blue-600 text-white text-[10px] lg:text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
