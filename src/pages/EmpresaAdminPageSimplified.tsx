import { useState, useEffect } from 'react'
import { MainLayout, LoadingCard, ErrorCard } from '../components'
import { EmpresaOverview } from '../components/empresa/EmpresaOverview'
import { EmpresaUsers } from '../components/empresa/EmpresaUsers'
import { ManageCustomFieldsList } from '../components/leads/ManageCustomFieldsModal'
import {
  getCurrentEmpresa, 
  updateEmpresa, 
  getEmpresaStats, 
  getEmpresaUsers, 
  isEmpresaAdmin,
  canAddMoreUsers,
  createUserForEmpresa
} from '../services/empresaService'
import type { 
  Empresa, 
  EmpresaStats, 
  UpdateEmpresaData, 
  CreateUserData
} from '../types'
import { useStandardizedLoading } from '../hooks/useStandardizedLoading'
import { ds } from '../utils/designSystem'

interface EmpresaUser {
  uuid: string
  full_name: string
  email: string
  phone: string
  created_at: string
}

type TabType = 'overview' | 'users' | 'customFields'

export default function EmpresaAdminPageSimplified() {
  // Estados principais
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [stats, setStats] = useState<EmpresaStats | null>(null)
  const [users, setUsers] = useState<EmpresaUser[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [canAddUsers, setCanAddUsers] = useState(false)

  // Loading states
  const {
    loading,
    error,
    executeAsync
  } = useStandardizedLoading()

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    await executeAsync(async () => {
      // Verificar se é admin
      const adminStatus = await isEmpresaAdmin()
      setIsAdmin(adminStatus)

      if (!adminStatus) {
        throw new Error('Acesso negado. Apenas administradores podem acessar esta página.')
      }

      // Carregar dados em paralelo
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
  const handleCreateUser = async (userData: CreateUserData) => {
    if (!empresa) return
    
    await createUserForEmpresa(userData)
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
    { id: 'customFields' as const, name: 'Campos Personalizados', description: 'Configurar campos' }
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
              />
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
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
