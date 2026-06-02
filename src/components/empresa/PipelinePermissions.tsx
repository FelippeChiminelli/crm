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
import {
  getAllUserStagePermissions,
  setUserStagePermissions as persistUserStagePermissions,
  isStagePermissionsDbEnabled,
  hasStageRestriction,
  type StagesByPipeline
} from '../../services/stagePermissionService'
import { getPipelines } from '../../services/pipelineService'
import { getStagesByPipeline } from '../../services/stageService'
import type { Stage } from '../../types'
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

function getAllStageIds(stagesByPipeline: Record<string, Stage[]>, pipelineId: string): string[] {
  return (stagesByPipeline[pipelineId] || []).map(s => s.id)
}

function resolveAllowedStageIds(
  pipelineId: string,
  stagesByPipeline: Record<string, Stage[]>,
  saved: StagesByPipeline
): string[] {
  if (hasStageRestriction(saved, pipelineId)) {
    return saved[pipelineId] || []
  }
  return getAllStageIds(stagesByPipeline, pipelineId)
}

function getPipelineAccessLabel(
  user: User,
  pipelines: Pipeline[],
  stagesByPipeline: Record<string, Stage[]>,
  userStages: StagesByPipeline
): string {
  if (user.isAdmin) return 'Acesso total'
  if (user.allowedPipelineIds.length === 0) return 'Nenhum permitido'

  const parts = user.allowedPipelineIds.map((pid) => {
    const pipeline = pipelines.find(p => p.id === pid)
    const name = pipeline?.name || 'Pipeline'
    const totalStages = stagesByPipeline[pid]?.length || 0
    const allowedCount = resolveAllowedStageIds(pid, stagesByPipeline, userStages).length
    if (totalStages > 0 && allowedCount < totalStages) {
      return `${name} (${allowedCount}/${totalStages})`
    }
    return name
  })

  if (parts.length <= 2) return parts.join(', ')
  return `${user.allowedPipelineIds.length} pipeline(s)`
}

export function PipelinePermissions({ onRefresh }: PipelinePermissionsProps) {
  const [users, setUsers] = useState<User[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, Stage[]>>({})
  const [userStagePermissions, setUserStagePermissions] = useState<Record<string, StagesByPipeline>>({})
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [tempPermissions, setTempPermissions] = useState<string[]>([])
  const [tempStagesByPipeline, setTempStagesByPipeline] = useState<StagesByPipeline>({})
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await executeAsync(async () => {
      const [usersResult, pipelinesResult, stagePermsResult] = await Promise.all([
        getAllUserPipelinePermissions(),
        getPipelines(),
        getAllUserStagePermissions()
      ])

      if (usersResult.error) {
        throw new Error(usersResult.error)
      }

      if (pipelinesResult.error) {
        throw new Error(pipelinesResult.error.message)
      }

      const pipelineList = pipelinesResult.data || []
      setUsers(usersResult.data || [])
      setPipelines(pipelineList)
      setUserStagePermissions(stagePermsResult.data || {})

      const stagesMap: Record<string, Stage[]> = {}
      await Promise.all(
        pipelineList.map(async (pipeline) => {
          const { data } = await getStagesByPipeline(pipeline.id)
          stagesMap[pipeline.id] = data || []
        })
      )
      setStagesByPipeline(stagesMap)
    })
  }

  const handleEditPermissions = (user: User) => {
    const savedStages = userStagePermissions[user.userId] || {}
    const initialStages: StagesByPipeline = {}

    for (const pipelineId of user.allowedPipelineIds) {
      initialStages[pipelineId] = resolveAllowedStageIds(pipelineId, stagesByPipeline, savedStages)
    }

    setSelectedUser(user)
    setTempPermissions([...user.allowedPipelineIds])
    setTempStagesByPipeline(initialStages)
    setShowPermissionModal(true)
    clearMessages()
  }

  const handleTogglePermission = (pipelineId: string) => {
    setTempPermissions(prev => {
      const isRemoving = prev.includes(pipelineId)
      if (isRemoving) {
        setTempStagesByPipeline(stages => {
          const next = { ...stages }
          delete next[pipelineId]
          return next
        })
        return prev.filter(id => id !== pipelineId)
      }

      setTempStagesByPipeline(stages => ({
        ...stages,
        [pipelineId]: getAllStageIds(stagesByPipeline, pipelineId),
      }))
      return [...prev, pipelineId]
    })
  }

  const getSelectedStageIds = (pipelineId: string): string[] => {
    if (tempStagesByPipeline[pipelineId]) {
      return tempStagesByPipeline[pipelineId]
    }
    return getAllStageIds(stagesByPipeline, pipelineId)
  }

  const handleToggleStage = (pipelineId: string, stageId: string) => {
    if (!tempPermissions.includes(pipelineId)) return

    setTempStagesByPipeline(prev => {
      const current = prev[pipelineId] ?? getAllStageIds(stagesByPipeline, pipelineId)
      const nextIds = current.includes(stageId)
        ? current.filter(id => id !== stageId)
        : [...current, stageId]
      return { ...prev, [pipelineId]: nextIds }
    })
  }

  const isStageChecked = (pipelineId: string, stageId: string): boolean => {
    return getSelectedStageIds(pipelineId).includes(stageId)
  }

  const buildStagesPayload = (): StagesByPipeline => {
    const payload: StagesByPipeline = {}
    for (const pipelineId of tempPermissions) {
      payload[pipelineId] = getSelectedStageIds(pipelineId)
    }
    return payload
  }

  const handleSavePermissions = async () => {
    if (!selectedUser) return

    await executeAsync(async () => {
      const pipelineResult = await setUserPipelinePermissions(selectedUser.userId, tempPermissions)
      if (!pipelineResult.success) {
        const msg = pipelineResult.error || 'Erro ao salvar permissões de pipeline'
        toast.showError('Erro', msg)
        throw new Error(msg)
      }

      const stagesPayload = buildStagesPayload()
      const stageResult = await persistUserStagePermissions(selectedUser.userId, stagesPayload)
      if (!stageResult.success) {
        const msg = stageResult.error || 'Erro ao salvar permissões de estágio'
        toast.showError('Erro', msg)
        throw new Error(msg)
      }

      toast.showSuccess('Permissões salvas', 'Pipelines e estágios do Kanban foram atualizados.')

      setUsers(prev =>
        prev.map(user =>
          user.userId === selectedUser.userId
            ? { ...user, allowedPipelineIds: [...tempPermissions] }
            : user
        )
      )
      setUserStagePermissions(prev => ({
        ...prev,
        [selectedUser.userId]: stagesPayload
      }))

      setShowPermissionModal(false)
      setSelectedUser(null)
      setTempStagesByPipeline({})

      if (onRefresh) {
        await onRefresh()
      }
    })
  }

  const handleCancelEdit = () => {
    setShowPermissionModal(false)
    setSelectedUser(null)
    setTempPermissions([])
    setTempStagesByPipeline({})
    clearMessages()
  }

  useEscapeKey(showPermissionModal, handleCancelEdit)

  const isUserAdmin = (user: User): boolean => user.isAdmin

  const dbDisabled = !isPipelinePermissionsDbEnabled() || !isStagePermissionsDbEnabled()

  return (
    <div className="space-y-4 lg:space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {dbDisabled && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm">
          Permissões salvas apenas neste navegador (DB desativado).
        </div>
      )}
      {error && <ErrorCard message={error} />}
      {success && <SuccessCard message={success} />}

      <div className={ds.card()}>
        <div className="p-3 lg:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base lg:text-xl font-semibold text-gray-900">
                Permissões de Pipeline e Estágios
              </h2>
              <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1 hidden sm:block">
                Controle quais pipelines e estágios do Kanban cada vendedor pode visualizar
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
              <div className="lg:hidden space-y-3">
                {users.map((user) => (
                  <div
                    key={user.userId}
                    className={`p-3 rounded-lg border ${isUserAdmin(user) ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                  >
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

                    <div className="text-xs mb-2">
                      {isUserAdmin(user) ? (
                        <span className="text-green-600 font-medium">Acesso total</span>
                      ) : (
                        <span className="text-gray-700">
                          {getPipelineAccessLabel(user, pipelines, stagesByPipeline, userStagePermissions[user.userId] || {})}
                        </span>
                      )}
                    </div>

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

              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pipelines / Estágios</th>
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
                            <span className="text-sm text-gray-900">
                              {getPipelineAccessLabel(user, pipelines, stagesByPipeline, userStagePermissions[user.userId] || {})}
                            </span>
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

      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 lg:p-4 z-[9999]">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] lg:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-3 lg:p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-sm lg:text-lg font-medium text-gray-900 truncate">
                Permissões: {selectedUser.userName}
              </h3>
              <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1">
                Marque os pipelines e desmarque os estágios que o vendedor não deve ver no Kanban
              </p>
              <p className="text-[10px] lg:text-xs text-gray-500 mt-1">
                Ao liberar um pipeline, todos os estágios ficam selecionados. Desmarque os que deseja ocultar.
              </p>
            </div>

            <div className="p-3 lg:p-6 overflow-y-auto flex-1 min-h-0">
              {pipelines.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">Nenhum pipeline disponível</p>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {pipelines.map((pipeline) => {
                    const pipelineSelected = tempPermissions.includes(pipeline.id)
                    const stages = stagesByPipeline[pipeline.id] || []

                    return (
                      <div
                        key={pipeline.id}
                        className={`rounded-lg border p-2 lg:p-3 ${pipelineSelected ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`pipeline-${pipeline.id}`}
                            checked={pipelineSelected}
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

                        {pipelineSelected && stages.length > 0 && (
                          <div className="mt-2 ml-6 pl-2 border-l-2 border-indigo-100 space-y-1.5">
                            <p className="text-[10px] lg:text-xs text-gray-500 font-medium uppercase tracking-wide">
                              Estágios no Kanban
                            </p>
                            {stages.map((stage) => (
                              <div key={stage.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`stage-${pipeline.id}-${stage.id}`}
                                  checked={isStageChecked(pipeline.id, stage.id)}
                                  onChange={() => handleToggleStage(pipeline.id, stage.id)}
                                  className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label
                                  htmlFor={`stage-${pipeline.id}-${stage.id}`}
                                  className="ml-2 flex items-center gap-2 cursor-pointer min-w-0"
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: stage.color }}
                                  />
                                  <span className="text-xs text-gray-800 truncate">{stage.name}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}

                        {pipelineSelected && stages.length === 0 && (
                          <p className="mt-2 ml-6 text-[10px] lg:text-xs text-gray-400 italic">
                            Este pipeline não possui estágios configurados.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-3 lg:p-6 border-t border-gray-200 flex justify-end gap-2 lg:gap-3 flex-shrink-0">
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
