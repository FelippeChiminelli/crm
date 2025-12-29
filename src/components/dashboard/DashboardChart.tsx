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

  // Função para obter o texto do período
  const getPeriodText = (period: string) => {
    switch (period) {
      case '7': return 'primeira metade da semana'
      case '14': return 'primeira semana'
      case '30': return 'primeiras duas semanas'
      default: return 'primeira metade do período'
    }
  }

  return (
    <div className="space-y-4 w-full">
      {/* Gráfico de Coluna Simplificado */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-blue-600" />
                Evolução de Leads
              </CardTitle>
              <div className="flex items-center gap-2 text-xs">
                {Number(crescimento) >= 0 ? (
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={`font-medium ${Number(crescimento) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {crescimento}%
                </span>
                <span className="text-gray-500">vs {getPeriodText(selectedPeriod)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Legenda visual */}
              <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Novos leads</span>
              </div>
              <div className="flex items-center gap-9">
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="14">Últimos 14 dias</option>
                  <option value="30">Últimos 30 dias</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 relative">
            {/* Eixo Y */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-[10px] text-gray-500">
              {yAxisValues.map((value, index) => (
                <span key={index}>{value}</span>
              ))}
            </div>

            {/* Área do gráfico */}
            <div className="ml-12 h-full relative">
              {/* Linhas de grade horizontais */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="border-b border-gray-100"></div>
                ))}
              </div>

              {/* Colunas do gráfico */}
              <div className="absolute inset-0 flex items-end justify-between px-6">
                {chartData.map((d, i) => {
                  // Calcular altura baseada no valor máximo real
                  // Altura disponível considerando padding e espaçamento
                  const availableHeight = 220 // Aumentado para chegar exatamente à linha
                  const barHeight = d.total > 0 
                    ? Math.max((d.total / maxValue) * availableHeight, 20) // Altura proporcional
                    : 4 // Mínimo 4px para barras vazias
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-3 w-16">
                      {/* Coluna única para cada dia */}
                      <div className="flex items-end h-full w-full justify-center">
                        <div 
                          className={`w-10 bg-gradient-to-t rounded-t-md relative group transition-all duration-200 hover:shadow-md ${
                            d.total > 0 
                              ? 'from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 shadow-sm' 
                              : 'from-gray-300 to-gray-200'
                          }`}
                          style={{ 
                            height: `${barHeight}px`,
                            minHeight: d.total > 0 ? '20px' : '4px'
                          }}
                        >
                          {/* Indicador visual para barras com dados */}
                          {d.total > 0 && (
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full opacity-80"></div>
                          )}
                          
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                            <div className="font-medium">{d.total} leads</div>
                            <div className="text-gray-300 text-[10px]">criados</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Data com melhor formatação */}
                      <div className="text-center">
                        <span className="text-[10px] font-medium text-gray-700">{d.date}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          
          {/* Resumo dos dados */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalLeads}</div>
              <div className="text-xs text-gray-500">
                Total de leads criados nos últimos {daysToShow} dias
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de Distribuição e Pipelines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        {/* Distribuição de Leads */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-green-600" />
              Distribuição de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-medium">Quentes</span>
                </div>
                <span className="text-xs text-gray-600">{stats.hotLeads} ({((stats.hotLeads / stats.totalLeads) * 100).toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 bg-red-500 rounded-full"
                  style={{ width: `${(stats.hotLeads / stats.totalLeads) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs font-medium">Mornos</span>
                </div>
                <span className="text-xs text-gray-600">{stats.warmLeads} ({((stats.warmLeads / stats.totalLeads) * 100).toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 bg-yellow-500 rounded-full"
                  style={{ width: `${(stats.warmLeads / stats.totalLeads) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-xs font-medium">Frios</span>
                </div>
                <span className="text-xs text-gray-600">{stats.coldLeads} ({((stats.coldLeads / stats.totalLeads) * 100).toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 bg-gray-500 rounded-full"
                  style={{ width: `${(stats.coldLeads / stats.totalLeads) * 100}%` }}
                ></div>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">Total</span>
                  <span className="font-bold text-blue-600">{stats.totalLeads} leads</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status das Tarefas */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-orange-600" />
              Status das Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskData.map((task, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${task.color}`}></div>
                      <span className="text-xs font-medium">{task.name}</span>
                    </div>
                    <span className="text-xs text-gray-600">{task.value} ({task.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${task.color}`}
                      style={{ width: `${task.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">Total</span>
                  <span className="font-bold text-orange-600">{totalTasks} tarefas</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo dos Kanbans/Pipelines */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RectangleStackIcon className="w-5 h-5 text-purple-600" />
            Resumo dos Kanbans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pipelines.length === 0 ? (
            <div className="text-center py-6">
              <RectangleStackIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 mb-2">Nenhuma pipeline criada</h3>
              <p className="text-xs text-gray-500">
                Crie sua primeira pipeline no Kanban para começar a organizar seus leads.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pipelines.map((pipeline) => (
                <div 
                  key={pipeline.id} 
                  className={`p-3 rounded-lg border transition-colors hover:shadow-md ${
                    pipeline.active 
                      ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-gray-900 truncate">{pipeline.name}</h4>
                      {pipeline.description && (
                        <p className="text-[10px] text-gray-500 truncate mt-1">{pipeline.description}</p>
                      )}
                    </div>
                    <div className={`ml-2 px-2 py-1 rounded-full text-[10px] font-medium ${
                      pipeline.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {pipeline.active ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-600">Leads</span>
                    </div>
                    <span className={`text-base font-bold ${
                      pipeline.active ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      {pipeline.leadsCount}
                    </span>
                  </div>
                  
                  {/* Barra de progresso visual */}
                  <div className="mt-2">
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
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">Total de Pipelines</span>
                <span className="font-bold text-purple-600">{pipelines.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-600">Total de Leads</span>
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