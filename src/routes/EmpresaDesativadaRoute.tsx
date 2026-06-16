import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { BrandLoader } from '../components/ui/BrandLoader'

interface EmpresaDesativadaRouteProps {
  children: ReactNode
}

export function EmpresaDesativadaRoute({ children }: EmpresaDesativadaRouteProps) {
  const { isAuthenticated, loading, isEmpresaDesativada, empresaAtiva } = useAuthContext()

  if (loading && !isAuthenticated) {
    return <BrandLoader text="Verificando autenticação..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (loading || empresaAtiva === null) {
    return <BrandLoader text="Carregando informações da empresa..." />
  }

  if (!isEmpresaDesativada) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default EmpresaDesativadaRoute
