import { BoltIcon } from '@heroicons/react/24/outline'
import type { AutomationRule } from '../../../../types'
import { Switch } from '../../../ui/Switch'
import type { RuleSentence } from '../formatters/ruleSentence'
import { getTrigger } from '../triggers'
import { RuleSentenceView } from '../ui/RuleSentenceView'
import { RuleActionsMenu } from './RuleActionsMenu'

interface AutomationRuleCardProps {
  rule: AutomationRule
  sentence: RuleSentence
  duplicating: boolean
  onToggleActive: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onViewExecutions: () => void
}

export function AutomationRuleCard({ rule, sentence, duplicating, onToggleActive, onEdit, onDuplicate, onDelete, onViewExecutions }: AutomationRuleCardProps) {
  const trigger = getTrigger(rule.event_type)
  const Icon = trigger?.icon || BoltIcon

  return (
    <div className={`rounded-xl border border-gray-200 p-4 transition-shadow hover:shadow-sm ${rule.active ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${rule.active ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`truncate font-medium ${rule.active ? 'text-gray-900' : 'text-gray-500'}`}>{rule.name}</h4>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              {trigger?.label || rule.event_type}
            </span>
          </div>
          <div className={`mt-2 ${rule.active ? '' : 'opacity-70'}`}>
            <RuleSentenceView sentence={sentence} compact />
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          <Switch checked={rule.active} onChange={onToggleActive} label={rule.active ? 'Desativar automação' : 'Ativar automação'} />
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
          >
            Editar
          </button>
          <RuleActionsMenu
            duplicating={duplicating}
            onViewExecutions={onViewExecutions}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  )
}
