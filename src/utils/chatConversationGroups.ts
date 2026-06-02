import type { ChatConversation } from '../types'

export interface UnifiedContactGroup {
  key: string
  leadId?: string
  phone: string
  leadName: string
  leadPhone: string
  conversations: ChatConversation[]
  representative: ChatConversation
  latestTime: string
  isUnread: boolean
}

export function normalizeChatPhone(fone?: string | null): string {
  return (fone || '').replace(/\D/g, '')
}

export function getContactGroupKey(conv: ChatConversation): string {
  if (conv.lead_id) return `lead:${conv.lead_id}`
  const phone = normalizeChatPhone(conv.lead_phone)
  return `phone:${phone || conv.id}`
}

/** Não lida quando a última mensagem é do cliente (outbound). */
export function isConversationUnread(conversation: ChatConversation): boolean {
  return conversation.last_message_direction === 'outbound'
}

function getConversationSortTime(conv: ChatConversation): number {
  return new Date(conv.last_message_time || conv.updated_at || conv.created_at || 0).getTime()
}

export function groupConversationsByContact(conversations: ChatConversation[]): UnifiedContactGroup[] {
  const map = new Map<string, ChatConversation[]>()

  for (const conv of conversations) {
    const key = getContactGroupKey(conv)
    const list = map.get(key) || []
    list.push(conv)
    map.set(key, list)
  }

  const groups: UnifiedContactGroup[] = []

  for (const [key, members] of map) {
    const sorted = [...members].sort((a, b) => getConversationSortTime(b) - getConversationSortTime(a))
    const representative = sorted[0]
    const leadId = representative.lead_id || members.find(c => c.lead_id)?.lead_id

    groups.push({
      key,
      leadId: leadId || undefined,
      phone: normalizeChatPhone(representative.lead_phone),
      leadName: representative.lead_name || 'Lead não cadastrado',
      leadPhone: representative.lead_phone || '',
      conversations: sorted,
      representative,
      latestTime: representative.last_message_time || representative.updated_at || representative.created_at,
      isUnread: sorted.some(isConversationUnread),
    })
  }

  return groups.sort((a, b) => getConversationSortTime(b.representative) - getConversationSortTime(a.representative))
}

export function isGroupSelected(group: UnifiedContactGroup, selectedConversationId?: string | null): boolean {
  if (!selectedConversationId) return false
  return group.conversations.some(c => c.id === selectedConversationId)
}

export function pickSendConversation(
  conversations: ChatConversation[],
  preferredInstanceId?: string | null
): ChatConversation | null {
  if (conversations.length === 0) return null

  if (preferredInstanceId) {
    const onInstance = conversations
      .filter(c => c.instance_id === preferredInstanceId)
      .sort((a, b) => getConversationSortTime(b) - getConversationSortTime(a))
    if (onInstance.length > 0) return onInstance[0]
  }

  return [...conversations].sort((a, b) => getConversationSortTime(b) - getConversationSortTime(a))[0]
}

export function pickDeleteConversation(
  group: UnifiedContactGroup,
  filteredInstanceId?: string | null
): ChatConversation | null {
  if (group.conversations.length === 0) return null

  if (filteredInstanceId) {
    const onInstance = group.conversations
      .filter(c => c.instance_id === filteredInstanceId)
      .sort((a, b) => getConversationSortTime(b) - getConversationSortTime(a))
    if (onInstance.length > 0) return onInstance[0]
  }

  return group.representative
}
