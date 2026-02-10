import { useNavigate } from 'react-router-dom'
import {
  ChatBubbleLeftEllipsisIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline'
import type { Lead } from '../../../types'

interface LeadConversationsSectionProps {
  conversations: any[]
  lead: Lead
  onReload: () => void
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso || ''
  }
}

export function LeadConversationsSection({
  conversations,
  lead,
}: LeadConversationsSectionProps) {
  const navigate = useNavigate()

  const whatsappLink = lead.phone
    ? `https://wa.me/${lead.phone.replace(/\D/g, '')}`
    : undefined

  const handleOpenConversation = (conversationId: string) => {
    navigate(`/chat?conversation=${conversationId}`)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-gray-500" />
          Conversas
          {conversations.length > 0 && (
            <span className="text-xs font-normal text-gray-400">({conversations.length})</span>
          )}
        </h3>
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            title="Abrir WhatsApp"
          >
            <PhoneIcon className="w-4 h-4" />
          </a>
        )}
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-2">Nenhuma conversa encontrada</p>
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
            >
              <PhoneIcon className="w-3.5 h-3.5" />
              Iniciar conversa via WhatsApp
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {conversations.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => handleOpenConversation(conv.id)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conv.contact_name || conv.contact_phone || 'Conversa'}
                  </p>
                  {conv.last_message && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message}</p>
                  )}
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  {conv.updated_at && (
                    <span className="text-[10px] text-gray-400">
                      {formatDate(conv.updated_at)}
                    </span>
                  )}
                  {conv.unread_count > 0 && (
                    <span className="mt-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
