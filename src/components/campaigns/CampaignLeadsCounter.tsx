import React from 'react'
import { UsersIcon } from '@heroicons/react/24/outline'

interface Props {
  loading: boolean
  /** null indica falha ao carregar a contagem */
  count: number | null
  emptyLabel: string
}

/**
 * Exibe quantos leads serão disparados conforme os critérios de segmentação atuais.
 */
export const CampaignLeadsCounter: React.FC<Props> = ({ loading, count, emptyLabel }) => (
  <div className="mt-2 p-2 lg:p-3 bg-orange-50 border border-orange-200 rounded-lg">
    <div className="flex items-center gap-2">
      <UsersIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-600 flex-shrink-0" />
      {loading ? (
        <span className="text-xs lg:text-sm text-orange-700">Carregando...</span>
      ) : count !== null ? (
        <span className="text-xs lg:text-sm font-medium text-orange-900">
          {count === 0
            ? emptyLabel
            : count === 1
            ? '1 lead será disparado'
            : `${count} leads serão disparados`}
        </span>
      ) : (
        <span className="text-xs lg:text-sm text-orange-700">Erro ao carregar</span>
      )}
    </div>
  </div>
)
