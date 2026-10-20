import { ds } from '../../../utils/designSystem'
import { DevicePushSection } from './DevicePushSection'
import { NotificationTypesSection } from './NotificationTypesSection'

export function NotificationSettingsTab() {
  return (
    <div className={`${ds.card()} divide-y divide-gray-100`}>
      <DevicePushSection />
      <NotificationTypesSection />
    </div>
  )
}
