import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { logout } from '../services/authService'
import { supabase } from '../services/supabaseClient'
import type { ProfileWithRole } from '../types'
import { getProfile, updateCurrentUserProfile } from '../services/profileService'
import SecureLogger from '../utils/logger'

export type UserRole = 'ADMIN' | 'VENDEDOR'

export interface UserPermissions {
  // Permissões gerais
  canAccessAdmin: boolean
  canManageUsers: boolean
  canViewAllData: boolean
  
  // Permissões de Kanban
  allowedPipelineIds: string[]
  canCreatePipeline: boolean
  canEditPipeline: boolean
  canDeletePipeline: boolean
  
  // Permissões de Chat
  allowedChatInstanceIds: string[]
  canConnectNewNumbers: boolean
  canViewAllConversations: boolean
  
  // Permissões de Leads
  canCreateLead: boolean
  canEditAllLeads: boolean
  canDeleteLeads: boolean
  canViewAllLeads: boolean
  
  // Permissões de Tarefas
  canCreateTask: boolean
  canEditAllTasks: boolean
  canDeleteTasks: boolean
  canViewAllTasks: boolean
  
  // Permissões de Agenda
  canCreateEvent: boolean
  canEditAllEvents: boolean
  canDeleteEvents: boolean
  canViewAllEvents: boolean
}

interface AuthContextType {
  user: User | null
  profile: ProfileWithRole | null
  userRole: UserRole | null
  permissions: UserPermissions | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  empresaNicho: string | null
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: keyof UserPermissions) => boolean
  canAccessPipeline: (pipelineId: string) => boolean
  canAccessChatInstance: (instanceId: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileWithRole | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true) // Inicia como true para verificar sessão
  const [error, setError] = useState<string | null>(null)
  const profileLoadInFlightRef = useRef<Promise<void> | null>(null)
  const lastProfileRef = useRef<ProfileWithRole | null>(null)
  const lastAuthHandledAtRef = useRef<number>(0)

  const isAuthenticated = !!user
  const isAdmin = userRole === 'ADMIN'

  // Função para gerar permissões baseado no role
  const generatePermissions = (
    role: UserRole,
    options: { verTodosLeads?: boolean } = {}
  ): UserPermissions => {
    const { verTodosLeads = false } = options
    if (role === 'ADMIN') {
      return {
        // Permissões gerais
        canAccessAdmin: true,
        canManageUsers: true,
        canViewAllData: true,
        
        // Permissões de Kanban
        allowedPipelineIds: [], // Array vazio significa acesso a todos
        canCreatePipeline: true,
        canEditPipeline: true,
        canDeletePipeline: true,
        
        // Permissões de Chat
        allowedChatInstanceIds: [], // Array vazio significa acesso a todos
        canConnectNewNumbers: true,
        canViewAllConversations: true,
        
        // Permissões de Leads
        canCreateLead: true,
        canEditAllLeads: true,
        canDeleteLeads: true,
        canViewAllLeads: true,
        
        // Permissões de Tarefas
        canCreateTask: true,
        canEditAllTasks: true,
        canDeleteTasks: true,
        canViewAllTasks: true,
        
        // Permissões de Agenda
        canCreateEvent: true,
        canEditAllEvents: true,
        canDeleteEvents: true,
        canViewAllEvents: true,
      }
    } else {
      // VENDEDOR - permissões limitadas
      return {
        // Permissões gerais
        canAccessAdmin: false,
        canManageUsers: false,
        canViewAllData: false,
        
        // Permissões de Kanban (específicas por pipeline)
        allowedPipelineIds: [], // Será preenchido pelo admin
        canCreatePipeline: false,
        canEditPipeline: false,
        canDeletePipeline: false,
        
        // Permissões de Chat (específicas por instância)
        allowedChatInstanceIds: [], // Será preenchido pelo admin
        canConnectNewNumbers: false,
        canViewAllConversations: false,
        
        // Permissões de Leads (limitadas; elevadas para vendedor com ver_todos_leads)
        canCreateLead: true,
        canEditAllLeads: verTodosLeads,
        canDeleteLeads: false,
        canViewAllLeads: verTodosLeads,
        
        // Permissões de Tarefas (limitadas)
        canCreateTask: true,
        canEditAllTasks: false,
        canDeleteTasks: false,
        canViewAllTasks: false,
        
        // Permissões de Agenda (limitadas)
        canCreateEvent: true,
        canEditAllEvents: false,
        canDeleteEvents: false,
        canViewAllEvents: false,
      }
    }
  }

  // Função para verificar permissão específica
  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!permissions) return false
    const value = permissions[permission]
    return Array.isArray(value) ? value.length === 0 : Boolean(value) // Array vazio = acesso total
  }

  // Função para verificar acesso a pipeline específico
  const canAccessPipeline = (pipelineId: string): boolean => {
    if (!permissions) return false
    if (isAdmin) return true // Admin tem acesso a tudo
    // Para não-admin: somente pipelines explicitamente permitidos
    return permissions.allowedPipelineIds.includes(pipelineId)
  }

  // Função para verificar acesso a instância de chat específica
  const canAccessChatInstance = (instanceId: string): boolean => {
    if (!permissions) return false
    if (isAdmin) return true // Admin tem acesso a tudo
    return permissions.allowedChatInstanceIds.length === 0 || permissions.allowedChatInstanceIds.includes(instanceId)
  }

  // Função para carregar perfil e permissões
  const loadUserProfile = async (userId: string) => {
    // Evitar chamadas concorrentes
    if (profileLoadInFlightRef.current) {
      try { await profileLoadInFlightRef.current } catch {}
      return
    }

    const run = async () => {
      try {
      SecureLogger.log('🔍 Carregando perfil do usuário', { userId })

      // Se já temos um perfil carregado em memória para este usuário, evitar refetch
      if (lastProfileRef.current?.uuid === userId) {
        setProfile(lastProfileRef.current)
        const role: UserRole = lastProfileRef.current.is_admin ? 'ADMIN' : 'VENDEDOR'
        setUserRole(role)
        setPermissions(generatePermissions(role, {
          verTodosLeads: !!lastProfileRef.current.ver_todos_leads
        }))
        SecureLogger.log('🗂️ Reutilizando perfil em memória (sem refetch)')
        return
      }
      
      // Função auxiliar com timeout
      const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
        return await Promise.race([
          p,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)) as Promise<T>
        ])
      }

      // Cache local imediato
      try {
        const cachedRaw = localStorage.getItem(`profile_cache_${userId}`)
        if (cachedRaw && !lastProfileRef.current) {
          const cached = JSON.parse(cachedRaw)
          lastProfileRef.current = cached
          setProfile(cached)
          const role: UserRole = cached.is_admin ? 'ADMIN' : 'VENDEDOR'
          setUserRole(role)
          setPermissions(generatePermissions(role, {
            verTodosLeads: !!cached?.ver_todos_leads
          }))
          SecureLogger.log('🗂️ Perfil carregado do cache local imediatamente')
        }
      } catch {}

      // 1ª tentativa (2s) para reduzir bloqueio perceptível
      let profileData: any = null
      let profileError: any = null
      try {
        const r1 = await withTimeout(getProfile(userId), 2000)
        profileData = (r1 as any).data
        profileError = (r1 as any).error
      } catch (e1) {
        profileError = e1
      }

      // Retry rápido (2ª tentativa, 1s)
      if (!profileData) {
        try {
          const r2 = await withTimeout(getProfile(userId), 1000)
          profileData = (r2 as any).data
          profileError = (r2 as any).error
        } catch (e2) {
          profileError = e2
        }
      }
      
      if (profileError) {
        SecureLogger.error('❌ Erro ao carregar perfil', profileError)
        // Se não houver cache anterior, usar metadados do user como perfil básico
        if (!lastProfileRef.current) {
          const basic = user ? {
            uuid: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
            phone: user.user_metadata?.phone || '',
            email: user.email || '',
            is_admin: false
          } as ProfileWithRole : null
          if (basic) {
            setProfile(basic)
            lastProfileRef.current = basic
            const role: UserRole = basic.is_admin ? 'ADMIN' : 'VENDEDOR'
            setUserRole(role)
            setPermissions(generatePermissions(role))
            SecureLogger.log('🧩 Perfil básico preenchido via user_metadata')
          } else {
            SecureLogger.log('🔄 Criando perfil padrão temporário para continuar...')
            setProfile({ uuid: userId, full_name: 'Usuário', phone: '', email: '', is_admin: false })
            setUserRole('VENDEDOR')
            setPermissions(generatePermissions('VENDEDOR'))
          }
        }
        // Não bloquear UI: manter perfil anterior se existir
        return
      }

      if (profileData) {
        SecureLogger.log('✅ Perfil carregado', { profileId: profileData.uuid })
        setProfile(profileData)
        lastProfileRef.current = profileData
        try { localStorage.setItem(`profile_cache_${userId}`, JSON.stringify(profileData)) } catch {}
        
        // Determinar role baseado no perfil
        const role: UserRole = profileData.is_admin ? 'ADMIN' : 'VENDEDOR'
        setUserRole(role)
        
        // Gerar permissões baseado no role
        const userPermissions = generatePermissions(role, {
          verTodosLeads: !!profileData.ver_todos_leads
        })
        setPermissions(userPermissions)
        
        SecureLogger.log('✅ Role definido', { role })
        SecureLogger.log('✅ Permissões configuradas')
      } else {
        SecureLogger.log('⚠️ Nenhum perfil encontrado, criando perfil padrão...')
        // Se não encontrou perfil, criar um padrão
        setProfile({
          uuid: userId,
          full_name: 'Usuário',
          phone: '',
          email: '',
          is_admin: false
        })
        setUserRole('VENDEDOR')
        setPermissions(generatePermissions('VENDEDOR'))
      }
    } catch (err) {
      SecureLogger.error('❌ Erro ao carregar perfil', err)
      // Se já tínhamos um perfil carregado antes, manter sem sobrescrever
      if (lastProfileRef.current) {
        SecureLogger.warn('⚠️ Mantendo perfil anterior em cache devido a erro/timeout')
        setProfile(lastProfileRef.current)
        const role: UserRole = lastProfileRef.current.is_admin ? 'ADMIN' : 'VENDEDOR'
        setUserRole(role)
        setPermissions(generatePermissions(role, {
          verTodosLeads: !!lastProfileRef.current.ver_todos_leads
        }))
      } else {
        // Fallback absoluto apenas se não houver cache
        SecureLogger.log('🔄 Criando perfil padrão devido ao erro...')
        setProfile({
          uuid: userId,
          full_name: 'Usuário',
          phone: '',
          email: '',
          is_admin: false
        })
        setUserRole('VENDEDOR')
        setPermissions(generatePermissions('VENDEDOR'))
      }
    }
    }

    try {
      profileLoadInFlightRef.current = run()
      await profileLoadInFlightRef.current
    } finally {
      profileLoadInFlightRef.current = null
    }
  }

  async function refreshUser() {
    try {
      SecureLogger.log('🔄 Iniciando refreshUser...')
      // Soft refresh: não bloquear UI se já temos usuário e perfil carregados
      const shouldBlockUI = !(user && (profile || lastProfileRef.current))
      if (shouldBlockUI) {
        setLoading(true)
      }
      setError(null)
      
      // Verificar se há uma sessão ativa
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        SecureLogger.error('❌ Erro ao obter sessão', { message: sessionError.message })
        
        // Se o erro for de usuário não existente, limpar a sessão
        if (sessionError.message.includes('User from sub claim in JWT does not exist')) {
          SecureLogger.log('🔄 Usuário não existe mais, limpando sessão...')
          await supabase.auth.signOut()
          setUser(null)
          setLoading(false)
          return
        }
        
        setUser(null)
        setLoading(false)
        return
      }
      
      if (sessionData.session?.user) {
        SecureLogger.log('✅ Sessão encontrada', { email: sessionData.session.user.email })
        setUser(sessionData.session.user)
        
        // Carregar perfil e permissões
        await loadUserProfile(sessionData.session.user.id)
      } else {
        SecureLogger.log('⚠️ Nenhuma sessão ativa encontrada')
        setUser(null)
        setProfile(null)
        setUserRole(null)
        setPermissions(null)
      }
    } catch (err) {
      SecureLogger.error('❌ Erro na verificação de autenticação', err)
      
      // Se o erro for de usuário não existente, limpar a sessão
      if (err instanceof Error && err.message.includes('User from sub claim in JWT does not exist')) {
        SecureLogger.log('🔄 Usuário não existe mais, limpando sessão...')
        await supabase.auth.signOut()
        setUser(null)
      } else {
        setError('Erro ao verificar autenticação')
        setUser(null)
      }
    } finally {
      // Apenas alterar loading se tínhamos bloqueado a UI
      if (user && (profile || lastProfileRef.current)) {
        // Soft refresh: garantir que loading não fique true por engano
        setLoading(false)
      }
      if (!user || !profile) {
        setLoading(false)
      }
      SecureLogger.log('🔄 refreshUser concluído', { isAuthenticated: !!user })
    }
  }

  async function handleLogout() {
    try {
      SecureLogger.log('🚪 Iniciando logout...')
      setLoading(true)
      setError(null)
      const { error } = await logout()
      if (error) {
        SecureLogger.error('❌ Erro no logout', { message: error.message })
        setError(error.message)
      } else {
        SecureLogger.log('✅ Logout realizado com sucesso')
        setUser(null)
        setProfile(null)
        setUserRole(null)
        setPermissions(null)
      }
    } catch (err) {
      SecureLogger.error('❌ Erro inesperado no logout', err)
      setError('Erro ao fazer logout')
    } finally {
      setLoading(false)
    }
  }

  // Verificação inicial da sessão
  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        SecureLogger.log('🔍 Verificando sessão inicial...')
        setLoading(true)
        
        // Verificar se há token no localStorage
        const token = localStorage.getItem('supabase.auth.token')
        SecureLogger.log('🔍 Token no localStorage', { hasToken: !!token })
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          SecureLogger.error('❌ Erro ao verificar sessão inicial', { message: sessionError.message })
          setUser(null)
          setLoading(false)
          return
        }
        
        if (sessionData.session?.user) {
          SecureLogger.log('✅ Sessão inicial encontrada', { email: sessionData.session.user.email })
          setUser(sessionData.session.user)
          
          // Carregar perfil e permissões
          await loadUserProfile(sessionData.session.user.id)
        } else {
          SecureLogger.log('⚠️ Nenhuma sessão inicial encontrada')
          setUser(null)
          setProfile(null)
          setUserRole(null)
          setPermissions(null)
        }
      } catch (err) {
        SecureLogger.error('❌ Erro ao verificar sessão inicial', err)
        setUser(null)
      } finally {
        setLoading(false)
        SecureLogger.log('✅ Verificação inicial concluída', { loading: false })
      }
    }
    
    checkInitialSession()
  }, [])

  useEffect(() => {
    SecureLogger.log('🎯 AuthProvider useEffect iniciando...')
    
    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        SecureLogger.log('🔄 Auth state change', { event, email: session?.user?.email })
        try {
          // Evitar reprocessar SIGNED_IN redundante (ex.: foco/refresh de token)
          if (event === 'SIGNED_IN' && session?.user?.id && lastProfileRef.current?.uuid === session.user.id) {
            SecureLogger.log('⏭️ Ignorando SIGNED_IN redundante (usuário já carregado)')
            return
          }
          // Debounce eventos de auth em sequência (ex.: foco) para reduzir flicker
          const now = Date.now()
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && now - lastAuthHandledAtRef.current < 5000) {
            SecureLogger.log('⏳ Ignorando evento de auth em janela de cooldown')
            return
          }
          lastAuthHandledAtRef.current = now
          // Evitar flicker ao voltar de outra aba: não ativar loading em SIGNED_IN
          if (event === 'SIGNED_IN' && session?.user) {
            SecureLogger.log('✅ Usuário autenticado', { email: session.user.email })
            setUser(session.user)
            setError(null)
            // Carregar perfil e permissões em background (sem bloquear UI)
            loadUserProfile(session.user.id).catch((err) => {
              SecureLogger.error('Erro ao carregar perfil após SIGNED_IN', err)
            })
          } else if (event === 'SIGNED_OUT') {
            SecureLogger.log('🚪 Usuário deslogado')
            setUser(null)
            setProfile(null)
            setUserRole(null)
            setPermissions(null)
            setError(null)
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            SecureLogger.log('🔄 Token atualizado', { email: session.user.email })
            // Não bloquear UI com loading aqui; atualizar estado em background
            setUser(session.user)
            setError(null)
            // Recarregar perfil em background sem travar navegação
            loadUserProfile(session.user.id).catch((err) => {
              SecureLogger.error('Erro ao recarregar perfil após refresh de token', err)
            })
          } else if (event === 'USER_UPDATED' && session?.user) {
            SecureLogger.log('🔄 USER_UPDATED recebido', { email: session.user.email })
            setUser(session.user)
            // Se o email do auth divergir do profile, sincronizar tabela profiles
            try {
              const currentProfile = lastProfileRef.current || profile
              const authEmail = session.user.email || ''
              const profileEmail = (currentProfile?.email || '')
              if (authEmail && authEmail !== profileEmail) {
                SecureLogger.log('🧩 Sincronizando profiles.email com auth.email', { authEmail, profileEmail })
                await updateCurrentUserProfile({ email: authEmail })
              }
            } catch (syncErr) {
              SecureLogger.warn('⚠️ Falha ao sincronizar profiles.email após USER_UPDATED (ignorado)', syncErr)
            }
            // Recarregar perfil em background
            loadUserProfile(session.user.id).catch((err) => {
              SecureLogger.error('Erro ao recarregar perfil após USER_UPDATED', err)
            })
          }
        } catch (err) {
          SecureLogger.error('❌ Erro no auth state change', err)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => {
      SecureLogger.log('🧹 Limpando subscription do auth state change')
      subscription?.unsubscribe()
    }
  }, [])

  const empresaNicho = profile?.empresa_nicho ?? null

  const value: AuthContextType = {
    user,
    profile,
    userRole,
    permissions,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    empresaNicho,
    logout: handleLogout,
    refreshUser,
    hasPermission,
    canAccessPipeline,
    canAccessChatInstance,
  }

  SecureLogger.log('🔐 AuthProvider renderizando', { loading, isAuthenticated, email: user?.email })

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext deve ser usado dentro de um AuthProvider')
  }
  return context
} 