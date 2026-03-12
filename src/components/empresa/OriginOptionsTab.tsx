import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, Bars3Icon, GlobeAltIcon } from '@heroicons/react/24/outline'
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
  getAllOriginOptions,
  createOriginOption,
  updateOriginOption,
  deleteOriginOption,
  reorderOriginOptions,
} from '../../services/originOptionsService'
import { ds } from '../../utils/designSystem'
import type { EmpresaOriginOption } from '../../types'
import { useEscapeKey } from '../../hooks/useEscapeKey'

function SortableItem({
  option,
  onEdit,
  onDelete,
  isDeleting,
}: {
  option: EmpresaOriginOption
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id })

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
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          title="Arrastar para reordenar"
        >
          <Bars3Icon className="w-5 h-5" />
        </button>
        <GlobeAltIcon className="w-5 h-5 text-gray-500" />
        <span className="text-sm font-medium text-gray-900">{option.name}</span>
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
          title="Excluir"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function OriginOptionsTab() {
  const [options, setOptions] = useState<EmpresaOriginOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingOption, setEditingOption] = useState<EmpresaOriginOption | null>(null)
  const [newOption, setNewOption] = useState({ name: '' })
  const [saving, setSaving] = useState(false)
  const { showSuccess, showError } = useToastContext()
  const { confirm } = useConfirm()

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllOriginOptions()
      setOptions(data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar origens')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const opt = options.find((o) => o.id === id)
    const confirmed = await confirm({
      title: 'Excluir Origem',
      message: `Tem certeza que deseja excluir a origem "${opt?.name}"? Ela não aparecerá mais como opção, mas leads existentes não serão afetados.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'warning',
    })

    if (!confirmed) return

    setDeletingId(id)
    setError(null)
    try {
      const { error } = await deleteOriginOption(id)
      if (error) {
        showError('Erro ao excluir origem', typeof error === 'object' && 'message' in error ? String(error.message) : String(error))
      } else {
        showSuccess('Origem excluída com sucesso!')
        await loadOptions()
      }
    } catch (err: unknown) {
      showError('Erro ao excluir origem', err instanceof Error ? err.message : String(err))
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOption.name.trim()) {
      setError('Nome da origem é obrigatório')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { error } = await createOriginOption(newOption.name.trim())
      if (error) throw error
      showSuccess('Origem criada com sucesso!')
      setShowModal(false)
      setNewOption({ name: '' })
      await loadOptions()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar origem')
      showError('Erro ao criar origem', err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOption || !editingOption.name.trim()) {
      setError('Nome da origem é obrigatório')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { error } = await updateOriginOption(editingOption.id, editingOption.name.trim())
      if (error) throw error
      showSuccess('Origem atualizada com sucesso!')
      setShowModal(false)
      setEditingOption(null)
      await loadOptions()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar origem')
      showError('Erro ao atualizar origem', err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sortedOptions = [...options].sort((a, b) => a.position - b.position)
    const oldIndex = sortedOptions.findIndex((o) => o.id === active.id)
    const newIndex = sortedOptions.findIndex((o) => o.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sortedOptions, oldIndex, newIndex)
    const ids = reordered.map((o) => o.id)

    try {
      const { error } = await reorderOriginOptions(ids)
      if (error) throw error
      await loadOptions()
    } catch (err: unknown) {
      showError('Erro ao reordenar', err instanceof Error ? err.message : String(err))
    }
  }

  const openEditModal = (opt: EmpresaOriginOption) => {
    setEditingOption({ ...opt })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingOption(null)
    setNewOption({ name: '' })
    setError(null)
  }

  useEscapeKey(showModal, closeModal)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Carregando origens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Origens Permitidas</h3>
          <p className="text-sm text-gray-600 mt-1">
            Restrinja quais origens os vendedores podem escolher ao criar ou editar leads. Se vazio, o campo continua livre.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className={ds.button('primary')}>
          <PlusIcon className="w-5 h-5" />
          Nova Origem
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {options.length > 0 ? (
        <div className={ds.card()}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {options
                  .sort((a, b) => a.position - b.position)
                  .map((opt) => (
                    <SortableItem
                      key={opt.id}
                      option={opt}
                      onEdit={() => openEditModal(opt)}
                      onDelete={() => handleDelete(opt.id)}
                      isDeleting={deletingId === opt.id}
                    />
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className={ds.card()}>
          <div className="text-center py-12">
            <GlobeAltIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-1">Nenhuma origem configurada.</p>
            <p className="text-sm text-gray-500 mb-4">
              Os vendedores poderão digitar livremente. Adicione origens para restringir as opções.
            </p>
            <button onClick={() => setShowModal(true)} className={ds.button('primary')}>
              <PlusIcon className="w-5 h-5" />
              Adicionar primeira origem
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingOption ? 'Editar Origem' : 'Nova Origem'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={editingOption ? handleUpdate : handleCreate}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da origem <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingOption?.name ?? newOption.name}
                  onChange={(e) => {
                    if (editingOption) {
                      setEditingOption({ ...editingOption, name: e.target.value })
                    } else {
                      setNewOption({ name: e.target.value })
                    }
                    setError(null)
                  }}
                  className={ds.input()}
                  placeholder="Ex: Website, Facebook, Indicação..."
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
                <button type="button" onClick={closeModal} disabled={saving} className={ds.button('secondary')}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className={ds.button('primary')}>
                  {saving ? 'Salvando...' : editingOption ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
