import { useState } from 'react'
import { 
  UserGroupIcon, 
  UserPlusIcon, 
  CogIcon,
  ShieldCheckIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import type { CreateUserData } from '../../types'
import type { UserRole } from '../../contexts/AuthContext'
import { ds } from '../../utils/designSystem'
import { EmptyState, ErrorCard } from '../ui/LoadingStates'
import { formatBrazilianPhone } from '../../utils/validations'
import { UserFormModal } from './UserFormModal'
import { ResponsiveModal } from '../common/ResponsiveModal'
import { StyledSelect } from '../ui/StyledSelect'
import { getUserRecordsCounts, transferUserRecords, type UserRecordsCounts } from '../../services/empresaService'

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
  onDeleteUser?: (userId: string) => Promise<void>
}

export function EmpresaUsers({ 
  users, 
  canAddUsers, 
  onCreateUser, 
  onRefresh, 
  onUpdateUserRole, 
  onUpdateUser,
  onDeleteUser
}: EmpresaUsersProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<EmpresaUser | null>(null)
  
  // Estados para modal de confirmação de exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<EmpresaUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  
  // Estados para contagens e transferência
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [recordsCounts, setRecordsCounts] = useState<UserRecordsCounts | null>(null)
  const [transferToUserId, setTransferToUserId] = useState<string>('')
  const [transferring, setTransferring] = useState(false)

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

  // Funções para exclusão de usuário
  const handleOpenDeleteModal = async (user: EmpresaUser) => {
    setUserToDelete(user)
    setDeleteError(null)
    setRecordsCounts(null)
    setTransferToUserId('')
    setDeleteModalOpen(true)
    
    // Buscar contagens de registros do usuário
    setLoadingCounts(true)
    try {
      const counts = await getUserRecordsCounts(user.uuid)
      setRecordsCounts(counts)
    } catch (error) {
      console.error('Erro ao buscar contagens:', error)
    } finally {
      setLoadingCounts(false)
    }
  }

  const handleCloseDeleteModal = () => {
    if (!deleting && !transferring) {
      setDeleteModalOpen(false)
      setUserToDelete(null)
      setDeleteError(null)
      setRecordsCounts(null)
      setTransferToUserId('')
    }
  }

  const handleTransferAndDelete = async () => {
    if (!onDeleteUser || !userToDelete) return
    
    setTransferring(true)
    setDeleteError(null)
    
    try {
      // Transferir registros se um usuário destino foi selecionado
      if (transferToUserId && recordsCounts && recordsCounts.total > 0) {
        await transferUserRecords(userToDelete.uuid, transferToUserId)
      }
      
      // Excluir o usuário
      setDeleting(true)
      await onDeleteUser(userToDelete.uuid)
      await onRefresh()
      setDeleteModalOpen(false)
      setUserToDelete(null)
      setRecordsCounts(null)
      setTransferToUserId('')
    } catch (error: any) {
      console.error('Erro ao transferir/excluir usuário:', error)
      setDeleteError(error?.message || 'Erro ao excluir usuário')
    } finally {
      setTransferring(false)
      setDeleting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!onDeleteUser || !userToDelete) return
    
    setDeleting(true)
    setDeleteError(null)
    
    try {
      await onDeleteUser(userToDelete.uuid)
      await onRefresh()
      setDeleteModalOpen(false)
      setUserToDelete(null)
      setRecordsCounts(null)
      setTransferToUserId('')
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error)
      setDeleteError(error?.message || 'Erro ao excluir usuário')
    } finally {
      setDeleting(false)
    }
  }
  
  // Filtrar usuários disponíveis para transferência (excluindo o usuário a ser excluído)
  const availableUsersForTransfer = users.filter(u => u.uuid !== userToDelete?.uuid)

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
                      
                      {(onUpdateUserRole || onUpdateUser || onDeleteUser) && (
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
                          {onDeleteUser && (
                            <button
                              onClick={() => handleOpenDeleteModal(user)}
                              className="flex-1 text-red-600 hover:text-red-900 flex items-center justify-center text-xs py-1.5 bg-white rounded border border-gray-200"
                            >
                              <TrashIcon className="h-3.5 w-3.5 mr-1" />
                              Excluir
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
                        {(onUpdateUserRole || onUpdateUser || onDeleteUser) && (
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
                          {(onUpdateUserRole || onUpdateUser || onDeleteUser) && (
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
                                {onDeleteUser && (
                                  <button
                                    onClick={() => handleOpenDeleteModal(user)}
                                    className="text-red-600 hover:text-red-900 flex items-center"
                                    title="Excluir usuário"
                                  >
                                    <TrashIcon className="h-4 w-4 mr-1" />
                                    Excluir
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

      {/* Modal de Confirmação de Exclusão */}
      <ResponsiveModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Excluir Usuário"
        size="md"
      >
        <div className="space-y-4">
          {/* Ícone de Alerta */}
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>

          {/* Mensagem de Confirmação */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir o usuário{' '}
              <span className="font-semibold text-gray-900">
                {userToDelete?.full_name}
              </span>
              ?
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Esta ação não pode ser desfeita. O usuário perderá acesso ao sistema.
            </p>
          </div>

          {/* Contagens de Registros */}
          {loadingCounts ? (
            <div className="flex items-center justify-center py-4">
              <svg className="animate-spin h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm text-gray-500">Verificando registros...</span>
            </div>
          ) : recordsCounts && recordsCounts.total > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800 mb-3">
                Este usuário possui registros atribuídos:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {recordsCounts.leads > 0 && (
                  <div className="flex items-center justify-between bg-white rounded px-2 py-1">
                    <span className="text-gray-600">Leads:</span>
                    <span className="font-semibold text-amber-700">{recordsCounts.leads}</span>
                  </div>
                )}
                {recordsCounts.tasks > 0 && (
                  <div className="flex items-center justify-between bg-white rounded px-2 py-1">
                    <span className="text-gray-600">Tarefas:</span>
                    <span className="font-semibold text-amber-700">{recordsCounts.tasks}</span>
                  </div>
                )}
                {recordsCounts.conversations > 0 && (
                  <div className="flex items-center justify-between bg-white rounded px-2 py-1">
                    <span className="text-gray-600">Conversas:</span>
                    <span className="font-semibold text-amber-700">{recordsCounts.conversations}</span>
                  </div>
                )}
                {recordsCounts.bookings > 0 && (
                  <div className="flex items-center justify-between bg-white rounded px-2 py-1">
                    <span className="text-gray-600">Agendamentos:</span>
                    <span className="font-semibold text-amber-700">{recordsCounts.bookings}</span>
                  </div>
                )}
                {recordsCounts.events > 0 && (
                  <div className="flex items-center justify-between bg-white rounded px-2 py-1">
                    <span className="text-gray-600">Eventos:</span>
                    <span className="font-semibold text-amber-700">{recordsCounts.events}</span>
                  </div>
                )}
              </div>
              
              {/* Opção de Transferência */}
              {availableUsersForTransfer.length > 0 && (
                <div className="mt-4 pt-3 border-t border-amber-200">
                  <label className="block text-xs font-medium text-amber-800 mb-2">
                    Transferir registros para outro usuário (opcional):
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <StyledSelect
                        options={[
                          { value: '', label: 'Não transferir (manter órfãos)' },
                          ...availableUsersForTransfer.map(u => ({
                            value: u.uuid,
                            label: `${u.full_name}${u.is_admin ? ' (Admin)' : ''}`
                          }))
                        ]}
                        value={transferToUserId}
                        onChange={setTransferToUserId}
                        placeholder="Selecione um usuário..."
                      />
                    </div>
                  </div>
                  {transferToUserId && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center">
                      <ArrowRightIcon className="h-3 w-3 mr-1" />
                      {recordsCounts.total} registro(s) serão transferidos antes da exclusão
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : recordsCounts && recordsCounts.total === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700 text-center">
                Este usuário não possui registros atribuídos.
              </p>
            </div>
          ) : null}

          {/* Mensagem de Erro */}
          {deleteError && (
            <ErrorCard message={deleteError} />
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCloseDeleteModal}
              disabled={deleting || transferring}
              className={`${ds.button('secondary')} text-sm px-4 py-2`}
            >
              Cancelar
            </button>
            
            {/* Botão de Transferir e Excluir (se tem transferência selecionada) */}
            {transferToUserId && recordsCounts && recordsCounts.total > 0 ? (
              <button
                onClick={handleTransferAndDelete}
                disabled={deleting || transferring}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferring || deleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {transferring ? 'Transferindo...' : 'Excluindo...'}
                  </>
                ) : (
                  <>
                    <ArrowRightIcon className="h-4 w-4 mr-1" />
                    Transferir e Excluir
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleConfirmDelete}
                disabled={deleting || loadingCounts}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Excluindo...
                  </>
                ) : (
                  'Excluir Usuário'
                )}
              </button>
            )}
          </div>
        </div>
      </ResponsiveModal>
    </>
  )
}
