import { useState } from 'react'
import { FiX, FiPlus, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi'
import type { ProductCategory } from '../../types'
import * as categoryService from '../../services/productCategoryService'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../contexts/ToastContext'

interface CategoryManagerProps {
  categories: ProductCategory[]
  isOpen: boolean
  onClose: () => void
  onCategoriesChange: () => void
}

export function CategoryManager({ categories, isOpen, onClose, onCategoriesChange }: CategoryManagerProps) {
  const { profile } = useAuth()
  const { showToast } = useToast()

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!profile?.empresa_id || !newName.trim()) return
    setLoading(true)
    try {
      await categoryService.createCategory(profile.empresa_id, newName.trim(), newDesc.trim() || undefined)
      showToast('Categoria criada com sucesso!', 'success')
      setNewName('')
      setNewDesc('')
      onCategoriesChange()
    } catch {
      showToast('Erro ao criar categoria', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (categoryId: string) => {
    if (!profile?.empresa_id || !editName.trim()) return
    setLoading(true)
    try {
      await categoryService.updateCategory(categoryId, profile.empresa_id, editName.trim(), editDesc.trim() || undefined)
      showToast('Categoria atualizada!', 'success')
      setEditingId(null)
      onCategoriesChange()
    } catch {
      showToast('Erro ao atualizar categoria', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!profile?.empresa_id) return
    if (!window.confirm('Excluir esta categoria? Os produtos vinculados ficarão sem categoria.')) return
    setLoading(true)
    try {
      await categoryService.deleteCategory(categoryId, profile.empresa_id)
      showToast('Categoria excluída!', 'success')
      onCategoriesChange()
    } catch {
      showToast('Erro ao excluir categoria', 'error')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (cat: ProductCategory) => {
    setEditingId(cat.id)
    setEditName(cat.nome)
    setEditDesc(cat.descricao || '')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 lg:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-lg my-2 lg:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl lg:rounded-2xl">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">Gerenciar Categorias</h2>
            <button onClick={onClose} className="p-1.5 lg:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <FiX size={20} className="lg:hidden" />
              <FiX size={24} className="hidden lg:block" />
            </button>
          </div>

          <div className="px-4 lg:px-6 py-4 lg:py-6 space-y-4">
            {/* Formulário de criação */}
            <div className="bg-gray-50 rounded-lg p-3 lg:p-4 space-y-2">
              <input
                type="text"
                placeholder="Nome da categoria"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm"
              >
                <FiPlus size={16} />
                Adicionar Categoria
              </button>
            </div>

            {/* Lista de categorias */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">Nenhuma categoria cadastrada</p>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3">
                    {editingId === cat.id ? (
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Descrição"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleUpdate(cat.id)}
                            disabled={!editName.trim() || loading}
                            className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                          >
                            <FiCheck size={12} /> Salvar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{cat.nome}</p>
                          {cat.descricao && <p className="text-xs text-gray-500 truncate">{cat.descricao}</p>}
                        </div>
                        <button
                          onClick={() => startEdit(cat)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          disabled={loading}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-end px-4 lg:px-6 py-3 lg:py-4 bg-gray-50 border-t border-gray-200">
            <button onClick={onClose} className="px-4 lg:px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
