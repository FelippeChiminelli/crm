import { supabase } from './supabaseClient'

/**
 * Consentimento do OAuth 2.1 Server do Supabase Auth (usado pelo servidor MCP).
 *
 * O supabase-js instalado (2.50) ainda não expõe `auth.oauth.*`, então chamamos os
 * mesmos endpoints que ele usa nas versões novas, com o token da sessão do usuário:
 *   GET  /auth/v1/oauth/authorizations/:id
 *   POST /auth/v1/oauth/authorizations/:id/consent  { action: 'approve' | 'deny' }
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export interface OAuthClientInfo {
  id: string
  name: string
  uri: string
  logo_uri: string
}

export interface OAuthAuthorizationDetails {
  authorization_id: string
  redirect_uri: string
  client: OAuthClientInfo
  user: { id: string; email: string }
  scope: string
}

export type OAuthAuthorizationResult =
  | { type: 'consent'; details: OAuthAuthorizationDetails }
  | { type: 'redirect'; redirectUrl: string }

async function oauthRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Sessão expirada. Entre novamente no Aucta CRM.')
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = body?.msg || body?.error_description || body?.message
    throw new Error(message || 'Não foi possível validar a solicitação de acesso.')
  }
  return body as T
}

export async function getAuthorizationDetails(
  authorizationId: string
): Promise<OAuthAuthorizationResult> {
  const data = await oauthRequest<OAuthAuthorizationDetails | { redirect_url: string }>(
    `/oauth/authorizations/${encodeURIComponent(authorizationId)}`
  )
  // Consentimento já dado antes: o Supabase devolve só o redirect
  if ('redirect_url' in data && !('authorization_id' in data)) {
    return { type: 'redirect', redirectUrl: data.redirect_url }
  }
  return { type: 'consent', details: data as OAuthAuthorizationDetails }
}

export async function decideAuthorization(
  authorizationId: string,
  action: 'approve' | 'deny'
): Promise<string> {
  const data = await oauthRequest<{ redirect_url: string }>(
    `/oauth/authorizations/${encodeURIComponent(authorizationId)}/consent`,
    { method: 'POST', body: JSON.stringify({ action }) }
  )
  return data.redirect_url
}
