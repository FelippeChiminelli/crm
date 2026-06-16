import type { AvailableMetric, CalculationNodeFilters } from '../../../../types'
import { isPipelineMetric } from '../widgets/index'

export const TASK_STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'atrasada', label: 'Atrasada' }
]

export const LEAD_STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_negociacao', label: 'Em Negociação' },
  { value: 'venda_confirmada', label: 'Venda Confirmada' },
  { value: 'perdido', label: 'Perdido' }
]

export const TASK_PRIORITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' }
]

export interface MetricFilterCapabilities {
  responsibles: boolean
  pipelines: boolean
  stages: boolean
  origins: boolean
  instances: boolean
  status: boolean
  priority: boolean
  pipelineCountMode: boolean
}

export function getMetricFilterCapabilities(metric: AvailableMetric): MetricFilterCapabilities {
  const key = metric.key
  const category = metric.category
  const none = {
    responsibles: false,
    pipelines: false,
    stages: false,
    origins: false,
    instances: false,
    status: false,
    priority: false,
    pipelineCountMode: false
  }

  if (category === 'chat') {
    return { ...none, instances: true }
  }

  if (category === 'tasks') {
    return { ...none, responsibles: true, pipelines: true, status: true, priority: true }
  }

  if (category === 'sales' || category === 'losses') {
    return { ...none, responsibles: true, pipelines: true, origins: true }
  }

  if (category === 'pipeline' || isPipelineMetric(key)) {
    return {
      ...none,
      responsibles: true,
      pipelines: !isPipelineMetric(key),
      stages: true,
      origins: true,
      status: true,
      pipelineCountMode: true
    }
  }

  if (category === 'leads' || key.startsWith('custom_field_')) {
    return { ...none, responsibles: true, pipelines: true, origins: true, status: true }
  }

  return none
}

export function hasAnyFilterCapability(cap: MetricFilterCapabilities): boolean {
  return (
    cap.responsibles ||
    cap.pipelines ||
    cap.stages ||
    cap.origins ||
    cap.instances ||
    cap.status ||
    cap.priority ||
    cap.pipelineCountMode
  )
}

export function normalizeNodeFilters(filters: CalculationNodeFilters): CalculationNodeFilters | undefined {
  const normalized: CalculationNodeFilters = {}

  if (filters.responsibles?.length) normalized.responsibles = filters.responsibles
  if (filters.pipelines?.length) normalized.pipelines = filters.pipelines
  if (filters.origins?.length) normalized.origins = filters.origins
  if (filters.instances?.length) normalized.instances = filters.instances
  if (filters.status?.length) normalized.status = filters.status
  if (filters.priority?.length) normalized.priority = filters.priority
  if (filters.stages?.length) normalized.stages = filters.stages
  if (filters.task_type_id?.length) normalized.task_type_id = filters.task_type_id
  if (filters.pipelineCountMode) normalized.pipelineCountMode = filters.pipelineCountMode

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

export function countActiveFilters(filters?: CalculationNodeFilters): number {
  if (!filters) return 0
  const groups = [
    filters.responsibles,
    filters.pipelines,
    filters.origins,
    filters.instances,
    filters.status,
    filters.priority,
    filters.stages,
    filters.task_type_id,
    filters.pipelineCountMode ? ['mode'] : undefined
  ]
  return groups.reduce((sum, current) => sum + (current?.length ? 1 : 0), 0)
}
