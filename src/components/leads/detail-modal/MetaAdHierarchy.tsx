import type { MetaAd } from '../../../types'

interface HierarchyLevel {
  label: string
  name: string | null
  id: string | null
}

/**
 * Um nível da hierarquia. Exibe o nome em destaque e o ID como apoio.
 * Registros antigos só têm o ID, então o nome é opcional.
 */
function LevelRow({ label, name, id }: HierarchyLevel) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="text-gray-500 w-20 flex-shrink-0">{label}</span>
      <div className="min-w-0 flex-1">
        {name && <div className="text-gray-900 font-medium break-words">{name}</div>}
        {id && (
          <div className="font-mono text-gray-500 text-[11px] truncate" title={id}>{id}</div>
        )}
      </div>
    </div>
  )
}

/**
 * Estrutura do anúncio na Meta: campanha > conjunto > anúncio, mais o
 * identificador do clique que trouxe o lead.
 */
export function MetaAdHierarchy({ ad }: { ad: MetaAd }) {
  // A integração grava o ID da campanha na coluna legada; id_campaign é o destino futuro
  const campaignId = ad.id_campaign || ad['campaing-id']

  const levels: HierarchyLevel[] = [
    { label: 'Campanha', name: ad.name_campaign, id: campaignId },
    { label: 'Conjunto', name: ad.name_conjunto_anuncio, id: ad.id_conjunto_anuncio },
    { label: 'Anúncio', name: ad.name_ads, id: ad.source_id },
    { label: 'Clique', name: null, id: ad.ctwaClid },
  ].filter((level) => level.name || level.id)

  if (levels.length === 0) return null

  return (
    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5 text-xs">
      {levels.map((level) => <LevelRow key={level.label} {...level} />)}
    </div>
  )
}
