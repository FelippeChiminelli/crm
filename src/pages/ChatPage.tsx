import { useState } from 'react'
import { ChatSidebar } from '../components/chat/ChatSidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { useChatLogic } from '../hooks/useChatLogic'
import type { ChatConversation, SendMessageData } from '../types'

export default function ChatPage() {
  const {
    selectedConversation,
    activeConversations,
    permittedActiveConversations,
    selectedSendConversation,
    messages,
    loading,
    sending,
    creatingInstance,
    canSend,
    canSendToSelected,
    extraInstances,
    sidebarRefreshToken,
    selectConversation,
    selectSendConversation,
    createConversationOnInstance,
    sendNewMessage,
  } = useChatLogic()

  const [showChatWindow, setShowChatWindow] = useState(false)
  const [repliedConversationId, setRepliedConversationId] = useState<string | null>(null)

  const handleSelectConversation = (conversation: ChatConversation | null, preferredInstanceId?: string) => {
    selectConversation(conversation, preferredInstanceId)
    if (conversation) {
      setShowChatWindow(true)
    }
  }

  const handleBackToList = () => {
    setShowChatWindow(false)
  }

  const handleSendMessage = async (data: SendMessageData) => {
    const result = await sendNewMessage(data)
    if (selectedSendConversation?.id) {
      setRepliedConversationId(selectedSendConversation.id)
    }
    return result
  }

  const sidebarProps = {
    selectedConversation,
    onSelectConversation: handleSelectConversation,
    repliedConversationId,
    refreshToken: sidebarRefreshToken,
  }

  return (
    <div className="h-full bg-[#eae6df] overflow-hidden">
      <div className="h-full max-w-screen-2xl mx-auto relative flex overflow-hidden">
        <div
          className={`absolute lg:relative inset-0 lg:inset-auto w-full lg:w-[420px] flex-shrink-0 border-r border-gray-200 h-full transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            showChatWindow ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
          }`}
        >
          <ChatSidebar {...sidebarProps} />
        </div>

        <div
          className={`absolute lg:relative inset-0 lg:inset-auto flex-1 min-w-0 h-full flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            showChatWindow ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <ChatWindow
            selectedConversation={selectedConversation}
            activeConversations={permittedActiveConversations}
            labelConversations={activeConversations}
            conversationCount={activeConversations.length}
            selectedSendConversation={selectedSendConversation}
            onSelectSendConversation={selectSendConversation}
            messages={messages}
            loading={loading}
            sending={sending}
            onSendMessage={handleSendMessage}
            onBack={handleBackToList}
            extraInstances={extraInstances}
            onSelectExtraInstance={createConversationOnInstance}
            canSend={canSend}
            canSendToSelected={canSendToSelected}
            creatingInstance={creatingInstance}
          />
        </div>
      </div>
    </div>
  )
}
