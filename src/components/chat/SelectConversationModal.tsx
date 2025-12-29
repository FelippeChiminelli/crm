import { XMarkIcon } from '@heroicons/react/24/outline'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatConversation } from '../../types'

interface SelectConversationModalProps {
  isOpen: boolean
  onClose: () => void
  conversations: ChatConversation[]
  onSelect: (conversation: ChatConversation) => void
}

export function SelectConversationModal({ 
  isOpen, 
  onClose, 
  conversations,
  onSelect 
}: SelectConversationModalProps) {
  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return 'Data inválida'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      case 'closed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa'
      case 'archived':
        return 'Arquivada'
      case 'closed':
        return 'Fechada'
      default:
        return status
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Selecionar Conversa
              </h2>
              <p className="text-sm text-gray-500">
                {conversations.length} {conversations.length === 1 ? 'conversa encontrada' : 'conversas encontradas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  onSelect(conversation)
                  onClose()
                }}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 group-hover:text-orange-700 transition-colors">
                        {conversation.nome_instancia}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(conversation.status)}`}>
                        {getStatusLabel(conversation.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Telefone:</span> {conversation.lead_phone}
                      </p>
                      
                      {conversation.Nome_Whatsapp && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Nome no WhatsApp:</span> {conversation.Nome_Whatsapp}
                        </p>
                      )}
                      
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Última atualização:</span>{' '}
                        {formatDate(conversation.last_message_time || conversation.updated_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-gray-400 group-hover:text-orange-600 transition-colors">
                      Ver conversa →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

