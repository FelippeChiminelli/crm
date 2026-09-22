import { useState } from 'react'
import {
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { parseISO } from 'date-fns'
import type { MetaAd } from '../../../types'
import { MetaAdHierarchy } from './MetaAdHierarchy'

const APP_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  messenger: 'Messenger',
  whatsapp: 'WhatsApp',
}

const TYPE_LABELS: Record<string, string> = {
  ad: 'Anúncio',
  post: 'Publicação',
}

const formatLabel = (value: string, labels: Record<string, string>) =>
  labels[value.toLowerCase()] || value

/**
 * Um registro de atribuição: o anúncio em que o lead clicou antes de chegar.
 * Campos ausentes são omitidos, pois a integração não preenche todos.
 */
export function MetaAdItem({ ad }: { ad: MetaAd }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false)

  const showThumbnail = !!ad.thumbnail_url && !thumbnailFailed

  return (
    <div className="bg-white rounded-lg p-2.5 border border-gray-200 text-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {ad.source_app && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              {formatLabel(ad.source_app, APP_LABELS)}
            </span>
          )}
          {ad.source_type && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
              {formatLabel(ad.source_type, TYPE_LABELS)}
            </span>
          )}
          {ad.ads_convertido && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <CheckBadgeIcon className="w-3.5 h-3.5" />
              Convertido
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {parseISO(ad.created_at).toLocaleString('pt-BR')}
        </span>
      </div>

      <div className="flex gap-2.5">
        {showThumbnail && (
          <img
            src={ad.thumbnail_url!}
            alt={ad.title_ads || 'Criativo do anúncio'}
            loading="lazy"
            onError={() => setThumbnailFailed(true)}
            className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
          />
        )}

        <div className="min-w-0 flex-1">
          {ad.title_ads && (
            <div className="font-medium text-gray-900 break-words">{ad.title_ads}</div>
          )}
          {ad.body_ads && (
            <p className="text-xs text-gray-600 mt-0.5 break-words">{ad.body_ads}</p>
          )}
          {!ad.title_ads && !ad.body_ads && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <PhotoIcon className="w-4 h-4" />
              Criativo sem título ou descrição
            </div>
          )}
        </div>
      </div>

      {ad.message_whats && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Mensagem inicial do lead:</div>
          <div className="p-2 bg-gray-50 rounded text-xs text-gray-600 italic break-words">
            {ad.message_whats}
          </div>
        </div>
      )}

      <MetaAdHierarchy ad={ad} />

      {ad.source_url && (
        <a
          href={ad.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          Ver anúncio
        </a>
      )}
    </div>
  )
}
