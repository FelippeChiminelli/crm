import { useEffect, useState } from 'react'
import { ds } from '../../utils/designSystem'
import { useAuthContext } from '../../contexts/AuthContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import type { TaskIntervalUnit } from '../../utils/automationUiBridge'

interface ProfileOption {
  uuid: string
  full_name?: string
  email?: string
}

interface AutomationTaskPromptModalProps {
  isOpen: boolean
  onClose: () => void
  defaultAssignedTo?: string
  defaultDueDate?: string
  defaultDueTime?: string
  manualAssignee?: boolean
  defaultTaskCount?: number
  defaultTaskIntervalDays?: number
  defaultTaskIntervalUnit?: TaskIntervalUnit
  onConfirm: (values: {
    due_date?: string
    due_time?: string
    assigned_to?: string
    task_count?: number
    task_interval_days?: number
    task_interval_unit?: TaskIntervalUnit
  }) => void
}

export function AutomationTaskPromptModal({
  isOpen,
  onClose: _onClose,
  defaultAssignedTo,
  defaultDueDate,
  defaultDueTime,
  manualAssignee,
  defaultTaskCount,
  defaultTaskIntervalDays,
  defaultTaskIntervalUnit,
  onConfirm
}: AutomationTaskPromptModalProps) {
  const { profile } = useAuthContext()
  const [assignedToName, setAssignedToName] = useState<string | undefined>(undefined)
  const [assignedToEmail, setAssignedToEmail] = useState<string | undefined>(undefined)
  const [dueDate, setDueDate] = useState<string | undefined>(defaultDueDate)
  const [dueTime, setDueTime] = useState<string | undefined>(defaultDueTime)
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(defaultAssignedTo || '')
  const [taskCount, setTaskCount] = useState<number>(defaultTaskCount && defaultTaskCount > 0 ? defaultTaskCount : 1)
  const [taskIntervalDays, setTaskIntervalDays] = useState<number>(
    typeof defaultTaskIntervalDays === 'number' && defaultTaskIntervalDays >= 0 ? defaultTaskIntervalDays : 0
  )
  const [taskIntervalUnit, setTaskIntervalUnit] = useState<TaskIntervalUnit>(
    defaultTaskIntervalUnit === 'months' ? 'months' : 'days'
  )
  const [loading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDueDate(defaultDueDate)
      setDueTime(defaultDueTime)
      setSelectedAssigneeId(defaultAssignedTo || profile?.uuid || '')
      setTaskCount(defaultTaskCount && defaultTaskCount > 0 ? defaultTaskCount : 1)
      setTaskIntervalDays(
        typeof defaultTaskIntervalDays === 'number' && defaultTaskIntervalDays >= 0 ? defaultTaskIntervalDays : 0
      )
      setTaskIntervalUnit(defaultTaskIntervalUnit === 'months' ? 'months' : 'days')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    async function loadProfilesAndName() {
      if (!isOpen) return

      if (manualAssignee) {
        try {
          const { getAllProfiles } = await import('../../services/profileService')
          const { data } = await getAllProfiles()
          setProfiles((data || []) as ProfileOption[])
        } catch {
          setProfiles([])
        }
        return
      }

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
    loadProfilesAndName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultAssignedTo, manualAssignee])
  
  useEscapeKey(isOpen, _onClose)

  if (!isOpen) return null

  const canConfirm =
    !!dueDate &&
    !!dueTime &&
    !loading &&
    (!manualAssignee || !!selectedAssigneeId) &&
    taskCount >= 1 &&
    taskIntervalDays >= 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Nova tarefa - Definir prazo</h3>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela tarefa</label>
            {manualAssignee ? (
              <select
                className={ds.input()}
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
              >
                <option value="">Selecione um responsável</option>
                {profiles.map(p => (
                  <option key={p.uuid} value={p.uuid}>{p.full_name || p.email}</option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                {(assignedToName || assignedToEmail) ? (assignedToName || assignedToEmail) : (profile?.full_name || profile?.email || 'Você')}
              </div>
            )}
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

          <div className={`grid grid-cols-1 ${taskCount > 1 ? 'sm:grid-cols-2' : ''} gap-4`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de tarefas</label>
              <input
                type="number"
                min={1}
                step={1}
                className={ds.input()}
                value={taskCount}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    setTaskCount(defaultTaskCount && defaultTaskCount > 0 ? defaultTaskCount : 1)
                    return
                  }
                  const parsed = parseInt(raw, 10)
                  setTaskCount(Number.isFinite(parsed) && parsed >= 1 ? parsed : 1)
                }}
              />
            </div>
            {taskCount > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intervalo entre tarefas ({taskIntervalUnit === 'months' ? 'meses' : 'dias'})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step={taskIntervalUnit === 'months' ? 1 : 0.1}
                    className={`${ds.input()} flex-1`}
                    value={taskIntervalDays}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        setTaskIntervalDays(
                          typeof defaultTaskIntervalDays === 'number' && defaultTaskIntervalDays >= 0
                            ? defaultTaskIntervalDays
                            : 0
                        )
                        return
                      }
                      const parsed = taskIntervalUnit === 'months' ? parseInt(raw, 10) : parseFloat(raw)
                      setTaskIntervalDays(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0)
                    }}
                  />
                  <select
                    className={ds.input()}
                    style={{ width: 'auto' }}
                    value={taskIntervalUnit}
                    onChange={(e) => {
                      const next = e.target.value as TaskIntervalUnit
                      setTaskIntervalUnit(next)
                      if (next === 'months') {
                        setTaskIntervalDays(prev => {
                          const rounded = Math.max(1, Math.round(prev || 1))
                          return rounded
                        })
                      }
                    }}
                  >
                    <option value="days">Dias</option>
                    <option value="months">Meses (mesmo dia)</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {taskIntervalUnit === 'months'
                    ? 'As tarefas serão criadas no mesmo dia dos meses seguintes (ex.: 10/06, 10/07, 10/08).'
                    : 'Use decimais para horas (ex.: 0.5 = 12h).'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button
            className={ds.button('primary')}
            disabled={!canConfirm}
            onClick={() => {
              onConfirm({
                due_date: dueDate,
                due_time: dueTime,
                assigned_to: manualAssignee ? selectedAssigneeId : undefined,
                task_count: taskCount,
                task_interval_days: taskIntervalDays,
                task_interval_unit: taskIntervalUnit,
              })
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
