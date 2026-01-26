import { useState } from 'react'
import { 
  UserGroupIcon, 
  UserPlusIcon, 
  CogIcon,
  ShieldCheckIcon,
  UserIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import type { CreateUserData } from '../../types'
import type { UserRole } from '../../contexts/AuthContext'
import { ds } from '../../utils/designSystem'
import { EmptyState } from '../ui/LoadingStates'
import { formatBrazilianPhone } from '../../utils/validations'
import { UserFormModal } from './UserFormModal'

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

export function EmpresaUsers({ 
  users, 
  canAddUsers, 
  onCreateUser, 
  onRefresh, 
  onUpdateUserRole, 
  onUpdateUser 
}: EmpresaUsersProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<EmpresaUser | null>(null)

  const handleOpenCreateModal = () => {
    setModalMode('create')
    setSelectedUser(null)
    setModalOpen(true)
  }

  const handleOpenEditModal = (user: EmpresaUser) => {
    setModalMode('edit')
    setSelectedUser(user)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedUser(null)
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
    <>
      <div className="space-y-4 lg:space-y-6 max-h-[70vh] overflow-y-auto pr-1">
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
                {canAddUsers && (
                  <button
                    onClick={handleOpenCreateModal}
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
                      onClick={handleOpenCreateModal}
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
                              onClick={() => handleOpenEditModal(user)}
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
                                    onClick={() => handleOpenEditModal(user)}
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

      {/* Modal de Criar/Editar */}
      <UserFormModal
        isOpen={modalOpen}
        mode={modalMode}
        user={selectedUser}
        onClose={handleCloseModal}
        onCreateUser={onCreateUser}
        onUpdateUser={onUpdateUser}
        onRefresh={onRefresh}
      />
    </>
  )
}
