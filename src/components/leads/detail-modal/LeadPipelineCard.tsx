import { RectangleStackIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import type { Lead, Pipeline, Stage } from '../../../types'
import { StyledSelect } from '../../ui/StyledSelect'
import { SectionCard } from './SectionCard'
import { fieldLabel } from './fieldStyles'
import type { EditableFields } from '../../../hooks/useLeadDetailModal'

interface LeadPipelineCardProps {
  lead: Lead
  isEditing: boolean
  editedFields: EditableFields
  updateField: (field: keyof EditableFields, value: string | number) => void
  pipelines: Pipeline[]
  allPipelinesForTransfer: Pipeline[]
  availableStages: Stage[]
  currentLeadStages: Stage[]
  currentStage?: Stage
  loadingStages: boolean
  isReadOnly: boolean
  changingStageId: string | null
  onQuickStageChange: (stageId: string) => void
}

type StepState = 'completed' | 'current' | 'upcoming'

function StageStep({ name, index, state, clickable, loading, onClick, isLast }: {
  name: string
  index: number
  state: StepState
  clickable: boolean
  loading: boolean
  onClick: () => void
  isLast: boolean
}) {
  const circle =
    state === 'completed'
      ? 'bg-indigo-500 text-white border-indigo-500'
      : state === 'current'
        ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100'
        : 'bg-white text-gray-400 border-gray-300'

  const text =
    state === 'current'
      ? 'text-indigo-700 font-semibold'
      : state === 'completed'
        ? 'text-gray-700'
        : 'text-gray-500'

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center self-stretch">
        <span className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-semibold flex-shrink-0 transition-colors ${circle}`}>
          {loading ? (
            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
          ) : state === 'completed' ? (
            <CheckIcon className="w-4 h-4" />
          ) : (
            index + 1
          )}
        </span>
        {!isLast && <span className={`w-0.5 flex-1 my-1 ${state === 'completed' ? 'bg-indigo-300' : 'bg-gray-200'}`} />}
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        className={`flex-1 text-left pb-4 -mt-0.5 ${clickable ? 'cursor-pointer group' : 'cursor-default'}`}
      >
        <span className={`inline-flex items-center gap-2 text-sm ${text} ${clickable ? 'group-hover:text-indigo-700' : ''}`}>
          {name}
          {state === 'current' && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold uppercase tracking-wide">Atual</span>
          )}
        </span>
      </button>
    </div>
  )
}

export function LeadPipelineCard(props: LeadPipelineCardProps) {
  const {
    lead, isEditing, editedFields, updateField,
    pipelines, allPipelinesForTransfer, availableStages,
    currentLeadStages, currentStage, loadingStages,
    isReadOnly, changingStageId, onQuickStageChange,
  } = props

  const pipelineName =
    allPipelinesForTransfer.find(p => p.id === lead.pipeline_id)?.name ||
    pipelines.find(p => p.id === lead.pipeline_id)?.name ||
    '-'

  // Etapas e seleção conforme o modo
  const stages = isEditing ? availableStages : currentLeadStages
  const selectedId = isEditing ? editedFields.stage_id : currentStage?.id
  const currentIndex = stages.findIndex(s => s.id === selectedId)
  const stageNumber = currentIndex >= 0 ? currentIndex + 1 : 0
  const progress = stages.length > 0 && stageNumber > 0 ? Math.round((stageNumber / stages.length) * 100) : 0

  const handleStageClick = (stageId: string) => {
    if (isEditing) {
      updateField('stage_id', stageId)
    } else if (!isReadOnly && changingStageId === null) {
      onQuickStageChange(stageId)
    }
  }

  return (
    <SectionCard title="Pipeline" theme="indigo" icon={RectangleStackIcon} active={isEditing}>
      <div className="space-y-4">
        {/* Pipeline (transferência no modo edição / nome no modo leitura) */}
        <div>
          <label className={fieldLabel}>Pipeline</label>
          {isEditing ? (
            <StyledSelect
              value={editedFields.pipeline_id || ''}
              onChange={(value) => updateField('pipeline_id', value)}
              options={allPipelinesForTransfer.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Pipeline"
              disabled={loadingStages}
              size="sm"
            />
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-indigo-50/70 border border-indigo-100 px-3 py-2">
              <span className="text-sm font-semibold text-indigo-900 truncate">{pipelineName}</span>
              {stages.length > 0 && stageNumber > 0 && (
                <span className="text-xs font-medium text-indigo-600 whitespace-nowrap">
                  Etapa {stageNumber} de {stages.length} · {progress}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stepper de etapas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`${fieldLabel} mb-0`}>Etapas</label>
            {!isEditing && !isReadOnly && stages.length > 0 && (
              <span className="text-[11px] text-gray-400">Clique para mover</span>
            )}
          </div>

          {loadingStages && isEditing ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin" /> Carregando etapas...
            </div>
          ) : stages.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma etapa disponível.</p>
          ) : (
            <div className="pt-1">
              {stages.map((stage, idx) => {
                const state: StepState = idx < currentIndex ? 'completed' : idx === currentIndex ? 'current' : 'upcoming'
                const clickable = isEditing || (!isReadOnly && changingStageId === null)
                return (
                  <StageStep
                    key={stage.id}
                    name={stage.name}
                    index={idx}
                    state={state}
                    clickable={clickable}
                    loading={changingStageId === stage.id}
                    onClick={() => handleStageClick(stage.id)}
                    isLast={idx === stages.length - 1}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        {stages.length > 0 && (
          <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Progresso</span>
              <span className="text-xs text-gray-500">{stageNumber}/{stages.length} · {progress}%</span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
