import { Fragment } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'

interface WizardStepperProps {
  steps: readonly string[]
  current: number
  isEnabled: (step: number) => boolean
  hasIssues: (step: number) => boolean
  onSelect: (step: number) => void
}

export function WizardStepper({ steps, current, isEnabled, hasIssues, onSelect }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {steps.map((label, index) => {
        const active = index === current
        const enabled = isEnabled(index)
        const done = enabled && !active && index < current && !hasIssues(index)
        return (
          <Fragment key={label}>
            {index > 0 && <div className="h-px flex-1 bg-gray-200" />}
            <button
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(index)}
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${
                active ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-gray-500'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                active ? 'bg-primary-500 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {done ? <CheckIcon className="h-3 w-3" /> : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}
