interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color?: 'primary' | 'green' | 'yellow' | 'red' | 'blue'
}

export function StatCard({ title, value, icon: Icon, color = 'primary' }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-primary-50 text-primary-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-gray-600 truncate">{title}</p>
          <p className="text-base sm:text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </div>
  )
} 