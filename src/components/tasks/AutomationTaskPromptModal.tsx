import { useEffect, useState } from 'react'
import { ds } from '../../utils/designSystem'
import { useAuthContext } from '../../contexts/AuthContext'

interface AutomationTaskPromptModalProps {
  isOpen: boolean
  onClose: () => void
  defaultAssignedTo?: string
  defaultDueDate?: string
  defaultDueTime?: string
  onConfirm: (values: { due_date?: string; due_time?: string }) => void
}

export function AutomationTaskPromptModal({
  isOpen,
  onClose: _onClose,
  defaultAssignedTo,
  defaultDueDate,
  defaultDueTime,
  onConfirm
}: AutomationTaskPromptModalProps) {
  const { profile } = useAuthContext()
  const [assignedToName, setAssignedToName] = useState<string | undefined>(undefined)
  const [assignedToEmail, setAssignedToEmail] = useState<string | undefined>(undefined)
  const [dueDate, setDueDate] = useState<string | undefined>(defaultDueDate)
  const [dueTime, setDueTime] = useState<string | undefined>(defaultDueTime)
  const [loading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDueDate(defaultDueDate)
      setDueTime(defaultDueTime)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    async function loadName() {
      if (!isOpen) return
      if (!defaultAssignedTo) {
        setAssignedToName(profile?.full_name || undefined)
        setAssignedToEmail(profile?.email || undefined)
        return
      }
      try {
        const { getAllProfiles } = await import('../../services/profileService')
        const { data } = await getAllProfiles()
        const u = (data || []).find(p => p.uuid === defaultAssignedTo)
        setAssignedToName(u?.full_name || undefined)
        setAssignedToEmail(u?.email || undefined)
      } catch {
        setAssignedToName(undefined)
        setAssignedToEmail(undefined)
      }
    }
    loadName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultAssignedTo])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Nova tarefa - Definir prazo</h3>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela tarefa</label>
            <div className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2">
              {(assignedToName || assignedToEmail) ? (assignedToName || assignedToEmail) : (profile?.full_name || profile?.email || 'Você')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de vencimento</label>
              <input
                type="date"
                className={ds.input()}
                value={dueDate || ''}
                onChange={(e) => setDueDate(e.target.value || undefined)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input
                type="time"
                className={ds.input()}
                value={dueTime || ''}
                onChange={(e) => setDueTime(e.target.value || undefined)}
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button
            className={ds.button('primary')}
            disabled={!dueDate || !dueTime || loading}
            onClick={() => {
              onConfirm({ due_date: dueDate, due_time: dueTime })
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}


