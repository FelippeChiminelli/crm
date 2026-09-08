import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ConversationViewModal } from '../../../chat/ConversationViewModal'
import { LeadDetailModal } from '../../../leads/LeadDetailModal'
import { EngagementConversationList } from './EngagementConversationList'
import { getCategoryConfig } from './engagementCategories'
import {
  ENGAGEMENT_PAGE_SIZE,
  getChatEngagementConversations
} from '../../../../services/chatEngagementService'
import type {
  ChatAnalyticsFilters,
  ChatConversation,
  ChatEngagementCategory,
  ChatEngagementConversation,
  Lead
} from '../../../../types'

interface EngagementDrilldownModalProps {
  category: ChatEngagementCategory | null
  filters: ChatAnalyticsFilters
  onClose: () => void
}

export function EngagementDrilldownModal({
  category,
  filters,
  onClose
}: EngagementDrilldownModalProps) {
  const [rows, setRows] = useState<ChatEngagementConversation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const config = category ? getCategoryConfig(category) : undefined

  // Volta para a primeira página sempre que a categoria muda
  useEffect(() => {
    setPage(0)
  }, [category])

  useEffect(() => {
    if (!category) return

    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getChatEngagementConversations(filters, category, page)
        if (cancelled) return
        setRows(result.conversations)
        setTotal(result.total)
      } catch (err) {
        if (cancelled) return
        console.error('Erro ao carregar conversas do estágio:', err)
        setError('Não foi possível carregar as conversas.')
        setRows([])
        setTotal(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [category, filters, page])

  const handleOpenConversation = async (conversationId: string) => {
    try {
      const { getConversationById } = await import('../../../../services/chatService')
      const conversation = await getConversationById(conversationId)
      if (conversation) setSelectedConversation(conversation)
    } catch (err) {
      console.error('Erro ao buscar conversa:', err)
    }
  }

  const handleOpenLead = async (leadId: string) => {
    try {
      const { getLeadById } = await import('../../../../services/leadService')
      const { data: lead, error: leadError } = await getLeadById(leadId)
      if (leadError) throw leadError
      if (lead) setSelectedLead(lead)
    } catch (err) {
      console.error('Erro ao buscar lead:', err)
    }
  }

  if (!category) return null

  const totalPages = Math.max(1, Math.ceil(total / ENGAGEMENT_PAGE_SIZE))

  return (
    <>
      {/* z-[52] fica acima do menu lateral (z-50 no MainLayout) e abaixo do
          ConversationViewModal (z-[55]), que abre por cima desta lista */}
      <div className="fixed inset-0 z-[52] bg-black/40 flex items-stretch lg:items-center justify-center lg:p-6">
        <div className="bg-white w-full lg:max-w-5xl h-full lg:h-auto lg:max-h-[85vh] flex flex-col overflow-hidden rounded-none lg:rounded-lg lg:shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-3 lg:p-4 border-b border-gray-200 shrink-0">
            <div className="min-w-0">
              <h3 className="text-sm lg:text-base font-semibold text-gray-900">
                {config?.label || 'Conversas'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {config?.description}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {total.toLocaleString('pt-BR')} conversas · da mais parada para a mais recente
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded shrink-0"
              aria-label="Fechar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Lista: min-h-0 permite que o flex encolha e a rolagem funcione */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <EngagementConversationList
              rows={rows}
              loading={loading}
              error={error}
              onOpenConversation={handleOpenConversation}
              onOpenLead={handleOpenLead}
            />
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 p-3 border-t border-gray-200 shrink-0">
              <span className="text-xs text-gray-500">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(current => Math.max(0, current - 1))}
                  disabled={page === 0 || loading}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(current => current + 1)}
                  disabled={page + 1 >= totalPages || loading}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedConversation && (
        <ConversationViewModal
          isOpen={!!selectedConversation}
          onClose={() => setSelectedConversation(null)}
          conversations={[selectedConversation]}
        />
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isOpen={true}
          onClose={() => setSelectedLead(null)}
          onLeadUpdate={updatedLead => setSelectedLead(updatedLead)}
        />
      )}
    </>
  )
}
