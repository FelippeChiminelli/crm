import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getWhatsAppUrl } from '../../utils/validations'
import { WhatsAppChoiceModal } from './WhatsAppChoiceModal'
import { ConversationViewModal } from './ConversationViewModal'
import { SelectInstanceModal } from './SelectInstanceModal'
import { useConversationFlow } from '../../hooks/useConversationFlow'

interface WhatsAppPhoneLinkProps {
  phone: string
  leadId: string
  children: ReactNode
  className?: string
  stopPropagation?: boolean
}

export function WhatsAppPhoneLink({
  phone,
  leadId,
  children,
  className = '',
  stopPropagation = false,
}: WhatsAppPhoneLinkProps) {
  const [showChoice, setShowChoice] = useState(false)

  const {
    conversations,
    availableInstances,
    showConversationView,
    showSelectInstance,
    allowedInstanceIds,
    loading,
    openInternalChat,
    createConversationForInstance,
    handleInstanceSelect,
    closeConversationView,
    closeSelectInstance,
  } = useConversationFlow()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (stopPropagation) e.stopPropagation()
    setShowChoice(true)
  }

  const handleExternal = () => {
    const url = getWhatsAppUrl(phone)
    if (url !== '#') window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleInternal = () => {
    openInternalChat(phone, leadId)
  }

  const modals = (showChoice || showConversationView || showSelectInstance) && createPortal(
    <>
      <WhatsAppChoiceModal
        isOpen={showChoice}
        onClose={() => setShowChoice(false)}
        onExternal={handleExternal}
        onInternal={handleInternal}
        loading={loading}
      />

      <ConversationViewModal
        isOpen={showConversationView}
        onClose={closeConversationView}
        conversations={conversations}
        availableInstances={availableInstances}
        onSelectNewInstance={createConversationForInstance}
      />

      <SelectInstanceModal
        isOpen={showSelectInstance}
        onClose={closeSelectInstance}
        allowedInstanceIds={allowedInstanceIds}
        onSelect={handleInstanceSelect}
      />
    </>,
    document.body
  )

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={className}
        title="Abrir WhatsApp"
      >
        {children}
      </button>

      {modals}
    </>
  )
}
