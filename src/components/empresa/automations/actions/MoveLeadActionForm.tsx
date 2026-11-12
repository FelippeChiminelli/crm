import { PipelineSingleSelect } from '../ui/PipelineSingleSelect'
import { StageSingleSelect } from '../ui/StageSingleSelect'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function MoveLeadActionForm() {
  const { form, setForm, pipelines, targetStages } = useAutomationEditor()
  return (
    <>
      {(form.action as any).type === 'move_lead' && (
        <>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Pipeline destino</label>
            <PipelineSingleSelect
              pipelines={pipelines}
              value={(form.action as any).target_pipeline_id || ''}
              placeholder="Selecione"
              onChange={(value) => {
                setForm(prev => ({ ...prev, action: { ...prev.action, target_pipeline_id: value, target_stage_id: '' } }))
              }}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Etapa destino</label>
            <StageSingleSelect
              stages={targetStages}
              value={(form.action as any).target_stage_id || ''}
              placeholder="Selecione"
              onChange={(v) => setForm(prev => ({ ...prev, action: { ...prev.action, target_stage_id: v } }))}
            />
          </div>
        </>
      )}
    </>
  )
}
