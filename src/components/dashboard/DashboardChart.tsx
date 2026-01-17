import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { 
  UserGroupIcon,
  ClockIcon,
  RectangleStackIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import type { Lead } from '../../types'
import { useState } from 'react'

interface DashboardChartProps {
  stats: {
    totalLeads: number
    hotLeads: number
    warmLeads: number
    coldLeads: number
    pendingTasks: number
    inProgressTasks: number
    completedTasks: number
    pipelinesWithLeads?: Array<{
      id: string
      name: string
      description?: string
      leadsCount: number
      active: boolean
    }>
  }
  allLeads?: Lead[] // Adicionando leads reais
}

export function DashboardChart({ stats, allLeads = [] }: DashboardChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7')

  // Função para gerar dados reais baseados nos leads existentes
  const generateRealChartData = (leads: Lead[], days: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Zerar horário para comparação precisa
    const lastDays = []
    
    // Gerar array dos últimos N dias (do mais antigo para o mais recente)
    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (days - 1 - i))
      lastDays.push(date)
    }
    
    // Contar leads criados em cada dia
    const chartData = lastDays.map(date => {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      
      const leadsCreatedOnDay = leads.filter(lead => {
        const leadDate = new Date(lead.created_at)
        
        // Verificar se a data é válida
        if (isNaN(leadDate.getTime())) {
          return false
        }
        
        // Comparação simples: verificar se é o mesmo dia usando toDateString()
        const leadDateString = leadDate.toDateString()
        const dayString = dayStart.toDateString()
        
        return leadDateString === dayString
      })
      
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        total: leadsCreatedOnDay.length
      }
    })
    
    return chartData
  }

  // Gerar dados reais baseados no período selecionado
  const daysToShow = parseInt(selectedPeriod)
  const chartData = allLeads.length > 0 ? generateRealChartData(allLeads, daysToShow) : 
    Array.from({ length: daysToShow }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (daysToShow - 1 - i))
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        total: 0
      }
    })

  const maxValue = Math.max(...chartData.map(d => d.total), 1) // Mínimo de 1 para evitar divisão por zero
  
  // Calcular totais e crescimento
  const totalLeads = chartData.reduce((sum, d) => sum + d.total, 0)
  
  // Gerar valores do eixo Y baseados nos dados reais
  const generateYAxisValues = (max: number) => {
    if (max <= 1) {
      return [1, 0]
    } else if (max <= 2) {
      return [max, Math.ceil(max * 0.5), 0]
    } else if (max <= 3) {
      return [max, Math.ceil(max * 0.7), Math.ceil(max * 0.3), 0]
    } else if (max <= 5) {
      return [max, Math.ceil(max * 0.8), Math.ceil(max * 0.6), Math.ceil(max * 0.4), Math.ceil(max * 0.2), 0]
    } else {
      return [max, Math.ceil(max * 0.8), Math.ceil(max * 0.6), Math.ceil(max * 0.4), Math.ceil(max * 0.2), 0]
    }
  }
  
  const yAxisValues = generateYAxisValues(maxValue)
  
  // Calcular crescimento (comparar primeira metade vs segunda metade do período)
  const halfPoint = Math.floor(chartData.length / 2)
  const firstHalf = chartData.slice(0, halfPoint).reduce((sum, d) => sum + d.total, 0)
  const secondHalf = chartData.slice(halfPoint).reduce((sum, d) => sum + d.total, 0)
  const crescimento = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf * 100).toFixed(1) : '0.0'

  // Dados para o gráfico de tarefas
  const totalTasks = stats.pendingTasks + stats.inProgressTasks + stats.completedTasks
  const taskData = [
    { name: 'Pendentes', value: stats.pendingTasks, color: 'bg-blue-500', percentage: totalTasks > 0 ? (stats.pendingTasks / totalTasks) * 100 : 0 },
    { name: 'Em Andamento', value: stats.inProgressTasks, color: 'bg-orange-500', percentage: totalTasks > 0 ? (stats.inProgressTasks / totalTasks) * 100 : 0 },
    { name: 'Concluídas', value: stats.completedTasks, color: 'bg-green-500', percentage: totalTasks > 0 ? (stats.completedTasks / totalTasks) * 100 : 0 }
  ]

  // Dados simulados para pipelines (caso não existam no stats)
  const pipelines = stats.pipelinesWithLeads || [
    { id: '1', name: 'Vendas B2B', description: 'Pipeline para vendas corporativas', leadsCount: 15, active: true },
    { id: '2', name: 'Vendas B2C', description: 'Pipeline para vendas diretas', leadsCount: 8, active: true },
    { id: '3', name: 'Parcerias', description: 'Pipeline para parcerias estratégicas', leadsCount: 3, active: false }
  ]

  return (
    <div className="space-y-2 sm:space-y-4 w-full">
      {/* Gráfico de Coluna Simplificado */}
      <Card className="w-full">
        <CardHeader className="p-2 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="hidden sm:inline">Evolução de Leads</span>
                <span className="sm:hidden">Leads</span>
              </CardTitle>
              <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                {Number(crescimento) >= 0 ? (
                  <ArrowTrendingUpIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                ) : (
                  <ArrowTrendingDownIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500" />
                )}
                <span className={`font-medium ${Number(crescimento) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {crescimento}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Legenda visual - oculta no mobile */}
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-600">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Novos leads</span>
              </div>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-[10px] sm:text-xs border border-gray-300 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7">7 dias</option>
                <option value="14">14 dias</option>
                <option value="30">30 dias</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 lg:p-6 pt-0">
          <div className="h-40 sm:h-64 relative">
            {/* Eixo Y */}
            <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-12 flex flex-col justify-between text-[8px] sm:text-[10px] text-gray-500">
              {yAxisValues.map((value, index) => (
                <span key={index}>{value}</span>
              ))}
            </div>

            {/* Área do gráfico */}
            <div className="ml-6 sm:ml-12 h-full relative">
              {/* Linhas de grade horizontais */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="border-b border-gray-100"></div>
                ))}
              </div>

              {/* Colunas do gráfico - scrollável no mobile */}
              <div className="absolute inset-0 flex items-end justify-between px-1 sm:px-6 overflow-x-auto">
                {chartData.map((d, i) => {
                  const availableHeight = window.innerWidth < 640 ? 130 : 220
                  const barHeight = d.total > 0 
                    ? Math.max((d.total / maxValue) * availableHeight, 16)
                    : 4
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 sm:gap-3 min-w-[28px] sm:w-16 flex-shrink-0">
                      <div className="flex items-end h-full w-full justify-center">
                        <div 
                          className={`w-5 sm:w-10 bg-gradient-to-t rounded-t-md relative group transition-all duration-200 ${
                            d.total > 0 
                              ? 'from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 shadow-sm' 
                              : 'from-gray-300 to-gray-200'
                          }`}
                          style={{ 
                            height: `${barHeight}px`,
                            minHeight: d.total > 0 ? '16px' : '4px'
                          }}
                        >
                          {d.total > 0 && (
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full opacity-80"></div>
                          )}
                          
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                            {d.total}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <span className="text-[8px] sm:text-[10px] font-medium text-gray-700">{d.date.split(' ')[0]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          
          {/* Resumo dos dados */}
          <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{totalLeads}</div>
              <div className="text-[10px] sm:text-xs text-gray-500">
                Leads nos últimos {daysToShow} dias
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de Distribuição e Pipelines */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-4 w-full">
        {/* Distribuição de Leads */}
        <Card className="w-full">
          <CardHeader className="p-2 sm:p-4 lg:p-6">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
              <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <span className="hidden sm:inline">Distribuição de Leads</span>
              <span className="sm:hidden">Leads</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 lg:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                  <span className="text-[10px] sm:text-xs font-medium">Quentes</span>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-600">{stats.hotLeads}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                <div 
                  className="h-1.5 sm:h-2 bg-red-500 rounded-full"
                  style={{ width: `${(stats.hotLeads / stats.totalLeads) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-[10px] sm:text-xs font-medium">Mornos</span>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-600">{stats.warmLeads}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                <div 
                  className="h-1.5 sm:h-2 bg-yellow-500 rounded-full"
                  style={{ width: `${(stats.warmLeads / stats.totalLeads) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-[10px] sm:text-xs font-medium">Frios</span>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-600">{stats.coldLeads}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                <div 
                  className="h-1.5 sm:h-2 bg-gray-500 rounded-full"
                  style={{ width: `${(stats.coldLeads / stats.totalLeads) * 100}%` }}
                ></div>
              </div>
              
              <div className="pt-1.5 sm:pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-[10px] sm:text-xs">
                  <span className="font-medium text-gray-700">Total</span>
                  <span className="font-bold text-blue-600">{stats.totalLeads}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status das Tarefas */}
        <Card className="w-full">
          <CardHeader className="p-2 sm:p-4 lg:p-6">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
              <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              <span className="hidden sm:inline">Status das Tarefas</span>
              <span className="sm:hidden">Tarefas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 lg:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              {taskData.map((task, index) => (
                <div key={index} className="space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${task.color}`}></div>
                      <span className="text-[10px] sm:text-xs font-medium truncate">{task.name}</span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-600">{task.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className={`h-1.5 sm:h-2 rounded-full ${task.color}`}
                      style={{ width: `${task.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              
              <div className="pt-1.5 sm:pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-[10px] sm:text-xs">
                  <span className="font-medium text-gray-700">Total</span>
                  <span className="font-bold text-orange-600">{totalTasks}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo dos Kanbans/Pipelines */}
      <Card className="w-full">
        <CardHeader className="p-2 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
            <RectangleStackIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            <span className="hidden sm:inline">Resumo dos Kanbans</span>
            <span className="sm:hidden">Kanbans</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 lg:p-6 pt-0">
          {pipelines.length === 0 ? (
            <div className="text-center py-4 sm:py-6">
              <RectangleStackIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-4" />
              <h3 className="text-xs sm:text-base font-medium text-gray-900 mb-1 sm:mb-2">Nenhuma pipeline</h3>
              <p className="text-[10px] sm:text-xs text-gray-500">
                Crie sua primeira pipeline no Kanban.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {pipelines.map((pipeline) => (
                <div 
                  key={pipeline.id} 
                  className={`p-2 sm:p-3 rounded-lg border transition-colors ${
                    pipeline.active 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5 sm:mb-2 gap-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[10px] sm:text-xs font-medium text-gray-900 truncate">{pipeline.name}</h4>
                      {pipeline.description && (
                        <p className="text-[9px] sm:text-[10px] text-gray-500 truncate mt-0.5">{pipeline.description}</p>
                      )}
                    </div>
                    <div className={`px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium flex-shrink-0 ${
                      pipeline.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {pipeline.active ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <UserGroupIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="text-[10px] sm:text-xs text-gray-600">Leads</span>
                    </div>
                    <span className={`text-sm sm:text-base font-bold ${
                      pipeline.active ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      {pipeline.leadsCount}
                    </span>
                  </div>
                  
                  {/* Barra de progresso visual */}
                  <div className="mt-1.5 sm:mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full ${
                          pipeline.active ? 'bg-orange-500' : 'bg-gray-400'
                        }`}
                        style={{ 
                          width: `${Math.min((pipeline.leadsCount / 20) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {pipelines.length > 0 && (
            <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="font-medium text-gray-700">Pipelines</span>
                <span className="font-bold text-purple-600">{pipelines.length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                <span className="text-gray-600">Leads</span>
                <span className="font-bold text-purple-600">
                  {pipelines.reduce((sum, p) => sum + p.leadsCount, 0)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 