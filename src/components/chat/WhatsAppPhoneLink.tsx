import { useRef, useState, type ReactNode } from 'react'
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

  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()

    const selection = window.getSelection()
    const hasSelection = selection && selection.toString().trim().length > 0

    const movedDistance = mouseDownPos.current
      ? Math.abs(e.clientX - mouseDownPos.current.x) + Math.abs(e.clientY - mouseDownPos.current.y)
      : 0

    if (hasSelection || movedDistance > 5) return

    e.preventDefault()
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
        phone={phone}
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
      <span
        role="link"
        tabIndex={0}
        data-no-drag
        onMouseDown={(e) => {
          e.stopPropagation()
          mouseDownPos.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter') setShowChoice(true) }}
        className={className}
        style={{ userSelect: 'text', WebkitUserSelect: 'text', cursor: 'pointer' }}
        title="Abrir WhatsApp"
      >
        {children}
      </span>

      {modals}
    </>
  )
}
