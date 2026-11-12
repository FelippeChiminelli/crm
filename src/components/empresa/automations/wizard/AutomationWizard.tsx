import { useMemo, useState } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { AutomationRule } from '../../../../types'
import { createAutomation, updateAutomation } from '../../../../services/automationService'
import { useEscapeKey } from '../../../../hooks/useEscapeKey'
import { createDefaultAction } from '../actionCatalog'
import type { ActionType } from '../actionCatalog'
import { AutomationEditorProvider } from '../editor/AutomationEditorContext'
import { suggestRuleName, useRuleFormatters } from '../formatters/ruleSentence'
import { getTriggerLabel } from '../triggers'
import type { AutomationLookups } from '../useAutomationLookups'
import { getActionsIssues, getConditionIssues, getReviewIssues } from '../validation'
import { useAutomationForm } from './useAutomationForm'
import { WizardStepper } from './WizardStepper'
import { ActionsStep } from './steps/ActionsStep'
import { ConditionsStep } from './steps/ConditionsStep'
import { ReviewStep } from './steps/ReviewStep'
import { TriggerStep } from './steps/TriggerStep'

const STEPS = ['Gatilho', 'Condições', 'Ações', 'Revisar'] as const
const REVIEW_STEP = STEPS.length - 1

interface AutomationWizardProps {
  /** Regra em edição; `null` para criar uma nova. */
  rule: AutomationRule | null
  lookups: AutomationLookups
  onClose: () => void
  onSaved: () => void
}

export function AutomationWizard({ rule, lookups, onClose, onSaved }: AutomationWizardProps) {
  const isEditing = !!rule
  const editor = useAutomationForm(rule)
  const { form, setForm, actions } = editor
  const { describeRule, formatSingleAction } = useRuleFormatters(lookups)
  const [step, setStep] = useState(isEditing ? REVIEW_STEP : 0)
  const [maxStep, setMaxStep] = useState(isEditing ? REVIEW_STEP : 0)
  const [triggerPicked, setTriggerPicked] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEscapeKey(true, onClose)

  const stepIssues = useMemo(() => {
    const conditionIssues = getConditionIssues(form)
    const actionIssues = getActionsIssues(actions)
    return [
      triggerPicked ? [] : ['Escolha um gatilho'],
      conditionIssues,
      actionIssues,
      [...conditionIssues, ...actionIssues, ...getReviewIssues(form)],
    ]
  }, [form, actions, triggerPicked])
  const currentIssues = stepIssues[step]

  function goTo(next: number) {
    if (next === REVIEW_STEP && !form.name.trim()) {
      setForm(prev => ({ ...prev, name: suggestRuleName(prev.event_type, prev.actions) }))
    }
    setStep(next)
    setMaxStep(prev => Math.max(prev, next))
  }

  function handleSelectTrigger(eventType: AutomationRule['event_type']) {
    editor.setEventType(eventType)
    setTriggerPicked(true)
    goTo(1)
  }

  function handleAddAction(type: ActionType) {
    editor.addAction(createDefaultAction(type, { eventType: form.event_type, ...lookups }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const payload = editor.buildPayload()
      const { error } = rule ? await updateAutomation(rule.id, payload) : await createAutomation(payload)
      if (error) throw error
      onSaved()
    } catch {
      setSaveError(isEditing ? 'Erro ao atualizar automação' : 'Erro ao criar automação')
    } finally {
      setSaving(false)
    }
  }

  const isLastStep = step === REVIEW_STEP

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">{isEditing ? 'Editar automação' : 'Nova automação'}</h3>
            {triggerPicked && <p className="truncate text-sm text-gray-500">{getTriggerLabel(form.event_type)}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-5 py-3">
          <WizardStepper
            steps={STEPS}
            current={step}
            isEnabled={index => isEditing || index <= maxStep}
            hasIssues={index => stepIssues[index].length > 0}
            onSelect={goTo}
          />
        </div>

        <AutomationEditorProvider lookups={lookups} form={form} setForm={setForm}>
          <div key={step} className="flex-1 overflow-y-auto px-5 py-5">
            {step === 0 && <TriggerStep value={triggerPicked ? form.event_type : null} onSelect={handleSelectTrigger} />}
            {step === 1 && <ConditionsStep />}
            {step === 2 && (
              <ActionsStep
                editingIndex={editor.editingIndex}
                onEdit={editor.setEditingIndex}
                onAdd={handleAddAction}
                onMove={editor.moveAction}
                onRemove={editor.removeAction}
                formatAction={formatSingleAction}
              />
            )}
            {step === 3 && <ReviewStep sentence={describeRule(form)} />}
          </div>
        </AutomationEditorProvider>

        <div className="border-t border-gray-200 px-5 py-3">
          {(saveError || (currentIssues.length > 0 && step > 0)) && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {saveError ? <p className="text-red-700">{saveError}</p> : (
                <ul className="space-y-0.5">
                  {currentIssues.map(issue => (
                    <li key={issue} className="flex items-start gap-1.5">
                      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
              disabled={saving}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </button>
            <button
              type="button"
              onClick={() => (isLastStep ? handleSave() : goTo(step + 1))}
              disabled={saving || currentIssues.length > 0}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLastStep ? (saving ? 'Salvando...' : 'Salvar automação') : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
