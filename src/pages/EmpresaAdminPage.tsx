import { useState, useEffect } from 'react'
import { MainLayout, ErrorCard } from '../components'
import { BrandLoader } from '../components/ui/BrandLoader'
import { EmpresaOverview } from '../components/empresa/EmpresaOverview'
import { EmpresaUsers } from '../components/empresa/EmpresaUsers'
import { PipelinePermissions } from '../components/empresa/PipelinePermissions'
import { AutomationsAdminTab } from '../components/empresa/AutomationsAdminTab.tsx'
import { WhatsAppNumbersTab } from '../components/empresa/WhatsAppNumbersTab'
import { ApiKeysTab } from '../components/empresa/ApiKeysTab'
import { ManageCustomFieldsList } from '../components/leads/ManageCustomFieldsModal'
import { LeadRoutingTab } from '../components/empresa/LeadRoutingTab'
import { LossReasonsTab } from '../components/empresa/LossReasonsTab'
import { OriginOptionsTab } from '../components/empresa/OriginOptionsTab'
import { useAdminContext } from '../contexts/AdminContext'
import {
  getCurrentEmpresa, 
  updateEmpresa, 
  getEmpresaStats, 
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

type TabType = 'overview' | 'users' | 'customFields' | 'permissions' | 'whatsapps' | 'automations' | 'routing' | 'lossReasons' | 'originOptions' | 'apiKeys'

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
      
      // Atualizar stats (contagem de usuários)
      const statsData = await getEmpresaStats()
      setStats(statsData)
      
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
    
    // Atualizar stats
    const statsData = await getEmpresaStats()
    setStats(statsData)
  }

  const tabs = [
    { id: 'overview' as const, name: 'Visão Geral', description: 'Informações da empresa' },
    { id: 'users' as const, name: 'Usuários', description: 'Gerenciar usuários' },
    { id: 'permissions' as const, name: 'Permissões', description: 'Controlar acesso aos pipelines' },
    { id: 'routing' as const, name: 'Roteamento de Leads', description: 'Distribuição automática de leads' },
    { id: 'whatsapps' as const, name: 'Números WhatsApp', description: 'Conectar e gerenciar instâncias' },
    { id: 'customFields' as const, name: 'Campos Personalizados', description: 'Configurar campos' },
    { id: 'lossReasons' as const, name: 'Motivos de Perda', description: 'Gerenciar motivos de perda' },
    { id: 'originOptions' as const, name: 'Origens', description: 'Restringir origens permitidas nos leads' },
    { id: 'automations' as const, name: 'Automações', description: 'Regras automáticas do CRM' },
    { id: 'apiKeys' as const, name: 'API Keys', description: 'Tokens para integrações externas' }
  ]

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
      <div className={ds.page()}>
        <div className={ds.pageContent()}>
          {/* Header */}
          <div className={ds.card()}>
            <div className="p-3 lg:p-4">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Administração da Empresa</h1>
              <p className="text-xs lg:text-sm text-gray-500 hidden sm:block">
                Gerencie as configurações e usuários da sua empresa
              </p>
            </div>
          </div>

          {/* Tabs - scroll horizontal no mobile */}
          <div className="border-b border-gray-200 -mx-3 lg:mx-0">
            <nav className="-mb-px flex overflow-x-auto scrollbar-hide px-3 lg:px-0 space-x-4 lg:space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap flex-shrink-0
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
          <div className="mt-4 lg:mt-6">
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
                <div className="p-3 lg:p-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
                    Campos Personalizados
                  </h2>
                  <ManageCustomFieldsList />
                </div>
              </div>
            )}

            {activeTab === 'lossReasons' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  <LossReasonsTab />
                </div>
              </div>
            )}

            {activeTab === 'originOptions' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  <OriginOptionsTab />
                </div>
              </div>
            )}

            {activeTab === 'automations' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-6 max-h-[calc(100vh-160px)] min-h-0 overflow-y-auto pr-2 sm:pr-3 pb-24">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
                    Automações
                  </h2>
                  <AutomationsAdminTab />
                </div>
              </div>
            )}

            {activeTab === 'apiKeys' && (
              <div className={ds.card()}>
                <div className="p-3 lg:p-6 max-h-[calc(100vh-160px)] min-h-0 overflow-y-auto pr-2 sm:pr-3 pb-24">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
                    Integrações & API
                  </h2>
                  <ApiKeysTab />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
