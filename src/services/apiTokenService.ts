import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'

export interface ApiToken {
  id: string
  empresa_id: string
  created_by: string
  token: string
  name: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Gera um token de API único no formato adv_live_<32 chars hex>.
 */
function generateApiToken(): string {
  const chars = 'abcdef0123456789'
  let hex = ''
  for (let i = 0; i < 32; i++) {
    hex += chars[Math.floor(Math.random() * chars.length)]
  }
  return `adv_live_${hex}`
}

/**
 * Lista todos os tokens de API da empresa.
 */
export async function listApiTokens(): Promise<ApiToken[]> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não encontrada')

  const { data, error } = await supabase
    .from('api_tokens')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Cria um novo token de API.
 * Retorna o token completo (só é visível neste momento).
 */
export async function createApiToken(name: string): Promise<ApiToken> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não encontrada')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const token = generateApiToken()

  const { data, error } = await supabase
    .from('api_tokens')
    .insert({
      empresa_id: empresaId,
      created_by: user.id,
      token,
      name,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Ativa ou desativa um token de API.
 */
export async function toggleApiToken(tokenId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('api_tokens')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', tokenId)

  if (error) throw error
}

/**
 * Deleta permanentemente um token de API.
 */
export async function deleteApiToken(tokenId: string): Promise<void> {
  const { error } = await supabase
    .from('api_tokens')
    .delete()
    .eq('id', tokenId)

  if (error) throw error
}
