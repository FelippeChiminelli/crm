import { useState } from 'react'
import { ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { LeadAttributeConditions } from '../../conditions/LeadAttributeConditions'
import { TriggerConditions } from '../../conditions/TriggerConditions'
import { useAutomationEditor } from '../../editor/AutomationEditorContext'
import { getTrigger, supportsLeadAttributeFilters } from '../../triggers'

const LEAD_ATTRIBUTE_KEYS = ['statuses', 'origins', 'tags'] as const

function LeadAttributeFiltersPanel() {
  const { form } = useAutomationEditor()
  const activeCount = LEAD_ATTRIBUTE_KEYS.filter(key => (form.condition[key] as string[] | undefined)?.length).length
  const [open, setOpen] = useState(activeCount > 0)

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">Filtrar por dados do lead</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">{activeCount} ativo(s)</span>
          )}
        </span>
        <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 py-4">
          <p className="mb-3 text-xs text-gray-500">Status, origem e tags. Deixe vazio para disparar para qualquer valor.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <LeadAttributeConditions />
          </div>
        </div>
      )}
    </div>
  )
}

export function ConditionsStep() {
  const { form } = useAutomationEditor()
  const trigger = getTrigger(form.event_type)

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
        Dispara sempre que <strong className="font-semibold text-gray-900">{trigger?.sentence || form.event_type}</strong>.
        <span className="text-gray-500"> Use os filtros abaixo para restringir quando ela vale.</span>
      </div>
      <TriggerConditions />
      {supportsLeadAttributeFilters(form.event_type) && <LeadAttributeFiltersPanel />}
    </div>
  )
}
