import type { AutomationRule } from '../../../../../types'
import { TRIGGERS, TRIGGER_GROUPS } from '../../triggers'

interface TriggerStepProps {
  value: AutomationRule['event_type'] | null
  onSelect: (eventType: AutomationRule['event_type']) => void
}

export function TriggerStep({ value, onSelect }: TriggerStepProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">O que deve iniciar esta automação?</p>
      {TRIGGER_GROUPS.map(group => (
        <section key={group.value}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.label}</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TRIGGERS.filter(t => t.group === group.value).map(trigger => {
              const selected = trigger.value === value
              const Icon = trigger.icon
              return (
                <button
                  key={trigger.value}
                  type="button"
                  onClick={() => onSelect(trigger.value)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                    selected
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{trigger.label}</span>
                    <span className="block text-xs text-gray-500">{trigger.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
