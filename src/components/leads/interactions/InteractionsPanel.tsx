import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useAuthContext } from '../../../contexts/AuthContext'
import { useLeadInteractions } from '../../../hooks/useLeadInteractions'
import { InteractionForm } from './InteractionForm'
import { InteractionList } from './InteractionList'
import type { LeadInteraction } from '../../../types'

interface InteractionsPanelProps {
  leadId?: string
  // Recarrega a timeline do histórico, que recebe a entrada espelhada pelo trigger
  onChanged?: () => void | Promise<void>
  readOnly?: boolean
}

/**
 * Miolo da área de interações: formulário, lista e a alternância entre registrar
 * e editar. Fica separado do "chrome" de cada superfície (SectionCard no modal,
 * card branco na página do lead) para não duplicar a lógica entre as duas.
 */
export function InteractionsPanel({
  leadId,
  onChanged,
  readOnly = false,
}: InteractionsPanelProps) {
  const { isAdmin } = useAuthContext()
  const { interactions, loading, saving, create, update, remove } = useLeadInteractions({
    leadId,
    onChanged,
  })

  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState<LeadInteraction | null>(null)

  const closeForm = () => {
    setIsCreating(false)
    setEditing(null)
  }

  const handleCreate = async (description: string) => {
    const ok = await create(description)
    if (ok) setIsCreating(false)
    return ok
  }

  const handleUpdate = async (description: string) => {
    if (!editing) return false
    const ok = await update(editing.id, description)
    if (ok) setEditing(null)
    return ok
  }

  const handleEdit = (interaction: LeadInteraction) => {
    setIsCreating(false)
    setEditing(interaction)
  }

  const isFormOpen = isCreating || !!editing

  return (
    <div className="space-y-3">
      {!readOnly && !isFormOpen && (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full px-3 py-2 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Registrar interação</span>
        </button>
      )}

      {isFormOpen && (
        <InteractionForm
          // Remonta o formulário ao alternar entre criar e editar
          key={editing?.id || 'new'}
          initialDescription={editing?.description}
          saving={saving}
          submitLabel={editing ? 'Salvar alterações' : 'Registrar'}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={closeForm}
        />
      )}

      <InteractionList
        interactions={interactions}
        loading={loading}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onDelete={remove}
      />
    </div>
  )
}
