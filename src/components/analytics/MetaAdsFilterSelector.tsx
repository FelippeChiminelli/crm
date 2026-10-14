import { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { FilterBlock } from './chatFilters/FilterBlock'
import { PeriodFilter } from './chatFilters/PeriodFilter'
import { MetaAdsCheckboxList } from './metaAds/MetaAdsCheckboxList'
import { META_ADS_PLATFORMS } from './metaAds/metaAdsLabels'
import { applyCascadeSelection, getCascadeOptions } from './metaAds/metaAdsFilterOptions'
import { getMetaAdsOptions } from '../../services/metaAdsAnalyticsService'
import type { MetaAdsAnalyticsFilters, MetaAdsOption } from '../../types'

interface MetaAdsFilterSelectorProps {
  filters: MetaAdsAnalyticsFilters
  onFiltersChange: (filters: MetaAdsAnalyticsFilters) => void
}

const PLATFORM_OPTIONS = META_ADS_PLATFORMS.map(({ value, label }) => ({ id: value, name: label }))

export function MetaAdsFilterSelector({ filters, onFiltersChange }: MetaAdsFilterSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [options, setOptions] = useState<MetaAdsOption[]>([])

  useEffect(() => {
    getMetaAdsOptions()
      .then(setOptions)
      .catch((error) => console.error('Erro ao carregar opções de Meta Ads:', error))
  }, [])

  const cascade = useMemo(() => getCascadeOptions(options, filters), [options, filters])

  const handleCascade = (level: 'campaign_ids' | 'adset_ids' | 'ad_ids') => (selected: string[]) =>
    onFiltersChange(applyCascadeSelection(options, filters, level, selected))

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        {isExpanded
          ? <><ChevronUpIcon className="w-4 h-4" />Recolher filtros</>
          : <><ChevronDownIcon className="w-4 h-4" />Expandir filtros</>}
      </button>

      {isExpanded && (
        <div className="space-y-4">
          <FilterBlock title="Período" scope="Data do clique no anúncio">
            <PeriodFilter filters={filters} onFiltersChange={onFiltersChange} showComparePeriod={false} />
          </FilterBlock>

          <FilterBlock title="Plataforma" scope="Onde o anúncio foi clicado">
            <MetaAdsCheckboxList
              options={PLATFORM_OPTIONS}
              selected={filters.platforms ?? []}
              onChange={(selected) =>
                onFiltersChange({ ...filters, platforms: selected.length > 0 ? selected : undefined })
              }
            />
          </FilterBlock>

          <FilterBlock title="Campanhas" scope="Restringe os conjuntos e anúncios abaixo">
            <MetaAdsCheckboxList
              options={cascade.campaigns}
              selected={filters.campaign_ids ?? []}
              onChange={handleCascade('campaign_ids')}
              emptyText="Nenhuma campanha rastreada ainda"
            />
          </FilterBlock>

          <FilterBlock title="Conjuntos de anúncios" scope="Restringe os anúncios abaixo">
            <MetaAdsCheckboxList
              options={cascade.adsets}
              selected={filters.adset_ids ?? []}
              onChange={handleCascade('adset_ids')}
            />
          </FilterBlock>

          <FilterBlock title="Anúncios" scope="Afeta toda a aba Meta Ads">
            <MetaAdsCheckboxList
              options={cascade.ads}
              selected={filters.ad_ids ?? []}
              onChange={handleCascade('ad_ids')}
            />
          </FilterBlock>

          <div className="pt-2">
            <button
              onClick={() => onFiltersChange({ period: filters.period })}
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
