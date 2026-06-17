import { useState, useMemo, useCallback } from 'react'
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline'
import type { BulkProgress } from '../../hooks/useBulkTaskActions'
import type { TaskStatus } from '../../types'
import { ds } from '../../utils/designSystem'

type BulkActionType = '' | 'status' | 'assignee' | 'delete'

interface BulkUser {
  uuid: string
  full_name: string
}

interface TasksBulkActionsBarProps {
  selectedCount: number
  isProcessing: boolean
  progress: BulkProgress | null
  isSelectAllFiltered: boolean
  allFilteredCount: number | null
  totalFiltered: number
  users?: BulkUser[]
  isAdmin?: boolean
  canDelete?: boolean
  onUpdateStatus: (status: TaskStatus) => Promise<void>
  onUpdateAssignee?: (assignedTo: string | null) => Promise<void>
  onDelete?: () => Promise<void>
  onClearSelection: () => void
  onSelectAllFiltered: (filteredIds: string[]) => void
  filteredTaskIds: string[]
}

const UNASSIGN_VALUE = '__unassign__'
const BULK_CONFIRM_THRESHOLD = 50

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]

function ConfirmInline({
  message,
  onConfirm,
  onCancel
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0" />
      <span className="text-sm text-yellow-800 flex-1">{message}</span>
      <button
        onClick={onConfirm}
        className="px-3 py-1 text-xs font-medium text-white bg-orange-500 rounded hover:bg-orange-600"
      >
        Confirmar
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        Cancelar
      </button>
    </div>
  )
}

export function TasksBulkActionsBar({
  selectedCount,
  isProcessing,
  progress,
  isSelectAllFiltered,
  allFilteredCount,
  totalFiltered,
  users = [],
  isAdmin,
  canDelete,
  onUpdateStatus,
  onUpdateAssignee,
  onDelete,
  onClearSelection,
  onSelectAllFiltered,
  filteredTaskIds
}: TasksBulkActionsBarProps) {
  const [selectedAction, setSelectedAction] = useState<BulkActionType>('')
  const [processingLabel, setProcessingLabel] = useState('Processando...')

  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | ''>('')
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)

  const [selectedResponsibleUuid, setSelectedResponsibleUuid] = useState('')
  const [showAssigneeConfirm, setShowAssigneeConfirm] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const resetActionStates = useCallback(() => {
    setSelectedStatus('')
    setShowStatusConfirm(false)
    setSelectedResponsibleUuid('')
    setShowAssigneeConfirm(false)
    setShowDeleteConfirm(false)
  }, [])

  const handleActionChange = (action: BulkActionType) => {
    resetActionStates()
    setSelectedAction(action)
  }

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')),
    [users]
  )

  const resolvedResponsibleUuid: string | null | undefined =
    selectedResponsibleUuid === ''
      ? undefined
      : selectedResponsibleUuid === UNASSIGN_VALUE
        ? null
        : selectedResponsibleUuid

  const assigneeLabel = useMemo(() => {
    if (resolvedResponsibleUuid === null) return 'Sem responsável'
    if (!resolvedResponsibleUuid) return ''
    return sortedUsers.find(u => u.uuid === resolvedResponsibleUuid)?.full_name || 'Usuário'
  }, [resolvedResponsibleUuid, sortedUsers])

  const canApplyStatus = !!selectedStatus && !isProcessing
  const canApplyAssignee = resolvedResponsibleUuid !== undefined && !isProcessing

  const handleApplyStatusClick = () => {
    if (selectedCount >= BULK_CONFIRM_THRESHOLD) {
      setShowStatusConfirm(true)
    } else {
      handleConfirmStatus()
    }
  }

  const handleConfirmStatus = async () => {
    setShowStatusConfirm(false)
    if (!selectedStatus) return
    setProcessingLabel('Alterando status...')
    await onUpdateStatus(selectedStatus)
    setSelectedStatus('')
  }

  const handleApplyAssigneeClick = () => {
    if (selectedCount >= BULK_CONFIRM_THRESHOLD) {
      setShowAssigneeConfirm(true)
    } else {
      handleConfirmAssignee()
    }
  }

  const handleConfirmAssignee = async () => {
    setShowAssigneeConfirm(false)
    setProcessingLabel('Atualizando responsável...')
    if (!onUpdateAssignee) return
    await onUpdateAssignee(resolvedResponsibleUuid === undefined ? null : resolvedResponsibleUuid)
    setSelectedResponsibleUuid('')
  }

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false)
    setProcessingLabel('Deletando tarefas...')
    await onDelete?.()
  }

  if (selectedCount === 0) return null

  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-3">
      {isProcessing && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-700 font-medium">
              {processingLabel} {progress.current}/{progress.total}
            </span>
            <span className="text-orange-600 text-xs">{progressPercent}%</span>
          </div>
          <div className="w-full bg-orange-100 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {!isProcessing && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-orange-800">
                {selectedCount} tarefa{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
              </span>

              {!isSelectAllFiltered && totalFiltered > selectedCount && (
                <button
                  onClick={() => onSelectAllFiltered(filteredTaskIds)}
                  className="text-xs text-orange-600 hover:text-orange-800 underline transition-colors"
                >
                  Selecionar todas as {totalFiltered} do filtro
                </button>
              )}

              {isSelectAllFiltered && allFilteredCount !== null && (
                <span className="text-xs text-orange-600">
                  (todas as {allFilteredCount} do filtro)
                </span>
              )}
            </div>

            <button
              onClick={onClearSelection}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              Limpar
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Ação
            </label>
            <select
              value={selectedAction}
              onChange={e => handleActionChange(e.target.value as BulkActionType)}
              className={`${ds.input()} text-sm py-1.5 h-9 w-auto`}
            >
              <option value="">Selecione uma ação...</option>
              <option value="status">Alterar status</option>
              {isAdmin && onUpdateAssignee && (
                <option value="assignee">Atribuir/Alterar responsável</option>
              )}
              {canDelete && onDelete && (
                <option value="delete">Deletar tarefas</option>
              )}
            </select>
          </div>

          {selectedAction === 'status' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as TaskStatus)}
                  className={`${ds.input()} w-auto`}
                >
                  <option value="">Status...</option>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <button
                  onClick={handleApplyStatusClick}
                  disabled={!canApplyStatus}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
              </div>

              {showStatusConfirm && (
                <ConfirmInline
                  message={`Alterar status de ${selectedCount} tarefa(s) para "${STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}"?`}
                  onConfirm={handleConfirmStatus}
                  onCancel={() => setShowStatusConfirm(false)}
                />
              )}
            </>
          )}

          {selectedAction === 'assignee' && isAdmin && onUpdateAssignee && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedResponsibleUuid}
                  onChange={e => setSelectedResponsibleUuid(e.target.value)}
                  className={`${ds.input()} w-auto`}
                >
                  <option value="">Responsável...</option>
                  <option value={UNASSIGN_VALUE}>Sem responsável</option>
                  {sortedUsers.map(u => (
                    <option key={u.uuid} value={u.uuid}>{u.full_name}</option>
                  ))}
                </select>

                <button
                  onClick={handleApplyAssigneeClick}
                  disabled={!canApplyAssignee}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserIcon className="w-4 h-4" />
                  Aplicar
                </button>
              </div>

              {showAssigneeConfirm && (
                <ConfirmInline
                  message={`Atribuir ${selectedCount} tarefa(s) para "${assigneeLabel}"?`}
                  onConfirm={handleConfirmAssignee}
                  onCancel={() => setShowAssigneeConfirm(false)}
                />
              )}
            </>
          )}

          {selectedAction === 'delete' && canDelete && onDelete && (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  Excluir {selectedCount} tarefa{selectedCount !== 1 ? 's' : ''}
                </button>
              </div>

              {showDeleteConfirm && (
                <ConfirmInline
                  message={`Tem certeza que deseja excluir ${selectedCount} tarefa(s)? Esta ação não pode ser desfeita.`}
                  onConfirm={handleConfirmDelete}
                  onCancel={() => setShowDeleteConfirm(false)}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
