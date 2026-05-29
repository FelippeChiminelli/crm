import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { PipelineProvider } from './contexts/PipelineContext';
import { QueryProvider } from './contexts/QueryContext';
import { ToastProvider } from './contexts/ToastContext';
import AppRoutes from './routes';
import { enablePerformanceDebugging } from './utils/performance';
import { PWAUpdatePrompt } from './components/pwa/PWAUpdatePrompt';
import { AppErrorBoundary } from './components/errors/AppErrorBoundary';

// Habilitar debugging de performance em desenvolvimento
enablePerformanceDebugging();

function App() {
  return (
    <AppErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <AdminProvider>
            <PipelineProvider>
              <ToastProvider>
                <BrowserRouter>
                  <AppRoutes />
                  <PWAUpdatePrompt />
                </BrowserRouter>
              </ToastProvider>
            </PipelineProvider>
          </AdminProvider>
        </AuthProvider>
      </QueryProvider>
    </AppErrorBoundary>
  );
}

export default App;
