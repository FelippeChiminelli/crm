import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface OriginNoticeProps {
  /** Grupos de origem selecionados. Zero significa filtro inativo. */
  selectedGroups: number
  /** Conversas do período sem lead vinculado, descartadas pelo filtro. */
  excludedNoLead: number
  /** Falso quando nenhuma conversa casou com as origens escolhidas. */
  hasResults: boolean
}

/**
 * Origem é atributo do lead, então conversas sem lead vinculado somem quando o
 * filtro está ativo. Sem este aviso a queda nos números pareceria um erro de
 * cálculo, e não uma consequência do recorte pedido.
 */
export function OriginNotice({
  selectedGroups,
  excludedNoLead,
  hasResults
}: OriginNoticeProps) {
  if (selectedGroups === 0) return null

  // Sem nenhuma conversa não há resumo, e portanto nenhuma contagem de
  // descartadas. Explicar a tela vazia importa mais que o número exato.
  if (!hasResults) {
    return (
      <Notice>
        Nenhuma conversa das origens selecionadas neste período. Conversas sem lead vinculado
        também não aparecem com o filtro de origem ativo, por não terem origem alguma.
      </Notice>
    )
  }

  if (excludedNoLead === 0) return null

  return (
    <Notice>
      Filtrando por {selectedGroups} {selectedGroups === 1 ? 'origem' : 'origens'}:{' '}
      <strong>{excludedNoLead.toLocaleString('pt-BR')}</strong>{' '}
      {excludedNoLead === 1 ? 'conversa ficou de fora' : 'conversas ficaram de fora'} por não
      {excludedNoLead === 1 ? ' ter' : ' terem'} lead vinculado, e portanto nenhuma origem.
    </Notice>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <InformationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs lg:text-sm text-amber-900">{children}</p>
    </div>
  )
}
