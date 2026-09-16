import { PhoneIcon } from '@heroicons/react/24/outline'

interface MessageCallProps {
  /** `inbound` marca a ligação feita pelo atendente, seguindo a convenção da timeline. */
  direction: 'inbound' | 'outbound'
}

export function MessageCall({ direction }: MessageCallProps) {
  const label = direction === 'inbound' ? 'Ligação realizada' : 'Ligação recebida'

  return (
    <div className="flex items-center gap-2 p-2 bg-black/5 rounded-lg min-w-[180px]">
      <PhoneIcon className="w-5 h-5 text-gray-400 shrink-0" />
      <span className="text-[14.2px] leading-[19px] text-gray-700">{label}</span>
    </div>
  )
}
