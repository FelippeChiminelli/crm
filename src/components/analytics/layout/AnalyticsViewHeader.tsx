import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface AnalyticsViewHeaderProps {
  title: string
  subtitle: string
  period?: string
  filterComponent: React.ReactNode
  activeFiltersCount?: number
}

export function AnalyticsViewHeader({
  title,
  subtitle,
  period,
  filterComponent,
  activeFiltersCount = 0
}: AnalyticsViewHeaderProps) {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      {/* Header Principal */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {subtitle}
              {period && <span className="ml-2 font-medium text-blue-600">• {period}</span>}
            </p>
          </div>
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium text-sm"
          >
            {isFiltersExpanded ? (
              <>
                <ChevronUpIcon className="w-4 h-4" />
                Ocultar Filtros
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4" />
                Exibir Filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
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
        <div className="px-6 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
          {filterComponent}
        </div>
      )}
    </div>
  )
}

