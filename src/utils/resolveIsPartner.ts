import { supabase } from '../services/supabaseClient'
import { isPartnerFromAccessToken } from './partnerClaims'

/**
 * Verifica se o usuario e parceiro (somente UX no front).
 *
 * 1. Tenta ler is_partner do JWT (Custom Access Token Hook).
 * 2. Fallback: profiles.parceiro_id (fonte da verdade no banco).
 *
 * A seguranca real continua no api_admin / require_partner.
 */
export async function resolveIsPartner(
  userId: string,
  accessToken: string | null | undefined
): Promise<boolean> {
  if (isPartnerFromAccessToken(accessToken)) {
    return true
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('parceiro_id')
    .eq('uuid', userId)
    .maybeSingle()

  if (error) {
    console.warn('PartnerRoute: falha ao ler profiles.parceiro_id', error.message)
    return false
  }

  return data?.parceiro_id != null
}
