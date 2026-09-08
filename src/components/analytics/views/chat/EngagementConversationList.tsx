import { ChatBubbleLeftRightIcon, EyeIcon } from '@heroicons/react/24/outline'
import { formatIdleTime } from '../../../../services/chatEngagementService'
import type { ChatEngagementConversation } from '../../../../types'

interface EngagementConversationListProps {
  rows: ChatEngagementConversation[]
  loading: boolean
  error: string | null
  onOpenConversation: (conversationId: string) => void
  onOpenLead: (leadId: string) => void
}

/**
 * Lista de conversas do drill-down.
 * Em telas pequenas usa cards empilhados; a tabela só aparece a partir de lg,
 * onde há largura suficiente para as sete colunas.
 */
export function EngagementConversationList({
  rows,
  loading,
  error,
  onOpenConversation,
  onOpenLead
}: EngagementConversationListProps) {
  if (error) {
    return (
      <div className="m-3 lg:m-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-3 lg:p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-14 lg:h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-gray-500">
        Nenhuma conversa nesta categoria.
      </div>
    )
  }

  return (
    <>
      {/* Mobile e tablet: cards */}
      <ul className="lg:hidden divide-y divide-gray-100">
        {rows.map(row => (
          <li key={row.conversation_id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {row.lead_name || row.contact_name || 'Sem nome'}
              </p>
              <span className="text-xs text-gray-700 whitespace-nowrap shrink-0">
                {formatIdleTime(row.idle_hours)}
              </span>
            </div>

            <p className="text-xs text-gray-600 mt-0.5">{row.phone || 'Sem telefone'}</p>

            <p className="text-xs text-gray-500 mt-1 truncate">
              {row.instance_name || 'Sem instância'} · {row.responsible_name || 'Sem responsável'}
            </p>

            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="text-xs text-gray-600">
                Cliente: {row.msgs_cliente} · Loja: {row.msgs_loja}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                {row.lead_id && (
                  <button
                    onClick={() => onOpenLead(row.lead_id as string)}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Lead
                  </button>
                )}
                <button
                  onClick={() => onOpenConversation(row.conversation_id)}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  Conversa
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: tabela */}
      <table className="hidden lg:table w-full text-sm table-fixed">
        <thead>
          {/* sticky no th (e não no thead) para compatibilidade entre navegadores */}
          <tr className="text-left text-xs text-gray-600 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-gray-50">
            <th className="px-3 py-2 font-medium w-[22%]">Contato</th>
            <th className="px-3 py-2 font-medium w-[14%]">Telefone</th>
            <th className="px-3 py-2 font-medium w-[15%]">Instância</th>
            <th className="px-3 py-2 font-medium w-[17%]">Responsável</th>
            <th className="px-3 py-2 font-medium text-center w-[8%]">Cliente</th>
            <th className="px-3 py-2 font-medium text-center w-[7%]">Loja</th>
            <th className="px-3 py-2 font-medium w-[9%]">Parado há</th>
            <th className="px-3 py-2 w-[8%] text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.conversation_id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-900 truncate">
                {row.lead_name || row.contact_name || 'Sem nome'}
              </td>
              <td className="px-3 py-2 text-gray-600 truncate">{row.phone || '-'}</td>
              <td className="px-3 py-2 text-gray-600 truncate">{row.instance_name || '-'}</td>
              <td className="px-3 py-2 text-gray-600 truncate">
                {row.responsible_name || 'Sem responsável'}
              </td>
              <td className="px-3 py-2 text-center text-gray-600">{row.msgs_cliente}</td>
              <td className="px-3 py-2 text-center text-gray-600">{row.msgs_loja}</td>
              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                {formatIdleTime(row.idle_hours)}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-2">
                  {row.lead_id && (
                    <button
                      onClick={() => onOpenLead(row.lead_id as string)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      title="Ver detalhes do lead"
                      aria-label="Ver detalhes do lead"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onOpenConversation(row.conversation_id)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                    title="Ver conversa"
                    aria-label="Ver conversa"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
