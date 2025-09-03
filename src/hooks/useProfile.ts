import { useState, useEffect } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { getCurrentUserProfile } from '../services/profileService'
import type { Profile } from '../types'

export function useProfile() {
  const { user, isAuthenticated } = useAuthContext()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      console.log('👤 useProfile: fetchProfile iniciado')
      console.log('👤 isAuthenticated:', isAuthenticated)
      console.log('👤 user:', user)
      console.log('👤 user?.id:', user?.id)
      
      if (!isAuthenticated || !user?.id) {
        console.log('⚠️ useProfile: Usuário não autenticado ou sem ID')
        setProfile(null)
        return
      }

      console.log('👤 useProfile: Buscando perfil para user.id:', user.id)
      
      setLoading(true)
      setError(null)

      try {
        const { data, error: profileError } = await getCurrentUserProfile()
        
        console.log('👤 useProfile: Resultado da busca:', { data, profileError })
        
        if (profileError) {
          console.warn('❌ useProfile: Erro ao carregar perfil:', profileError.message)
          setError(profileError.message)
          setProfile(null)
        } else {
          console.log('✅ useProfile: Perfil carregado:', data)
          setProfile(data)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar perfil'
        console.error('❌ useProfile: Erro ao buscar perfil:', err)
        setError(errorMessage)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user?.id, isAuthenticated])

  return {
    profile,
    loading,
    error,
    // Helper para pegar nome do usuário
    getUserName: () => {
      if (profile?.full_name) {
        return profile.full_name
      }
      
      // Fallback para metadata se perfil não estiver carregado ainda
      if (user?.user_metadata?.full_name || user?.user_metadata?.name) {
        return user.user_metadata.full_name || user.user_metadata.name
      }
      
      return 'Usuário'
    }
  }
} 