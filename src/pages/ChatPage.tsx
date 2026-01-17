import { useEffect, useState } from 'react'
import { ChatSidebar } from '../components/chat/ChatSidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { useChatLogic } from '../hooks/useChatLogic'

export default function ChatPage() {
  const {
    // conversations, // não usado
    selectedConversation,
    messages,
    sending,
    loadConversations,
    // loadMessages, // não usado
    selectConversation,
    sendNewMessage,
    // connectInstance, // removido: agora na página de administração
    // deleteInstance, // removido: agora na página de administração
    // error, // não usado
    // clearError // não usado
  } = useChatLogic()

  // Estado para controlar visualização mobile
  const [showChatWindow, setShowChatWindow] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [])

  // Quando selecionar uma conversa no mobile, mostrar a janela de chat
  const handleSelectConversation = (conversation: any) => {
    selectConversation(conversation)
    if (conversation) {
      setShowChatWindow(true)
    }
  }

  // Voltar para a lista de conversas no mobile
  const handleBackToList = () => {
    setShowChatWindow(false)
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar - Oculta no mobile quando chat está aberto */}
      <div className={`
        ${showChatWindow ? 'hidden' : 'flex'} 
        lg:flex
        w-full lg:w-80 flex-shrink-0
      `}>
        <ChatSidebar
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
        />
      </div>
      
      {/* Janela de chat - Oculta no mobile quando lista está aberta */}
      <div className={`
        ${showChatWindow ? 'flex' : 'hidden'} 
        lg:flex
        flex-1 min-w-0
      `}>
        <ChatWindow
          selectedConversation={selectedConversation}
          messages={messages}
          sending={sending}
          onSendMessage={sendNewMessage}
          onBack={handleBackToList}
        />
      </div>
    </div>
  )
} 