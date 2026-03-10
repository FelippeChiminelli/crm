import { useAuthContext } from '../contexts/AuthContext'
import { BrandLoader } from '../components/ui/BrandLoader'
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
      <BrandLoader text="Verificando autenticação..." />
    )
  }

  // Permite que usuários autenticados vejam a tela de login se quiserem
  console.log('🌐 Renderizando página pública')
  return <>{children}</>
}

export default PublicRoute 