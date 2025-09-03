import { useState, useEffect } from 'react'
import { MainLayout } from '../components'
import {
  getCurrentEmpresa, 
  updateEmpresa, 
  getEmpresaStats, 
  getEmpresaUsers, 
  isEmpresaAdmin,
  canAddMoreUsers,
  createUserForEmpresa
} from '../services/empresaService'
import {
  getRoles,
  getPermissionsByModule,
  assignRoleToUser,
  getEmpresaUsersWithRoles,
  getRoleStats
} from '../services/roleService'
import { 
  BuildingOfficeIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  UserGroupIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import type { 
  Empresa, 
  EmpresaStats, 
  UpdateEmpresaData, 
  CreateUserData,
  Role,
  PermissionModule,
  ProfileWithRole,
  RoleStats
} from '../types'
import { GENDER_OPTIONS } from '../utils/constants'
import { usePermissions, PERMISSIONS } from '../hooks/usePermissions'
import { ManageCustomFieldsList } from '../components/leads/ManageCustomFieldsModal'

interface EmpresaUser {
  uuid: string
  full_name: string
  email: string
  phone: string
  created_at: string
}

export default function EmpresaAdminPage() {
  // Hook de permissões
  const { hasPermission } = usePermissions()
  
  // Estados principais
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'roles' | 'customFields'>('overview')
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [stats, setStats] = useState<EmpresaStats | null>(null)
  const [users, setUsers] = useState<EmpresaUser[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [canAddUsers, setCanAddUsers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Estados para criação de usuário
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)

  // Estados para gestão de roles
  const [roles, setRoles] = useState<Role[]>([])
  const [, setPermissionModules] = useState<PermissionModule[]>([])
  const [usersWithRoles, setUsersWithRoles] = useState<ProfileWithRole[]>([])
  const [roleStats, setRoleStats] = useState<RoleStats | null>(null)
  const [, setShowCreateRole] = useState(false)
  const [, setEditingRole] = useState<Role | null>(null)
  const [, setDeletingRole] = useState<Role | null>(null)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Dados do formulário de edição
  const [editForm, setEditForm] = useState<UpdateEmpresaData>({})

  // Dados do formulário de criação de usuário
  const [createUserForm, setCreateUserForm] = useState<CreateUserData>({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: 'masculino',
    password: ''
  })

  // Carregar dados da empresa
  const loadEmpresaData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [empresaData, statsData, usersData, adminStatus, canAddStatus] = await Promise.all([
        getCurrentEmpresa(),
        getEmpresaStats(),
        getEmpresaUsers(),
        isEmpresaAdmin(),
        canAddMoreUsers()
      ])

      console.log('🔍 loadEmpresaData: Dados carregados:', {
        empresa: empresaData?.nome,
        stats: statsData,
        users: usersData,
        usersCount: usersData?.length,
        admin: adminStatus,
        canAdd: canAddStatus
      })

      setEmpresa(empresaData)
      setStats(statsData)
      setUsers(usersData)
      setIsAdmin(adminStatus)
      setCanAddUsers(canAddStatus)

      if (empresaData) {
        setEditForm({
          nome: empresaData.nome,
          cnpj: empresaData.cnpj,
          email: empresaData.email,
          telefone: empresaData.telefone,
          endereco: empresaData.endereco,
          plano: empresaData.plano,
          max_usuarios: empresaData.max_usuarios
        })
      }
    } catch (err) {
      console.error('❌ Erro ao carregar dados da empresa:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmpresaData()
  }, [])

  // Carregar dados específicos da aba ativa
  useEffect(() => {
    if (activeTab === 'roles' && hasPermission(PERMISSIONS.ADMIN_ROLES)) {
      loadRolesData()
    }
  }, [activeTab, hasPermission])

  // Carregar dados de roles e permissões
  const loadRolesData = async () => {
    try {
      setLoadingRoles(true)
      setError(null)

      const [rolesResult, permissionsResult, usersResult, statsResult] = await Promise.all([
        getRoles(),
        getPermissionsByModule(),
        getEmpresaUsersWithRoles(),
        getRoleStats()
      ])

      if (rolesResult.error) {
        setError(rolesResult.error)
        return
      }

      if (permissionsResult.error) {
        setError(permissionsResult.error)
        return
      }

      if (usersResult.error) {
        setError(usersResult.error)
        return
      }

      if (statsResult.error) {
        setError(statsResult.error)
        return
      }

      setRoles(rolesResult.data || [])
      setPermissionModules(permissionsResult.data || [])
      setUsersWithRoles(usersResult.data || [])
      setRoleStats(statsResult.data)
    } catch (err) {
      setError('Erro ao carregar dados de roles e permissões')
    } finally {
      setLoadingRoles(false)
    }
  }

  // Funções para gestão de roles implementadas nos services e prontas para uso

  // Atribuir role a usuário
  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      setSaving(true)
      setError(null)

      const { error } = await assignRoleToUser(userId, roleId)
      
      if (error) {
        setError(error)
        return false
      }

      setSuccess('Role atribuído com sucesso!')
      await loadRolesData()
      return true
    } catch (err) {
      setError('Erro ao atribuir role')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Salvar alterações
  const handleSave = async () => {
    if (!empresa || !isAdmin) return
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const updatedEmpresa = await updateEmpresa(empresa.id, editForm)
      setEmpresa(updatedEmpresa)
      setEditing(false)
      setSuccess('Dados da empresa atualizados com sucesso!')
      
      // Recarregar estatísticas
      const newStats = await getEmpresaStats()
      setStats(newStats)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('❌ Erro ao salvar empresa:', err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar dados')
    } finally {
      setSaving(false)
    }
  }

  // Cancelar edição
  const handleCancel = () => {
    if (empresa) {
      setEditForm({
        nome: empresa.nome,
        cnpj: empresa.cnpj,
        email: empresa.email,
        telefone: empresa.telefone,
        endereco: empresa.endereco,
        plano: empresa.plano,
        max_usuarios: empresa.max_usuarios
      })
    }
    setEditing(false)
    setError(null)
  }

  // Criar novo usuário
  const handleCreateUser = async () => {
    if (!isAdmin) return
    
    try {
      setCreatingUser(true)
      setError(null)
      setSuccess(null)

      const result = await createUserForEmpresa(createUserForm)
      
      console.log('✅ Resultado da criação:', result)
      
      // Recarregar dados
      await loadEmpresaData()
      
      // Limpar formulário
      setCreateUserForm({
        fullName: '',
        email: '',
        phone: '',
        birthDate: '',
        gender: 'masculino',
        password: ''
      })
      
      setShowCreateUser(false)
      
      // Exibir mensagem de sucesso com as credenciais
      if (result.message) {
        setSuccess(result.message)
      } else {
        setSuccess('Usuário criado com sucesso!')
      }
      
      setTimeout(() => setSuccess(null), 8000) // Mais tempo para ler as credenciais
    } catch (err) {
      console.error('❌ Erro ao criar usuário:', err)
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setCreatingUser(false)
    }
  }

  // Cancelar criação de usuário
  const handleCancelCreateUser = () => {
    setCreateUserForm({
      fullName: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: 'masculino',
      password: ''
    })
    setShowCreateUser(false)
    setError(null)
  }



  // Formatação de dados
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatPlano = (plano: string) => {
    const planos: Record<string, string> = {
      'basico': 'Básico',
      'premium': 'Premium',
      'enterprise': 'Enterprise'
    }
    return planos[plano] || plano
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados da empresa...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!empresa) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Empresa não encontrada</h2>
            <p className="text-gray-600">Você não possui uma empresa associada ao seu perfil.</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0 p-3 lg:p-4">
          <div className="h-full flex flex-col space-y-3">
            
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-primary-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {empresa.nome}
                    </h1>
                    <p className="text-gray-600">Administração da Empresa</p>
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Administrador</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mensagens */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex-shrink-0">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-shrink-0">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Usuário criado com sucesso!</h3>
                    <div className="mt-2 text-sm text-green-700">
                      {success.includes('Credenciais:') ? (
                        <div className="space-y-1">
                          <p className="font-medium">Informe ao usuário as credenciais de acesso:</p>
                          <div className="bg-green-100 p-2 rounded border">
                            <p className="font-mono text-sm">{success}</p>
                          </div>
                          <p className="text-xs">⚠️ Anote essas informações pois não serão exibidas novamente</p>
                        </div>
                      ) : (
                        <p>{success}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navegação por Abas */}
            <div className="bg-white rounded-lg shadow flex-shrink-0">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-4" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BuildingOfficeIcon className="w-4 h-4" />
                      Visão Geral
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'users'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="w-4 h-4" />
                      Usuários
                    </div>
                  </button>

                  {hasPermission(PERMISSIONS.ADMIN_ROLES) && (
                    <>
                      <button
                        onClick={() => setActiveTab('roles')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'roles'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <KeyIcon className="w-4 h-4" />
                          Roles e Permissões
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab('customFields')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'customFields'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <PlusIcon className="w-4 h-4" />
                          Campos Personalizados
                        </div>
                      </button>
                    </>
                  )}
                </nav>
              </div>
            </div>

            {/* Conteúdo das Abas */}
            {activeTab === 'overview' && (
              <>
                {/* Estatísticas */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-8 w-8 text-primary-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Usuários</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.usuarios}/{stats.maxUsuarios}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Leads</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.leads}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pipelines</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pipelines}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <InformationCircleIcon className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Plano</p>
                      <p className="text-2xl font-bold text-gray-900">{formatPlano(stats.plano)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Principal - Área Scrollável */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Dados da Empresa */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900">Dados da Empresa</h2>
                      {isAdmin && !editing && (
                        <button
                          onClick={() => setEditing(true)}
                          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Editar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    {editing ? (
                      <form className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome da Empresa *
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={editForm.nome || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              CNPJ
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={editForm.cnpj || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, cnpj: e.target.value }))}
                              placeholder="XX.XXX.XXX/XXXX-XX"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Telefone
                            </label>
                            <input
                              type="tel"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={editForm.telefone || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, telefone: e.target.value }))}
                              placeholder="(11) 99999-9999"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            E-mail
                          </label>
                          <input
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="contato@empresa.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Endereço
                          </label>
                          <textarea
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={editForm.endereco || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, endereco: e.target.value }))}
                            placeholder="Endereço completo"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Plano
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={editForm.plano || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, plano: e.target.value as 'basico' | 'premium' | 'enterprise' }))}
                            >
                              <option value="basico">Básico</option>
                              <option value="premium">Premium</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Máximo de Usuários
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={editForm.max_usuarios || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, max_usuarios: parseInt(e.target.value) }))}
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
                          >
                            <CheckIcon className="h-4 w-4" />
                            {saving ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancel}
                            disabled={saving}
                            className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
                          >
                            <XMarkIcon className="h-4 w-4" />
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nome</label>
                          <p className="text-gray-900">{empresa.nome}</p>
                        </div>

                        {empresa.cnpj && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">CNPJ</label>
                            <p className="text-gray-900">{empresa.cnpj}</p>
                          </div>
                        )}

                        {empresa.email && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">E-mail</label>
                            <p className="text-gray-900">{empresa.email}</p>
                          </div>
                        )}

                        {empresa.telefone && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Telefone</label>
                            <p className="text-gray-900">{empresa.telefone}</p>
                          </div>
                        )}

                        {empresa.endereco && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Endereço</label>
                            <p className="text-gray-900">{empresa.endereco}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Plano</label>
                            <p className="text-gray-900">{formatPlano(empresa.plano)}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Máx. Usuários</label>
                            <p className="text-gray-900">{empresa.max_usuarios}</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            empresa.ativo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {empresa.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista de Usuários */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900">
                        Usuários da Empresa ({users.length}/{empresa.max_usuarios})
                      </h2>
                      <div className="flex items-center gap-3">
                        {canAddUsers && isAdmin && (
                          <button
                            onClick={() => setShowCreateUser(!showCreateUser)}
                            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                          >
                            <UserPlusIcon className="h-4 w-4" />
                            Adicionar Usuário
                          </button>
                        )}
                        

                        
                        {canAddUsers && (
                          <span className="text-sm text-green-600 font-medium">
                            ✅ Pode adicionar mais
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Formulário de Criação de Usuário */}
                    {showCreateUser && isAdmin && canAddUsers && (
                      <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Criar Novo Usuário</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nome Completo *
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={createUserForm.fullName}
                              onChange={(e) => setCreateUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                              placeholder="Nome completo"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              E-mail *
                            </label>
                            <input
                              type="email"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={createUserForm.email}
                              onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="usuario@email.com"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Telefone *
                            </label>
                            <input
                              type="tel"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={createUserForm.phone}
                              onChange={(e) => setCreateUserForm(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="(11) 99999-9999"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Data de Nascimento *
                            </label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={createUserForm.birthDate}
                              onChange={(e) => setCreateUserForm(prev => ({ ...prev, birthDate: e.target.value }))}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Gênero *
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={createUserForm.gender}
                              onChange={(e) => setCreateUserForm(prev => ({ ...prev, gender: e.target.value as 'masculino' | 'feminino' | 'outro' }))}
                            >
                              {GENDER_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Senha *
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={createUserForm.password}
                                onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="Mínimo 6 caracteres"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                {showPassword ? (
                                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <EyeIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={handleCreateUser}
                            disabled={creatingUser}
                            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
                          >
                            <UserPlusIcon className="h-4 w-4" />
                            {creatingUser ? 'Criando...' : 'Criar Usuário'}
                          </button>
                          <button
                            onClick={handleCancelCreateUser}
                            disabled={creatingUser}
                            className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
                          >
                            <XMarkIcon className="h-4 w-4" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {users.length === 0 ? (
                      <div className="text-center py-8">
                        <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Nenhum usuário encontrado</p>
                        <p className="text-xs text-gray-400 mt-2">Debug: users.length = {users.length}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-400 mb-2">Debug: Renderizando {users.length} usuário(s)</p>
                        {users.map((user, index) => {
                          console.log('🎨 Renderizando usuário:', user)
                          return (
                          <div key={user.uuid} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{user.full_name}</p>
                                {index === 0 && (
                                  <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              {user.phone && (
                                <p className="text-sm text-gray-600">{user.phone}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                Desde {formatDate(user.created_at)}
                              </p>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                    
                    {!canAddUsers && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-700">
                          ⚠️ Limite de usuários atingido. Upgrade seu plano para adicionar mais usuários.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
            </>
            )}

            {/* Aba de Usuários */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-lg shadow p-4 flex-1 min-h-0 overflow-y-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Gestão de Usuários</h3>
                <p className="text-gray-600">Funcionalidade já implementada acima. Esta aba pode ser usada para organizar melhor a interface.</p>
              </div>
            )}

            {/* Aba de Roles e Permissões */}
            {activeTab === 'roles' && hasPermission(PERMISSIONS.ADMIN_ROLES) && (
              <div className="bg-white rounded-lg shadow p-4 flex-1 min-h-0 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Roles e Permissões</h3>
                  <button
                    onClick={() => setShowCreateRole(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Novo Role
                  </button>
                </div>

                {loadingRoles ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    <span className="ml-2 text-gray-600">Carregando roles...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Estatísticas de Roles */}
                    {roleStats && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <KeyIcon className="h-8 w-8 text-blue-500" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-blue-900">Total de Roles</p>
                              <p className="text-2xl font-semibold text-blue-900">{roleStats.total_roles}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <ShieldCheckIcon className="h-8 w-8 text-green-500" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-green-900">Permissões</p>
                              <p className="text-2xl font-semibold text-green-900">{roleStats.total_permissions}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <UserGroupIcon className="h-8 w-8 text-purple-500" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-purple-900">Usuários com Roles</p>
                              <p className="text-2xl font-semibold text-purple-900">
                                {Object.values(roleStats.users_by_role).reduce((a, b) => a + b, 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lista de Roles */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Roles Disponíveis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map((role) => (
                          <div key={role.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">{role.name}</h5>
                              <div className="flex items-center gap-1">
                                {!role.is_system_role && (
                                  <>
                                    <button
                                      onClick={() => setEditingRole(role)}
                                      className="p-1 text-gray-400 hover:text-blue-500"
                                      title="Editar role"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeletingRole(role)}
                                      className="p-1 text-gray-400 hover:text-red-500"
                                      title="Deletar role"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {role.description && (
                              <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                            )}
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className={`px-2 py-1 rounded-full ${
                                role.is_system_role 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {role.is_system_role ? 'Sistema' : 'Customizado'}
                              </span>
                              
                              {roleStats?.users_by_role[role.name] && (
                                <span className="text-gray-500">
                                  {roleStats.users_by_role[role.name]} usuário(s)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lista de Usuários com Roles */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Usuários e seus Roles</h4>
                      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Usuário
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role Atual
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {usersWithRoles.map((user) => (
                              <tr key={user.uuid}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {user.full_name}
                                      </div>
                                      <div className="text-sm text-gray-500">{user.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {user.role?.name || 'Sem Role'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {user.is_admin ? (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      Administrador
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                      Usuário
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <select
                                    value={user.role?.id || ''}
                                    onChange={(e) => handleAssignRole(user.uuid, e.target.value)}
                                    className="text-sm border border-gray-300 rounded-md px-2 py-1"
                                    disabled={saving}
                                  >
                                    <option value="">Selecionar role...</option>
                                    {roles.map((role) => (
                                      <option key={role.id} value={role.id}>
                                        {role.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Aba de Campos Personalizados */}
            {activeTab === 'customFields' && isAdmin && (
              <div className="bg-white rounded-lg shadow p-4 flex-1 min-h-0 overflow-y-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Gerenciar Campos Personalizados</h3>
                <ManageCustomFieldsList isOpen={true} />
              </div>
            )}

          </div>
        </div>
      </div>
    </MainLayout>
  )
} 