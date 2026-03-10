import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import type { ReactNode } from 'react'
import SecureLogger from '../utils/logger'
import { BrandLoader } from '../components/ui/BrandLoader'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuthContext()

  SecureLogger.log('🔒 ProtectedRoute', { loading, isAuthenticated })

  if (loading && !isAuthenticated) {
    return <BrandLoader text="Verificando autenticação..." />
  }

  if (!isAuthenticated) {
    SecureLogger.log('🚫 Usuário não autenticado, redirecionando para /auth')
    return <Navigate to="/auth" replace />
  }

  SecureLogger.log('✅ Usuário autenticado, renderizando conteúdo protegido')
  return <>{children}</>
}

export default ProtectedRoute 