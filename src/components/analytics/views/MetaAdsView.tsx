import { useState } from 'react'
import { AnalyticsViewHeader } from '../layout/AnalyticsViewHeader'
import { useMetaAdsAnalytics } from '../hooks/useMetaAdsAnalytics'
import { MetaAdsKpis } from '../metaAds/MetaAdsKpis'
import { MetaAdsHierarchyTable } from '../metaAds/MetaAdsHierarchyTable'
import { MetaAdsTimelineSection } from '../metaAds/MetaAdsTimelineSection'
import { MetaAdsPlatformSection } from '../metaAds/MetaAdsPlatformSection'
import { MetaAdsCreativesRanking } from '../metaAds/MetaAdsCreativesRanking'
import { MetaAdsDrilldownModal } from '../metaAds/drilldown/MetaAdsDrilldownModal'
import type { MetaAdsAnalyticsFilters, MetaAdsLeadCategory } from '../../../types'

interface MetaAdsViewProps {
  filters: MetaAdsAnalyticsFilters
  formatCurrency: (value: number) => string
  formatPeriod: (start: string, end: string) => string
  onOpenMobileMenu?: () => void
  onOpenFilters: () => void
}

export function MetaAdsView({
  filters,
  formatCurrency,
  formatPeriod,
  onOpenMobileMenu,
  onOpenFilters
}: MetaAdsViewProps) {
  const { totals, tree, platforms, creatives, timeline, granularity, loading, error } = useMetaAdsAnalytics(filters)
  const [drilldownCategory, setDrilldownCategory] = useState<MetaAdsLeadCategory | null>(null)

  const activeFiltersCount = [
    filters.platforms?.length || 0,
    filters.campaign_ids?.length || 0,
    filters.adset_ids?.length || 0,
    filters.ad_ids?.length || 0
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <AnalyticsViewHeader
        title="Meta Ads"
        subtitle="Leads e resultados por campanha, conjunto e anúncio"
        period={formatPeriod(filters.period.start, filters.period.end)}
        activeFiltersCount={activeFiltersCount}
        onOpenMobileMenu={onOpenMobileMenu}
        onOpenFilters={onOpenFilters}
      />

      <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <MetaAdsKpis
          totals={totals}
          loading={loading}
          formatCurrency={formatCurrency}
          onSelect={setDrilldownCategory}
        />

        <MetaAdsHierarchyTable tree={tree} loading={loading} formatCurrency={formatCurrency} />

        <MetaAdsTimelineSection
          timeline={timeline}
          granularity={granularity}
          period={filters.period}
          loading={loading}
        />

        <MetaAdsPlatformSection
          platforms={platforms}
          totals={totals}
          loading={loading}
          formatCurrency={formatCurrency}
        />

        <MetaAdsCreativesRanking creatives={creatives} loading={loading} formatCurrency={formatCurrency} />
      </div>

      <MetaAdsDrilldownModal
        category={drilldownCategory}
        filters={filters}
        formatCurrency={formatCurrency}
        onCategoryChange={setDrilldownCategory}
        onClose={() => setDrilldownCategory(null)}
      />
    </div>
  )
}
