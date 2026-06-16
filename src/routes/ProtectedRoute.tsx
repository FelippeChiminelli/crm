import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import type { ReactNode } from 'react'
import SecureLogger from '../utils/logger'
import { BrandLoader } from '../components/ui/BrandLoader'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, isEmpresaDesativada, empresaAtiva } = useAuthContext()

  SecureLogger.log('🔒 ProtectedRoute', { loading, isAuthenticated, isEmpresaDesativada })

  if (loading && !isAuthenticated) {
    return <BrandLoader text="Verificando autenticação..." />
  }

  if (!isAuthenticated) {
    SecureLogger.log('🚫 Usuário não autenticado, redirecionando para /auth')
    return <Navigate to="/auth" replace />
  }

  if (loading || empresaAtiva === null) {
    return <BrandLoader text="Carregando informações da empresa..." />
  }

  if (isEmpresaDesativada) {
    SecureLogger.log('🚫 Empresa desativada, redirecionando para /empresa-desativada')
    return <Navigate to="/empresa-desativada" replace />
  }

  SecureLogger.log('✅ Usuário autenticado, renderizando conteúdo protegido')
  return <>{children}</>
}

export default ProtectedRoute
