import { getStageChangePipelineId, setStageChangePipeline } from './stageChangePipeline'
import { PipelineSingleSelect } from '../ui/PipelineSingleSelect'
import { StageSingleSelect } from '../ui/StageSingleSelect'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function StageChangedConditions() {
  const { form, setForm, pipelines, fromStages, toStages } = useAutomationEditor()
  return (
    <>
      {/* Condições para evento de mudança de etapa */}
      {form.event_type === 'lead_stage_changed' && (
        <div className="md:col-span-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">De pipeline</label>
              <PipelineSingleSelect
                pipelines={pipelines}
                value={getStageChangePipelineId(form.condition, 'from')}
                allowEmpty
                placeholder="Qualquer"
                onChange={(value) => {
                  setForm(prev => ({ ...prev, condition: setStageChangePipeline(prev.condition, 'from', value) }))
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Deixe em Qualquer para não filtrar por pipeline.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">De etapa</label>
              <StageSingleSelect
                stages={fromStages}
                value={(form.condition as any).from_stage_id || ''}
                allowEmpty
                placeholder="Qualquer"
                onChange={(v) => setForm(prev => ({ ...prev, condition: { ...prev.condition, from_stage_id: v } }))}
              />
            </div>
            <div></div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Para pipeline</label>
              <PipelineSingleSelect
                pipelines={pipelines}
                value={getStageChangePipelineId(form.condition, 'to')}
                allowEmpty
                placeholder="Qualquer"
                onChange={(value) => {
                  setForm(prev => ({ ...prev, condition: setStageChangePipeline(prev.condition, 'to', value) }))
                }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Para etapa</label>
              <StageSingleSelect
                stages={toStages}
                value={(form.condition as any).to_stage_id || ''}
                allowEmpty
                placeholder="Qualquer"
                onChange={(v) => setForm(prev => ({ ...prev, condition: { ...prev.condition, to_stage_id: v } }))}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
