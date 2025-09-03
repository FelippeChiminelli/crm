import { useAuthContext } from '../contexts/AuthContext'
import type { ReactNode } from 'react'

interface PublicRouteProps {
  children: ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { loading } = useAuthContext()

  // Log para debug
  console.log('🌐 PublicRoute - loading:', loading)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Permite que usuários autenticados vejam a tela de login se quiserem
  console.log('🌐 Renderizando página pública')
  return <>{children}</>
}

export default PublicRoute 