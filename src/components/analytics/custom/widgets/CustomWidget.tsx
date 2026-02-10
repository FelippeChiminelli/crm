import { useState, useEffect } from 'react'
import { 
  PencilIcon, 
  TrashIcon,
  EllipsisVerticalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts'
import type { DashboardWidget, DashboardWidgetConfig, AnalyticsPeriod, CustomFieldStatusFilter } from '../../../../types'
import { useWidgetData } from './useWidgetData'
import { isCustomFieldMetric } from './index'

// Labels de filtro de status
const STATUS_FILTER_LABELS: Record<CustomFieldStatusFilter, string> = {
  all: 'Todos',
  active: 'Ativos',
  sold: 'Vendidos',
  lost: 'Perdidos'
}

interface CustomWidgetProps {
  widget: DashboardWidget
  period: AnalyticsPeriod
  canEdit: boolean
  onEdit?: (widget: DashboardWidget) => void
  onDelete?: (widgetId: string) => void
}

// Paleta de cores para gráficos
const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EF4444', // red
  '#06B6D4', // cyan
  '#F97316', // orange
  '#EC4899', // pink
  '#6366F1', // indigo
  '#84CC16', // lime
]

export function CustomWidget({
  widget,
  period,
  canEdit,
  onEdit,
  onDelete
}: CustomWidgetProps) {
  const [showMenu, setShowMenu] = useState(false)
  const { data, loading, error } = useWidgetData(widget.metric_key, period, widget.config, widget.widget_type)

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false)
    if (showMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showMenu])

  // Loading state
  if (loading) {
    return (
      <div className="h-full bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-full bg-gray-100 rounded"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-full bg-white rounded-lg border border-red-200 p-4">
        <div className="h-full flex items-center justify-center text-red-500 text-sm">
          Erro ao carregar dados
        </div>
      </div>
    )
  }

  // Renderizar conteúdo baseado no tipo
  const renderContent = () => {
    switch (widget.widget_type) {
      case 'kpi':
        return <KPIContent data={data} />
      case 'bar_chart':
        return <BarChartContent data={data} config={widget.config} />
      case 'line_chart':
        return <LineChartContent data={data} config={widget.config} />
      case 'pie_chart':
        return <PieChartContent data={data} config={widget.config} />
      case 'table':
        return <TableContent data={data} config={widget.config} />
      case 'funnel':
        return <FunnelContent data={data} config={widget.config} />
      default:
        return <div className="text-gray-500">Tipo de widget não suportado</div>
    }
  }

  // Verificar se é campo personalizado e tem filtro de status
  const isCustomField = isCustomFieldMetric(widget.metric_key)
  const statusFilter = widget.config?.statusFilter as CustomFieldStatusFilter | undefined
  const showStatusIndicator = isCustomField && statusFilter && statusFilter !== 'all'

  return (
    <div className={`h-full bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden group ${
      isCustomField ? 'border-cyan-200' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isCustomField ? 'border-cyan-100 bg-cyan-50/30' : 'border-gray-100 bg-gray-50/50'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {widget.title}
          </h3>
          
          {/* Badge de campo personalizado */}
          {isCustomField && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-medium bg-cyan-100 text-cyan-700 rounded">
              Campo
            </span>
          )}
          
          {/* Indicador de filtro de status */}
          {showStatusIndicator && (
            <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium bg-purple-100 text-purple-700 rounded">
              <FunnelIcon className="w-3 h-3" />
              {STATUS_FILTER_LABELS[statusFilter]}
            </span>
          )}
        </div>
        
        {canEdit && (
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <button
                  onClick={() => {
                    onEdit?.(widget)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    onDelete?.(widget.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {renderContent()}
      </div>
    </div>
  )
}

// =====================================================
// COMPONENTES DE CONTEÚDO
// =====================================================

interface KPIContentProps {
  data: any
}

function KPIContent({ data }: KPIContentProps) {
  if (!data) return <div className="text-gray-500 text-center">Sem dados</div>

  const { value, formatted, trend, trendValue, subtitle } = data

  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-3xl font-bold text-gray-900">{formatted || value}</p>
      
      <div className="flex items-center gap-2 mt-2">
        {subtitle && (
          <span className="text-sm text-gray-500">{subtitle}</span>
        )}
        
        {trend && trendValue && (
          <div className="flex items-center gap-1">
            {trend === 'up' && (
              <>
                <ArrowUpIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">{trendValue}</span>
              </>
            )}
            {trend === 'down' && (
              <>
                <ArrowDownIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-500">{trendValue}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface ChartContentProps {
  data: any
  config: DashboardWidgetConfig
}

function BarChartContent({ data, config }: ChartContentProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Nenhum dado disponível
      </div>
    )
  }

  const dataKey = Object.keys(data[0]).find(k => k !== 'name' && k !== 'label') || 'value'
  const nameKey = data[0].name !== undefined ? 'name' : 'label'

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey={nameKey}
          tick={{ fontSize: 11 }}
          stroke="#666"
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fontSize: 11 }} stroke="#666" />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            fontSize: '12px'
          }}
        />
        {config.showLegend && <Legend />}
        <Bar 
          dataKey={dataKey}
          fill={CHART_COLORS[0]}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

function LineChartContent({ data, config }: ChartContentProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Nenhum dado disponível
      </div>
    )
  }

  const dataKey = Object.keys(data[0]).find(k => k !== 'date' && k !== 'label') || 'value'

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date"
          tick={{ fontSize: 11 }}
          stroke="#666"
        />
        <YAxis tick={{ fontSize: 11 }} stroke="#666" />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            fontSize: '12px'
          }}
        />
        {config.showLegend && <Legend />}
        <Line 
          type="monotone" 
          dataKey={dataKey}
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS[0], r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function PieChartContent({ data, config }: ChartContentProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Nenhum dado disponível
      </div>
    )
  }

  const valueKey = Object.keys(data[0]).find(k => k !== 'name' && k !== 'label') || 'value'

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: any) => `${props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`}
          outerRadius="80%"
          dataKey={valueKey}
          nameKey="name"
        >
          {data.map((_: any, index: number) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            fontSize: '12px'
          }}
        />
        {config.showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  )
}

function TableContent({ data }: ChartContentProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Nenhum dado disponível
      </div>
    )
  }

  // Extrair colunas dos dados
  const columns = Object.keys(data[0])

  // Mapear nomes de colunas para labels mais amigáveis
  const columnLabels: Record<string, string> = {
    name: 'Nome',
    label: 'Descrição',
    value: 'Valor',
    count: 'Quantidade',
    total: 'Total',
    percentage: '%',
    total_value: 'Valor Total',
    average_value: 'Valor Médio',
    conversion_rate: 'Conversão'
  }

  return (
    <div className="h-full overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {columns.map(col => (
              <th
                key={col}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {columnLabels[col] || col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row: any, idx: number) => (
            <tr key={idx} className="hover:bg-gray-50">
              {columns.map(col => (
                <td key={col} className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                  {formatCellValue(row[col], col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FunnelContent({ data }: ChartContentProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Nenhum dado disponível
      </div>
    )
  }

  // Dados do funil com cores
  const funnelData = data.map((item: any, index: number) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length]
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <FunnelChart>
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            fontSize: '12px'
          }}
        />
        <Funnel
          dataKey="value"
          data={funnelData}
          isAnimationActive
        >
          <LabelList 
            position="right" 
            fill="#000" 
            stroke="none" 
            dataKey="name"
            fontSize={12}
          />
          <LabelList 
            position="center" 
            fill="#fff" 
            stroke="none" 
            dataKey="value"
            fontSize={14}
            fontWeight="bold"
          />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  )
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function formatCellValue(value: any, column: string): string {
  if (value === null || value === undefined) return '-'
  
  // Formatar valores monetários
  if (column.includes('value') || column.includes('price') || column.includes('total')) {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    }
  }
  
  // Formatar percentuais
  if (column.includes('percentage') || column.includes('rate') || column.includes('conversion')) {
    if (typeof value === 'number') {
      return `${value.toFixed(1)}%`
    }
  }
  
  // Formatar números
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR').format(value)
  }
  
  return String(value)
}
