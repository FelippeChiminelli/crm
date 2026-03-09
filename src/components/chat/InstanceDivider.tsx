import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline'

interface InstanceDividerProps {
  instanceName: string
}

export function InstanceDivider({ instanceName }: InstanceDividerProps) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-300" />
      <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm">
        <DevicePhoneMobileIcon className="w-3.5 h-3.5 text-orange-500" />
        <span className="text-xs font-medium text-gray-600">{instanceName}</span>
      </div>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  )
}
