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

  const isUserAdmin = (user: User): boolean => user.isAdmin

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {!isPipelinePermissionsDbEnabled() && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-md text-sm">
          As permissões estão salvas apenas neste navegador (DB desativado). Ative VITE_ENABLE_PIPELINE_PERMISSIONS_DB e reinicie o app.
        </div>
      )}
      {/* Mensagens */}
      {error && <ErrorCard message={error} />}
      {success && <SuccessCard message={success} />}

      {/* Cabeçalho */}
      <div className={ds.card()}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Permissões de Pipeline
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Controle quais pipelines cada vendedor pode acessar
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className={ds.button('secondary')}
            >
              <CogIcon className="w-4 h-4 mr-2" />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de usuários */}
      <div className={ds.card()}>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Carregando usuários...</span>
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="Nenhum usuário encontrado"
              description="Não há usuários para gerenciar permissões."
              icon={UserIcon}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo de Acesso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pipelines Permitidos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
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
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.userName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isUserAdmin(user) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Administrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Vendedor
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isUserAdmin(user) ? (
                          <span className="text-sm text-green-600 font-medium">
                            Acesso total (todos os pipelines)
                          </span>
                        ) : user.allowedPipelineIds.length === 0 ? (
                          <span className="text-sm text-red-600">
                            Nenhum pipeline permitido
                          </span>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {user.allowedPipelineIds.length} pipeline(s) permitido(s)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => !isUserAdmin(user) && handleEditPermissions(user)}
                          className={
                            isUserAdmin(user)
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-indigo-600 hover:text-indigo-900'
                          }
                          disabled={isUserAdmin(user)}
                          title={
                            isUserAdmin(user)
                              ? 'Administradores têm acesso total a todos os pipelines'
                              : 'Gerenciar permissões'
                          }
                        >
                          Gerenciar Permissões
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edição de permissões */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Permissões para {selectedUser.userName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Selecione quais pipelines este vendedor pode acessar
              </p>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {pipelines.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhum pipeline disponível
                </p>
              ) : (
                <div className="space-y-3">
                  {pipelines.map((pipeline) => (
                    <div key={pipeline.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`pipeline-${pipeline.id}`}
                        checked={tempPermissions.includes(pipeline.id)}
                        onChange={() => handleTogglePermission(pipeline.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`pipeline-${pipeline.id}`}
                        className="ml-3 flex-1 cursor-pointer"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {pipeline.name}
                        </div>
                        {pipeline.description && (
                          <div className="text-xs text-gray-500">
                            {pipeline.description}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCancelEdit}
                disabled={loading}
                className={ds.button('secondary')}
              >
                Cancelar
              </button>
              <LoadingButton
                loading={loading}
                onClick={handleSavePermissions}
                variant="primary"
              >
                Salvar Permissões
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
