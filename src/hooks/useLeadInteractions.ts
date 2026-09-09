import { useState, useEffect, useCallback } from 'react'
import { useToastContext } from '../contexts/ToastContext'
import { useDeleteConfirmation } from './useDeleteConfirmation'
import {
  getInteractionsByLead,
  createLeadInteraction,
  updateLeadInteraction,
  deleteLeadInteraction,
} from '../services/leadInteractionService'
import type { LeadInteraction } from '../types'

interface UseLeadInteractionsArgs {
  leadId?: string
  // Chamado após cada mutação para que a timeline do histórico reflita a
  // entrada espelhada pelo trigger no banco.
  onChanged?: () => void | Promise<void>
}

/**
 * Estado e operações das interações de um lead.
 * Carrega os próprios dados, então serve as duas superfícies (modal e página)
 * sem precisar de fetch nos hooks de dados delas.
 */
export function useLeadInteractions({ leadId, onChanged }: UseLeadInteractionsArgs) {
  const { showError, showSuccess } = useToastContext()
  const { executeDelete } = useDeleteConfirmation({
    defaultConfirmMessage: 'Tem certeza que deseja excluir esta interação?',
    defaultErrorContext: 'ao excluir interação',
  })

  const [interactions, setInteractions] = useState<LeadInteraction[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!leadId) {
      setInteractions([])
      return
    }

    setLoading(true)
    try {
      const data = await getInteractionsByLead(leadId)
      setInteractions(data)
    } catch (err) {
      console.error('Erro ao carregar interações do lead:', err)
      setInteractions([])
      showError('Erro ao carregar interações do lead')
    } finally {
      setLoading(false)
    }
  }, [leadId, showError])

  useEffect(() => {
    load()
  }, [load])

  const create = useCallback(async (description: string) => {
    if (!leadId) return false

    setSaving(true)
    try {
      const created = await createLeadInteraction(leadId, description)
      // O banco carimba created_at, então a nova interação é sempre a mais recente
      setInteractions(prev => [created, ...prev])
      await onChanged?.()
      showSuccess('Interação registrada')
      return true
    } catch (err) {
      console.error('Erro ao registrar interação:', err)
      showError('Erro ao registrar interação', toErrorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }, [leadId, onChanged, showError, showSuccess])

  const update = useCallback(async (interactionId: string, description: string) => {
    setSaving(true)
    try {
      const updated = await updateLeadInteraction(interactionId, description)
      setInteractions(prev => prev.map(i => (i.id === interactionId ? updated : i)))
      await onChanged?.()
      showSuccess('Interação atualizada')
      return true
    } catch (err) {
      console.error('Erro ao atualizar interação:', err)
      showError('Erro ao atualizar interação', toErrorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }, [onChanged, showError, showSuccess])

  const remove = useCallback(async (interaction: LeadInteraction) => {
    const confirmed = await executeDelete(
      () => deleteLeadInteraction(interaction.id),
      'Tem certeza que deseja excluir esta interação? Ela também sairá do histórico do lead.',
      'ao excluir interação',
    )
    if (!confirmed) return false

    setInteractions(prev => prev.filter(i => i.id !== interaction.id))
    await onChanged?.()
    showSuccess('Interação excluída')
    return true
  }, [executeDelete, onChanged, showSuccess])

  return { interactions, loading, saving, reload: load, create, update, remove }
}

function toErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined
}
