import { 
  ChartBarIcon, 
  FunnelIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'

export type AnalyticsView = 'overview' | 'pipeline' | 'funnel' | 'sales' | 'losses' | 'chat' | 'tasks' | 'custom'

interface AnalyticsSidebarProps {
  activeView: AnalyticsView
  onViewChange: (view: AnalyticsView) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
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
    label: 'Leads', 
    icon: FunnelIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hoverColor: 'hover:bg-purple-50'
  },
  { 
    id: 'funnel', 
    label: 'Funil de Conversão', 
    icon: ArrowTrendingUpIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    hoverColor: 'hover:bg-indigo-50'
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
  },
  { 
    id: 'custom', 
    label: 'Personalizado', 
    icon: Squares2X2Icon,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    hoverColor: 'hover:bg-cyan-50'
  }
]

export function AnalyticsSidebar({
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose
}: AnalyticsSidebarProps) {
  return (
    <aside 
      className={`
        bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        ${isMobileOpen 
          ? 'fixed inset-y-0 left-0 z-[9999] w-64 translate-x-0' 
          : 'fixed inset-y-0 left-0 w-64 -translate-x-full lg:relative lg:translate-x-0 lg:z-auto'
        }
        transform transition-transform duration-300
      `}
    >
      {/* Header do Sidebar */}
      <div className="p-3 lg:p-4 border-b border-gray-200 flex items-center justify-between">
        {(!isCollapsed || isMobileOpen) && (
          <h2 className="text-base lg:text-lg font-bold text-gray-900">Analytics</h2>
        )}
        <div className="flex items-center gap-1">
          {/* Botão fechar mobile */}
          <button
            onClick={onMobileClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
          {/* Botão colapsar desktop */}
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="p-2 lg:p-3 space-y-1 lg:space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          const showLabel = !isCollapsed || isMobileOpen
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg 
                transition-all duration-200 group text-sm lg:text-base
                ${isActive 
                  ? `${item.bgColor} ${item.color} font-semibold shadow-sm` 
                  : `text-gray-700 ${item.hoverColor}`
                }
              `}
              title={!showLabel ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
              {showLabel && (
                <span className="truncate">{item.label}</span>
              )}
              {isActive && showLabel && (
                <div className="ml-auto w-2 h-2 bg-current rounded-full" />
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

