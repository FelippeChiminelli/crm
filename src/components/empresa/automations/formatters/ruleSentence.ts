import { useMemo } from 'react'
import type { AutomationRule } from '../../../../types'
import { getActionTypeLabel } from '../actionCatalog'
import { getTrigger } from '../triggers'
import type { AutomationLookups } from '../useAutomationLookups'
import { createActionFormatter } from './actionText'
import { createConditionFormatter } from './conditionText'

type RuleLike = Pick<AutomationRule, 'event_type' | 'condition' | 'action' | 'actions'>

export interface RuleSentence {
  /** Complemento de "Quando ...". */
  when: string
  /** Complemento de "Se ...", ou o texto padrão do gatilho quando não há filtros. */
  conditions: string
  hasConditions: boolean
  /** Uma descrição por ação, na ordem de execução. */
  actions: string[]
}

export function getRuleActions(rule: Pick<AutomationRule, 'action' | 'actions'>): Record<string, any>[] {
  if (rule.actions && rule.actions.length > 0) return rule.actions
  return rule.action ? [rule.action] : []
}

/** Nome sugerido a partir do gatilho e da primeira ação, ex.: "Mudança de etapa → Enviar WhatsApp". */
export function suggestRuleName(eventType: string, actions: Record<string, any>[]): string {
  const trigger = getTrigger(eventType)?.label || 'Automação'
  return actions[0]?.type ? `${trigger} → ${getActionTypeLabel(actions[0].type)}` : trigger
}

export function useRuleFormatters(lookups: AutomationLookups) {
  return useMemo(() => {
    const formatConditions = createConditionFormatter(lookups)
    const { formatSingleAction } = createActionFormatter(lookups)

    function describeRule(rule: RuleLike): RuleSentence {
      const trigger = getTrigger(rule.event_type)
      const conditionText = formatConditions({ ...rule, condition: rule.condition || {} } as AutomationRule)
      return {
        when: trigger?.sentence || rule.event_type,
        conditions: conditionText || trigger?.defaultConditionText || 'Sem condição específica',
        hasConditions: !!conditionText,
        actions: getRuleActions(rule).map(action => formatSingleAction(action)),
      }
    }

    return { describeRule, formatSingleAction }
  }, [lookups])
}
