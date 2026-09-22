import { useState, useEffect, useCallback } from 'react'
import type { MetaAd } from '../types'
import { getMetaAdsByLead } from '../services/metaAdsService'
import SecureLogger from '../utils/logger'

/**
 * Carrega os anúncios Meta vinculados ao lead.
 * Mantido separado do useLeadDetailModal para não engrossar aquele hook.
 *
 * O carregamento acontece ao abrir o modal (e não ao clicar na aba) porque a
 * própria exibição da aba depende de saber se existe algum registro.
 */
export function useLeadMetaAds(leadId: string | undefined, isOpen: boolean) {
  const [metaAds, setMetaAds] = useState<MetaAd[]>([])
  const [loading, setLoading] = useState(false)

  const loadMetaAds = useCallback(async () => {
    if (!leadId) {
      setMetaAds([])
      return
    }

    setLoading(true)
    try {
      const ads = await getMetaAdsByLead(leadId)
      setMetaAds(ads || [])
    } catch (err) {
      // Aba secundária: falha não interrompe a abertura do modal
      SecureLogger.error('Erro ao carregar anúncios do lead:', err)
      setMetaAds([])
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    if (isOpen && leadId) {
      loadMetaAds()
    } else {
      setMetaAds([])
    }
  }, [isOpen, leadId, loadMetaAds])

  return { metaAds, loading }
}
