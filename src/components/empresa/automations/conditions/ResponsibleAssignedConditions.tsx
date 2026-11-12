import { PipelineSingleSelect } from '../ui/PipelineSingleSelect'
import { ResponsibleCondition } from './ResponsibleCondition'
import type { Pipeline } from '../../../../types'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function ResponsibleAssignedConditions() {
  const { form, setForm, pipelines, profiles } = useAutomationEditor()
  return (
    <>
      {/* Condições para evento de responsável atribuído */}
      {form.event_type === 'lead_responsible_assigned' && (
        <div className="md:col-span-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Pipeline</label>
              <PipelineSingleSelect
                pipelines={[{ id: '', name: 'Qualquer pipeline' } as Pipeline, ...pipelines]}
                value={((form.condition as any).pipeline_id || '') as string}
                placeholder="Qualquer pipeline"
                onChange={(value) => {
                  setForm(prev => ({
                    ...prev,
                    condition: {
                      ...prev.condition,
                      pipeline_id: value || undefined
                    }
                  }))
                }}
              />
            </div>

            <ResponsibleCondition
              profiles={profiles}
              selectedIds={((form.condition as any).responsible_uuids as string[]) || []}
              helpText="Selecione um ou mais responsáveis. Deixe vazio para disparar quando qualquer responsável for atribuído."
              onChange={(next) => {
                setForm(prev => ({
                  ...prev,
                  condition: {
                    ...prev.condition,
                    responsible_uuids: next.length > 0 ? next : undefined,
                    responsible_uuid: undefined
                  }
                }))
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
