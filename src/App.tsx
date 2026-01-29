import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { PipelineProvider } from './contexts/PipelineContext';
import { QueryProvider } from './contexts/QueryContext';
import { ToastProvider } from './contexts/ToastContext';
import AppRoutes from './routes';
import { enablePerformanceDebugging } from './utils/performance';
import { PWAUpdatePrompt } from './components/pwa/PWAUpdatePrompt';

// Habilitar debugging de performance em desenvolvimento
enablePerformanceDebugging();

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AdminProvider>
          <PipelineProvider>
            <ToastProvider>
              <BrowserRouter>
                <AppRoutes />
                {/* Notificação de atualização do PWA */}
                <PWAUpdatePrompt />
              </BrowserRouter>
            </ToastProvider>
          </PipelineProvider>
        </AdminProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
