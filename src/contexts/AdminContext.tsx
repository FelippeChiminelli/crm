import { createContext, useContext, useState, useEffect } from 'react'
import { useAuthContext } from './AuthContext'
import { isEmpresaAdmin } from '../services/empresaService'

interface AdminContextType {
  isAdmin: boolean
  isLoading: boolean
  refreshAdminStatus: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

interface AdminProviderProps {
  children: React.ReactNode
}

export function AdminProvider({ children }: AdminProviderProps) {
  const { user } = useAuthContext()
  const [isAdmin, setIsAdmin] = useState(() => {
    // Carregar do localStorage imediatamente para evitar flash
    const cached = localStorage.getItem('user-is-admin')
    return cached === 'true'
  })
  const [isLoading, setIsLoading] = useState(false)

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false)
      localStorage.removeItem('user-is-admin')
      localStorage.removeItem('cached-user-id')
      return
    }

    setIsLoading(true)
    try {
      const adminStatus = await isEmpresaAdmin()
      setIsAdmin(adminStatus)
      // Persistir para carregamentos futuros
      localStorage.setItem('user-is-admin', adminStatus.toString())
      localStorage.setItem('cached-user-id', user.id)
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error)
      setIsAdmin(false)
      localStorage.setItem('user-is-admin', 'false')
    } finally {
      setIsLoading(false)
    }
  }

  // Função para forçar refresh do status (útil depois de mudanças de permissão)
  const refreshAdminStatus = async () => {
    await checkAdminStatus()
  }

  useEffect(() => {
    if (user) {
      // Verificar se já temos cache válido para este usuário
      const cachedUserId = localStorage.getItem('cached-user-id')
      
      if (cachedUserId !== user.id) {
        // Usuário mudou ou não há cache, verificar status
        checkAdminStatus()
      }
      // Se há cache válido, não fazemos nada (status já foi carregado do localStorage)
    } else {
      // Não há usuário, limpar tudo
      setIsAdmin(false)
      localStorage.removeItem('user-is-admin')
      localStorage.removeItem('cached-user-id')
    }
  }, [user])

  return (
    <AdminContext.Provider value={{ isAdmin, isLoading, refreshAdminStatus }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdminContext() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdminContext deve ser usado dentro de um AdminProvider')
  }
  return context
}
