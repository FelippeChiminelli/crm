import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useToastContext } from '../../contexts/ToastContext'
import { useConfirm } from '../../hooks/useConfirm'
import { 
  getAllLossReasons, 
  createLossReason, 
  updateLossReason, 
  deleteLossReason,
  reorderLossReasons,
  migrateDefaultReasons
} from '../../services/lossReasonService'
import { ds } from '../../utils/designSystem'
import type { LossReason } from '../../types'
import { useEscapeKey } from '../../hooks/useEscapeKey'

export function LossReasonsTab() {
  const [reasons, setReasons] = useState<LossReason[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingReason, setEditingReason] = useState<LossReason | null>(null)
  const [newReason, setNewReason] = useState({ name: '' })
  const [saving, setSaving] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const { showSuccess, showError } = useToastContext()
  const { confirm } = useConfirm()

  useEffect(() => {
    loadReasons()
  }, [])

  const loadReasons = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await getAllLossReasons(null)
      if (error) throw error
      setReasons(data || [])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar motivos de perda')
      console.error('Erro ao carregar motivos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const reason = reasons.find(r => r.id === id)
    const confirmed = await confirm({
      title: 'Desativar Motivo de Perda',
      message: `Tem certeza que deseja desativar o motivo "${reason?.name}"? Ele não aparecerá mais nas opções, mas leads existentes não serão afetados.`,
      confirmText: 'Desativar',
      cancelText: 'Cancelar',
      type: 'warning'
    })
    
    if (!confirmed) return
    
    setDeletingId(id)
    setError(null)
    try {
      const { error } = await deleteLossReason(id)
      if (error) {
        showError('Erro ao desativar motivo', error.message)
      } else {
        showSuccess('Motivo desativado com sucesso!')
        await loadReasons()
      }
    } catch (err: any) {
      showError('Erro ao desativar motivo', err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReason.name.trim()) {
      setError('Nome do motivo é obrigatório')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { error } = await createLossReason({
        name: newReason.name.trim(),
        pipeline_id: null,
        position: reasons.filter(r => r.is_active).length
      })
      
      if (error) throw error
      
      showSuccess('Motivo criado com sucesso!')
      setShowModal(false)
      setNewReason({ name: '' })
      await loadReasons()
    } catch (err: any) {
      setError(err.message || 'Erro ao criar motivo')
      showError('Erro ao criar motivo', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReason || !editingReason.name.trim()) {
      setError('Nome do motivo é obrigatório')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { error } = await updateLossReason(editingReason.id, {
        name: editingReason.name.trim()
      })
      
      if (error) throw error
      
      showSuccess('Motivo atualizado com sucesso!')
      setShowModal(false)
      setEditingReason(null)
      await loadReasons()
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar motivo')
      showError('Erro ao atualizar motivo', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const activeReasonsList = reasons.filter(r => r.is_active).sort((a, b) => a.position - b.position)
    const oldIndex = activeReasonsList.findIndex(r => r.id === active.id)
    const newIndex = activeReasonsList.findIndex(r => r.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const reorderedReasons = arrayMove(activeReasonsList, oldIndex, newIndex)
    const ids = reorderedReasons.map(r => r.id)

    try {
      const { error } = await reorderLossReasons(ids)
      if (error) throw error
      await loadReasons()
    } catch (err: any) {
      showError('Erro ao reordenar', err.message)
    }
  }

  const handleToggleActive = async (reason: LossReason) => {
    try {
      const { error } = await updateLossReason(reason.id, {
        is_active: !reason.is_active
      })
      if (error) throw error
      showSuccess(`Motivo ${!reason.is_active ? 'ativado' : 'desativado'} com sucesso!`)
      await loadReasons()
    } catch (err: any) {
      showError('Erro ao alterar status', err.message)
    }
  }

  const handleMigrateDefaults = async () => {
    const confirmed = await confirm({
      title: 'Criar Motivos Padrão',
      message: 'Isso criará os 9 motivos padrão na sua empresa. Se você já tem motivos personalizados, eles serão mantidos. Deseja continuar?',
      confirmText: 'Criar',
      cancelText: 'Cancelar',
      type: 'info'
    })
    
    if (!confirmed) return
    
    setMigrating(true)
    try {
      const { error } = await migrateDefaultReasons()
      if (error) throw error
      showSuccess('Motivos padrão criados com sucesso!')
      await loadReasons()
    } catch (err: any) {
      showError('Erro ao criar motivos padrão', err.message)
    } finally {
      setMigrating(false)
    }
  }

  const openEditModal = (reason: LossReason) => {
    setEditingReason({ ...reason })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingReason(null)
    setNewReason({ name: '' })
    setError(null)
  }

  useEscapeKey(showModal, closeModal)

  const activeReasons = reasons.filter(r => r.is_active).sort((a, b) => a.position - b.position)
  const inactiveReasons = reasons.filter(r => !r.is_active).sort((a, b) => a.position - b.position)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Componente SortableItem para motivos ativos
  interface SortableItemProps {
    reason: LossReason
    onEdit: () => void
    onDelete: () => void
    isDeleting: boolean
  }

  function SortableItem({ reason, onEdit, onDelete, isDeleting }: SortableItemProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: reason.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            title="Arrastar para reordenar"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-gray-900">{reason.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Editar"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
            title="Desativar"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando motivos de perda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Motivos de Perda</h3>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie os motivos de perda que aparecem ao marcar um lead como perdido
          </p>
        </div>
        <div className="flex gap-2">
          {reasons.length === 0 && (
            <button
              onClick={handleMigrateDefaults}
              disabled={migrating}
              className={ds.button('secondary')}
            >
              {migrating ? 'Criando...' : 'Criar Motivos Padrão'}
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className={ds.button('primary')}
          >
            <PlusIcon className="w-5 h-5" />
            Novo Motivo
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Active Reasons */}
      {activeReasons.length > 0 && (
        <div className={ds.card()}>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Motivos Ativos</h4>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeReasons.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {activeReasons.map((reason) => (
                  <SortableItem
                    key={reason.id}
                    reason={reason}
                    onEdit={() => openEditModal(reason)}
                    onDelete={() => handleDelete(reason.id)}
                    isDeleting={deletingId === reason.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Inactive Reasons */}
      {inactiveReasons.length > 0 && (
        <div className={ds.card()}>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Motivos Inativos</h4>
          <div className="space-y-2">
            {inactiveReasons.map((reason) => (
              <div
                key={reason.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60"
              >
                <span className="text-sm text-gray-600">{reason.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(reason)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Reativar"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(reason)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {reasons.length === 0 && (
        <div className={ds.card()}>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Nenhum motivo de perda configurado</p>
            <button
              onClick={handleMigrateDefaults}
              disabled={migrating}
              className={ds.button('secondary')}
            >
              {migrating ? 'Criando...' : 'Criar Motivos Padrão'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de criação/edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingReason ? 'Editar Motivo' : 'Novo Motivo'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={editingReason ? handleUpdate : handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Motivo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingReason?.name || newReason.name}
                  onChange={(e) => {
                    if (editingReason) {
                      setEditingReason({ ...editingReason, name: e.target.value })
                    } else {
                      setNewReason({ name: e.target.value })
                    }
                    setError(null)
                  }}
                  className={ds.input()}
                  placeholder="Ex: Cliente sem orçamento"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className={ds.button('secondary')}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={ds.button('primary')}
                >
                  {saving ? 'Salvando...' : editingReason ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

