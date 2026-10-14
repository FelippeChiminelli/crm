import {
  PhoneArrowDownLeftIcon,
  PhoneArrowUpRightIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from '@heroicons/react/24/outline'
import type { CallMessageMetadata } from '../../../types'
import { getCallInfo } from './callInfo'

interface MessageCallProps {
  /** `inbound` marca a ligação feita pelo atendente, seguindo a convenção da timeline. */
  direction: 'inbound' | 'outbound'
  metadata?: CallMessageMetadata | null
}

function pickIcon(direction: MessageCallProps['direction'], isVideo: boolean, failed: boolean) {
  if (isVideo) return failed ? VideoCameraSlashIcon : VideoCameraIcon
  if (failed) return PhoneXMarkIcon
  return direction === 'inbound' ? PhoneArrowUpRightIcon : PhoneArrowDownLeftIcon
}

export function MessageCall({ direction, metadata }: MessageCallProps) {
  const { title, details, isVideo, failed } = getCallInfo(direction, metadata)
  const Icon = pickIcon(direction, isVideo, failed)

  return (
    <div className="flex items-center gap-2.5 p-2 bg-black/5 rounded-lg min-w-[200px]">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        failed ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[14.2px] leading-[19px] text-gray-800">{title}</p>
        {details.length > 0 && (
          <p className="text-[12px] leading-4 text-gray-500 truncate">{details.join(' · ')}</p>
        )}
      </div>
    </div>
  )
}
