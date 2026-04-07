import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline'

interface InstanceDividerProps {
  instanceName: string
}

export function InstanceDivider({ instanceName }: InstanceDividerProps) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-gray-200" />
      <div className="flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm">
        <DevicePhoneMobileIcon className="w-3.5 h-3.5 text-primary-500" />
        <span className="text-[11px] font-medium text-gray-500">{instanceName}</span>
      </div>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}
