import React, { useState } from 'react'
import type { BookingCalendarOwner, Profile } from '../../types'
import { 
  PlusIcon, 
  TrashIcon, 
  UserIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'

interface BookingOwnerListProps {
  owners: BookingCalendarOwner[]
  availableUsers: Profile[]
  onAdd?: (user_id: string, role: 'admin' | 'member') => Promise<void>
  onRemove?: (owner_id: string) => Promise<void>
  onUpdate?: (owner_id: string, data: { can_receive_bookings?: boolean; booking_weight?: number }) => Promise<void>
}

export const BookingOwnerList: React.FC<BookingOwnerListProps> = ({
  owners,
  availableUsers,
  onAdd,
  onRemove,
  onUpdate
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member')
  const [adding, setAdding] = useState(false)

  // Filtrar usuários que ainda não são owners
  const availableToAdd = availableUsers.filter(
    user => !owners.some(owner => owner.user_id === user.uuid)
  )

  const handleAdd = async () => {
    if (!selectedUserId || !onAdd) return
    
    setAdding(true)
    try {
      await onAdd(selectedUserId, selectedRole)
      setShowAddForm(false)
      setSelectedUserId('')
      setSelectedRole('member')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (owner_id: string) => {
    if (!onRemove) return
    if (!confirm('Remover este responsável da agenda?')) return
    await onRemove(owner_id)
  }

  const handleToggleReceiveBookings = async (owner: BookingCalendarOwner) => {
    if (!onUpdate) return
    await onUpdate(owner.id, { can_receive_bookings: !owner.can_receive_bookings })
  }

  const handleWeightChange = async (owner: BookingCalendarOwner, weight: number) => {
    if (!onUpdate) return
    await onUpdate(owner.id, { booking_weight: weight })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900">Responsáveis</h3>
          <p className="text-sm text-gray-500">
            Defina quem receberá os agendamentos desta agenda
          </p>
        </div>
        {!showAddForm && availableToAdd.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className={ds.button('primary')}
          >
            <PlusIcon className="w-4 h-4" />
            Adicionar
          </button>
        )}
      </div>

      {/* Form para adicionar novo owner */}
      {showAddForm && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuário
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={ds.input()}
              >
                <option value="">Selecione um usuário</option>
                {availableToAdd.map(user => (
                  <option key={user.uuid} value={user.uuid}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Função
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'member')}
                className={ds.input()}
              >
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleAdd}
                disabled={!selectedUserId || adding}
                className={ds.button('primary')}
              >
                {adding ? 'Adicionando...' : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Adicionar
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedUserId('')
                }}
                className={ds.button('secondary')}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de owners */}
      {owners.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <UserIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>Nenhum responsável adicionado</p>
          <p className="text-sm">Adicione usuários para receberem agendamentos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {owners.map(owner => (
            <div 
              key={owner.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {owner.user?.full_name || 'Usuário'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {owner.user?.email}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  owner.role === 'admin' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {owner.role === 'admin' ? 'Admin' : 'Membro'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Toggle receber agendamentos */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Receber agendamentos</span>
                  <button
                    type="button"
                    onClick={() => handleToggleReceiveBookings(owner)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      owner.can_receive_bookings ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span 
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        owner.can_receive_bookings ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Peso na distribuição */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Peso:</span>
                  <select
                    value={owner.booking_weight}
                    onChange={(e) => handleWeightChange(owner, parseInt(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={3}>3x</option>
                  </select>
                </div>

                {/* Remover */}
                <button
                  onClick={() => handleRemove(owner.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {owners.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          <strong>Distribuição de agendamentos:</strong> Os agendamentos são distribuídos 
          automaticamente entre os responsáveis ativos, considerando o peso configurado 
          (ex: peso 2x recebe o dobro de agendamentos).
        </div>
      )}
    </div>
  )
}
