import { supabase } from './supabaseClient'
import { getCurrentEmpresa } from './empresaService'

/**
 * Função para corrigir perfis de usuários que foram criados sem empresa_id e role_id
 * devido ao problema do trigger
 */
export async function fixUserProfile(userUuid: string, role: 'ADMIN' | 'VENDEDOR' = 'VENDEDOR') {
  try {
    console.log('🔧 Corrigindo perfil do usuário:', userUuid)
    
    // Buscar empresa atual
    const currentEmpresa = await getCurrentEmpresa()
    if (!currentEmpresa) {
      throw new Error('Empresa não encontrada')
    }
    
    // Buscar role_id baseado no tipo
    const isAdminRole = role === 'ADMIN'
    let roleId = null
    
    const roleName = role === 'ADMIN' ? 'Admin' : 'Vendedor'
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .eq('empresa_id', currentEmpresa.id)
      .eq('is_active', true)
      .single()
    
    if (roleData) {
      roleId = roleData.id
      console.log(`✅ Role ID encontrado para ${roleName}:`, roleId)
    } else {
      console.warn(`⚠️ Role ${roleName} não encontrado`)
    }

    // Tentar usar RPC primeiro
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('fix_user_profile', {
        user_uuid: userUuid,
        user_empresa_id: currentEmpresa.id,
        user_role_id: roleId,
        user_is_admin: isAdminRole
      })
      
      if (rpcError) {
        console.warn('⚠️ RPC fix_user_profile não disponível, usando método direto:', rpcError)
        throw new Error('RPC_NOT_AVAILABLE')
      }
      
      if (rpcResult && rpcResult.success) {
        console.log('✅ Perfil corrigido via RPC:', rpcResult)
        return rpcResult
      } else {
        throw new Error(rpcResult?.message || 'Erro desconhecido na RPC')
      }
      
    } catch (rpcError: any) {
      if (rpcError.message !== 'RPC_NOT_AVAILABLE') {
        console.error('❌ Erro na RPC:', rpcError)
      }
      
      // Fallback: Método direto
      console.log('🔄 Usando método direto para correção...')
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          empresa_id: currentEmpresa.id,
          is_admin: isAdminRole,
          role_id: roleId
        })
        .eq('uuid', userUuid)
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ Erro ao atualizar perfil:', updateError)
        throw new Error(`Erro ao atualizar perfil: ${updateError.message}`)
      }
      
      console.log('✅ Perfil corrigido com sucesso:', {
        uuid: updatedProfile.uuid,
        empresa_id: updatedProfile.empresa_id,
        role_id: updatedProfile.role_id,
        is_admin: updatedProfile.is_admin
      })
      
      return updatedProfile
    }
    
  } catch (error) {
    console.error('❌ Erro ao corrigir perfil:', error)
    throw error
  }
}

/**
 * Função para corrigir todos os usuários da empresa que estão sem empresa_id
 */
export async function fixAllCompanyUsers() {
  try {
    console.log('🔧 Buscando usuários sem empresa_id...')
    
    const currentEmpresa = await getCurrentEmpresa()
    if (!currentEmpresa) {
      throw new Error('Empresa não encontrada')
    }
    
    // Buscar usuários sem empresa_id
    const { data: usersToFix, error } = await supabase
      .from('profiles')
      .select('uuid, full_name, email, is_admin')
      .is('empresa_id', null)
    
    if (error) {
      throw error
    }
    
    if (!usersToFix || usersToFix.length === 0) {
      console.log('✅ Nenhum usuário para corrigir')
      return []
    }
    
    console.log(`🔧 Corrigindo ${usersToFix.length} usuários...`)
    
    const results = []
    for (const user of usersToFix) {
      try {
        const role = user.is_admin ? 'ADMIN' : 'VENDEDOR'
        const result = await fixUserProfile(user.uuid, role)
        results.push(result)
        console.log(`✅ Usuário ${user.full_name} corrigido`)
      } catch (error) {
        console.error(`❌ Erro ao corrigir usuário ${user.full_name}:`, error)
      }
    }
    
    return results
    
  } catch (error) {
    console.error('❌ Erro ao corrigir usuários:', error)
    throw error
  }
}
