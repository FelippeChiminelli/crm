import { supabase } from './supabaseClient'
import { getCurrentEmpresa } from './empresaService'

/**
 * Função para criar usuário e corrigir perfil usando SQL direto
 * Esta abordagem bypassa os problemas de sessão e RLS
 */
export async function createUserDirectly(userData: {
  fullName: string
  email: string
  phone: string
  birthDate: string
  gender: 'masculino' | 'feminino' | 'outro'
  password: string
  role?: 'ADMIN' | 'VENDEDOR'
}) {
  try {
    console.log('👤 createUserDirectly: Iniciando criação...', userData.email)
    
    // Verificar empresa atual
    const currentEmpresa = await getCurrentEmpresa()
    if (!currentEmpresa) {
      throw new Error('Empresa não encontrada')
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', userData.email.trim())
      .single()
    
    if (existingUser) {
      throw new Error('E-mail já cadastrado no sistema')
    }

    // Buscar role_id baseado no tipo
    const isAdminRole = userData.role === 'ADMIN'
    let roleId = null
    
    if (userData.role) {
      const roleName = userData.role === 'ADMIN' ? 'Admin' : 'Vendedor'
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
      }
    }

    // Salvar sessão atual do admin
    const { data: { session: adminSession } } = await supabase.auth.getSession()
    if (!adminSession) {
      throw new Error('Sessão do administrador não encontrada')
    }

    console.log('🔄 Criando usuário no auth...')
    
    // Criar usuário usando signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email.trim(),
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName.trim(),
          phone: userData.phone.trim(),
          birth_date: userData.birthDate,
          gender: userData.gender
        }
      }
    })
    
    if (authError || !authData.user) {
      throw new Error(`Erro ao criar usuário: ${authError?.message || 'Erro desconhecido'}`)
    }

    console.log('✅ Usuário criado no auth:', authData.user.id)

    // Fazer logout do novo usuário
    await supabase.auth.signOut()

    // Restaurar sessão admin
    await supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token
    })

    console.log('🔄 Aguardando trigger criar perfil...')
    
    // Aguardar o trigger criar o perfil (mais tempo para garantir)
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Agora usar SQL direto para atualizar (bypassing RLS)
    console.log('🔄 Executando correção via SQL direto...')
    
    const updateQuery = `
      UPDATE profiles 
      SET 
        empresa_id = '${currentEmpresa.id}',
        role_id = ${roleId ? `'${roleId}'` : 'NULL'},
        is_admin = ${isAdminRole},
        full_name = '${userData.fullName.trim().replace(/'/g, "''")}',
        phone = '${userData.phone.trim()}',
        birth_date = ${userData.birthDate ? `'${userData.birthDate}'` : 'NULL'},
        gender = '${userData.gender}',
        updated_at = NOW()
      WHERE uuid = '${authData.user.id}'
      RETURNING uuid, full_name, empresa_id, role_id, is_admin;
    `

    const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
      query: updateQuery
    })

    if (updateError) {
      console.warn('⚠️ SQL direto falhou, tentando método normal:', updateError)
      
      // Fallback: método normal
      const { data: updatedProfile, error: normalError } = await supabase
        .from('profiles')
        .update({
          empresa_id: currentEmpresa.id,
          role_id: roleId,
          is_admin: isAdminRole,
          full_name: userData.fullName.trim(),
          phone: userData.phone.trim(),
          birth_date: userData.birthDate || null,
          gender: userData.gender
        })
        .eq('uuid', authData.user.id)
        .select()
        .single()

      if (normalError) {
        console.error('❌ Erro ao atualizar perfil:', normalError)
        throw new Error(`Erro ao atualizar perfil: ${normalError.message}`)
      }

      console.log('✅ Perfil atualizado via método normal:', updatedProfile)
      return {
        success: true,
        user: authData.user,
        profile: updatedProfile
      }
    }

    console.log('✅ Perfil atualizado via SQL direto:', updateResult)

    return {
      success: true,
      user: authData.user,
      profile: updateResult?.[0] || { uuid: authData.user.id }
    }

  } catch (error) {
    console.error('❌ createUserDirectly: Erro:', error)
    throw error
  }
}
