import { useState, useEffect } from 'react'
import { MainLayout, LoadingCard, ErrorCard } from '../components'
import { EmpresaOverview } from '../components/empresa/EmpresaOverview'
import { EmpresaUsers } from '../components/empresa/EmpresaUsers'
import { PipelinePermissions } from '../components/empresa/PipelinePermissions'
import { AutomationsAdminTab } from '../components/empresa/AutomationsAdminTab.tsx'
import { WhatsAppNumbersTab } from '../components/empresa/WhatsAppNumbersTab'
import { ManageCustomFieldsList } from '../components/leads/ManageCustomFieldsModal'
import { LeadRoutingTab } from '../components/empresa/LeadRoutingTab'
import { useAdminContext } from '../contexts/AdminContext'
import {
  getCurrentEmpresa, 
  updateEmpresa, 
  getEmpresaStats, 
  getEmpresaUsers, 
  canAddMoreUsers,
  createUserForEmpresa,
  updateUserRole
} from '../services/empresaService'
import { updateUserProfile } from '../services/profileService'
import { fixAllCompanyUsers } from '../services/fixUserProfiles'
import type { 
  Empresa, 
  EmpresaStats, 
  UpdateEmpresaData, 
  CreateUserData
} from '../types'
import type { UserRole } from '../contexts/AuthContext'
import { useStandardizedLoading } from '../hooks/useStandardizedLoading'
import { ds } from '../utils/designSystem'

interface EmpresaUser {
  uuid: string
  full_name: string
  email: string
  phone: string
  birth_date?: string
  gender?: 'masculino' | 'feminino' | 'outro'
  created_at: string
  is_admin?: boolean
  role?: string
}

type TabType = 'overview' | 'users' | 'customFields' | 'permissions' | 'whatsapps' | 'automations' | 'routing'

export default function EmpresaAdminPageSimplified() {
  const { isAdmin } = useAdminContext()
  
  // Estados principais
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [stats, setStats] = useState<EmpresaStats | null>(null)
  const [users, setUsers] = useState<EmpresaUser[]>([])
  const [canAddUsers, setCanAddUsers] = useState(false)

  // Loading states
  const {
    loading,
    error,
    executeAsync
  } = useStandardizedLoading()

  // Carregar dados iniciais
  useEffect(() => {
    if (isAdmin) {
      loadInitialData()
    }
  }, [isAdmin])

  const loadInitialData = async () => {
    await executeAsync(async () => {
      if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores podem acessar esta página.')
      }

      // Auto-fix: garantir que todos os usuários recém-criados recebam empresa_id/role_id
      try {
        await fixAllCompanyUsers()
      } catch (e) {
        console.warn('⚠️ Correção automática ignorada:', e)
      }

      // Carregar dados em paralelo (após a correção)
      const [empresaData, statsData, usersData, canAddUsersData] = await Promise.all([
        getCurrentEmpresa(),
        getEmpresaStats(),
        getEmpresaUsers(),
        canAddMoreUsers()
      ])

      if (!empresaData) {
        throw new Error('Empresa não encontrada')
      }

      setEmpresa(empresaData)
      setStats(statsData)
      setUsers(usersData)
      setCanAddUsers(canAddUsersData)
    })
  }

  // Atualizar empresa
  const handleUpdateEmpresa = async (data: UpdateEmpresaData) => {
    if (!empresa) return
    
    await updateEmpresa(empresa.id, data)
    
    // Recarregar dados da empresa
    const updatedEmpresa = await getCurrentEmpresa()
    if (updatedEmpresa) {
      setEmpresa(updatedEmpresa)
    }
  }

  // Criar usuário
  const handleCreateUser = async (userData: CreateUserData & { role?: UserRole }) => {
    if (!empresa) return
    
    try {
      // Criar usuário
      const result = await createUserForEmpresa(userData)
      console.log('✅ Usuário criado:', result)
      
      // Se o resultado tem o ID do usuário, tentar corrigir especificamente
      if (result?.user?.id) {
        setTimeout(async () => {
          try {
            console.log('🔄 Executando correção específica para:', result.user.id)
            const { fixUserProfile } = await import('../services/fixUserProfiles')
            await fixUserProfile(result.user.id, userData.role || 'VENDEDOR')
            await refreshUsers()
            console.log('✅ Correção específica concluída')
          } catch (error) {
            console.error('❌ Erro na correção específica:', error)
            // Fallback: correção geral
            try {
              await fixAllCompanyUsers()
              await refreshUsers()
            } catch (fallbackError) {
              console.error('❌ Erro no fallback:', fallbackError)
            }
          }
        }, 3000) // 3 segundos de delay
      }
      
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error)
      throw error
    }
  }

  // Atualizar dados do usuário
  const handleUpdateUser = async (
    userId: string, 
    data: {
      full_name?: string
      email?: string
      phone?: string
      birth_date?: string
      gender?: 'masculino' | 'feminino' | 'outro'
      is_admin?: boolean
    }
  ) => {
    try {
      const result = await updateUserProfile(userId, data)
      
      if (result.error) {
        throw new Error(result.error.message || 'Erro ao atualizar usuário')
      }
      
      console.log('✅ Usuário atualizado:', result.data)
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error)
      throw error
    }
  }

  // Atualizar role do usuário
  const handleUpdateUserRole = async (userId: string, role: UserRole) => {
    try {
      await updateUserRole(userId, role === 'ADMIN')
      
      // Atualizar estado local
      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.uuid === userId 
            ? { ...user, is_admin: role === 'ADMIN' }
            : user
        )
      )
    } catch (error) {
      console.error('Erro ao atualizar role do usuário:', error)
      throw error
    }
  }

  // Recarregar usuários
  const refreshUsers = async () => {
    const usersData = await getEmpresaUsers()
    setUsers(usersData)
    
    // Atualizar stats
    const statsData = await getEmpresaStats()
    setStats(statsData)
  }

  // Corrigir usuários sem empresa_id
  const handleFixUsers = async () => {
    try {
      await fixAllCompanyUsers()
      await refreshUsers() // Recarregar lista após correção
      console.log('✅ Usuários corrigidos com sucesso')
    } catch (error) {
      console.error('❌ Erro ao corrigir usuários:', error)
    }
  }

  const tabs = [
    { id: 'overview' as const, name: 'Visão Geral', description: 'Informações da empresa' },
    { id: 'users' as const, name: 'Usuários', description: 'Gerenciar usuários' },
    { id: 'permissions' as const, name: 'Permissões', description: 'Controlar acesso aos pipelines' },
    { id: 'routing' as const, name: 'Roteamento de Leads', description: 'Distribuição automática de leads' },
    { id: 'whatsapps' as const, name: 'Números WhatsApp', description: 'Conectar e gerenciar instâncias' },
    { id: 'customFields' as const, name: 'Campos Personalizados', description: 'Configurar campos' },
    { id: 'automations' as const, name: 'Automações', description: 'Regras automáticas do CRM' }
  ]

  if (loading) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <LoadingCard 
            title="Carregando dados da empresa..." 
            description="Aguarde enquanto carregamos as informações"
          />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <ErrorCard 
            message={error} 
            onRetry={loadInitialData}
          />
        </div>
      </MainLayout>
    )
  }

  if (!empresa) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <ErrorCard 
            message="Empresa não encontrada" 
            onRetry={loadInitialData}
          />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className={ds.page()}>
        <div className={ds.pageContent()}>
          {/* Header */}
          <div className={ds.card()}>
            <div className="p-6">
              <h1 className={ds.headerTitle()}>Administração da Empresa</h1>
              <p className={ds.headerSubtitle()}>
                Gerencie as configurações e usuários da sua empresa
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'overview' && (
              <EmpresaOverview
                empresa={empresa}
                stats={stats}
                onUpdate={handleUpdateEmpresa}
                canEdit={isAdmin}
              />
            )}

          {activeTab === 'users' && (
            <EmpresaUsers
              users={users}
              canAddUsers={canAddUsers}
              onCreateUser={handleCreateUser}
              onRefresh={refreshUsers}
              onUpdateUserRole={handleUpdateUserRole}
              onUpdateUser={handleUpdateUser}
              onFixUsers={handleFixUsers}
            />
          )}

            {activeTab === 'permissions' && (
              <PipelinePermissions
                onRefresh={refreshUsers}
              />
            )}

            {activeTab === 'whatsapps' && (
              <div className={ds.card()}>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Números WhatsApp
                  </h2>
                  <WhatsAppNumbersTab />
                </div>
              </div>
            )}

            {activeTab === 'routing' && (
              <LeadRoutingTab />
            )}

            {activeTab === 'customFields' && (
              <div className={ds.card()}>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Campos Personalizados
                  </h2>
                  <ManageCustomFieldsList />
                </div>
              </div>
            )}
            {activeTab === 'automations' && (
              <div className={ds.card()}>
                <div className="p-6 max-h-[calc(100vh-160px)] min-h-0 overflow-y-auto pr-2 sm:pr-3 pb-24">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Automações
                  </h2>
                  <AutomationsAdminTab />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
