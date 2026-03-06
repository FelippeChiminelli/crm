import type { AvailableMetric, CalculationNodeFilters } from '../../../../types'

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
  origins: boolean
  instances: boolean
  status: boolean
  priority: boolean
}

export function getMetricFilterCapabilities(metric: AvailableMetric): MetricFilterCapabilities {
  const key = metric.key
  const category = metric.category

  if (category === 'chat') {
    return { responsibles: false, pipelines: false, origins: false, instances: true, status: false, priority: false }
  }

  if (category === 'tasks') {
    return { responsibles: true, pipelines: true, origins: false, instances: false, status: true, priority: true }
  }

  if (category === 'sales' || category === 'losses') {
    return { responsibles: true, pipelines: true, origins: true, instances: false, status: false, priority: false }
  }

  if (category === 'pipeline') {
    return { responsibles: true, pipelines: true, origins: true, instances: false, status: true, priority: false }
  }

  if (category === 'leads' || key.startsWith('custom_field_')) {
    return { responsibles: true, pipelines: true, origins: true, instances: false, status: true, priority: false }
  }

  return { responsibles: false, pipelines: false, origins: false, instances: false, status: false, priority: false }
}

export function hasAnyFilterCapability(cap: MetricFilterCapabilities): boolean {
  return cap.responsibles || cap.pipelines || cap.origins || cap.instances || cap.status || cap.priority
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
    filters.task_type_id
  ]
  return groups.reduce((sum, current) => sum + (current?.length ? 1 : 0), 0)
}
