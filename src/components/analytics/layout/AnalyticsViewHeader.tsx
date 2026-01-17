import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, Bars3Icon } from '@heroicons/react/24/outline'

interface AnalyticsViewHeaderProps {
  title: string
  subtitle: string
  period?: string
  filterComponent: React.ReactNode
  activeFiltersCount?: number
  onOpenMobileMenu?: () => void
}

export function AnalyticsViewHeader({
  title,
  subtitle,
  period,
  filterComponent,
  activeFiltersCount = 0,
  onOpenMobileMenu
}: AnalyticsViewHeaderProps) {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      {/* Header Principal */}
      <div className="px-3 lg:px-6 py-3 lg:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            {/* Botão Menu Mobile */}
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
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-1.5 lg:py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium text-xs lg:text-sm flex-shrink-0"
          >
            {isFiltersExpanded ? (
              <>
                <ChevronUpIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Ocultar</span>
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 lg:px-2 py-0.5 bg-blue-600 text-white text-[10px] lg:text-xs rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Área de Filtros (Expansível) */}
      {isFiltersExpanded && (
        <div className="px-3 lg:px-6 pb-3 lg:pb-4 border-t border-gray-100 pt-3 lg:pt-4 bg-gray-50">
          {filterComponent}
        </div>
      )}
    </div>
  )
}

