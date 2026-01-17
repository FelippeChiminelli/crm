import { useState } from 'react'
import { 
  ChartBarIcon, 
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CalendarIcon,
  Bars3Icon
} from '@heroicons/react/24/outline'
import { KPICard } from '../KPICard'
import { LineChartWidget } from '../LineChartWidget'
import type { LeadAnalyticsFilters } from '../../../types'
import { getDaysAgoLocalDateString, getTodayLocalDateString } from '../../../utils/dateHelpers'

interface OverviewViewProps {
  data: any
  filters: LeadAnalyticsFilters
  onFiltersChange: (filters: LeadAnalyticsFilters) => void
  formatCurrency: (value: number) => string
  formatPeriod: (start: string, end: string) => string
  onOpenMobileMenu?: () => void
}

export function OverviewView({ data, filters, onFiltersChange, formatCurrency, formatPeriod, onOpenMobileMenu }: OverviewViewProps) {
  const { loading, stats, leadsOverTime } = data
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)

  // Calcular taxas de conversão
  const totalLeads = stats?.total_leads || 0
  const totalSales = stats?.total_sales || 0
  const totalLost = stats?.total_lost || 0
  
  const salesConversionRate = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : '0.0'
  const lostConversionRate = totalLeads > 0 ? ((totalLost / totalLeads) * 100).toFixed(1) : '0.0'

  // Funções de filtro de período
  const handleQuickPeriod = (days: number) => {
    const end = getTodayLocalDateString()
    const start = getDaysAgoLocalDateString(days - 1)
    onFiltersChange({ ...filters, period: { start, end } })
    setShowCustomDatePicker(false)
  }

  const handleCustomPeriod = (start: string, end: string) => {
    onFiltersChange({ ...filters, period: { start, end } })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 lg:px-6 py-3 lg:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            {/* Botão Menu Mobile */}
            <button
              onClick={onOpenMobileMenu}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden flex-shrink-0"
            >
              <Bars3Icon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">Visão Geral</h1>
              <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1 truncate">
                <span className="hidden sm:inline">Resumo das principais métricas</span>
                <span className="font-medium text-blue-600 sm:ml-2">
                  <span className="hidden sm:inline">• </span>{formatPeriod(filters.period.start, filters.period.end)}
                </span>
              </p>
            </div>
          </div>

          {/* Filtros Rápidos de Período */}
          <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
            <CalendarIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 hidden sm:block" />
            <div className="flex gap-1 lg:gap-2">
              <button
                onClick={() => handleQuickPeriod(7)}
                className={`px-2 lg:px-3 py-1 lg:py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors ${
                  formatPeriod(filters.period.start, filters.period.end) === formatPeriod(getDaysAgoLocalDateString(6), getTodayLocalDateString())
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                7d
              </button>
              <button
                onClick={() => handleQuickPeriod(15)}
                className={`px-2 lg:px-3 py-1 lg:py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors hidden sm:block ${
                  formatPeriod(filters.period.start, filters.period.end) === formatPeriod(getDaysAgoLocalDateString(14), getTodayLocalDateString())
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                15d
              </button>
              <button
                onClick={() => handleQuickPeriod(30)}
                className={`px-2 lg:px-3 py-1 lg:py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors ${
                  formatPeriod(filters.period.start, filters.period.end) === formatPeriod(getDaysAgoLocalDateString(29), getTodayLocalDateString())
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                30d
              </button>
              <button
                onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                className="px-2 lg:px-3 py-1 lg:py-1.5 text-xs lg:text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors hidden sm:block"
              >
                Custom
              </button>
            </div>
          </div>
        </div>

        {/* Date Picker Personalizado */}
        {showCustomDatePicker && (
          <div className="mt-3 lg:mt-4 p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-2 lg:gap-4">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={filters.period.start}
                  onChange={(e) => handleCustomPeriod(e.target.value, filters.period.end)}
                  className="w-full px-2 lg:px-3 py-1.5 lg:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={filters.period.end}
                  onChange={(e) => handleCustomPeriod(filters.period.start, e.target.value)}
                  className="w-full px-2 lg:px-3 py-1.5 lg:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPIs Principais - 4 cards no topo */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
            {/* Leads Ativos */}
            <KPICard
              title="Leads Ativos"
              value={totalLeads}
              subtitle="No período"
              icon={<ChartBarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="blue"
              loading={loading}
            />

            {/* Vendas Confirmadas */}
            <KPICard
              title="Vendas"
              value={totalSales}
              subtitle={formatCurrency(stats.sales_value || 0)}
              icon={<CheckCircleIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="green"
              loading={loading}
            />

            {/* Perdidos */}
            <KPICard
              title="Perdidos"
              value={totalLost}
              subtitle={`${lostConversionRate}%`}
              icon={<ChartBarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="red"
              loading={loading}
            />

            {/* Conversas */}
            <KPICard
              title="Conversas"
              value={data.totalConversations || 0}
              subtitle="No período"
              icon={<ChatBubbleLeftRightIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="indigo"
              loading={loading}
            />
          </div>
        )}

        {/* Métricas de Tempo e Conversão */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
          {/* Tempo Médio de Resposta */}
          <KPICard
            title="Tempo Resposta"
            value={data.firstResponseTime?.formatted || '-'}
            subtitle={`${data.firstResponseTime?.total_conversations || 0} conversas`}
            icon={<ClockIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="amber"
            loading={loading}
          />

          {/* Tempo Médio 1º Contato */}
          <KPICard
            title="1º Contato"
            value={data.proactiveContactTime?.formatted || '-'}
            subtitle={`${data.proactiveContactTime?.total_leads || 0} leads`}
            icon={<ClockIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="teal"
            loading={loading}
          />

          {/* Taxa de Conversão para Venda */}
          <KPICard
            title="Conv. Venda"
            value={`${salesConversionRate}%`}
            subtitle={`${totalSales}/${totalLeads}`}
            icon={<CheckCircleIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="green"
            loading={loading}
          />

          {/* Taxa de Conversão para Perda */}
          <KPICard
            title="Conv. Perda"
            value={`${lostConversionRate}%`}
            subtitle={`${totalLost}/${totalLeads}`}
            icon={<ChartBarIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="red"
            loading={loading}
          />
        </div>

        {/* Gráfico de Evolução */}
        <LineChartWidget
          title="Evolução de Leads no Tempo"
          data={leadsOverTime}
          dataKey="value"
          dataKeyLabel="Quantidade de Leads"
          xAxisKey="date"
          loading={loading}
        />
      </div>
    </div>
  )
}

