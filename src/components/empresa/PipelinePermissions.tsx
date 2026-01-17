import { useState, useEffect } from 'react'
import { 
  CogIcon, 
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { LoadingButton, ErrorCard, SuccessCard, EmptyState } from '../ui/LoadingStates'
import { useStandardizedLoading } from '../../hooks/useStandardizedLoading'
import { 
  getAllUserPipelinePermissions,
  setUserPipelinePermissions,
  isPipelinePermissionsDbEnabled
} from '../../services/pipelinePermissionService'
import { getPipelines } from '../../services/pipelineService'
import { useToastContext } from '../../contexts/ToastContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface User {
  userId: string
  userName: string
  isAdmin: boolean
  allowedPipelineIds: string[]
}

interface Pipeline {
  id: string
  name: string
  description?: string
}

interface PipelinePermissionsProps {
  onRefresh?: () => Promise<void>
}

export function PipelinePermissions({ onRefresh }: PipelinePermissionsProps) {
  const [users, setUsers] = useState<User[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [tempPermissions, setTempPermissions] = useState<string[]>([])
  const toast = useToastContext()

  const {
    loading,
    error,
    success,
    executeAsync,
    clearMessages
  } = useStandardizedLoading({
    successMessage: 'Permissões atualizadas com sucesso!',
    errorMessage: 'Erro ao atualizar permissões'
  })

  // Carregar dados iniciais
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await executeAsync(async () => {
      const [usersResult, pipelinesResult] = await Promise.all([
        getAllUserPipelinePermissions(),
        getPipelines()
      ])

      if (usersResult.error) {
        throw new Error(usersResult.error)
      }

      if (pipelinesResult.error) {
        throw new Error(pipelinesResult.error.message)
      }

      setUsers(usersResult.data || [])
      setPipelines(pipelinesResult.data || [])
    })
  }

  const handleEditPermissions = (user: User) => {
    setSelectedUser(user)
    setTempPermissions([...user.allowedPipelineIds])
    setShowPermissionModal(true)
    clearMessages()
  }

  const handleTogglePermission = (pipelineId: string) => {
    setTempPermissions(prev => 
      prev.includes(pipelineId)
        ? prev.filter(id => id !== pipelineId)
        : [...prev, pipelineId]
    )
  }

  const handleSavePermissions = async () => {
    if (!selectedUser) return

    await executeAsync(async () => {
      const result = await setUserPipelinePermissions(selectedUser.userId, tempPermissions)
      
      if (!result.success) {
        const msg = result.error || 'Erro ao salvar permissões'
        toast.showError('Erro', msg)
        throw new Error(msg)
      }

      toast.showSuccess('Permissões salvas', 'As permissões de pipeline foram atualizadas.')
      // Atualizar estado local
      setUsers(prev => 
        prev.map(user => 
          user.userId === selectedUser.userId
            ? { ...user, allowedPipelineIds: [...tempPermissions] }
            : user
        )
      )

      setShowPermissionModal(false)
      setSelectedUser(null)
      
      if (onRefresh) {
        await onRefresh()
      }
    })
  }

  const handleCancelEdit = () => {
    setShowPermissionModal(false)
    setSelectedUser(null)
    setTempPermissions([])
    clearMessages()
  }
  
  useEscapeKey(showPermissionModal, handleCancelEdit)

  const isUserAdmin = (user: User): boolean => user.isAdmin

  return (
    <div className="space-y-4 lg:space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {!isPipelinePermissionsDbEnabled() && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm">
          Permissões salvas apenas neste navegador (DB desativado).
        </div>
      )}
      {/* Mensagens */}
      {error && <ErrorCard message={error} />}
      {success && <SuccessCard message={success} />}

      {/* Cabeçalho */}
      <div className={ds.card()}>
        <div className="p-3 lg:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base lg:text-xl font-semibold text-gray-900">
                Permissões de Pipeline
              </h2>
              <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1 hidden sm:block">
                Controle quais pipelines cada vendedor pode acessar
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className={`${ds.button('secondary')} p-1.5 lg:p-2 flex-shrink-0`}
              title="Atualizar"
            >
              <CogIcon className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden lg:inline ml-2">Atualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de usuários */}
      <div className={ds.card()}>
        <div className="p-3 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-6 lg:py-8">
              <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 text-xs lg:text-base">Carregando...</span>
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="Nenhum usuário encontrado"
              description="Não há usuários para gerenciar permissões."
              icon={UserIcon}
            />
          ) : (
            <>
              {/* Mobile: Cards */}
              <div className="lg:hidden space-y-3">
                {users.map((user) => (
                  <div 
                    key={user.userId} 
                    className={`p-3 rounded-lg border ${isUserAdmin(user) ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isUserAdmin(user) ? (
                          <ShieldCheckIcon className="h-4 w-4 text-red-600 flex-shrink-0" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {user.userName}
                        </span>
                      </div>
                      {isUserAdmin(user) ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 flex-shrink-0">
                          Admin
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                          Vendedor
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="text-xs mb-2">
                      {isUserAdmin(user) ? (
                        <span className="text-green-600 font-medium">Acesso total</span>
                      ) : user.allowedPipelineIds.length === 0 ? (
                        <span className="text-red-600">Nenhum pipeline</span>
                      ) : (
                        <span className="text-gray-700">{user.allowedPipelineIds.length} pipeline(s)</span>
                      )}
                    </div>

                    {/* Ação */}
                    {!isUserAdmin(user) && (
                      <button
                        onClick={() => handleEditPermissions(user)}
                        className="w-full px-2 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded border border-indigo-200 hover:bg-indigo-100"
                      >
                        Gerenciar Permissões
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: Tabela */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pipelines</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {isUserAdmin(user) ? (
                              <ShieldCheckIcon className="h-5 w-5 text-red-600 mr-3" />
                            ) : (
                              <UserIcon className="h-5 w-5 text-blue-600 mr-3" />
                            )}
                            <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isUserAdmin(user) ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Administrador</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Vendedor</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isUserAdmin(user) ? (
                            <span className="text-sm text-green-600 font-medium">Acesso total</span>
                          ) : user.allowedPipelineIds.length === 0 ? (
                            <span className="text-sm text-red-600">Nenhum permitido</span>
                          ) : (
                            <span className="text-sm text-gray-900">{user.allowedPipelineIds.length} pipeline(s)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => !isUserAdmin(user) && handleEditPermissions(user)}
                            className={isUserAdmin(user) ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-900'}
                            disabled={isUserAdmin(user)}
                            title={isUserAdmin(user) ? 'Admins têm acesso total' : 'Gerenciar permissões'}
                          >
                            {isUserAdmin(user) ? '-' : 'Gerenciar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de edição de permissões */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 lg:p-4 z-[9999]">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] lg:max-h-[80vh] overflow-hidden">
            <div className="p-3 lg:p-6 border-b border-gray-200">
              <h3 className="text-sm lg:text-lg font-medium text-gray-900 truncate">
                Permissões: {selectedUser.userName}
              </h3>
              <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1">
                Selecione os pipelines permitidos
              </p>
            </div>

            <div className="p-3 lg:p-6 max-h-64 lg:max-h-96 overflow-y-auto">
              {pipelines.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">Nenhum pipeline disponível</p>
              ) : (
                <div className="space-y-2 lg:space-y-3">
                  {pipelines.map((pipeline) => (
                    <div 
                      key={pipeline.id} 
                      className="flex items-center p-2 lg:p-0 bg-gray-50 lg:bg-transparent rounded-lg lg:rounded-none"
                    >
                      <input
                        type="checkbox"
                        id={`pipeline-${pipeline.id}`}
                        checked={tempPermissions.includes(pipeline.id)}
                        onChange={() => handleTogglePermission(pipeline.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`pipeline-${pipeline.id}`} className="ml-2 lg:ml-3 flex-1 cursor-pointer min-w-0">
                        <div className="text-xs lg:text-sm font-medium text-gray-900 truncate">{pipeline.name}</div>
                        {pipeline.description && (
                          <div className="text-[10px] lg:text-xs text-gray-500 truncate">{pipeline.description}</div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 lg:p-6 border-t border-gray-200 flex justify-end gap-2 lg:gap-3">
              <button
                onClick={handleCancelEdit}
                disabled={loading}
                className={`${ds.button('secondary')} text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2`}
              >
                Cancelar
              </button>
              <LoadingButton
                loading={loading}
                onClick={handleSavePermissions}
                variant="primary"
                className="text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2"
              >
                Salvar
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
