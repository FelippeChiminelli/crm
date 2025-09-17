import { useEffect, useState } from 'react'
import { getAllUsersWithInstancePermissions, setAllowedUserIdsForInstance, isInstancePermissionsDbEnabled } from '../../services/instancePermissionService'
import type { WhatsAppInstance } from '../../types'
import { useToastContext } from '../../contexts/ToastContext'

interface InstancePermissionsProps {
  instance: WhatsAppInstance
  onChanged?: (instanceId: string) => void
}

export function InstancePermissions({ instance, onChanged }: InstancePermissionsProps) {
  const [rows, setRows] = useState<Array<{ userId: string; userName: string; isAdmin: boolean; allowed: boolean }>>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToastContext()

  useEffect(() => {
    load()
  }, [instance.id])

  const load = async () => {
    const { data, error } = await getAllUsersWithInstancePermissions(instance.id)
    if (error) {
      setError('Erro ao carregar permissões')
      setRows([])
      return
    }
    setError(null)
    setRows(data)
  }

  const handleToggle = (userId: string) => {
    setRows(prev => prev.map(r => r.userId === userId ? { ...r, allowed: !r.allowed } : r))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const allowedUserIds = rows.filter(r => r.allowed && !r.isAdmin).map(r => r.userId)
      if (import.meta.env.MODE === 'development') {
        console.log('[InstancePermissions] Saving permissions', {
          instanceId: instance.id,
          allowedUserIds
        })
      }
      const result = await setAllowedUserIdsForInstance(instance.id, allowedUserIds)
      if (import.meta.env.MODE === 'development') {
        console.log('[InstancePermissions] Save result', result)
      }
      if (!result.success) {
        setError(result.error || 'Erro ao salvar permissões')
        toast.showError('Erro', result.error || 'Erro ao salvar permissões')
      } else {
        toast.showSuccess('Permissões salvas', 'As permissões desta instância foram atualizadas.')
        await load()
        try {
          onChanged?.(instance.id)
        } catch {}
      }
    } catch (e) {
      setError('Erro ao salvar permissões')
      toast.showError('Erro', 'Erro ao salvar permissões')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {!isInstancePermissionsDbEnabled() && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-md text-sm">
          As permissões estão salvas apenas neste navegador (DB desativado). Ative VITE_ENABLE_INSTANCE_PERMISSIONS_DB.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">{error}</div>
      )}
      <div className="border rounded-md divide-y">
        {rows.map(r => (
          <label key={r.userId} className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={r.allowed}
                disabled={r.isAdmin}
                onChange={() => handleToggle(r.userId)}
              />
              <span className="text-sm text-gray-800">{r.userName}{r.isAdmin ? ' (Admin)' : ''}</span>
            </div>
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-md disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar permissões'}
        </button>
      </div>
    </div>
  )
}


