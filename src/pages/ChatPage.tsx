import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { ChatSidebar } from '../components/chat/ChatSidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { useChatLogic } from '../hooks/useChatLogic'
import { useMarkLeadNotificationsRead } from '../hooks/useNotifications'
import type { ChatConversation, SendMessageData } from '../types'

/**
 * O deep link `?conversation=` só é lido na montagem (useChatLogic/ChatSidebar).
 * Remontar a cada navegação com o parâmetro faz o link funcionar mesmo com o chat já aberto.
 */
export default function ChatPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const deepLinkId = searchParams.get('conversation')
  return <ChatPageContent key={deepLinkId ? location.key : 'chat'} openOnMount={Boolean(deepLinkId)} />
}

function ChatPageContent({ openOnMount }: { openOnMount: boolean }) {
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

  const [showChatWindow, setShowChatWindow] = useState(openOnMount)
  useMarkLeadNotificationsRead(selectedConversation?.lead_id)
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
