import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useRef } from 'react';
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useAuthContext } from '../../contexts/AuthContext';
import { useSidebar } from '../../hooks/useSidebar';
import { useProfile } from '../../hooks/useProfile';
import { usePermissionCheck } from '../../routes/PermissionRoute';
import type { UserPermissions } from '../../contexts/AuthContext';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description?: string;
  permission?: keyof UserPermissions;
  adminOnly?: boolean;
  allowedRoles?: ('ADMIN' | 'VENDEDOR')[];
}

interface MainLayoutProps {
  children: React.ReactNode;
}

const navigation: NavigationItem[] = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: HomeIcon,
    description: 'Visão geral do sistema'
    // Todos podem acessar dashboard
  },
  { 
    name: 'Kanban', 
    href: '/kanban', 
    icon: UserGroupIcon,
    description: 'Visualização em pipeline'
    // Todos podem acessar kanban (controle interno por pipeline)
  },
  { 
    name: 'Leads', 
    href: '/leads', 
    icon: UsersIcon,
    description: 'Gerenciar leads e prospects',
    permission: 'canCreateLead'
  },
  { 
    name: 'Tarefas', 
    href: '/tasks', 
    icon: ClipboardDocumentListIcon,
    description: 'Acompanhar atividades e lembretes',
    permission: 'canCreateTask'
  },
  { 
    name: 'Agenda', 
    href: '/agenda', 
    icon: CalendarIcon,
    description: 'Compromissos, reuniões e eventos',
    permission: 'canCreateEvent'
  },
  { 
    name: 'Chat', 
    href: '/chat', 
    icon: ChatBubbleLeftRightIcon,
    description: 'Conversas via WhatsApp'
    // Chat é acessível por todos (controle interno por instância)
  },
  { 
    name: 'Empresa', 
    href: '/admin', 
    icon: BuildingOfficeIcon,
    description: 'Administração da empresa',
    adminOnly: true
  }
];

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, userRole, loading } = useAuthContext();
  const { sidebarOpen, setSidebarOpen, toggleMobileSidebar } = useSidebar();
  const { getUserName } = useProfile();
  const { checkPermission, checkAdminOnly } = usePermissionCheck();

  // Memo de estabilidade: persiste o último estado admin para sobreviver a reloads
  const lastAdminStored = (() => {
    try {
      return localStorage.getItem('last_is_admin') === 'true'
    } catch {
      return false
    }
  })()
  const lastAdminTrueRef = useRef<boolean>(lastAdminStored)

  // Estado para controle do collapse da sidebar - carregado imediatamente do localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    return savedCollapsed === 'true';
  });

  // Hook para detectar se é desktop
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);



  // Função para alternar o collapse da sidebar
  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('sidebar-collapsed', newCollapsed.toString());
  };

  const handleSignOut = async () => {
    try {
      await logout();
      try { localStorage.removeItem('last_is_admin') } catch {}
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const closeSidebar = () => {
    // Só fechar sidebar em telas mobile
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    toggleMobileSidebar();
  };

  // Captura estado atual de admin e memoriza último true para evitar flicker em transições
  const isAdminNow = checkAdminOnly();
  if (isAdminNow && !lastAdminTrueRef.current) {
    lastAdminTrueRef.current = true;
    try { localStorage.setItem('last_is_admin', 'true') } catch {}
  }

  // Filtrar navegação baseado nas permissões do usuário
  const filteredNavigation = navigation.filter(item => {
    // Verificar se é apenas para admin (com fallback memoizado)
    if (item.adminOnly && !loading) {
      const allowAdminItem = isAdminNow || lastAdminTrueRef.current;
      if (!allowAdminItem) {
        return false;
      }
    }
    
    // Verificar permissão específica
    if (item.permission && !loading && !checkPermission(item.permission)) {
      return false;
    }
    
    // Verificar roles permitidas
    if (item.allowedRoles && !loading && userRole && !item.allowedRoles.includes(userRole)) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden max-w-full">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - Tema Escuro */}
      <div className={`
        fixed lg:relative
        inset-y-0 left-0 z-50
        ${isCollapsed ? 'w-20' : 'w-64'} bg-gray-900
        shadow-2xl flex flex-col overflow-hidden
        
        transform lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        
        transition-transform duration-300 ease-in-out lg:transition-none
        lg:transition-[width] lg:duration-300 lg:ease-in-out
      `}>
        {/* Header da Sidebar */}
        <div className={`${isCollapsed ? 'px-3' : 'px-6'} py-4 bg-gray-800 border-b border-gray-700`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className={`${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'} bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-lg`}>
                <span className={`text-white font-bold ${isCollapsed ? 'text-base' : 'text-sm'}`}>ADV</span>
              </div>
              {!isCollapsed && (
                <span className="ml-3 text-lg font-semibold text-white">
                  ADV - CRM
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Botão de Collapse - apenas em desktop */}
              <button
                onClick={toggleCollapse}
                className="hidden lg:block p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="h-5 w-5" />
                ) : (
                  <ChevronLeftIcon className="h-5 w-5" />
                )}
              </button>
              
              <button
                onClick={closeSidebar}
                className="lg:hidden p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Saudação do Usuário */}
          {!isCollapsed && (
            <div className="text-sm text-gray-300">
              Olá, <span className="text-white font-medium">
                {getUserName()}
              </span>
            </div>
          )}
        </div>

                {/* Navegação */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 overflow-y-auto overflow-x-hidden`}>
          <div className={`${isCollapsed ? 'space-y-2' : 'space-y-1'}`}>
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    closeSidebar();
                  }}
                  className={`
                    w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-4' : 'px-3 py-3'} text-sm font-medium rounded-lg
                    transition-all duration-200 group relative
                    ${isActive
                      ? 'bg-primary-600 text-white shadow-lg border-l-4 border-primary-400'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                    overflow-hidden
                  `}
                  title={isCollapsed ? `${item.name} - ${item.description}` : item.description}
                >
                  <item.icon
                    className={`${isCollapsed ? 'mx-auto h-6 w-6' : 'mr-3 h-5 w-5'} ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="transition-opacity duration-200 truncate">
                      {item.name}
                    </span>
                  )}
                  
                  {/* Tooltip para modo colapsado */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
                      {item.name}
                      <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className={`border-t border-gray-700 ${isCollapsed ? 'p-2' : 'p-4'} bg-gray-800`}>
          <div className={`${isCollapsed ? 'flex justify-center mb-4' : 'flex items-center mb-3'}`}>
            <div className={`${isCollapsed ? 'w-12 h-12' : 'w-10 h-10'} bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg group relative`}>
              <UserIcon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} text-white`} />
              
              {/* Tooltip do usuário para modo colapsado */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
                  {getUserName()}
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email || 'Usuário'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.user_metadata?.empresa_nome || 'Sistema'}
                </p>
              </div>
            )}
          </div>
          
          <div className={`${isCollapsed ? 'space-y-2' : 'space-y-1'}`}>
            <button
              onClick={() => {
                navigate('/profiles');
                closeSidebar();
              }}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2'} text-sm text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors group relative overflow-hidden`}
              title="Perfil"
            >
              <UserIcon className={`${isCollapsed ? 'mx-auto h-5 w-5' : 'mr-3 h-4 w-4'}`} />
              {!isCollapsed && 'Perfil'}
              
              {/* Tooltip para modo colapsado */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
                  Perfil
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </button>
            
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2'} text-sm text-red-400 rounded-lg hover:bg-red-900 hover:bg-opacity-20 hover:text-red-300 transition-colors group relative overflow-hidden`}
              title="Sair"
            >
              <ArrowRightOnRectangleIcon className={`${isCollapsed ? 'mx-auto h-5 w-5' : 'mr-3 h-4 w-4'}`} />
              {!isCollapsed && 'Sair'}
              
              {/* Tooltip para modo colapsado */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
                  Sair
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Mobile */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center">
              <div className="w-6 h-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">CRM</span>
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">
                ADV System
              </span>
            </div>
            
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-hidden bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
} 