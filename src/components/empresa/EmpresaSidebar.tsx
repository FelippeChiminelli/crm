import {
  BuildingOfficeIcon,
  UsersIcon,
  ShieldCheckIcon,
  ArrowsRightLeftIcon,
  AdjustmentsHorizontalIcon,
  XCircleIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  CpuChipIcon,
  BellAlertIcon,
  DocumentTextIcon,
  KeyIcon,
  SignalIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

export type EmpresaTab =
  | 'overview'
  | 'users'
  | 'permissions'
  | 'routing'
  | 'customFields'
  | 'lossReasons'
  | 'originOptions'
  | 'whatsapps'
  | 'automations'
  | 'agente'
  | 'notificacoes'
  | 'contracts'
  | 'apiKeys'
  | 'metaCapi'

export interface EmpresaTabItem {
  id: EmpresaTab
  name: string
  description: string
  icon: typeof BuildingOfficeIcon
}

interface EmpresaTabSection {
  title: string
  items: EmpresaTabItem[]
}

export const empresaTabSections: EmpresaTabSection[] = [
  {
    title: 'Geral',
    items: [
      { id: 'overview', name: 'Visão Geral', description: 'Informações da empresa', icon: BuildingOfficeIcon },
      { id: 'users', name: 'Usuários', description: 'Gerenciar usuários', icon: UsersIcon },
      { id: 'permissions', name: 'Permissões Pipeline', description: 'Controlar acesso aos pipelines', icon: ShieldCheckIcon }
    ]
  },
  {
    title: 'Leads',
    items: [
      { id: 'routing', name: 'Roteamento de Leads', description: 'Distribuição automática de leads', icon: ArrowsRightLeftIcon },
      { id: 'customFields', name: 'Campos Personalizados', description: 'Configurar campos', icon: AdjustmentsHorizontalIcon },
      { id: 'lossReasons', name: 'Motivos de Perda', description: 'Gerenciar motivos de perda', icon: XCircleIcon },
      { id: 'originOptions', name: 'Origens', description: 'Restringir origens permitidas nos leads', icon: MapPinIcon }
    ]
  },
  {
    title: 'Comunicação e Automação',
    items: [
      { id: 'whatsapps', name: 'Números WhatsApp', description: 'Conectar e gerenciar instâncias', icon: ChatBubbleLeftRightIcon },
      { id: 'automations', name: 'Automações', description: 'Regras automáticas do CRM', icon: BoltIcon },
      { id: 'agente', name: 'Agentes', description: 'Prompts de atendimento por identificador', icon: CpuChipIcon },
      { id: 'notificacoes', name: 'Notificações', description: 'Push neste aparelho e tipos de aviso', icon: BellAlertIcon }
    ]
  },
  {
    title: 'Integrações',
    items: [
      { id: 'contracts', name: 'Contratos', description: 'Modelos de contrato emitidos na venda', icon: DocumentTextIcon },
      { id: 'apiKeys', name: 'API Keys', description: 'Tokens para integrações externas', icon: KeyIcon },
      { id: 'metaCapi', name: 'Meta CAPI', description: 'Conversions API da Meta', icon: SignalIcon }
    ]
  }
]

export function getEmpresaTabItem(id: EmpresaTab): EmpresaTabItem | undefined {
  return empresaTabSections.flatMap(section => section.items).find(item => item.id === id)
}

interface EmpresaSidebarProps {
  activeTab: EmpresaTab
  onTabChange: (tab: EmpresaTab) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export function EmpresaSidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose
}: EmpresaSidebarProps) {
  const showLabel = !isCollapsed || isMobileOpen

  return (
    <aside
      className={`
        bg-white border-r border-gray-200 flex-shrink-0 flex flex-col
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        ${isMobileOpen
          ? 'fixed inset-y-0 left-0 z-[9999] w-64 translate-x-0'
          : 'fixed inset-y-0 left-0 w-64 -translate-x-full lg:relative lg:translate-x-0 lg:z-auto'
        }
        transform transition-all duration-300
      `}
    >
      <div className="p-3 lg:p-4 border-b border-gray-200 flex items-center justify-between">
        {showLabel && (
          <h2 className="text-base lg:text-lg font-bold text-gray-900">Empresa</h2>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={onMobileClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
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

      <nav className="custom-scrollbar flex-1 min-h-0 overflow-y-auto p-2 lg:p-3 space-y-4">
        {empresaTabSections.map((section, index) => (
          <div key={section.title} className={!showLabel && index > 0 ? 'pt-3 border-t border-gray-200' : ''}>
            {showLabel && (
              <p className="px-3 lg:px-4 mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isActive={activeTab === item.id}
                  showLabel={showLabel}
                  onClick={() => onTabChange(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}

interface SidebarItemProps {
  item: EmpresaTabItem
  isActive: boolean
  showLabel: boolean
  onClick: () => void
}

function SidebarItem({ item, isActive, showLabel, onClick }: SidebarItemProps) {
  const Icon = item.icon

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2.5 rounded-lg
        transition-all duration-200 group text-sm
        ${isActive
          ? 'bg-primary-50 text-primary-600 font-semibold shadow-sm'
          : 'text-gray-700 hover:bg-gray-50'
        }
      `}
      title={!showLabel ? item.name : undefined}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
      {showLabel && <span className="truncate">{item.name}</span>}
    </button>
  )
}
