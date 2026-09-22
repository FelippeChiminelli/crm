import { MegaphoneIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import type { MetaAd } from '../../../types'
import { SectionCard } from './SectionCard'
import { MetaAdItem } from './MetaAdItem'

interface LeadMetaAdsCardProps {
  metaAds: MetaAd[]
  loading: boolean
}

export function LeadMetaAdsCard({ metaAds, loading }: LeadMetaAdsCardProps) {
  return (
    <SectionCard title="Rastreamento" theme="blue" icon={MegaphoneIcon}>
      <p className="text-xs text-gray-400 mb-2">
        Anúncios em que o lead clicou antes de entrar em contato. Dados registrados
        automaticamente pela integração com a Meta.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Carregando...</span>
        </div>
      ) : metaAds.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded">
          Nenhum anúncio vinculado
        </div>
      ) : (
        <div className="space-y-2">
          {metaAds.map((ad) => <MetaAdItem key={ad.id} ad={ad} />)}
        </div>
      )}
    </SectionCard>
  )
}
