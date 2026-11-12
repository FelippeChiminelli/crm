import { useMemo, useState } from 'react'
import { BoltIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { AutomationRule } from '../../../../types'
import type { RuleSentence } from '../formatters/ruleSentence'
import { getTrigger } from '../triggers'
import { AutomationRuleCard } from './AutomationRuleCard'
import { RulesToolbar } from './RulesToolbar'
import type { RulesFilters } from './RulesToolbar'

interface AutomationRulesListProps {
  rules: AutomationRule[]
  duplicatingId: string | null
  describeRule: (rule: AutomationRule) => RuleSentence
  onCreate: () => void
  onToggleActive: (rule: AutomationRule) => void
  onEdit: (rule: AutomationRule) => void
  onDuplicate: (rule: AutomationRule) => void
  onDelete: (rule: AutomationRule) => void
  onViewExecutions: (rule: AutomationRule) => void
}

const INITIAL_FILTERS: RulesFilters = { search: '', group: 'all', status: 'all' }

function matchesFilters(rule: AutomationRule, filters: RulesFilters): boolean {
  if (filters.status === 'active' && !rule.active) return false
  if (filters.status === 'inactive' && rule.active) return false
  if (filters.group !== 'all' && getTrigger(rule.event_type)?.group !== filters.group) return false
  const search = filters.search.trim().toLowerCase()
  return !search || (rule.name || '').toLowerCase().includes(search)
}

export function AutomationRulesList({ rules, duplicatingId, describeRule, onCreate, onToggleActive, onEdit, onDuplicate, onDelete, onViewExecutions }: AutomationRulesListProps) {
  const [filters, setFilters] = useState<RulesFilters>(INITIAL_FILTERS)
  const visibleRules = useMemo(() => rules.filter(rule => matchesFilters(rule, filters)), [rules, filters])

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <BoltIcon className="h-6 w-6" />
        </span>
        <h4 className="text-base font-semibold text-gray-900">Nenhuma automação ainda</h4>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          Automatize tarefas repetitivas: mover leads, criar tarefas, enviar WhatsApp e muito mais.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500"
        >
          <PlusIcon className="h-4 w-4" />
          Criar primeira automação
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <RulesToolbar filters={filters} onChange={setFilters} />
      {visibleRules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center">
          <p className="text-sm text-gray-600">Nenhuma automação encontrada com esses filtros.</p>
          <button type="button" onClick={() => setFilters(INITIAL_FILTERS)} className="mt-2 text-sm font-medium text-primary-700 hover:underline">
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRules.map(rule => (
            <AutomationRuleCard
              key={rule.id}
              rule={rule}
              sentence={describeRule(rule)}
              duplicating={duplicatingId === rule.id}
              onToggleActive={() => onToggleActive(rule)}
              onEdit={() => onEdit(rule)}
              onDuplicate={() => onDuplicate(rule)}
              onDelete={() => onDelete(rule)}
              onViewExecutions={() => onViewExecutions(rule)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
