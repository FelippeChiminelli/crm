import { useCallback, useMemo, useState } from 'react'
import type { SetStateAction } from 'react'
import type { AutomationRule, CreateAutomationRuleData } from '../../../../types'
import { sanitizeWhatsAppRecipient } from '../constants'
import { getRuleActions } from '../formatters/ruleSentence'
import { getTrigger } from '../triggers'

type Action = Record<string, any>

/** Formulário visto pelos componentes de condição e ação: `action` é a ação em edição. */
export type EditorForm = CreateAutomationRuleData & { condition: Record<string, any>; action: Action; actions: Action[] }

interface EditorState {
  form: Omit<CreateAutomationRuleData, 'action' | 'actions'> & { condition: Record<string, any> }
  actions: Action[]
  editingIndex: number | null
}

const INITIAL_STATE: EditorState = {
  form: { name: '', description: '', event_type: 'lead_stage_changed', active: true, condition: {} },
  actions: [],
  editingIndex: null,
}

function stateFromRule(rule: AutomationRule): EditorState {
  return {
    form: {
      name: rule.name || '',
      description: rule.description || '',
      event_type: rule.event_type || 'lead_stage_changed',
      active: rule.active ?? true,
      condition: rule.condition || {},
    },
    actions: getRuleActions(rule),
    editingIndex: null,
  }
}

export function useAutomationForm(rule: AutomationRule | null) {
  const [state, setState] = useState<EditorState>(() => (rule ? stateFromRule(rule) : INITIAL_STATE))
  const { actions, editingIndex } = state

  const form = useMemo<EditorForm>(() => ({
    ...state.form,
    action: (editingIndex !== null && actions[editingIndex]) || {},
    actions,
  }), [state.form, actions, editingIndex])

  const setForm = useCallback((update: SetStateAction<EditorForm>) => {
    setState(prev => {
      const view: EditorForm = {
        ...prev.form,
        action: (prev.editingIndex !== null && prev.actions[prev.editingIndex]) || {},
        actions: prev.actions,
      }
      const { action, actions: _ignored, ...nextForm } = typeof update === 'function' ? update(view) : update
      const nextActions = prev.editingIndex !== null && action !== view.action
        ? prev.actions.map((item, i) => (i === prev.editingIndex ? action : item))
        : prev.actions
      return { ...prev, form: { ...nextForm, condition: nextForm.condition || {} }, actions: nextActions }
    })
  }, [])

  const setEventType = useCallback((eventType: AutomationRule['event_type']) => {
    setState(prev => {
      if (prev.form.event_type === eventType) return prev
      return {
        ...prev,
        form: { ...prev.form, event_type: eventType, condition: getTrigger(eventType)?.defaultCondition() || {} },
        actions: sanitizeWhatsAppRecipient(prev.actions, eventType),
      }
    })
  }, [])

  const addAction = useCallback((action: Action) => {
    setState(prev => ({ ...prev, actions: [...prev.actions, action], editingIndex: prev.actions.length }))
  }, [])

  const removeAction = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
      editingIndex: prev.editingIndex === index ? null
        : prev.editingIndex !== null && prev.editingIndex > index ? prev.editingIndex - 1
          : prev.editingIndex,
    }))
  }, [])

  const moveAction = useCallback((index: number, direction: -1 | 1) => {
    setState(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.actions.length) return prev
      const next = [...prev.actions]
      ;[next[index], next[target]] = [next[target], next[index]]
      const editing = prev.editingIndex === index ? target : prev.editingIndex === target ? index : prev.editingIndex
      return { ...prev, actions: next, editingIndex: editing }
    })
  }, [])

  const setEditingIndex = useCallback((index: number | null) => {
    setState(prev => ({ ...prev, editingIndex: index }))
  }, [])

  /** Mesmo formato salvo hoje: `action` (legado) é a primeira ação e `actions` a lista completa. */
  const buildPayload = useCallback((): CreateAutomationRuleData => ({
    ...state.form,
    action: actions[0],
    actions,
  }), [state.form, actions])

  return { form, setForm, actions, editingIndex, setEditingIndex, setEventType, addAction, removeAction, moveAction, buildPayload }
}
