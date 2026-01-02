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
  BuildingOfficeIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';
import { useAuthContext } from '../../contexts/AuthContext';
import { useSidebar } from '../../hooks/useSidebar';
import { useProfile } from '../../hooks/useProfile';
import { usePermissionCheck } from '../../routes/PermissionRoute';
import type { UserPermissions } from '../../contexts/AuthContext';
import AuctaLogo from '../../assets/logo-aucta.svg';
import AuctaLogoText from '../../assets/logo-aucta-text.svg';

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
    name: 'Campanhas', 
    href: '/campanhas', 
    icon: MegaphoneIcon,
    description: 'Campanhas de disparo de mensagens WhatsApp'
    // Campanhas acessível por todos
  },
  { 
    name: 'Analytics', 
    href: '/analytics', 
    icon: ChartBarIcon,
    description: 'Análises e relatórios personalizados'
    // Controle de permissão feito dentro da página
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
  const { profile, logout, userRole, loading } = useAuthContext();
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

  // Estado para controle do collapse da sidebar - sempre inicia colapsado
  const [isCollapsed, setIsCollapsed] = useState(true);

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
    <div className="flex h-screen overflow-hidden max-w-full">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - Tema Escuro */}
      <div 
        className={`
          fixed
          inset-y-0 left-0 z-50
          ${isCollapsed ? 'w-20' : 'w-56'} bg-gray-900
          shadow-2xl flex flex-col overflow-hidden
          
          transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          
          transition-all duration-300 ease-in-out
        `}
        onMouseEnter={() => isDesktop && setIsCollapsed(false)}
        onMouseLeave={() => isDesktop && setIsCollapsed(true)}
      >
        {/* Header da Sidebar */}
        <div className="px-4 py-4 bg-gray-800 border-b border-gray-700 transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-center mb-2 relative">
            <div className={`flex items-center transition-all duration-300 ease-in-out ${isCollapsed ? 'justify-center' : 'justify-center gap-3'}`}>
              <img 
                src={AuctaLogo} 
                alt="Aucta" 
                className="h-12 w-12 object-contain flex-shrink-0"
              />
              {!isCollapsed && (
                <img 
                  src={AuctaLogoText} 
                  alt="Aucta.crm" 
                  className="h-4 w-auto object-contain"
                />
              )}
            </div>
            
            {/* Botão de fechar apenas mobile */}
            <button
              onClick={closeSidebar}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors absolute right-0"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

                {/* Navegação */}
        <nav className="flex-1 px-3 pt-4 pb-6 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out">
          <div className="space-y-1">
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
                    w-full flex items-center text-xs font-medium rounded-lg
                    transition-all duration-300 group relative
                    ${isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-3'}
                    ${isActive
                      ? 'bg-primary-600 text-white shadow-lg border-l-4 border-primary-400'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                    overflow-hidden
                  `}
                  title={isCollapsed ? `${item.name} - ${item.description}` : item.description}
                >
                  <item.icon
                    className={`flex-shrink-0 h-5 w-5 transition-all duration-300 ease-in-out ${isCollapsed ? 'mx-auto' : 'mr-3'} ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                    }`}
                  />
                  <span className={`truncate transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                    {item.name}
                  </span>
                  
                  {/* Tooltip para modo colapsado */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
                      {item.name}
                      <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-700 p-3 bg-gray-800 transition-all duration-300 ease-in-out">
          <div className={`flex items-center mb-3 transition-all duration-300 ease-in-out ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-full w-10 h-10 flex items-center justify-center shadow-lg group relative flex-shrink-0 transition-all duration-300 ease-in-out">
              <UserIcon className="text-white h-5 w-5 transition-all duration-300 ease-in-out" />
              
              {/* Tooltip do usuário para modo colapsado */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
                  {getUserName()}
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">
                  {getUserName()}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {profile?.empresa_nome || 'Sistema'}
                </p>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <button
              onClick={() => {
                navigate('/profiles');
                closeSidebar();
              }}
              className={`w-full flex items-center text-xs text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-300 group relative overflow-hidden ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'}`}
              title="Perfil"
            >
              <UserIcon className={`flex-shrink-0 h-5 w-5 transition-all duration-300 ease-in-out ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              <span className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                Perfil
              </span>
              
              {/* Tooltip para modo colapsado */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
                  Perfil
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </button>
            
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center text-xs text-red-400 rounded-lg hover:bg-red-900 hover:bg-opacity-20 hover:text-red-300 transition-all duration-300 group relative overflow-hidden ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'}`}
              title="Sair"
            >
              <ArrowRightOnRectangleIcon className={`flex-shrink-0 h-5 w-5 transition-all duration-300 ease-in-out ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              <span className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                Sair
              </span>
              
              {/* Tooltip para modo colapsado */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
                  Sair
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full max-w-full lg:pl-20">
        {/* Header Mobile */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
              <img 
                src={AuctaLogo} 
                alt="Aucta" 
                className="h-8 w-8 object-contain flex-shrink-0"
              />
              <img 
                src={AuctaLogoText} 
                alt="Aucta.crm" 
                className="h-3 w-auto object-contain max-w-full"
              />
            </div>
            
            <div className="w-10 flex-shrink-0" /> {/* Spacer */}
          </div>
        </div>

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-hidden bg-gray-50 w-full max-w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
} 