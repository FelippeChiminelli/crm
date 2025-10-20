import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'amber' | 'teal'
  loading?: boolean
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  teal: 'bg-teal-50 text-teal-600 border-teal-200'
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'blue',
  loading = false
}: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Valor Principal */}
      <div className="mb-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>

      {/* Subtítulo e Tendência */}
      {(subtitle || trend) && (
        <div className="flex items-center justify-between">
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          
          {trend && trendValue && (
            <div className="flex items-center gap-1">
              {trend === 'up' && (
                <>
                  <ArrowUpIcon className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">{trendValue}</span>
                </>
              )}
              {trend === 'down' && (
                <>
                  <ArrowDownIcon className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">{trendValue}</span>
                </>
              )}
              {trend === 'stable' && (
                <span className="text-sm font-medium text-gray-500">{trendValue}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

