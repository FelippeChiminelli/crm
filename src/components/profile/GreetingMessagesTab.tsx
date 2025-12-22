import { useState, useEffect } from 'react'
import { PlusIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { useGreetingMessages } from '../../hooks/useGreetingMessages'
import { GreetingMessageCard } from './GreetingMessageCard'
import { GreetingMessageForm } from './GreetingMessageForm'
import { GreetingMessagePreview } from './GreetingMessagePreview'
import { useConfirm } from '../../hooks/useConfirm'
import type { GreetingMessage } from '../../services/greetingMessageService'
import { getCurrentUserProfile, updateCurrentUserProfile } from '../../services/profileService'

export function GreetingMessagesTab() {
  const {
    messages,
    loading,
    error,
    uploading,
    createMessage,
    deleteMessage,
    toggleMessageStatus,
    uploadMedia,
    setError
  } = useGreetingMessages()

  const [showForm, setShowForm] = useState(false)
  const [editingMessage, setEditingMessage] = useState<GreetingMessage | null>(null)
  const [previewMessage, setPreviewMessage] = useState<GreetingMessage | null>(null)
  const [greetingEnabled, setGreetingEnabled] = useState(false)
  const [enablingGreeting, setEnablingGreeting] = useState(false)

  const { confirm } = useConfirm()

  // Carregar valor inicial do toggle
  useEffect(() => {
    const loadGreetingStatus = async () => {
      const { data } = await getCurrentUserProfile()
      if (data?.greeting_message !== undefined) {
        setGreetingEnabled(data.greeting_message)
      }
    }
    loadGreetingStatus()
  }, [])

  // Toggle geral das mensagens de saudação
  const handleToggleGreeting = async () => {
    try {
      setEnablingGreeting(true)
      const newValue = !greetingEnabled

      const { error: updateError } = await updateCurrentUserProfile({
        greeting_message: newValue
      })

      if (updateError) {
        setError('Erro ao atualizar configuração')
        return
      }

      setGreetingEnabled(newValue)
    } catch (err) {
      setError('Erro ao atualizar configuração')
    } finally {
      setEnablingGreeting(false)
    }
  }

  const handleCreateMessage = async (data: any) => {
    const result = await createMessage(data)
    
    if (result.success) {
      setShowForm(false)
      setEditingMessage(null)
    }
  }

  const handleDeleteMessage = async (message: GreetingMessage) => {
    const confirmed = await confirm({
      title: 'Excluir mensagem',
      message: 'Tem certeza que deseja excluir esta mensagem de saudação?'
    })

    if (confirmed) {
      await deleteMessage(message.id, message.media_url)
    }
  }

  const handleEditMessage = (message: GreetingMessage) => {
    setEditingMessage(message)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingMessage(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando mensagens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
      {/* Header com Toggle Geral */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Mensagens Automáticas de Saudação
              </h3>
              <p className="text-sm text-gray-600">
                Configure mensagens que serão enviadas automaticamente quando um lead entrar em contato
              </p>
            </div>
          </div>
          
          <button
            onClick={handleToggleGreeting}
            disabled={enablingGreeting}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              greetingEnabled ? 'bg-green-500' : 'bg-gray-300'
            } ${enablingGreeting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                greetingEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!greetingEnabled && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ As mensagens automáticas estão desativadas. Ative o toggle acima para começar a usar.
            </p>
          </div>
        )}
      </div>

      {/* Mensagens de Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Formulário de Criação/Edição */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingMessage ? 'Editar Mensagem' : 'Nova Mensagem de Saudação'}
          </h3>
          <GreetingMessageForm
            onSubmit={handleCreateMessage}
            onCancel={handleCancelForm}
            editingMessage={editingMessage || undefined}
            uploading={uploading}
            onUpload={uploadMedia}
          />
        </div>
      )}

      {/* Botão de Adicionar */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors group"
        >
          <div className="flex items-center justify-center gap-2 text-gray-600 group-hover:text-primary-600">
            <PlusIcon className="w-5 h-5" />
            <span className="font-medium">Adicionar Nova Mensagem</span>
          </div>
        </button>
      )}

      {/* Lista de Mensagens */}
      {messages.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 px-1">
            Suas Mensagens ({messages.length})
          </h3>
          {messages.map(message => (
            <GreetingMessageCard
              key={message.id}
              message={message}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onToggleStatus={toggleMessageStatus}
              onPreview={setPreviewMessage}
            />
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma mensagem cadastrada
            </h3>
            <p className="text-gray-500 mb-6">
              Crie sua primeira mensagem de saudação para começar
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Criar Primeira Mensagem
            </button>
          </div>
        )
      )}

      {/* Modal de Preview */}
      {previewMessage && (
        <GreetingMessagePreview
          message={previewMessage}
          onClose={() => setPreviewMessage(null)}
        />
      )}
    </div>
  )
}

