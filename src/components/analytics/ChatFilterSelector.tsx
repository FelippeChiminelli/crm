import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { FilterBlock } from './chatFilters/FilterBlock'
import { PeriodFilter } from './chatFilters/PeriodFilter'
import { InstancesFilter } from './chatFilters/InstancesFilter'
import { TimeOfDayFilter } from './chatFilters/TimeOfDayFilter'
import { InactivityFilter } from './chatFilters/InactivityFilter'
import { OriginFilter } from './chatFilters/OriginFilter'
import { DEFAULT_INACTIVE_HOURS } from '../../services/chatEngagementService'
import type { ChatAnalyticsFilters } from '../../types'

interface ChatFilterSelectorProps {
  filters: ChatAnalyticsFilters
  onFiltersChange: (filters: ChatAnalyticsFilters) => void
}

/**
 * Filtros da aba Chat, agrupados pelo escopo que afetam.
 * Os controles de tempo têm alcances distintos: o recorte de horário vale para
 * os KPIs de tempo, e a janela de inatividade só para o Estágio do Atendimento.
 */
export function ChatFilterSelector({ filters, onFiltersChange }: ChatFilterSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const inactiveHours = filters.inactiveHours ?? DEFAULT_INACTIVE_HOURS

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUpIcon className="w-4 h-4" />
            Recolher filtros
          </>
        ) : (
          <>
            <ChevronDownIcon className="w-4 h-4" />
            Expandir filtros
          </>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4">
          <FilterBlock title="Período" scope="Afeta toda a aba Chat">
            <PeriodFilter filters={filters} onFiltersChange={onFiltersChange} />
          </FilterBlock>

          <FilterBlock title="Instâncias WhatsApp" scope="Afeta toda a aba Chat">
            <InstancesFilter filters={filters} onFiltersChange={onFiltersChange} />
          </FilterBlock>

          <FilterBlock
            title="Origem do lead"
            scope="Afeta toda a aba Chat"
            footnote="Conversas sem lead vinculado não têm origem e ficam de fora quando este filtro está ativo. Grafias equivalentes da mesma origem são selecionadas juntas."
          >
            <OriginFilter filters={filters} onFiltersChange={onFiltersChange} />
          </FilterBlock>

          <FilterBlock
            title="Tempo sem interação"
            scope="Afeta apenas o Estágio do Atendimento"
            footnote={`Conversas sem nenhuma mensagem há mais de ${inactiveHours}h deixam de contar como "Em conversa" e passam a aparecer como paradas.`}
          >
            <InactivityFilter filters={filters} onFiltersChange={onFiltersChange} />
          </FilterBlock>

          <FilterBlock
            title="Horário do dia"
            scope="Afeta os KPIs de tempo de resposta e 1º contato"
            footnote="Considera apenas as mensagens enviadas dentro da faixa de horário. Não se aplica ao Estágio do Atendimento: recortar o dia faria uma conversa respondida fora da faixa parecer sem resposta."
          >
            <TimeOfDayFilter filters={filters} onFiltersChange={onFiltersChange} />
          </FilterBlock>

          <div className="pt-2">
            <button
              onClick={() =>
                onFiltersChange({
                  period: filters.period,
                  comparePeriod: undefined,
                  instances: undefined,
                  timeRange: undefined,
                  inactiveHours: undefined,
                  origins: undefined
                })
              }
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpar todos os filtros
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
