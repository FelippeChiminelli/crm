import { useEffect } from 'react'
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

  useEffect(() => {
    loadConversations()
  }, [])

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <ChatSidebar
        selectedConversation={selectedConversation}
        onSelectConversation={selectConversation}
        // onConnectInstance removido
        // onDeleteInstance removido
      />
      
      {/* Janela de chat */}
      <ChatWindow
        selectedConversation={selectedConversation}
        messages={messages}
        sending={sending}
        onSendMessage={sendNewMessage}
      />
    </div>
  )
} 