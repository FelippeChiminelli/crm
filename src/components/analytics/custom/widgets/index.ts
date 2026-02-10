import type { AvailableMetric, WidgetTypeDefinition, DashboardWidgetType, MetricCategory, LeadCustomField, DashboardCalculation } from '../../../../types'

// =====================================================
// DEFINIÇÕES DOS TIPOS DE WIDGETS
// =====================================================

export const WIDGET_TYPES: WidgetTypeDefinition[] = [
  {
    type: 'kpi',
    label: 'KPI Card',
    description: 'Exibe uma métrica principal com valor e variação',
    icon: 'ChartBarSquareIcon',
    minWidth: 1,
    minHeight: 1,
    maxWidth: 4,
    maxHeight: 2,
    defaultWidth: 2,
    defaultHeight: 1
  },
  {
    type: 'bar_chart',
    label: 'Gráfico de Barras',
    description: 'Comparação entre categorias',
    icon: 'ChartBarIcon',
    minWidth: 2,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 4,
    defaultWidth: 4,
    defaultHeight: 2
  },
  {
    type: 'line_chart',
    label: 'Gráfico de Linha',
    description: 'Evolução ao longo do tempo',
    icon: 'ArrowTrendingUpIcon',
    minWidth: 2,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 4,
    defaultWidth: 4,
    defaultHeight: 2
  },
  {
    type: 'pie_chart',
    label: 'Gráfico de Pizza',
    description: 'Distribuição proporcional',
    icon: 'ChartPieIcon',
    minWidth: 2,
    minHeight: 2,
    maxWidth: 6,
    maxHeight: 4,
    defaultWidth: 3,
    defaultHeight: 2
  },
  {
    type: 'table',
    label: 'Tabela',
    description: 'Dados detalhados em formato tabular',
    icon: 'TableCellsIcon',
    minWidth: 2,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 6,
    defaultWidth: 4,
    defaultHeight: 3
  },
  {
    type: 'funnel',
    label: 'Funil',
    description: 'Visualização de funil de conversão',
    icon: 'FunnelIcon',
    minWidth: 2,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 4,
    defaultWidth: 6,
    defaultHeight: 3
  }
]

// =====================================================
// CATÁLOGO DE MÉTRICAS DISPONÍVEIS
// =====================================================

export const AVAILABLE_METRICS: AvailableMetric[] = [
  // =====================================================
  // MÉTRICAS DE LEADS
  // =====================================================
  {
    key: 'leads_total',
    label: 'Total de Leads',
    description: 'Quantidade total de leads no período',
    category: 'leads',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'leads_active',
    label: 'Leads Ativos',
    description: 'Quantidade de leads em andamento',
    category: 'leads',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'leads_total_value',
    label: 'Valor Total de Leads',
    description: 'Soma do valor de todos os leads',
    category: 'leads',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'leads_average_value',
    label: 'Valor Médio por Lead',
    description: 'Média do valor dos leads',
    category: 'leads',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'leads_by_pipeline',
    label: 'Leads por Pipeline',
    description: 'Distribuição de leads por funil',
    category: 'leads',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'leads_by_origin',
    label: 'Leads por Origem',
    description: 'Distribuição de leads por fonte de origem',
    category: 'leads',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'leads_by_stage',
    label: 'Leads por Estágio',
    description: 'Distribuição de leads por etapa do funil',
    category: 'leads',
    supportedWidgets: ['bar_chart', 'funnel', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'leads_over_time',
    label: 'Evolução de Leads',
    description: 'Quantidade de leads ao longo do tempo',
    category: 'leads',
    supportedWidgets: ['line_chart', 'bar_chart'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'leads_conversion_rate',
    label: 'Taxa de Conversão',
    description: 'Percentual de leads convertidos em vendas',
    category: 'leads',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'leads_conversion_by_stage',
    label: 'Conversão por Estágio',
    description: 'Taxa de conversão entre estágios',
    category: 'leads',
    supportedWidgets: ['table', 'funnel'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'leads_time_per_stage',
    label: 'Tempo por Estágio',
    description: 'Tempo médio em cada estágio do funil',
    category: 'leads',
    supportedWidgets: ['bar_chart', 'table'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'leads_pipeline_funnel',
    label: 'Funil de Pipeline',
    description: 'Funil de conversão completo do pipeline',
    category: 'leads',
    supportedWidgets: ['funnel'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  
  // =====================================================
  // MÉTRICAS DE VENDAS
  // =====================================================
  {
    key: 'sales_total',
    label: 'Total de Vendas',
    description: 'Quantidade de vendas confirmadas',
    category: 'sales',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'sales_total_value',
    label: 'Valor Total Vendido',
    description: 'Soma do valor de todas as vendas',
    category: 'sales',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'sales_average_ticket',
    label: 'Ticket Médio',
    description: 'Valor médio por venda',
    category: 'sales',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'sales_by_origin',
    label: 'Vendas por Origem',
    description: 'Distribuição de vendas por fonte',
    category: 'sales',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'sales_by_responsible',
    label: 'Vendas por Vendedor',
    description: 'Vendas por responsável',
    category: 'sales',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'sales_over_time',
    label: 'Evolução de Vendas',
    description: 'Vendas ao longo do tempo',
    category: 'sales',
    supportedWidgets: ['line_chart', 'bar_chart'],
    defaultConfig: { showLegend: false }
  },
  
  // =====================================================
  // MÉTRICAS DE PERDAS
  // =====================================================
  {
    key: 'losses_total',
    label: 'Total de Perdas',
    description: 'Quantidade de leads perdidos',
    category: 'losses',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'losses_total_value',
    label: 'Valor Perdido',
    description: 'Soma do valor de leads perdidos',
    category: 'losses',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'losses_by_origin',
    label: 'Perdas por Origem',
    description: 'Distribuição de perdas por fonte',
    category: 'losses',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'losses_by_responsible',
    label: 'Perdas por Responsável',
    description: 'Perdas por vendedor',
    category: 'losses',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'losses_by_reason',
    label: 'Perdas por Motivo',
    description: 'Distribuição de perdas por motivo',
    category: 'losses',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'losses_over_time',
    label: 'Evolução de Perdas',
    description: 'Perdas ao longo do tempo',
    category: 'losses',
    supportedWidgets: ['line_chart', 'bar_chart'],
    defaultConfig: { showLegend: false }
  },
  
  // =====================================================
  // MÉTRICAS DE CHAT
  // =====================================================
  {
    key: 'chat_total_conversations',
    label: 'Total de Conversas',
    description: 'Quantidade total de conversas',
    category: 'chat',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'chat_avg_response_time',
    label: 'Tempo Médio de Resposta',
    description: 'Tempo médio para primeira resposta',
    category: 'chat',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'chat_avg_first_contact',
    label: 'Tempo 1º Contato',
    description: 'Tempo médio até primeiro contato proativo',
    category: 'chat',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'chat_by_instance',
    label: 'Conversas por Instância',
    description: 'Distribuição por instância WhatsApp',
    category: 'chat',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'chat_response_by_instance',
    label: 'Tempo Resposta por Instância',
    description: 'Tempo de resposta por instância',
    category: 'chat',
    supportedWidgets: ['bar_chart', 'table'],
    defaultConfig: { showLegend: false }
  },
  
  // =====================================================
  // MÉTRICAS DE TAREFAS
  // =====================================================
  {
    key: 'tasks_total',
    label: 'Total de Tarefas',
    description: 'Quantidade total de tarefas',
    category: 'tasks',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'tasks_completion_rate',
    label: 'Taxa de Conclusão',
    description: 'Percentual de tarefas concluídas',
    category: 'tasks',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'tasks_overdue',
    label: 'Tarefas Atrasadas',
    description: 'Quantidade de tarefas em atraso',
    category: 'tasks',
    supportedWidgets: ['kpi', 'table'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'tasks_avg_completion_time',
    label: 'Tempo Médio de Conclusão',
    description: 'Tempo médio para concluir tarefas',
    category: 'tasks',
    supportedWidgets: ['kpi'],
    defaultConfig: { showLegend: false }
  },
  {
    key: 'tasks_by_status',
    label: 'Tarefas por Status',
    description: 'Distribuição por status',
    category: 'tasks',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'tasks_by_priority',
    label: 'Tarefas por Prioridade',
    description: 'Distribuição por prioridade',
    category: 'tasks',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'tasks_by_type',
    label: 'Tarefas por Tipo',
    description: 'Distribuição por tipo de tarefa',
    category: 'tasks',
    supportedWidgets: ['bar_chart', 'pie_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'tasks_by_user',
    label: 'Produtividade por Usuário',
    description: 'Tarefas por responsável',
    category: 'tasks',
    supportedWidgets: ['bar_chart', 'table'],
    defaultConfig: { showLegend: true, showValues: true }
  },
  {
    key: 'tasks_over_time',
    label: 'Evolução de Tarefas',
    description: 'Tarefas ao longo do tempo',
    category: 'tasks',
    supportedWidgets: ['line_chart', 'bar_chart'],
    defaultConfig: { showLegend: false }
  }
]

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Obter definição de tipo de widget
 */
export function getWidgetTypeDefinition(type: DashboardWidgetType): WidgetTypeDefinition | undefined {
  return WIDGET_TYPES.find(w => w.type === type)
}

/**
 * Obter métrica por chave
 */
export function getMetricByKey(key: string): AvailableMetric | undefined {
  return AVAILABLE_METRICS.find(m => m.key === key)
}

/**
 * Filtrar métricas por categoria
 */
export function getMetricsByCategory(category: MetricCategory): AvailableMetric[] {
  return AVAILABLE_METRICS.filter(m => m.category === category)
}

/**
 * Filtrar métricas por tipo de widget suportado
 */
export function getMetricsForWidgetType(widgetType: DashboardWidgetType): AvailableMetric[] {
  return AVAILABLE_METRICS.filter(m => m.supportedWidgets.includes(widgetType))
}

/**
 * Obter widgets suportados para uma métrica
 */
export function getSupportedWidgetsForMetric(metricKey: string): WidgetTypeDefinition[] {
  const metric = getMetricByKey(metricKey)
  if (!metric) return []
  return WIDGET_TYPES.filter(w => metric.supportedWidgets.includes(w.type))
}

/**
 * Labels das categorias
 */
export const CATEGORY_LABELS: Record<MetricCategory, string> = {
  leads: 'Leads',
  sales: 'Vendas',
  losses: 'Perdas',
  chat: 'Chat / WhatsApp',
  tasks: 'Tarefas',
  custom_fields: 'Campos Personalizados',
  calculations: 'Cálculos'
}

/**
 * Cores das categorias
 */
export const CATEGORY_COLORS: Record<MetricCategory, string> = {
  leads: 'purple',
  sales: 'green',
  losses: 'red',
  chat: 'emerald',
  tasks: 'orange',
  custom_fields: 'cyan',
  calculations: 'amber'
}

/**
 * Ícones das categorias (nome do HeroIcon)
 */
export const CATEGORY_ICONS: Record<MetricCategory, string> = {
  leads: 'UserGroupIcon',
  sales: 'BanknotesIcon',
  losses: 'XCircleIcon',
  chat: 'ChatBubbleLeftRightIcon',
  tasks: 'ClipboardDocumentCheckIcon',
  custom_fields: 'AdjustmentsHorizontalIcon',
  calculations: 'CalculatorIcon'
}

// =====================================================
// CAMPOS PERSONALIZADOS
// =====================================================

/**
 * Mapeamento de tipos de campos para widgets suportados
 */
const CUSTOM_FIELD_WIDGET_MAP: Record<LeadCustomField['type'], DashboardWidgetType[]> = {
  select: ['kpi', 'pie_chart', 'bar_chart', 'table'],
  multiselect: ['kpi', 'pie_chart', 'bar_chart', 'table'],
  number: ['kpi', 'bar_chart', 'line_chart', 'table'],
  date: ['kpi', 'line_chart', 'table'],
  text: ['kpi', 'table'],
  link: ['kpi', 'table'],
  vehicle: ['kpi', 'table']
}

/**
 * Labels para tipos de campos
 */
const CUSTOM_FIELD_TYPE_LABELS: Record<LeadCustomField['type'], string> = {
  select: 'Seleção única',
  multiselect: 'Múltipla seleção',
  number: 'Numérico',
  date: 'Data',
  text: 'Texto',
  link: 'Link',
  vehicle: 'Veículo'
}

/**
 * Prefixo usado para identificar métricas de campos personalizados
 */
export const CUSTOM_FIELD_METRIC_PREFIX = 'custom_field_'

/**
 * Verificar se uma métrica é de campo personalizado
 */
export function isCustomFieldMetric(metricKey: string): boolean {
  return metricKey.startsWith(CUSTOM_FIELD_METRIC_PREFIX)
}

/**
 * Extrair o ID do campo a partir da chave da métrica
 */
export function extractCustomFieldId(metricKey: string): string | null {
  if (!isCustomFieldMetric(metricKey)) return null
  return metricKey.replace(CUSTOM_FIELD_METRIC_PREFIX, '')
}

/**
 * Converter campos personalizados em métricas disponíveis
 * Essa função deve ser chamada dinamicamente para obter as métricas
 */
export function convertCustomFieldsToMetrics(customFields: LeadCustomField[]): AvailableMetric[] {
  return customFields.map(field => ({
    key: `${CUSTOM_FIELD_METRIC_PREFIX}${field.id}`,
    label: field.name,
    description: `Análise do campo personalizado "${field.name}" (${CUSTOM_FIELD_TYPE_LABELS[field.type]})`,
    category: 'custom_fields' as MetricCategory,
    supportedWidgets: CUSTOM_FIELD_WIDGET_MAP[field.type] || ['table'],
    defaultConfig: { 
      showLegend: true, 
      showValues: true,
      customFieldId: field.id,
      statusFilter: 'all'
    },
    // Propriedade extra para identificar como campo personalizado
    isCustomField: true,
    customFieldType: field.type,
    customFieldOptions: field.options
  } as AvailableMetric & { 
    isCustomField: boolean
    customFieldType: LeadCustomField['type']
    customFieldOptions?: string[]
  }))
}

/**
 * Obter todas as métricas incluindo campos personalizados
 */
export function getAllMetricsWithCustomFields(customFields: LeadCustomField[]): AvailableMetric[] {
  const customFieldMetrics = convertCustomFieldsToMetrics(customFields)
  
  // Campos personalizados vão em sua própria categoria no final
  return [...AVAILABLE_METRICS, ...customFieldMetrics]
}

/**
 * Obter todas as métricas incluindo campos personalizados e cálculos
 */
export function getAllMetricsWithAll(
  customFields: LeadCustomField[],
  calculations: DashboardCalculation[]
): AvailableMetric[] {
  const customFieldMetrics = convertCustomFieldsToMetrics(customFields)
  const calculationMetrics = convertCalculationsToMetrics(calculations)
  
  return [...AVAILABLE_METRICS, ...customFieldMetrics, ...calculationMetrics]
}

/**
 * Obter widgets suportados para um campo personalizado
 */
export function getSupportedWidgetsForCustomField(fieldType: LeadCustomField['type']): WidgetTypeDefinition[] {
  const supportedTypes = CUSTOM_FIELD_WIDGET_MAP[fieldType] || ['table']
  return WIDGET_TYPES.filter(w => supportedTypes.includes(w.type))
}

// =====================================================
// CÁLCULOS PERSONALIZADOS
// =====================================================

/**
 * Prefixo para identificar métricas de cálculos personalizados
 */
export const CALCULATION_METRIC_PREFIX = 'calc_'

/**
 * Verificar se uma métrica é de cálculo personalizado
 */
export function isCalculationMetric(metricKey: string): boolean {
  return metricKey.startsWith(CALCULATION_METRIC_PREFIX)
}

/**
 * Extrair o ID do cálculo a partir da chave da métrica
 */
export function extractCalculationId(metricKey: string): string | null {
  if (!isCalculationMetric(metricKey)) return null
  return metricKey.replace(CALCULATION_METRIC_PREFIX, '')
}

/**
 * Converter cálculos em métricas disponíveis
 */
export function convertCalculationsToMetrics(calculations: DashboardCalculation[]): AvailableMetric[] {
  return calculations.map(calc => {
    const formatLabel = {
      number: 'Numérico',
      currency: 'Moeda',
      percentage: 'Percentual'
    }[calc.result_format]

    return {
      key: `${CALCULATION_METRIC_PREFIX}${calc.id}`,
      label: calc.name,
      description: calc.description || `Cálculo personalizado (${formatLabel})`,
      category: 'calculations' as MetricCategory,
      supportedWidgets: ['kpi', 'line_chart'] as DashboardWidgetType[],
      defaultConfig: {
        calculationId: calc.id
      }
    }
  })
}
