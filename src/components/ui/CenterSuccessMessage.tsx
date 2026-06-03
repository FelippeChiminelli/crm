import { useEffect, useState } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

interface CenterSuccessMessageProps {
  message: string
  visible: boolean
  onDismiss: () => void
  durationMs?: number
}

export function CenterSuccessMessage({
  message,
  visible,
  onDismiss,
  durationMs = 2500,
}: CenterSuccessMessageProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!visible) {
      setIsVisible(false)
      return
    }

    setIsVisible(true)
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onDismiss, 300)
    }, durationMs)

    return () => clearTimeout(timer)
  }, [visible, durationMs, onDismiss])

  if (!visible && !isVisible) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={`
          flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border border-green-200 bg-white
          transform transition-all duration-300 ease-in-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        <CheckCircleIcon className="w-8 h-8 text-green-500 flex-shrink-0" />
        <p className="text-base font-medium text-gray-900">{message}</p>
      </div>
    </div>
  )
}
