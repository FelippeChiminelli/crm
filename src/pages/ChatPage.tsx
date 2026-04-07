import { useEffect, useState } from 'react'
import { ChatSidebar } from '../components/chat/ChatSidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { useChatLogic } from '../hooks/useChatLogic'

export default function ChatPage() {
  const {
    selectedConversation,
    messages,
    sending,
    loadConversations,
    selectConversation,
    sendNewMessage,
  } = useChatLogic()

  const [showChatWindow, setShowChatWindow] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [])

  const handleSelectConversation = (conversation: any) => {
    selectConversation(conversation)
    if (conversation) {
      setShowChatWindow(true)
    }
  }

  const handleBackToList = () => {
    setShowChatWindow(false)
  }

  return (
    <div className="h-full bg-[#eae6df] overflow-hidden">
      {/* Desktop: flex side-by-side */}
      <div className="hidden lg:flex h-full max-w-screen-2xl mx-auto overflow-hidden">
        <div className="w-[420px] flex-shrink-0 border-r border-gray-200 h-full">
          <ChatSidebar
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
          />
        </div>
        <div className="flex-1 min-w-0 h-full flex flex-col">
          <ChatWindow
            selectedConversation={selectedConversation}
            messages={messages}
            sending={sending}
            onSendMessage={sendNewMessage}
          />
        </div>
      </div>

      {/* Mobile: slide transition */}
      <div className="lg:hidden relative h-full overflow-hidden">
        <div
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            showChatWindow ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <ChatSidebar
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
          />
        </div>
        <div
          className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out ${
            showChatWindow ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <ChatWindow
            selectedConversation={selectedConversation}
            messages={messages}
            sending={sending}
            onSendMessage={sendNewMessage}
            onBack={handleBackToList}
          />
        </div>
      </div>
    </div>
  )
} 