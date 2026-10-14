import { useState } from 'react'
import type {
  LeadAnalyticsFilters,
  ChatAnalyticsFilters,
  TaskAnalyticsFilters,
  SalesAnalyticsFilters,
  StockAnalyticsFilters,
  MetaAdsAnalyticsFilters,
  AnalyticsPeriod,
} from '../../../types'
import { getDaysAgoLocalDateString, getTodayLocalDateString } from '../../../utils/dateHelpers'

/**
 * Par rascunho/aplicado de cada aba. O rascunho é editado no modal e só vira
 * filtro aplicado (que dispara as consultas) ao clicar em "Aplicar Filtros".
 */
function useFilterPair<T>(initial: T) {
  const [draft, setDraft] = useState<T>(initial)
  const [applied, setApplied] = useState<T>(initial)
  return { draft, setDraft, applied, setApplied }
}

export function useAnalyticsFilters() {
  // Usa hora LOCAL, não UTC
  const [defaultPeriod] = useState<AnalyticsPeriod>(() => ({
    start: getDaysAgoLocalDateString(6),
    end: getTodayLocalDateString()
  }))

  const lead = useFilterPair<LeadAnalyticsFilters>({ period: defaultPeriod })
  const chat = useFilterPair<ChatAnalyticsFilters>({ period: defaultPeriod })
  const task = useFilterPair<TaskAnalyticsFilters>({ period: defaultPeriod })
  const sales = useFilterPair<SalesAnalyticsFilters>({ period: defaultPeriod })
  const stock = useFilterPair<StockAnalyticsFilters>({ period: defaultPeriod })
  const metaAds = useFilterPair<MetaAdsAnalyticsFilters>({ period: defaultPeriod })

  const applyFilters = () => {
    lead.setApplied(lead.draft)
    chat.setApplied(chat.draft)
    task.setApplied(task.draft)
    sales.setApplied(sales.draft)
    stock.setApplied(stock.draft)
    metaAds.setApplied(metaAds.draft)
  }

  return { lead, chat, task, sales, stock, metaAds, applyFilters }
}
