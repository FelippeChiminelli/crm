import { decodeJwtClaims } from './jwt'

interface PartnerJwtClaims {
  // O claim pode chegar como boolean (hook) ou string 'true' (dependendo da serialização).
  is_partner?: boolean | string
  app_metadata?: {
    is_partner?: boolean | string
    parceiro_id?: string
  }
}

/** Lê is_partner do JWT (hook injeta em app_metadata; fallback na raiz do payload). */
export function isPartnerFromAccessToken(accessToken: string | null | undefined): boolean {
  const claims = decodeJwtClaims<PartnerJwtClaims>(accessToken)
  if (!claims) return false
  const value = claims.app_metadata?.is_partner ?? claims.is_partner
  return value === true || value === 'true'
}
