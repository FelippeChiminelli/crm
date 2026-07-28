import { supabase } from '../supabaseClient'

/**
 * Cliente HTTP da area Aucta Admin (parceiros).
 *
 * IMPORTANTE: esta area consome EXCLUSIVAMENTE o servico FastAPI `api_admin`,
 * nunca o Supabase diretamente. O acesso cross-tenant e feito no backend com a
 * service_role; aqui apenas repassamos o access_token do Supabase como Bearer.
 */

const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL as string | undefined

function getBaseUrl(): string {
  if (!ADMIN_API_URL) {
    throw new Error(
      'VITE_ADMIN_API_URL nao esta definida. Configure a URL do servico api_admin.'
    )
  }
  return ADMIN_API_URL.replace(/\/$/, '')
}

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error('Sessao invalida: nenhum access_token disponivel.')
  }
  return token
}

export class AdminApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

export async function adminApiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const token = await getAccessToken()

  const url = new URL(`${getBaseUrl()}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    let detail = `Erro ${response.status}`
    try {
      const body = await response.json()
      detail = body?.detail || detail
    } catch {
      // resposta sem corpo JSON
    }
    throw new AdminApiError(response.status, detail)
  }

  return response.json() as Promise<T>
}

export async function adminApiPost<T>(path: string, body?: unknown): Promise<T> {
  const token = await getAccessToken()

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let detail = `Erro ${response.status}`
    try {
      const errorBody = await response.json()
      detail = errorBody?.detail || detail
    } catch {
      // resposta sem corpo JSON
    }
    throw new AdminApiError(response.status, detail)
  }

  return response.json() as Promise<T>
}
