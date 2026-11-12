import { useEffect, useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import type { AutomationRule, CreateAutomationRuleData } from '../../types'
import { listAutomations, createAutomation, updateAutomation, deleteAutomation } from '../../services/automationService'
import { AutomationExecutionsList } from './automations/AutomationExecutionsList'
import { getRuleActions, useRuleFormatters } from './automations/formatters/ruleSentence'
import { AutomationRulesList } from './automations/list/AutomationRulesList'
import { DeleteAutomationDialog } from './automations/list/DeleteAutomationDialog'
import { RuleExecutionsModal } from './automations/list/RuleExecutionsModal'
import { useAutomationLookups } from './automations/useAutomationLookups'
import { AutomationWizard } from './automations/wizard/AutomationWizard'

/** `null` = criando uma regra nova; `undefined` = assistente fechado. */
type WizardTarget = AutomationRule | null | undefined

export function AutomationsAdminTab() {
  const [items, setItems] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'rules' | 'executions'>('rules')
  const [wizardTarget, setWizardTarget] = useState<WizardTarget>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [executionsRule, setExecutionsRule] = useState<AutomationRule | null>(null)
  const lookups = useAutomationLookups()
  const { describeRule } = useRuleFormatters(lookups)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await listAutomations()
      if (error) throw error
      setItems(data)
    } catch {
      setError('Erro ao carregar automações')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(rule: AutomationRule) {
    setItems(prev => prev.map(item => (item.id === rule.id ? { ...item, active: !rule.active } : item)))
    const { error } = await updateAutomation(rule.id, { active: !rule.active })
    if (error) load()
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const { error } = await deleteAutomation(deleteTarget.id)
      if (!error) {
        setDeleteTarget(null)
        await load()
      }
    } finally {
      setDeleting(false)
    }
  }

  async function handleDuplicate(rule: AutomationRule) {
    try {
      setDuplicatingId(rule.id)
      const actions = getRuleActions(rule)
      const duplicated: CreateAutomationRuleData = {
        name: `${rule.name} (cópia)`,
        description: rule.description || '',
        event_type: rule.event_type,
        active: false, // Cópia começa desativada para evitar execuções acidentais
        condition: rule.condition || {},
        action: actions[0],
        actions,
      }
      const { error } = await createAutomation(duplicated)
      if (!error) await load()
    } finally {
      setDuplicatingId(null)
    }
  }

  async function handleSaved() {
    setWizardTarget(undefined)
    await load()
  }

  const viewButton = (view: typeof activeView) =>
    `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === view ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button type="button" onClick={() => setActiveView('rules')} className={viewButton('rules')}>Regras</button>
          <button type="button" onClick={() => setActiveView('executions')} className={viewButton('executions')}>Execuções</button>
        </div>
        {activeView === 'rules' && items.length > 0 && (
          <button
            onClick={() => setWizardTarget(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Criar automação
          </button>
        )}
      </div>

      {activeView === 'executions' ? (
        <AutomationExecutionsList ruleOptions={items.map(i => ({ id: i.id, name: i.name }))} />
      ) : loading ? (
        <div className="text-sm text-gray-600">Carregando...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <AutomationRulesList
          rules={items}
          duplicatingId={duplicatingId}
          describeRule={describeRule}
          onCreate={() => setWizardTarget(null)}
          onToggleActive={toggleActive}
          onEdit={setWizardTarget}
          onDuplicate={handleDuplicate}
          onDelete={setDeleteTarget}
          onViewExecutions={setExecutionsRule}
        />
      )}

      {wizardTarget !== undefined && (
        <AutomationWizard
          key={wizardTarget?.id || 'new'}
          rule={wizardTarget}
          lookups={lookups}
          onClose={() => setWizardTarget(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteAutomationDialog
          rule={deleteTarget}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {executionsRule && <RuleExecutionsModal rule={executionsRule} onClose={() => setExecutionsRule(null)} />}
    </div>
  )
}
