import { RectangleStackIcon } from '@heroicons/react/24/outline'
import { StyledSelect } from '../../ui/StyledSelect'
import type { Lead, Pipeline, Stage } from '../../../types'

interface LeadPipelineSectionProps {
  lead: Lead
  isEditing: boolean
  editedFields: Partial<Lead>
  onFieldChange: (field: string, value: any) => void
  onPipelineChange: (pipelineId: string) => void
  pipelines: Pipeline[]
  stages: Stage[]
}

export function LeadPipelineSection({
  lead,
  isEditing,
  editedFields,
  onFieldChange,
  onPipelineChange,
  pipelines,
  stages,
}: LeadPipelineSectionProps) {
  const currentStage = stages.find(s => s.id === lead.stage_id)
  const currentStageIndex = stages.findIndex(s => s.id === lead.stage_id)
  const sortedStages = [...stages].sort((a, b) => a.position - b.position)

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <RectangleStackIcon className="w-4 h-4 text-gray-500" />
          Pipeline e Estágio
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pipeline</label>
            <StyledSelect
              value={editedFields.pipeline_id || lead.pipeline_id}
              onChange={(val) => onPipelineChange(val)}
              options={pipelines.map(p => ({ value: p.id, label: p.name }))}
              size="sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estágio</label>
            <StyledSelect
              value={editedFields.stage_id || lead.stage_id}
              onChange={(val) => onFieldChange('stage_id', val)}
              options={sortedStages.map(s => ({ value: s.id, label: s.name }))}
              size="sm"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <RectangleStackIcon className="w-4 h-4 text-gray-500" />
        Pipeline e Estágio
      </h3>

      {/* Barra de progresso visual */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {sortedStages.map((stage, index) => {
            const isCurrent = stage.id === lead.stage_id
            const isPast = index < currentStageIndex

            return (
              <div key={stage.id} className="flex items-center gap-1.5 flex-shrink-0">
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isCurrent
                      ? 'text-white shadow-sm'
                      : isPast
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                  style={isCurrent ? { backgroundColor: stage.color } : undefined}
                >
                  {stage.name}
                </div>
                {index < sortedStages.length - 1 && (
                  <div className={`w-4 h-0.5 flex-shrink-0 ${isPast ? 'bg-gray-300' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {currentStage && (
          <p className="text-xs text-gray-500">
            Estágio atual: <span className="font-medium" style={{ color: currentStage.color }}>{currentStage.name}</span>
            {' '}({currentStageIndex + 1} de {sortedStages.length})
          </p>
        )}
      </div>
    </div>
  )
}
