/**
 * Decodifica o payload (claims) de um JWT SEM verificar assinatura.
 *
 * Uso: ler claims injetados pelo Custom Access Token Hook do Supabase
 * (ex.: app_metadata.is_partner), que aparecem SOMENTE no access_token e nao
 * no objeto session.user. Nunca use para decisoes de seguranca reais no
 * cliente — isso e responsabilidade do backend (api_admin / require_partner).
 */
export function decodeJwtClaims<T = Record<string, unknown>>(
  token: string | null | undefined
): T | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as T
  } catch {
    return null
  }
}
