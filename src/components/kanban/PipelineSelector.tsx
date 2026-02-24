import type { Pipeline } from '../../types'
import { StyledSelect } from '../ui/StyledSelect'

interface PipelineSelectorProps {
  pipelines: Pipeline[]
  selectedPipeline: string
  onPipelineChange: (pipelineId: string) => void
}

export function PipelineSelector({ 
  pipelines, 
  selectedPipeline, 
  onPipelineChange 
}: PipelineSelectorProps) {
  const options = [
    {
      value: '',
      label: 'Selecione um funil',
      description: 'Escolha um funil para visualizar os leads'
    },
    ...pipelines.map(pipeline => ({
      value: pipeline.id,
      label: pipeline.name,
      badge: pipeline.active ? 'Ativo' : 'Inativo'
    }))
  ]

  return (
    <StyledSelect
      options={options}
      value={selectedPipeline}
      onChange={onPipelineChange}
      placeholder="Selecione um funil"
      className="w-full sm:min-w-[175px] lg:min-w-[185px] sm:w-auto"
    />
  )
} 