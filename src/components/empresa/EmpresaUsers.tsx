import { useState } from 'react'
import { 
  UserGroupIcon, 
  UserPlusIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CogIcon,
  ShieldCheckIcon,
  UserIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import type { CreateUserData } from '../../types'
import type { UserRole } from '../../contexts/AuthContext'
import { ds } from '../../utils/designSystem'
import { StyledSelect } from '../ui/StyledSelect'
import { PhoneInput } from '../ui/PhoneInput'
import { GENDER_OPTIONS } from '../../utils/constants'
import { useStandardizedLoading } from '../../hooks/useStandardizedLoading'
import { LoadingButton, ErrorCard, SuccessCard, EmptyState } from '../ui/LoadingStates'
import { validateBrazilianPhone, formatBrazilianPhone } from '../../utils/validations'

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

interface CreateUserWithRoleData extends CreateUserData {
  role: UserRole
}

interface UpdateUserData {
  full_name?: string
  email?: string
  phone?: string
  birth_date?: string
  gender?: 'masculino' | 'feminino' | 'outro'
  is_admin?: boolean
}

interface EmpresaUsersProps {
  users: EmpresaUser[]
  canAddUsers: boolean
  onCreateUser: (userData: CreateUserWithRoleData) => Promise<void>
  onRefresh: () => Promise<void>
  onUpdateUserRole?: (userId: string, role: UserRole) => Promise<void>
  onUpdateUser?: (userId: string, data: UpdateUserData) => Promise<void>
}

export function EmpresaUsers({ users, canAddUsers, onCreateUser, onRefresh, onUpdateUserRole, onUpdateUser }: EmpresaUsersProps) {
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [editingUser, setEditingUser] = useState<EmpresaUser | null>(null)
  
  const [createUserForm, setCreateUserForm] = useState<CreateUserWithRoleData>({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: 'masculino',
    password: '',
    role: 'VENDEDOR'
  })

  const [editUserForm, setEditUserForm] = useState<{
    full_name: string
    email: string
    phone: string
    birth_date: string
    gender: 'masculino' | 'feminino' | 'outro'
    is_admin: boolean
  }>({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: 'masculino',
    is_admin: false
  })

  const {
    loading: creatingUser,
    error: createError,
    success: createSuccess,
    executeAsync: executeCreate,
    clearMessages: clearCreateMessages
  } = useStandardizedLoading({
    successMessage: 'Usuário criado com sucesso!',
    errorMessage: 'Erro ao criar usuário'
  })

  const {
    loading: updatingUser,
    error: updateError,
    success: updateSuccess,
    executeAsync: executeUpdate,
    clearMessages: clearUpdateMessages
  } = useStandardizedLoading({
    successMessage: 'Usuário atualizado com sucesso!',
    errorMessage: 'Erro ao atualizar usuário'
  })

  const handleCreateUser = async () => {
    await executeCreate(async () => {
      // Validações
      if (!createUserForm.fullName.trim()) {
        throw new Error('Nome completo é obrigatório')
      }
      
      if (!createUserForm.email.trim()) {
        throw new Error('Email é obrigatório')
      }
      
      if (!createUserForm.phone.trim()) {
        throw new Error('Telefone é obrigatório')
      }
      
      // Validar telefone
      const phoneValidation = validateBrazilianPhone(createUserForm.phone)
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.errors[0])
      }
      
      if (!createUserForm.password.trim() || createUserForm.password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres')
      }

      await onCreateUser(createUserForm)
      
      // Reset form
      setCreateUserForm({
        fullName: '',
        email: '',
        phone: '',
        birthDate: '',
        gender: 'masculino',
        password: '',
        role: 'VENDEDOR'
      })
      setShowCreateUser(false)
      
      // Refresh users list
      await onRefresh()
    })
  }

  const updateCreateUserForm = (field: keyof CreateUserWithRoleData, value: string | UserRole) => {
    setCreateUserForm(prev => ({ ...prev, [field]: value }))
  }

  const handleShowCreateUser = () => {
    setShowCreateUser(true)
    clearCreateMessages()
  }

  const handleCancelCreate = () => {
    setShowCreateUser(false)
    setCreateUserForm({
      fullName: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: 'masculino',
      password: '',
      role: 'VENDEDOR'
    })
    clearCreateMessages()
  }

  const handleShowEditUser = (user: EmpresaUser) => {
    setEditingUser(user)
    setEditUserForm({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      birth_date: user.birth_date || '',
      gender: (user.gender as 'masculino' | 'feminino' | 'outro') || 'masculino',
      is_admin: user.is_admin || false
    })
    clearUpdateMessages()
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setEditUserForm({
      full_name: '',
      email: '',
      phone: '',
      birth_date: '',
      gender: 'masculino',
      is_admin: false
    })
    clearUpdateMessages()
  }

  const handleUpdateUser = async () => {
    if (!editingUser || !onUpdateUser) return

    await executeUpdate(async () => {
      // Validações
      if (!editUserForm.full_name.trim()) {
        throw new Error('Nome completo é obrigatório')
      }
      
      if (!editUserForm.phone.trim()) {
        throw new Error('Telefone é obrigatório')
      }
      
      // Validar telefone
      const phoneValidation = validateBrazilianPhone(editUserForm.phone)
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.errors[0])
      }

      // Remover email do payload (não pode ser editado)
      const { email, ...updateData } = editUserForm
      await onUpdateUser(editingUser.uuid, updateData)
      
      // Reset form
      handleCancelEdit()
      
      // Refresh users list
      await onRefresh()
    })
  }

  const updateEditUserForm = (
    field: keyof typeof editUserForm, 
    value: string | boolean | 'masculino' | 'feminino' | 'outro'
  ) => {
    setEditUserForm(prev => ({ ...prev, [field]: value }))
  }

  const handleToggleUserRole = async (user: EmpresaUser) => {
    if (!onUpdateUserRole) return
    
    const newRole: UserRole = user.is_admin ? 'VENDEDOR' : 'ADMIN'
    
    try {
      await onUpdateUserRole(user.uuid, newRole)
      await onRefresh()
    } catch (error) {
      console.error('Erro ao atualizar role do usuário:', error)
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {/* Mensagens */}
      {createError && <ErrorCard message={createError} />}
      {createSuccess && <SuccessCard message={createSuccess} />}
      {updateError && <ErrorCard message={updateError} />}
      {updateSuccess && <SuccessCard message={updateSuccess} />}

      {/* Header */}
      <div className={ds.card()}>
        <div className="p-3 lg:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 lg:space-x-3 min-w-0">
              <UserGroupIcon className="w-5 h-5 lg:w-6 lg:h-6 text-primary-600 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base lg:text-xl font-semibold text-gray-900 truncate">Usuários da Empresa</h2>
                <p className="text-xs lg:text-sm text-gray-500">{users.length} usuários</p>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              {canAddUsers && !showCreateUser && (
                <button
                  onClick={handleShowCreateUser}
                  className={`${ds.button('primary')} inline-flex items-center text-xs lg:text-sm px-2 lg:px-4 py-1.5 lg:py-2`}
                >
                  <UserPlusIcon className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">Adicionar Usuário</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Edição */}
      {editingUser && onUpdateUser && (
        <div className={ds.card()}>
          <div className="p-3 lg:p-6">
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <PencilIcon className="w-4 h-4 lg:w-5 lg:h-5 text-primary-600" />
              <h3 className="text-base lg:text-lg font-medium text-gray-900">Editar Usuário</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={editUserForm.full_name}
                  onChange={(e) => updateEditUserForm('full_name', e.target.value)}
                  className={`${ds.input()} text-sm`}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                  Email *
                  <span className="ml-1 text-[10px] lg:text-xs text-gray-500">(não editável)</span>
                </label>
                <input
                  type="email"
                  value={editUserForm.email}
                  disabled
                  className="w-full px-2 lg:px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                <PhoneInput
                  value={editUserForm.phone}
                  onChange={(value) => updateEditUserForm('phone', value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Data Nasc.</label>
                <input
                  type="date"
                  value={editUserForm.birth_date}
                  onChange={(e) => updateEditUserForm('birth_date', e.target.value)}
                  className={`${ds.input()} text-sm`}
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Gênero</label>
                <StyledSelect
                  options={GENDER_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  value={editUserForm.gender}
                  onChange={(val) => updateEditUserForm('gender', val)}
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Acesso *</label>
                <StyledSelect
                  options={[
                    { value: 'false', label: 'Vendedor' },
                    { value: 'true', label: 'Admin' }
                  ]}
                  value={String(editUserForm.is_admin)}
                  onChange={(val) => updateEditUserForm('is_admin', val === 'true')}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 lg:space-x-3 mt-4 lg:mt-6">
              <button
                onClick={handleCancelEdit}
                disabled={updatingUser}
                className={`${ds.button('secondary')} text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2`}
              >
                Cancelar
              </button>
              <LoadingButton
                loading={updatingUser}
                onClick={handleUpdateUser}
                variant="primary"
                className="text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2"
              >
                Salvar
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Formulário de Criação */}
      {showCreateUser && (
        <div className={ds.card()}>
          <div className="p-3 lg:p-6">
            <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-3 lg:mb-4">Novo Usuário</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={createUserForm.fullName}
                  onChange={(e) => updateCreateUserForm('fullName', e.target.value)}
                  className={`${ds.input()} text-sm`}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) => updateCreateUserForm('email', e.target.value)}
                  className={`${ds.input()} text-sm`}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                <PhoneInput
                  value={createUserForm.phone}
                  onChange={(value) => updateCreateUserForm('phone', value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Data Nasc.</label>
                <input
                  type="date"
                  value={createUserForm.birthDate}
                  onChange={(e) => updateCreateUserForm('birthDate', e.target.value)}
                  className={`${ds.input()} text-sm`}
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Gênero</label>
                <StyledSelect
                  options={GENDER_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  value={createUserForm.gender}
                  onChange={(val) => updateCreateUserForm('gender', val)}
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Acesso *</label>
                <StyledSelect
                  options={[
                    { value: 'VENDEDOR', label: 'Vendedor' },
                    { value: 'ADMIN', label: 'Admin' }
                  ]}
                  value={createUserForm.role}
                  onChange={(val) => updateCreateUserForm('role', val as UserRole)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={createUserForm.password}
                    onChange={(e) => updateCreateUserForm('password', e.target.value)}
                    className={`${ds.input()} text-sm pr-10`}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 lg:space-x-3 mt-4 lg:mt-6">
              <button
                onClick={handleCancelCreate}
                disabled={creatingUser}
                className={`${ds.button('secondary')} text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2`}
              >
                Cancelar
              </button>
              <LoadingButton
                loading={creatingUser}
                onClick={handleCreateUser}
                variant="primary"
                className="text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2"
              >
                Criar
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Usuários */}
      <div className={ds.card()}>
        <div className="p-3 lg:p-6">
          {users.length === 0 ? (
            <EmptyState
              title="Nenhum usuário cadastrado"
              description="Adicione usuários para sua empresa começar a usar o sistema."
              icon={UserGroupIcon}
              action={
                canAddUsers ? (
                  <button
                    onClick={handleShowCreateUser}
                    className={`${ds.button('primary')} text-sm`}
                  >
                    <UserPlusIcon className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Usuário
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Versão Mobile - Cards */}
              <div className="lg:hidden space-y-3">
                {users.map((user) => (
                  <div key={user.uuid} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      {user.is_admin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 flex-shrink-0">
                          <ShieldCheckIcon className="h-3 w-3 mr-1" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                          <UserIcon className="h-3 w-3 mr-1" />
                          Vendedor
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{user.phone ? formatBrazilianPhone(user.phone) : 'Sem telefone'}</span>
                      <span>{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    
                    {(onUpdateUserRole || onUpdateUser) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        {onUpdateUser && (
                          <button
                            onClick={() => handleShowEditUser(user)}
                            className="flex-1 text-primary-600 hover:text-primary-900 flex items-center justify-center text-xs py-1.5 bg-white rounded border border-gray-200"
                          >
                            <PencilIcon className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </button>
                        )}
                        {onUpdateUserRole && (
                          <button
                            onClick={() => handleToggleUserRole(user)}
                            className="flex-1 text-indigo-600 hover:text-indigo-900 flex items-center justify-center text-xs py-1.5 bg-white rounded border border-gray-200"
                          >
                            <CogIcon className="h-3.5 w-3.5 mr-1" />
                            {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Versão Desktop - Tabela */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nível de Acesso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data de Criação
                      </th>
                      {(onUpdateUserRole || onUpdateUser) && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.uuid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">
                            {user.phone ? formatBrazilianPhone(user.phone) : 'Não informado'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.is_admin ? (
                              <div className="flex items-center">
                                <ShieldCheckIcon className="h-4 w-4 text-red-600 mr-2" />
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Administrador
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <UserIcon className="h-4 w-4 text-blue-600 mr-2" />
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Vendedor
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        {(onUpdateUserRole || onUpdateUser) && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-3">
                              {onUpdateUser && (
                                <button
                                  onClick={() => handleShowEditUser(user)}
                                  className="text-primary-600 hover:text-primary-900 flex items-center"
                                  title="Editar usuário"
                                >
                                  <PencilIcon className="h-4 w-4 mr-1" />
                                  Editar
                                </button>
                              )}
                              {onUpdateUserRole && (
                                <button
                                  onClick={() => handleToggleUserRole(user)}
                                  className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                  title={user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                                >
                                  <CogIcon className="h-4 w-4 mr-1" />
                                  {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
