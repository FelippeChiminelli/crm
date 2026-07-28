import { useEffect, useState } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../services/supabaseClient'
import { resolveIsPartner } from '../utils/resolveIsPartner'

interface UseIsPartnerResult {
  isPartner: boolean
  loading: boolean
}

/**
 * Verifica se o usuario logado e parceiro (Aucta Admin) — somente UX.
 *
 * Reutiliza a mesma logica do PartnerRoute (claim is_partner no JWT, com
 * fallback em profiles.parceiro_id). A seguranca real continua no api_admin.
 */
export function useIsPartner(): UseIsPartnerResult {
  const { isAuthenticated, user } = useAuthContext()
  const [isPartner, setIsPartner] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    if (!isAuthenticated || !user) {
      setIsPartner(false)
      setLoading(false)
      return
    }

    setLoading(true)

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const result = await resolveIsPartner(user.id, data.session?.access_token)
      if (active) {
        setIsPartner(result)
        setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [isAuthenticated, user?.id])

  return { isPartner, loading }
}
