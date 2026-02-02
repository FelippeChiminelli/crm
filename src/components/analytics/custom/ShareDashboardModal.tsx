import { useState, useEffect } from 'react'
import {
  XMarkIcon,
  UserPlusIcon,
  TrashIcon,
  GlobeAltIcon,
  UserGroupIcon,
  LockClosedIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import type { CustomDashboard, Profile } from '../../../types'
import { getCompanyUsersForSharing } from '../../../services/customDashboardService'

interface ShareDashboardModalProps {
  isOpen: boolean
  dashboard: CustomDashboard | null
  onClose: () => void
  onShareWithUser: (userId: string, permission: 'view' | 'edit') => Promise<void>
  onShareWithAll: (permission: 'view' | 'edit') => Promise<void>
  onUpdatePermission: (shareId: string, permission: 'view' | 'edit') => Promise<void>
  onRemoveShare: (shareId: string) => Promise<void>
  onRemoveShareAll: () => Promise<void>
}

export function ShareDashboardModal({
  isOpen,
  dashboard,
  onClose,
  onShareWithUser,
  onShareWithAll,
  onUpdatePermission,
  onRemoveShare,
  onRemoveShareAll
}: ShareDashboardModalProps) {
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)

  // Carregar usuários disponíveis
  useEffect(() => {
    if (isOpen && dashboard) {
      loadAvailableUsers()
    }
  }, [isOpen, dashboard?.id])

  const loadAvailableUsers = async () => {
    if (!dashboard) return
    
    try {
      setLoadingUsers(true)
      const users = await getCompanyUsersForSharing(dashboard.id)
      setAvailableUsers(users)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleShareWithUser = async () => {
    if (!selectedUserId) return
    
    try {
      setSaving(true)
      await onShareWithUser(selectedUserId, selectedPermission)
      setSelectedUserId('')
      await loadAvailableUsers()
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleShareWithAll = async () => {
    try {
      setSaving(true)
      await onShareWithAll(selectedPermission)
    } catch (error) {
      console.error('Erro ao compartilhar com empresa:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveShareAll = async () => {
    try {
      setSaving(true)
      await onRemoveShareAll()
    } catch (error) {
      console.error('Erro ao remover compartilhamento:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !dashboard) return null

  // Verificar se já está compartilhado com toda empresa
  const companyShare = dashboard.shares?.find(s => s.shared_with_all)
  const userShares = dashboard.shares?.filter(s => !s.shared_with_all) || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Compartilhar Dashboard
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {dashboard.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Compartilhar com toda empresa */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <GlobeAltIcon className="w-6 h-6 text-gray-500" />
              <div>
                <h3 className="font-medium text-gray-900">Toda a Empresa</h3>
                <p className="text-sm text-gray-500">
                  Todos os usuários da empresa poderão acessar
                </p>
              </div>
            </div>

            {companyShare ? (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    companyShare.permission === 'edit'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {companyShare.permission === 'edit' ? (
                      <>
                        <PencilIcon className="w-3 h-3 inline mr-1" />
                        Pode editar
                      </>
                    ) : (
                      <>
                        <EyeIcon className="w-3 h-3 inline mr-1" />
                        Somente visualizar
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={companyShare.permission}
                    onChange={(e) => onUpdatePermission(companyShare.id, e.target.value as 'view' | 'edit')}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    disabled={saving}
                  >
                    <option value="view">Visualizar</option>
                    <option value="edit">Editar</option>
                  </select>
                  <button
                    onClick={handleRemoveShareAll}
                    disabled={saving}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remover compartilhamento"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                <select
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value as 'view' | 'edit')}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="view">Visualizar</option>
                  <option value="edit">Editar</option>
                </select>
                <button
                  onClick={handleShareWithAll}
                  disabled={saving}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Compartilhar com todos
                </button>
              </div>
            )}
          </div>

          {/* Compartilhar com usuário específico */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <UserPlusIcon className="w-5 h-5 text-gray-500" />
              Compartilhar com Usuário
            </h3>

            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                disabled={loadingUsers || saving}
              >
                <option value="">Selecione um usuário...</option>
                {availableUsers.map(user => (
                  <option key={user.uuid} value={user.uuid}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
              <select
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value as 'view' | 'edit')}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="view">Visualizar</option>
                <option value="edit">Editar</option>
              </select>
              <button
                onClick={handleShareWithUser}
                disabled={!selectedUserId || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>

            {availableUsers.length === 0 && !loadingUsers && (
              <p className="text-sm text-gray-500 mt-2">
                Todos os usuários já têm acesso a este dashboard
              </p>
            )}
          </div>

          {/* Lista de usuários com acesso */}
          {userShares.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-gray-500" />
                Usuários com Acesso
              </h3>

              <div className="space-y-2">
                {userShares.map(share => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {share.shared_with_user?.full_name || 'Usuário'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {share.shared_with_user?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={share.permission}
                        onChange={(e) => onUpdatePermission(share.id, e.target.value as 'view' | 'edit')}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        disabled={saving}
                      >
                        <option value="view">Visualizar</option>
                        <option value="edit">Editar</option>
                      </select>
                      <button
                        onClick={() => onRemoveShare(share.id)}
                        disabled={saving}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remover acesso"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info de privacidade */}
          {!companyShare && userShares.length === 0 && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <LockClosedIcon className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Dashboard Privado</p>
                <p className="text-sm text-yellow-700">
                  Apenas você pode visualizar este dashboard
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
