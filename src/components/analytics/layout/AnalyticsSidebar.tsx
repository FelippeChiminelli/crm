import { 
  ChartBarIcon, 
  FunnelIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

export type AnalyticsView = 'overview' | 'pipeline' | 'sales' | 'losses' | 'chat' | 'tasks'

interface AnalyticsSidebarProps {
  activeView: AnalyticsView
  onViewChange: (view: AnalyticsView) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

interface MenuItem {
  id: AnalyticsView
  label: string
  icon: typeof ChartBarIcon
  color: string
  bgColor: string
  hoverColor: string
}

const menuItems: MenuItem[] = [
  { 
    id: 'overview', 
    label: 'Visão Geral', 
    icon: ChartBarIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-50'
  },
  { 
    id: 'pipeline', 
    label: 'Leads / Pipeline', 
    icon: FunnelIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hoverColor: 'hover:bg-purple-50'
  },
  { 
    id: 'sales', 
    label: 'Vendas', 
    icon: CheckCircleIcon,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    hoverColor: 'hover:bg-emerald-50'
  },
  { 
    id: 'losses', 
    label: 'Perdas', 
    icon: XMarkIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    hoverColor: 'hover:bg-red-50'
  },
  { 
    id: 'chat', 
    label: 'Chat / WhatsApp', 
    icon: ChatBubbleLeftRightIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    hoverColor: 'hover:bg-green-50'
  },
  { 
    id: 'tasks', 
    label: 'Tarefas', 
    icon: ClipboardDocumentCheckIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    hoverColor: 'hover:bg-orange-50'
  }
]

export function AnalyticsSidebar({
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse
}: AnalyticsSidebarProps) {
  return (
    <aside 
      className={`
        bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Header do Sidebar */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-lg font-bold text-gray-900">Analytics</h2>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={isCollapsed ? 'Expandir' : 'Recolher'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="p-3 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg 
                transition-all duration-200 group
                ${isActive 
                  ? `${item.bgColor} ${item.color} font-semibold shadow-sm` 
                  : `text-gray-700 ${item.hoverColor}`
                }
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-2 h-2 bg-current rounded-full" />
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

