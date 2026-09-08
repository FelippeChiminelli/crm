import { ENGAGEMENT_CATEGORIES } from './engagementCategories'
import { DEFAULT_INACTIVE_HOURS, formatIdleTime } from '../../../../services/chatEngagementService'
import type { ChatEngagementCategory, ChatEngagementSummary } from '../../../../types'

interface EngagementCardsProps {
  summary: ChatEngagementSummary[]
  loading: boolean
  error: string | null
  inactiveHours?: number
  onSelectCategory: (category: ChatEngagementCategory) => void
}

export function EngagementCards({
  summary,
  loading,
  error,
  inactiveHours = DEFAULT_INACTIVE_HOURS,
  onSelectCategory
}: EngagementCardsProps) {
  // O SQL agrupa por categoria e omite as que não têm conversas no período
  const byCategory = new Map(summary.map(item => [item.category, item]))
  const total = summary.reduce((sum, item) => sum + item.conversations, 0)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm lg:text-base font-semibold text-gray-900">
          Estágio do Atendimento
        </h3>
        <span className="text-xs text-gray-500">
          {total.toLocaleString('pt-BR')} conversas · parado após {inactiveHours}h · clique para ver a lista
        </span>
      </div>

      {error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4">
          {ENGAGEMENT_CATEGORIES.map(config => {
            const item = byCategory.get(config.key)
            const conversations = item?.conversations || 0
            const Icon = config.icon

            if (loading) {
              return (
                <div
                  key={config.key}
                  className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4 animate-pulse"
                >
                  <div className="h-3 lg:h-4 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="h-6 lg:h-8 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-2 lg:h-3 bg-gray-200 rounded w-1/3" />
                </div>
              )
            }

            return (
              <button
                key={config.key}
                type="button"
                onClick={() => onSelectCategory(config.key)}
                disabled={conversations === 0}
                title={config.description}
                className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4 text-left transition-shadow hover:shadow-md disabled:cursor-default disabled:hover:shadow-none"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2 lg:mb-3">
                  <h4 className="text-xs lg:text-sm font-medium text-gray-600 leading-tight">
                    {config.label}
                  </h4>
                  <div
                    className={`p-1 lg:p-2 rounded-lg border flex-shrink-0 ${config.iconClasses}`}
                  >
                    <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                </div>

                {/* Valor principal */}
                <p className="text-xl lg:text-3xl font-bold text-gray-900">
                  {conversations.toLocaleString('pt-BR')}
                </p>

                <p className="text-[10px] lg:text-sm text-gray-500 mt-0.5">
                  {(item?.percentage || 0).toFixed(1)}% do total
                </p>

                {conversations > 0 && (
                  <p className="text-[10px] lg:text-xs text-gray-400 mt-1">
                    {config.ignoresWindow
                      ? `${(item?.stale_conversations || 0).toLocaleString('pt-BR')} há mais de ${inactiveHours}h`
                      : `parado há ${formatIdleTime(item?.avg_idle_hours || 0)} em média`}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
