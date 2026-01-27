import { useState, useEffect } from 'react'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useToastContext } from '../../contexts/ToastContext'
import { useConfirm } from '../../hooks/useConfirm'
import { getCustomFieldsByPipeline, createCustomField, updateCustomField, deleteCustomField } from '../../services/leadCustomFieldService'
import { ds } from '../../utils/designSystem'
import type { LeadCustomField } from '../../types'
import { useEscapeKey } from '../../hooks/useEscapeKey'

type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'link' | 'vehicle'

interface ManageCustomFieldsListProps {
  isOpen?: boolean
}

// Função para traduzir tipos de campos
const translateFieldType = (type: string): string => {
  const translations: Record<string, string> = {
    'text': 'Texto',
    'number': 'Número',
    'date': 'Data',
    'select': 'Lista (opção única)',
    'multiselect': 'Lista (múltiplas opções)',
    'link': 'Link (URL clicável)',
    'vehicle': 'Veículo (Estoque)'
  }
  return translations[type] || type
}

export function ManageCustomFieldsList({ isOpen = true }: ManageCustomFieldsListProps) {
  const [fields, setFields] = useState<LeadCustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false)
  const [editingField, setEditingField] = useState<LeadCustomField | null>(null)
  const [newField, setNewField] = useState<{ name: string; type: CustomFieldType; required: boolean; options: string }>({
    name: '',
    type: 'text',
    required: false,
    options: ''
  })
  const [creatingField, setCreatingField] = useState(false)
  const [updatingField, setUpdatingField] = useState(false)
  const { showSuccess } = useToastContext()
  const { confirm } = useConfirm()

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      getCustomFieldsByPipeline('null').then(({ data, error }) => {
        if (error) setError(error.message)
        setFields(data || [])
        setLoading(false)
      })
    }
  }, [isOpen])

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir Campo Personalizado',
      message: 'Tem certeza que deseja excluir este campo? Esta ação é irreversível.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    })
    
    if (!confirmed) return
    
    setDeletingId(id)
    setError(null)
    const { error, data } = await deleteCustomField(id)
    if (error) {
      setError(error.message)
    } else if (!data) {
      setError('Não foi possível excluir: registro não encontrado ou sem permissão')
    } else {
      setFields(prev => prev.filter(f => f.id !== id))
    }
    setDeletingId(null)
  }

  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingField(true)
    try {
      const fieldData = {
        name: newField.name,
        type: newField.type,
        required: newField.required,
        options: (newField.type === 'select' || newField.type === 'multiselect') ? newField.options.split(',').map(o => o.trim()).filter(Boolean) : undefined,
        position: fields.length + 1,
        pipeline_id: null as any
      }
      const result = await createCustomField(fieldData)
      if (!result || result.error || !result.data) {
        setError('Erro ao criar campo: ' + (result?.error?.message || 'Sem retorno do Supabase'))
        return
      }
      
      showSuccess('Campo personalizado criado com sucesso!')
      
      setShowCustomFieldModal(false)
      setNewField({ name: '', type: 'text', required: false, options: '' })
      // Recarregar campos personalizados
      const { data: updatedFields } = await getCustomFieldsByPipeline('null')
      setFields(updatedFields || [])
    } catch (err: any) {
      setError('Erro ao criar campo: ' + (err?.message || JSON.stringify(err)))
    } finally {
      setCreatingField(false)
    }
  }

  const handleEditClick = (field: LeadCustomField) => {
    setEditingField(field)
    setNewField({
      name: field.name,
      type: field.type,
      required: field.required || false,
      options: field.options ? field.options.join(', ') : ''
    })
  }

  const handleUpdateCustomField = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingField) return
    
    setUpdatingField(true)
    setError(null)
    try {
      // Montar dados do campo - incluir apenas campos que devem ser atualizados
      const fieldData: any = {
        name: newField.name.trim(),
        type: newField.type,
        required: newField.required
      }
      
      // Adicionar options SOMENTE se for select/multiselect
      if (newField.type === 'select' || newField.type === 'multiselect') {
        const optionsArray = newField.options.split(',').map(o => o.trim()).filter(Boolean)
        if (optionsArray.length > 0) {
          fieldData.options = optionsArray
        }
      }
      
      const result = await updateCustomField(editingField.id, fieldData)
      
      if (result.error) {
        setError('Erro ao atualizar campo: ' + result.error.message)
        return
      }
      
      if (!result.data) {
        setError('Erro ao atualizar: nenhum dado retornado')
        return
      }
      
      showSuccess('Campo personalizado atualizado com sucesso!')
      
      setEditingField(null)
      setNewField({ name: '', type: 'text', required: false, options: '' })
      
      const { data: updatedFields } = await getCustomFieldsByPipeline('null')
      setFields(updatedFields || [])
    } catch (err: any) {
      setError('Erro ao atualizar campo: ' + (err?.message || JSON.stringify(err)))
    } finally {
      setUpdatingField(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    setNewField({ name: '', type: 'text', required: false, options: '' })
  }
  
  const handleCloseModal = () => {
    if (editingField) {
      handleCancelEdit()
    } else {
      setShowCustomFieldModal(false)
    }
  }
  
  // Hook para fechar modal interno com ESC
  useEscapeKey(showCustomFieldModal || !!editingField, handleCloseModal)

  if (!isOpen) return null
  return (
    <div className="">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          className="px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600"
          onClick={() => setShowCustomFieldModal(true)}
        >
          + Novo Campo
        </button>
      </div>
      {(showCustomFieldModal || editingField) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4">
              {editingField ? 'Editar Campo Personalizado' : 'Novo Campo Personalizado'}
            </h4>
            <form onSubmit={editingField ? handleUpdateCustomField : handleCreateCustomField} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input
                  type="text"
                  value={newField.name}
                  onChange={e => setNewField(f => ({ ...f, name: e.target.value }))}
                  className={ds.input()}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <select
                  value={newField.type}
                  onChange={e => setNewField(f => ({ ...f, type: e.target.value as CustomFieldType }))}
                  className={ds.input()}
                  required
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="date">Data</option>
                  <option value="link">Link (URL clicável)</option>
                  <option value="select">Lista (opção única)</option>
                  <option value="multiselect">Lista (múltiplas opções)</option>
                  <option value="vehicle">Veículo (Estoque)</option>
                </select>
              </div>
              {(newField.type === 'select' || newField.type === 'multiselect') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Opções (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={newField.options}
                    onChange={e => setNewField(f => ({ ...f, options: e.target.value }))}
                    className={ds.input()}
                    placeholder="Ex: Opção 1, Opção 2, Opção 3"
                    required={newField.type === 'select' || newField.type === 'multiselect'}
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newField.required}
                  onChange={e => setNewField(f => ({ ...f, required: e.target.checked }))}
                  id="required"
                />
                <label htmlFor="required" className="text-sm">Obrigatório</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editingField) {
                      handleCancelEdit()
                    } else {
                      setShowCustomFieldModal(false)
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                  disabled={creatingField || updatingField}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                  disabled={creatingField || updatingField || !newField.name}
                >
                  {(creatingField || updatingField) ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? <p>Carregando...</p> : (
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-2 text-left">Nome</th>
              <th className="py-2 px-2 text-left w-56 min-w-[14rem] max-w-[16rem]">ID</th>
              <th className="py-2 px-2 text-left">Tipo</th>
              <th className="py-2 px-2 text-left">Obrigatório</th>
              <th className="py-2 px-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(field => (
              <tr key={field.id} className="border-t">
                <td className="py-2 px-2">{field.name}</td>
                <td className="py-2 px-2 font-mono text-xs text-gray-500 w-56 min-w-[14rem] max-w-[16rem]">{field.id}</td>
                <td className="py-2 px-2">{translateFieldType(field.type)}</td>
                <td className="py-2 px-2">{field.required ? 'Sim' : 'Não'}</td>
                <td className="py-2 px-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(field)}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      disabled={deletingId === field.id}
                      title="Editar campo"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(field.id)}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      disabled={deletingId === field.id}
                      title={deletingId === field.id ? 'Excluindo...' : 'Excluir campo'}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500">Nenhum campo personalizado encontrado.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
} 