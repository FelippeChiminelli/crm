import { createContext, useContext, useMemo } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { Stage } from '../../../../types'
import { getStageChangePipelineId } from '../conditions/stageChangePipeline'
import { getStagesOfPipelines } from '../useAutomationLookups'
import type { AutomationLookups } from '../useAutomationLookups'
import type { EditorForm } from '../wizard/useAutomationForm'

export interface AutomationEditorValue extends AutomationLookups {
  form: EditorForm
  setForm: Dispatch<SetStateAction<EditorForm>>
  fromStages: Stage[]
  toStages: Stage[]
  idleStages: Stage[]
  targetStages: Stage[]
  createLeadStages: Stage[]
}

const AutomationEditorContext = createContext<AutomationEditorValue | null>(null)

interface ProviderProps {
  lookups: AutomationLookups
  form: EditorForm
  setForm: Dispatch<SetStateAction<EditorForm>>
  children: ReactNode
}

export function AutomationEditorProvider({ lookups, form, setForm, children }: ProviderProps) {
  const { stageIndex } = lookups
  const condition = form.condition
  const targetPipelineId = form.action?.target_pipeline_id as string | undefined

  const value = useMemo<AutomationEditorValue>(() => {
    const targetStages = getStagesOfPipelines(stageIndex, targetPipelineId)
    return {
      ...lookups,
      form,
      setForm,
      fromStages: getStagesOfPipelines(stageIndex, getStageChangePipelineId(condition, 'from')),
      toStages: getStagesOfPipelines(stageIndex, getStageChangePipelineId(condition, 'to')),
      idleStages: getStagesOfPipelines(stageIndex, condition.pipeline_ids as string[] | undefined),
      targetStages,
      createLeadStages: targetStages,
    }
  }, [lookups, form, setForm, stageIndex, condition, targetPipelineId])

  return <AutomationEditorContext.Provider value={value}>{children}</AutomationEditorContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAutomationEditor(): AutomationEditorValue {
  const ctx = useContext(AutomationEditorContext)
  if (!ctx) throw new Error('useAutomationEditor deve ser usado dentro de AutomationEditorProvider')
  return ctx
}
