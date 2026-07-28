import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../services/supabaseClient'
import { resolveIsPartner } from '../utils/resolveIsPartner'
import { BrandLoader } from '../components/ui/BrandLoader'

interface PartnerRouteProps {
  children: ReactNode
}

/**
 * Guard da area Aucta Admin (parceiros).
 *
 * ATENCAO: esta verificacao e APENAS UX. A seguranca REAL e o require_partner no api_admin.
 */
export function PartnerRoute({ children }: PartnerRouteProps) {
  const { isAuthenticated, loading, user } = useAuthContext()
  const [isPartner, setIsPartner] = useState<boolean | null>(null)
  const initialCheckDone = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsPartner(null)
      initialCheckDone.current = false
      return
    }

    let active = true
    initialCheckDone.current = false

    const runCheck = async (accessToken: string | null | undefined) => {
      return resolveIsPartner(user.id, accessToken)
    }

    const resolvePartnerAccess = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      let token = sessionData.session?.access_token

      let partner = await runCheck(token)

      if (!partner) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        token = refreshed.session?.access_token ?? token
        partner = await runCheck(token)
      }

      if (active) {
        setIsPartner(partner)
        initialCheckDone.current = true
      }
    }

    resolvePartnerAccess()

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active || !initialCheckDone.current) return
      if (event === 'SIGNED_OUT') {
        setIsPartner(false)
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsPartner(await runCheck(session?.access_token))
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [isAuthenticated, user?.id])

  if (loading && !isAuthenticated) {
    return <BrandLoader text="Verificando acesso..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (isPartner === null) {
    return <BrandLoader text="Verificando acesso de parceiro..." />
  }

  if (!isPartner) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default PartnerRoute
