import { useState, useEffect } from 'react'
import { MainLayout, ErrorCard } from '../components'
import { BrandLoader } from '../components/ui/BrandLoader'
import { EmpresaOverview } from '../components/empresa/EmpresaOverview'
import { EmpresaUsers } from '../components/empresa/EmpresaUsers'
import { PipelinePermissions } from '../components/empresa/PipelinePermissions'
import { AutomationsAdminTab } from '../components/empresa/AutomationsAdminTab.tsx'
import { WhatsAppNumbersTab } from '../components/empresa/WhatsAppNumbersTab'
import { ApiKeysTab } from '../components/empresa/ApiKeysTab'
import { MetaCapiTab } from '../components/empresa/MetaCapiTab'
import { ContractsTab } from '../components/empresa/ContractsTab'
import { ManageCustomFieldsList } from '../components/leads/ManageCustomFieldsModal'
import { LeadRoutingTab } from '../components/empresa/LeadRoutingTab'
import { LossReasonsTab } from '../components/empresa/LossReasonsTab'
import { OriginOptionsTab } from '../components/empresa/OriginOptionsTab'
import { AgenteSdrTab } from '../components/empresa/AgenteSdrTab'
import { EmpresaSidebar, getEmpresaTabItem, type EmpresaTab } from '../components/empresa/EmpresaSidebar'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useAdminContext } from '../contexts/AdminContext'
import { useAuthContext } from '../contexts/AuthContext'
import {
  getCurrentEmpresa, 
  updateEmpresa, 
  getEmpresaUsers, 
  canAddMoreUsers,
  createUserForEmpresa,
  updateUserRole,
  deleteEmpresaUser
} from '../services/empresaService'
import { updateUserProfile } from '../services/profileService'
import { fixAllCompanyUsers } from '../services/fixUserProfiles'
import type { 
  Empresa, 
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

export default function EmpresaAdminPageSimplified() {
  const { isAdmin, refreshAdminStatus } = useAdminContext()
  const { refreshUser } = useAuthContext()
  
  // Estados principais
  const [activeTab, setActiveTab] = useState<EmpresaTab>('overview')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
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
      const [empresaData, usersData, canAddUsersData] = await Promise.all([
        getCurrentEmpresa(),
        getEmpresaUsers(),
        canAddMoreUsers()
      ])

      if (!empresaData) {
        throw new Error('Empresa não encontrada')
      }

      setEmpresa(empresaData)
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

    const result = await createUserForEmpresa(userData)
    console.log('✅ Usuário criado:', result)

    await refreshUser()
    await refreshAdminStatus()
    await refreshUsers()
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
      ver_todos_leads?: boolean
    }
  ) => {
    try {
      console.log('🔧 handleUpdateUser: Iniciando atualização para userId:', userId)
      console.log('🔧 handleUpdateUser: Dados:', data)
      
      const result = await updateUserProfile(userId, data)
      
      console.log('🔧 handleUpdateUser: Resultado:', result)
      
      if (result.error) {
        // Tratar erro como string ou objeto
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || 'Erro ao atualizar usuário'
        throw new Error(errorMessage)
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

  // Excluir usuário
  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteEmpresaUser(userId)
      
      // Atualizar estado local removendo o usuário
      setUsers(currentUsers => 
        currentUsers.filter(user => user.uuid !== userId)
      )
      
      // Verificar se pode adicionar mais usuários
      const canAdd = await canAddMoreUsers()
      setCanAddUsers(canAdd)
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      throw error
    }
  }

  // Recarregar usuários
  const refreshUsers = async () => {
    const usersData = await getEmpresaUsers()
    setUsers(usersData)
  }

  const handleTabChange = (tab: EmpresaTab) => {
    setActiveTab(tab)
    setIsMobileSidebarOpen(false)
  }

  const activeTabItem = getEmpresaTabItem(activeTab)

  if (loading) {
    return (
      <MainLayout>
        <div className={ds.page()}>
          <div className="h-full flex items-center justify-center">
            <BrandLoader variant="inline" size="lg" text="Carregando dados da empresa..." />
          </div>
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
      <div className="flex h-screen overflow-hidden">
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <EmpresaSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        <main className="custom-scrollbar flex-1 min-w-0 overflow-y-auto bg-gray-50 p-3 lg:p-6">
          <div className={ds.card()}>
            <div className="p-3 lg:p-4 flex items-center gap-2 lg:gap-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden flex-shrink-0"
              >
                <Bars3Icon className="w-5 h-5 text-gray-600" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">Administração da Empresa</h1>
                <p className="text-xs lg:text-sm text-gray-500 truncate">
                  {activeTabItem ? `${activeTabItem.name} · ${activeTabItem.description}` : 'Gerencie as configurações e usuários da sua empresa'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 lg:mt-6 pb-6">
            {activeTab === 'overview' && (
              <EmpresaOverview
                empresa={empresa}
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
              onDeleteUser={handleDeleteUser}
            />
          )}

            {activeTab === 'permissions' && (
              <PipelinePermissions
                onRefresh={refreshUsers}
              />
            )}

            {activeTab === 'whatsapps' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-4">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
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
                <div className="p-3 lg:p-4">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
                    Campos Personalizados
                  </h2>
                  <ManageCustomFieldsList />
                </div>
              </div>
            )}

            {activeTab === 'lossReasons' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-4">
                  <LossReasonsTab />
                </div>
              </div>
            )}

            {activeTab === 'originOptions' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-4">
                  <OriginOptionsTab />
                </div>
              </div>
            )}

            {activeTab === 'automations' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-6">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
                    Automações
                  </h2>
                  <AutomationsAdminTab />
                </div>
              </div>
            )}

            {activeTab === 'contracts' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-6">
                  <ContractsTab />
                </div>
              </div>
            )}

            {activeTab === 'apiKeys' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-6">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
                    Integrações & API
                  </h2>
                  <ApiKeysTab />
                </div>
              </div>
            )}

            {activeTab === 'metaCapi' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-6">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
                    Meta Conversions API
                  </h2>
                  <MetaCapiTab />
                </div>
              </div>
            )}

            {activeTab === 'agente' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-6">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
                    Agentes
                  </h2>
                  <AgenteSdrTab />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </MainLayout>
  )
}
