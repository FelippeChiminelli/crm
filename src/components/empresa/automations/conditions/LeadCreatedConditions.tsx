import { PipelineStageCondition } from './PipelineStageCondition'
import { ResponsibleCondition } from './ResponsibleCondition'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function LeadCreatedConditions() {
  const { form, setForm, pipelines, idleStages, profiles } = useAutomationEditor()
  return (
    <>
      {/* Condições para gatilho de lead criado */}
      {form.event_type === 'lead_created' && (
        <div className="md:col-span-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
            <p className="text-sm text-amber-700">
              Esta automação é executada no servidor sempre que um lead for criado, por qualquer origem: cadastro no CRM, importação de planilha, API, chat ou outra automação. Ações que dependem de confirmação em modal não estão disponíveis para este gatilho.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <PipelineStageCondition
              accent="amber"
              pipelines={pipelines}
              stages={idleStages}
              selectedPipelineIds={((form.condition as any).pipeline_ids as string[]) || []}
              selectedStageIds={((form.condition as any).stage_ids as string[]) || []}
              pipelineHelpText="Dispara apenas para leads criados nestes pipelines. Deixe vazio para todos."
              stageHelpText="Dispara apenas para leads criados nestes estágios. Deixe vazio para qualquer estágio."
              onChangePipelines={(next) => {
                setForm(prev => ({
                  ...prev,
                  condition: {
                    ...prev.condition,
                    pipeline_ids: next.length > 0 ? next : undefined,
                    stage_ids: undefined,
                  }
                }))
              }}
              onChangeStages={(next) => {
                setForm(prev => ({
                  ...prev,
                  condition: {
                    ...prev.condition,
                    stage_ids: next.length > 0 ? next : undefined,
                  }
                }))
              }}
            />

            <ResponsibleCondition
              accent="amber"
              profiles={profiles}
              selectedIds={((form.condition as any).responsible_uuids as string[]) || []}
              label="Responsável inicial"
              helpText="Dispara apenas quando o lead for criado com um destes responsáveis. Deixe vazio para qualquer responsável."
              onChange={(next) => {
                setForm(prev => ({
                  ...prev,
                  condition: {
                    ...prev.condition,
                    responsible_uuids: next.length > 0 ? next : undefined,
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
