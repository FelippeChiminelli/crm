import { supabase } from '../services/supabaseClient'

/**
 * Verifica se o usuário está autenticado e retorna informações da sessão
 */
export async function verifyAuthentication() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Erro ao verificar sessão:', error)
      return { authenticated: false, user: null, error }
    }
    
    if (!session?.user) {
      console.log('❌ Nenhuma sessão ativa encontrada')
      return { authenticated: false, user: null, error: new Error('Sessão não encontrada') }
    }
    
    console.log('✅ Usuário autenticado:', session.user.id)
    return { authenticated: true, user: session.user, error: null }
  } catch (err) {
    console.error('❌ Erro ao verificar autenticação:', err)
    return { authenticated: false, user: null, error: err }
  }
}

/**
 * Força o refresh do token de autenticação
 */
export async function refreshAuthToken() {
  try {
    console.log('🔄 Tentando refresh do token...')
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('❌ Erro ao fazer refresh do token:', error)
      return { success: false, error }
    }
    
    console.log('✅ Token refreshed com sucesso')
    return { success: true, session: data.session }
  } catch (err) {
    console.error('❌ Erro inesperado no refresh:', err)
    return { success: false, error: err }
  }
}

/**
 * Verifica se o usuário tem permissão para modificar um lead
 * CORRIGIDO: Permite modificação quando responsible_uuid for null ou quando for o próprio usuário
 */
export function canUserModifyLead(user: any, lead: any): boolean {
  if (!user || !lead) return false
  
  // Se o lead não tem responsável definido, qualquer usuário autenticado pode modificar
  if (!lead.responsible_uuid) {
    console.log(`🔓 Lead sem responsável definido - permitindo modificação para usuário: ${user.id}`)
    return true
  }
  
  // Se o usuário é o responsável pelo lead, pode modificar
  const canModify = user.id === lead.responsible_uuid
  console.log(`🔒 Verificação de permissão:`, { 
    userId: user.id, 
    leadResponsible: lead.responsible_uuid, 
    canModify 
  })
  
  return canModify
} 