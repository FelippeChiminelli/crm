import type { UnifiedChatMessage } from '../types'

export type TimelineItem =
  | { type: 'date'; date: string }
  | { type: 'instance'; instanceName: string }
  | { type: 'message'; message: UnifiedChatMessage }

export function buildUnifiedTimeline(msgs: UnifiedChatMessage[]): TimelineItem[] {
  const items: TimelineItem[] = []
  let lastDate = ''
  let lastInstanceName = ''

  for (const msg of msgs) {
    const dateKey = msg.timestamp.split('T')[0]
    if (dateKey !== lastDate) {
      lastDate = dateKey
      lastInstanceName = ''
      items.push({ type: 'date', date: dateKey })
    }
    if (msg.instance_name !== lastInstanceName) {
      lastInstanceName = msg.instance_name
      items.push({ type: 'instance', instanceName: msg.instance_name })
    }
    items.push({ type: 'message', message: msg })
  }

  return items
}
