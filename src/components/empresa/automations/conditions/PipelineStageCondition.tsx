import type { Pipeline, Stage } from '../../../../types'
import { ConditionChip, toggleId, type ConditionAccent } from './ConditionChip'

interface PipelineStageConditionProps {
  pipelines: Pipeline[]
  /** Estágios já carregados para os pipelines selecionados. */
  stages: Stage[]
  selectedPipelineIds: string[]
  selectedStageIds: string[]
  /** Recebe a nova lista de pipelines; o chamador é responsável por recarregar os estágios. */
  onChangePipelines: (pipelineIds: string[]) => void | Promise<void>
  onChangeStages: (stageIds: string[]) => void
  accent?: ConditionAccent
  pipelineHelpText?: string
  stageHelpText?: string
}

/**
 * Multi-select de pipelines + estágios usado pelos gatilhos que filtram por
 * pipeline_ids/stage_ids (lead_created, lead_idle_in_stage).
 */
export function PipelineStageCondition({
  pipelines,
  stages,
  selectedPipelineIds,
  selectedStageIds,
  onChangePipelines,
  onChangeStages,
  accent = 'blue',
  pipelineHelpText = 'Selecione em quais pipelines monitorar. Deixe vazio para todos.',
  stageHelpText = 'Selecione estágios específicos. Deixe vazio para qualquer estágio.',
}: PipelineStageConditionProps) {
  return (
    <>
      <div className="md:col-span-2">
        <label className="block text-sm text-gray-700 mb-1">Pipeline(s)</label>
        <p className="text-xs text-gray-500 mb-2">{pipelineHelpText}</p>
        <div className="flex flex-wrap gap-2">
          {pipelines.map(pipeline => (
            <ConditionChip
              key={pipeline.id}
              label={pipeline.name}
              accent={accent}
              selected={selectedPipelineIds.includes(pipeline.id)}
              onClick={() => onChangePipelines(toggleId(selectedPipelineIds, pipeline.id))}
            />
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm text-gray-700 mb-1">Estágio(s)</label>
        <p className="text-xs text-gray-500 mb-2">{stageHelpText}</p>
        <div className="flex flex-wrap gap-2">
          {stages.map(stage => (
            <ConditionChip
              key={stage.id}
              label={stage.name}
              accent={accent}
              selected={selectedStageIds.includes(stage.id)}
              onClick={() => onChangeStages(toggleId(selectedStageIds, stage.id))}
            />
          ))}
          {stages.length === 0 && (
            <span className="text-xs text-gray-400">
              {selectedPipelineIds.length > 0 ? 'Carregando estágios...' : 'Selecione um pipeline primeiro'}
            </span>
          )}
        </div>
      </div>
    </>
  )
}
