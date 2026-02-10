import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import { PermissionRoute } from './PermissionRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthContext } from '../contexts/AuthContext';

// Componente de loading para lazy loading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Carregando...</p>
    </div>
  </div>
);

// Lazy loading das páginas públicas
const AuthPage = lazy(() => import('../pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));

// Lazy loading das páginas protegidas
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const LeadsPage = lazy(() => import('../pages/LeadsPage'));
const KanbanPage = lazy(() => import('../pages/KanbanPage'));
const TasksPage = lazy(() => import('../pages/TasksPage'));
const ProfilesPage = lazy(() => import('../pages/ProfilesPage'));
const EmpresaAdminPage = lazy(() => import('../pages/EmpresaAdminPage'));
const AgendaPage = lazy(() => import('../pages/AgendaPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const CampaignsPage = lazy(() => import('../pages/CampaignsPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const EstoquePage = lazy(() => import('../pages/EstoquePage'));
const LeadPage = lazy(() => import('../pages/LeadPage'));

// Lazy loading da página de agendamento público
const PublicBookingPage = lazy(() => import('../pages/PublicBookingPage'));

// Lazy loading da página pública de dashboard (TV)
const PublicDashboardPage = lazy(() => import('../pages/PublicDashboardPage'));

// Componente para redirecionamento da raiz baseado na autenticação
const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuthContext();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/auth" replace />;
};

// Componente para redirecionamento de rotas não encontradas
const NotFoundRedirect = () => {
  const { isAuthenticated } = useAuthContext();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/auth" replace />;
};

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Rota raiz sempre redireciona para login */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Rotas públicas */}
        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/auth/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        
        {/* Rotas protegidas */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        <Route path="/leads/:leadId" element={
          <ProtectedRoute>
            <LeadPage />
          </ProtectedRoute>
        } />
        
        <Route path="/leads" element={
          <ProtectedRoute>
            <PermissionRoute permission="canCreateLead">
              <LeadsPage />
            </PermissionRoute>
          </ProtectedRoute>
        } />
        
        <Route path="/kanban" element={
          <ProtectedRoute>
            <KanbanPage />
          </ProtectedRoute>
        } />
        
        <Route path="/tasks" element={
          <ProtectedRoute>
            <PermissionRoute permission="canCreateTask">
              <TasksPage />
            </PermissionRoute>
          </ProtectedRoute>
        } />
        
        <Route path="/profiles" element={
          <ProtectedRoute>
            <ProfilesPage />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute>
            <PermissionRoute adminOnly={true}>
              <EmpresaAdminPage />
            </PermissionRoute>
          </ProtectedRoute>
        } />
        
        <Route path="/agenda" element={
          <ProtectedRoute>
            <PermissionRoute permission="canCreateEvent">
              <AgendaPage />
            </PermissionRoute>
          </ProtectedRoute>
        } />
        
        <Route path="/chat" element={
          <ProtectedRoute>
            <MainLayout>
              <ChatPage />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/campanhas" element={
          <ProtectedRoute>
            <CampaignsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/estoque" element={
          <ProtectedRoute>
            <EstoquePage />
          </ProtectedRoute>
        } />
        
        {/* Rotas públicas - NÃO requer autenticação */}
        <Route path="/agendar/:slug" element={<PublicBookingPage />} />
        <Route path="/tv/:token" element={<PublicDashboardPage />} />
        
        {/* Rota catch-all para redirecionar rotas não encontradas */}
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </Suspense>
  );
} 