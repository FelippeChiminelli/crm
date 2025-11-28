import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import type { ReactNode } from 'react'
import SecureLogger from '../utils/logger'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuthContext()

  // Log para debug
  SecureLogger.log('🔒 ProtectedRoute', { loading, isAuthenticated })

  // Evitar mostrar loader se já existe usuário autenticado (ex.: refresh de token em background)
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    SecureLogger.log('🚫 Usuário não autenticado, redirecionando para /auth')
    return <Navigate to="/auth" replace />
  }

  SecureLogger.log('✅ Usuário autenticado, renderizando conteúdo protegido')
  return <>{children}</>
}

export default ProtectedRoute 