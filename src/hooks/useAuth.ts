import { useState } from 'react'
import { login, signUp } from '../services/authService'
import { getCurrentUserProfile } from '../services/profileService'
import { useAuthContext } from '../contexts/AuthContext'

function getPostAuthRedirectPath(profile: Awaited<ReturnType<typeof getCurrentUserProfile>>['data']): string {
  if (profile?.empresa_id && profile.empresa_ativa === false) {
    return '/empresa-desativada'
  }
  return '/dashboard'
}

export function useAuth() {
  const { refreshUser, profile } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(email: string, password: string) {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await login(email, password)
      if (error) {
        setError((error as any)?.message || 'Erro no login')
        return { data, error, redirectPath: '/dashboard' as const }
      }
      
      await refreshUser()
      const { data: freshProfile } = await getCurrentUserProfile()
      const redirectPath = getPostAuthRedirectPath(freshProfile)
      return { data, error: null, redirectPath }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage }, redirectPath: '/dashboard' as const }
    } finally {
      setLoading(false)
    }
  }

  // Novo: aceitar profileData opcional
  async function handleSignUp(email: string, password: string, profileData?: Parameters<typeof signUp>[2]) {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await signUp(email, password, profileData)
      if (error) {
        setError((error as any)?.message || 'Erro no cadastro')
        return { data, error }
      }
      // Não atualiza o contexto aqui pois o usuário ainda não confirmou o email
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    profile,
    handleLogin,
    handleSignUp,
  }
} 