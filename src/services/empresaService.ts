import { supabase } from './supabaseClient'
import type { Empresa } from '../types'

// Validação de dados de empresa
function validateEmpresaData(data: Partial<Empresa>): void {
  console.log('🔍 validateEmpresaData: Validando dados:', data)
  
  if (data.nome !== undefined) {
    if (!data.nome?.trim()) {
      throw new Error('Nome da empresa é obrigatório')
    }
    
    if (data.nome.length < 2) {
      throw new Error('Nome da empresa deve ter pelo menos 2 caracteres')
    }
    
    if (data.nome.length > 100) {
      throw new Error('Nome da empresa não pode ter mais de 100 caracteres')
    }
  }
  
  if (data.cnpj && data.cnpj.trim()) {
    // Remover pontuação para validar apenas números
    const cnpjNumbers = data.cnpj.replace(/[^\d]/g, '')
    console.log('🔍 validateEmpresaData: CNPJ original:', data.cnpj)
    console.log('🔍 validateEmpresaData: CNPJ números:', cnpjNumbers)
    
    // Validar se tem 14 dígitos
    if (cnpjNumbers.length !== 14) {
      throw new Error('CNPJ deve ter 14 dígitos')
    }
    
    // Aceitar tanto formato com pontuação quanto sem
    const cnpjRegex = /^(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{14})$/
    if (!cnpjRegex.test(data.cnpj)) {
      throw new Error('CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX ou apenas números')
    }
  }
  
  if (data.email && data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      throw new Error('Email da empresa inválido')
    }
  }
  
  if (data.telefone && data.telefone.trim()) {
    const phoneRegex = /^(\+55\s?)?(\(?\d{2}\)?[\s\-]?)?\d{4,5}[\s\-]?\d{4}$/
    if (!phoneRegex.test(data.telefone)) {
      throw new Error('Telefone da empresa inválido')
    }
  }
  
  if (data.plano && !['basico', 'premium', 'enterprise'].includes(data.plano)) {
    throw new Error('Plano deve ser: basico, premium ou enterprise')
  }
  
  if (data.max_usuarios && (data.max_usuarios < 1 || data.max_usuarios > 1000)) {
    throw new Error('Máximo de usuários deve estar entre 1 e 1000')
  }
}

// Dados para criar nova empresa
export interface CreateEmpresaData {
  nome: string
  cnpj: string
  email?: string
  telefone?: string
  endereco?: string
  plano?: 'basico' | 'premium' | 'enterprise'
  max_usuarios?: number
}

// Dados para atualizar empresa
export interface UpdateEmpresaData {
  nome?: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  plano?: 'basico' | 'premium' | 'enterprise'
  max_usuarios?: number
  ativo?: boolean
}

// Criar nova empresa
export async function createEmpresa(data: CreateEmpresaData): Promise<Empresa> {
  try {
    console.log('🏢 createEmpresa: Iniciando criação da empresa...')
    console.log('📊 createEmpresa: Dados recebidos:', data)
    
    console.log('🔍 createEmpresa: Validando dados...')
    validateEmpresaData(data)
    console.log('✅ createEmpresa: Validação passou')
    
    // Verificar se CNPJ foi fornecido (agora obrigatório)
    if (!data.cnpj?.trim()) {
      console.error('❌ createEmpresa: CNPJ não fornecido')
      throw new Error('CNPJ é obrigatório')
    }
    
    console.log('🔍 createEmpresa: Verificando CNPJ duplicado...', data.cnpj.trim())
    
    // Verificar CNPJ duplicado
    const { data: existingEmpresa, error: checkError } = await supabase
      .from('empresas')
      .select('id')
      .eq('cnpj', data.cnpj.trim())
      .single()
    
    console.log('📋 createEmpresa: Resultado da verificação CNPJ:', { existingEmpresa, checkError })
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ createEmpresa: Erro ao verificar CNPJ:', checkError)
      throw new Error(`Erro ao verificar CNPJ: ${checkError.message}`)
    }
    
    if (existingEmpresa) {
      console.error('❌ createEmpresa: CNPJ já existe:', existingEmpresa.id)
      throw new Error('CNPJ já cadastrado')
    }
    
    console.log('✅ createEmpresa: CNPJ disponível')
    
    const empresaData = {
      nome: data.nome.trim(),
      cnpj: data.cnpj.trim(),
      email: data.email?.trim() || null,
      telefone: data.telefone?.trim() || null,
      endereco: data.endereco?.trim() || null,
      plano: data.plano || 'basico',
      max_usuarios: data.max_usuarios || 5,
      ativo: true
    }
    
    console.log('📝 createEmpresa: Inserindo dados na tabela empresas...', empresaData)
    
    const { data: newEmpresa, error } = await supabase
      .from('empresas')
      .insert([empresaData])
      .select()
      .single()
    
    console.log('📋 createEmpresa: Resultado da inserção:', { newEmpresa, error })
    
    if (error) {
      console.error('❌ createEmpresa: Erro ao inserir na tabela:', error)
      throw new Error(`Erro ao criar empresa: ${error.message}`)
    }
    
    if (!newEmpresa) {
      console.error('❌ createEmpresa: Empresa não retornada após inserção')
      throw new Error('Empresa criada mas não retornada')
    }
    
    console.log('✅ createEmpresa: Empresa criada com sucesso:', newEmpresa.id)
    return newEmpresa
  } catch (error) {
    console.error('❌ createEmpresa: Erro geral:', error)
    throw error
  }
}

// Obter empresa atual do usuário
export async function getCurrentEmpresa(): Promise<Empresa | null> {
  try {
    console.log('🔍 getCurrentEmpresa: Obtendo empresa do usuário...')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    
    // Buscar empresa através do perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('uuid', user.id)
      .single()
    
    if (profileError || !profile?.empresa_id) {
      console.warn('⚠️ getCurrentEmpresa: Perfil sem empresa_id')
      return null
    }
    
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', profile.empresa_id)
      .single()
    
    if (empresaError) {
      console.error('❌ getCurrentEmpresa: Erro ao buscar empresa:', empresaError)
      return null
    }
    
    console.log('✅ getCurrentEmpresa: Empresa encontrada:', empresa.nome)
    return empresa
  } catch (error) {
    console.error('❌ getCurrentEmpresa: Erro geral:', error)
    return null
  }
}

// Atualizar dados da empresa
export async function updateEmpresa(empresaId: string, data: UpdateEmpresaData): Promise<Empresa> {
  try {
    console.log('🔄 updateEmpresa: Atualizando empresa...', empresaId)
    
    validateEmpresaData(data)
    
    // Verificar se usuário pode atualizar esta empresa
    const currentEmpresa = await getCurrentEmpresa()
    if (!currentEmpresa || currentEmpresa.id !== empresaId) {
      throw new Error('Você não tem permissão para atualizar esta empresa')
    }
    
    // Verificar CNPJ duplicado (se alterado)
    if (data.cnpj?.trim() && data.cnpj !== currentEmpresa.cnpj) {
      const { data: existingEmpresa } = await supabase
        .from('empresas')
        .select('id')
        .eq('cnpj', data.cnpj.trim())
        .neq('id', empresaId)
        .single()
      
      if (existingEmpresa) {
        throw new Error('CNPJ já cadastrado por outra empresa')
      }
    }
    
    const updateData = {
      ...(data.nome && { nome: data.nome.trim() }),
      ...(data.cnpj !== undefined && { cnpj: data.cnpj?.trim() || null }),
      ...(data.email !== undefined && { email: data.email?.trim() || null }),
      ...(data.telefone !== undefined && { telefone: data.telefone?.trim() || null }),
      ...(data.endereco !== undefined && { endereco: data.endereco?.trim() || null }),
      ...(data.plano && { plano: data.plano }),
      ...(data.max_usuarios && { max_usuarios: data.max_usuarios }),
      ...(data.ativo !== undefined && { ativo: data.ativo })
    }
    
    const { data: updatedEmpresa, error } = await supabase
      .from('empresas')
      .update(updateData)
      .eq('id', empresaId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ updateEmpresa: Erro ao atualizar empresa:', error)
      throw new Error(`Erro ao atualizar empresa: ${error.message}`)
    }
    
    console.log('✅ updateEmpresa: Empresa atualizada com sucesso')
    return updatedEmpresa
  } catch (error) {
    console.error('❌ updateEmpresa: Erro geral:', error)
    throw error
  }
}

// Listar usuários da empresa
export async function getEmpresaUsers(): Promise<any[]> {
  try {
    console.log('👥 getEmpresaUsers: Listando usuários da empresa...')
    
    const currentEmpresa = await getCurrentEmpresa()
    if (!currentEmpresa) {
      throw new Error('Empresa não encontrada')
    }



    const { data: users, error } = await supabase
      .from('profiles')
      .select('uuid, full_name, email, phone, created_at, is_admin')
      .eq('empresa_id', currentEmpresa.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ getEmpresaUsers: Erro ao buscar usuários:', error)
      throw new Error(`Erro ao buscar usuários: ${error.message}`)
    }

    console.log('✅ getEmpresaUsers: Usuários encontrados:', users?.length || 0)
    return users || []
  } catch (error) {
    console.error('❌ getEmpresaUsers: Erro geral:', error)
    throw error
  }
}

// Verificar se empresa pode adicionar mais usuários
export async function canAddMoreUsers(): Promise<boolean> {
  try {
    const currentEmpresa = await getCurrentEmpresa()
    if (!currentEmpresa) return false
    
    const users = await getEmpresaUsers()
    return users.length < currentEmpresa.max_usuarios
  } catch (error) {
    console.error('❌ canAddMoreUsers: Erro:', error)
    return false
  }
}

// Estatísticas da empresa
export async function getEmpresaStats() {
  try {
    console.log('📊 getEmpresaStats: Obtendo estatísticas da empresa...')
    
    const currentEmpresa = await getCurrentEmpresa()
    if (!currentEmpresa) {
      throw new Error('Empresa não encontrada')
    }
    
    // Contar usuários, leads, pipelines
    const [usersResult, leadsResult, pipelinesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('uuid', { count: 'exact', head: true })
        .eq('empresa_id', currentEmpresa.id),
      
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', currentEmpresa.id),
      
      supabase
        .from('pipelines')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', currentEmpresa.id)
        .eq('active', true)
    ])
    
    const stats = {
      usuarios: usersResult.count || 0,
      leads: leadsResult.count || 0,
      pipelines: pipelinesResult.count || 0,
      maxUsuarios: currentEmpresa.max_usuarios,
      plano: currentEmpresa.plano,
      ativo: currentEmpresa.ativo
    }
    
    console.log('✅ getEmpresaStats: Estatísticas obtidas:', stats)
    return stats
  } catch (error) {
    console.error('❌ getEmpresaStats: Erro geral:', error)
    throw error
  }
}

// Verificar se usuário é admin da empresa (primeiro usuário cadastrado)
export async function isEmpresaAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    // Buscar o perfil do usuário para verificar is_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, empresa_id')
      .eq('uuid', user.id)
      .single()
    
    if (!profile) {
      console.log('⚠️ isEmpresaAdmin: Perfil não encontrado')
      return false
    }

    const isAdmin = profile.is_admin || false
    console.log('🔍 isEmpresaAdmin: Verificando admin status:', { userId: user.id, isAdmin })
    
    return isAdmin
  } catch (error) {
    console.error('❌ isEmpresaAdmin: Erro:', error)
    return false
  }
}

// Interface para dados de criação de usuário
export interface CreateUserData {
  fullName: string
  email: string
  phone: string
  birthDate: string
  gender: 'masculino' | 'feminino' | 'outro'
  password: string
}


// Criar novo usuário para a empresa (apenas admins)
export async function createUserForEmpresa(userData: CreateUserData & { role?: 'ADMIN' | 'VENDEDOR' }): Promise<any> {
  try {
    console.log('👤 createUserForEmpresa: Criando novo usuário...', userData.email)
    console.log('👤 createUserForEmpresa: Role definido como:', userData.role || 'VENDEDOR (padrão)')
    
    // Verificar se usuário atual é admin
    const isAdmin = await isEmpresaAdmin()
    if (!isAdmin) {
      throw new Error('Apenas administradores podem adicionar novos usuários')
    }
    
    // Verificar se empresa pode adicionar mais usuários
    const canAdd = await canAddMoreUsers()
    if (!canAdd) {
      throw new Error('Limite de usuários atingido. Faça upgrade do seu plano')
    }
    
    const currentEmpresa = await getCurrentEmpresa()
    if (!currentEmpresa) {
      throw new Error('Empresa não encontrada')
    }
    
    // Validar dados do usuário
    if (!userData.fullName?.trim()) {
      throw new Error('Nome completo é obrigatório')
    }
    
    if (!userData.email?.trim()) {
      throw new Error('E-mail é obrigatório')
    }
    
    if (!userData.phone?.trim()) {
      throw new Error('Telefone é obrigatório')
    }
    
    if (!userData.password || userData.password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres')
    }
    
    // Verificar se e-mail já existe na tabela auth.users
    const { data: existingAuthUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', userData.email.trim())
      .single()
    
    if (existingAuthUser) {
      throw new Error('E-mail já cadastrado no sistema')
    }
    
    // Preparar dados de role ANTES de criar o usuário (como admin)
    const isAdminRoleRequested = userData.role === 'ADMIN'
    let requestedRoleId: string | null = null
    try {
      if (userData.role) {
        const roleName = isAdminRoleRequested ? 'Admin' : 'Vendedor'
        const { data: roleData } = await supabase
          .from('roles')
          .select('id')
          .eq('name', roleName)
          .eq('empresa_id', currentEmpresa.id)
          .eq('is_active', true)
          .single()
        if (roleData) {
          requestedRoleId = roleData.id
          console.log(`✅ Role ID (pré-cálculo) para ${roleName}:`, requestedRoleId)
        } else {
          console.warn(`⚠️ Role ${roleName} não encontrado para empresa ${currentEmpresa.id}`)
        }
      }
    } catch (roleLookupError) {
      console.warn('⚠️ Erro ao buscar role antes da criação:', roleLookupError)
    }

    // Tentar usar a função RPC se disponível
    try {
      const { data: result, error: rpcError } = await supabase.rpc('create_empresa_user', {
        user_email: userData.email.trim(),
        user_password: userData.password,
        user_full_name: userData.fullName.trim(),
        user_phone: userData.phone.trim(),
        user_birth_date: userData.birthDate,
        user_gender: userData.gender,
        user_is_admin: isAdminRoleRequested
      })
      
      if (rpcError) {
        console.log('⚠️ createUserForEmpresa: RPC não disponível, usando método alternativo:', rpcError.message)
        throw new Error('RPC_NOT_AVAILABLE')
      }
      
      if (result && result.success) {
        console.log('✅ createUserForEmpresa: Usuário criado via RPC:', result.user_id)
        return result
      } else if (result && result.error) {
        throw new Error(result.error)
      }
    } catch (rpcError: any) {
      if (rpcError.message !== 'RPC_NOT_AVAILABLE') {
        throw rpcError
      }
      
      console.log('⚠️ createUserForEmpresa: Usando método alternativo de criação...')
    }
    
    // Método alternativo: Usar signUp para criar o usuário e perfil automaticamente
    console.log('⚠️ createUserForEmpresa: Usando método de signup temporário...')
    
    // Salvar dados da sessão atual do admin
    const { data: { session: adminSession } } = await supabase.auth.getSession()
    
    if (!adminSession) {
      throw new Error('Sessão do administrador não encontrada')
    }
    
    try {
      // Criar usuário usando signUp (isso vai criar automaticamente na tabela auth e profiles via trigger)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.trim(),
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName.trim(),
            phone: userData.phone.trim(),
            birth_date: userData.birthDate,
            gender: userData.gender,
            empresa_id: currentEmpresa.id
          }
        }
      })
      
      if (authError || !authData.user) {
        console.error('❌ createUserForEmpresa: Erro ao criar usuário auth:', authError)
        throw new Error(`Erro ao criar usuário: ${authError?.message || 'Erro desconhecido'}`)
      }
      
      console.log('✅ createUserForEmpresa: Usuário criado com ID:', authData.user.id)
      
      // Importante: Fazer login como o usuário recém-criado para atualizar o próprio perfil (passa no RLS)
      try {
        console.log('🔐 Fazendo login temporário como o novo usuário para atualizar perfil...')
        const { error: tempLoginError } = await supabase.auth.signInWithPassword({
          email: userData.email.trim(),
          password: userData.password
        })
        if (tempLoginError) {
          console.warn('⚠️ Login temporário falhou (pode já estar logado):', tempLoginError.message)
        }
      } catch (e) {
        console.warn('⚠️ Falha ao garantir sessão do novo usuário:', e)
      }

      // Atualizar perfil COMO O PRÓPRIO USUÁRIO (RLS permite uuid = auth.uid())
      try {
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: userData.fullName.trim(),
            phone: userData.phone.trim(),
            birth_date: userData.birthDate,
            gender: userData.gender,
            empresa_id: currentEmpresa.id,
            is_admin: isAdminRoleRequested,
            role_id: requestedRoleId
          })
          .eq('uuid', authData.user.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ Erro ao atualizar perfil (como usuário):', updateError)
          throw new Error(`Erro ao atualizar perfil: ${updateError.message}`)
        }
        console.log('✅ Perfil atualizado (como usuário):', {
          uuid: updatedProfile.uuid,
          empresa_id: updatedProfile.empresa_id,
          role_id: updatedProfile.role_id,
          is_admin: updatedProfile.is_admin
        })
      } catch (e) {
        console.error('❌ Falha na atualização do perfil como usuário:', e)
        // Não rethrow aqui para tentar restaurar admin mesmo assim
      }

      // Restaurar sessão do admin
      try {
        const { error: restoreError } = await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token
        })
        if (restoreError) {
          console.warn('⚠️ Erro ao restaurar sessão do admin:', restoreError)
        }
      } catch (e) {
        console.warn('⚠️ Exceção ao restaurar sessão do admin:', e)
      }
      
      // Criar role padrão para o usuário
      try {
        const { data: defaultRole } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'User')
          .eq('empresa_id', currentEmpresa.id)
          .single()
        
        if (defaultRole) {
          await supabase
            .from('user_roles')
            .insert([{
              user_id: authData.user.id,
              role_id: defaultRole.id
            }])
          
          console.log('✅ Role padrão atribuído ao usuário')
        }
      } catch (roleError) {
        console.warn('⚠️ Não foi possível atribuir role padrão:', roleError)
      }
      
      return {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email
        },
        profile: {
          uuid: authData.user.id,
          full_name: userData.fullName.trim(),
          email: userData.email.trim(),
          empresa_id: currentEmpresa.id,
          is_admin: isAdminRoleRequested,
          role_id: requestedRoleId
        },
        message: `Usuário ${userData.fullName} criado com sucesso! Credenciais: ${userData.email} / ${userData.password}`
      }
    } catch (signupError) {
      // Restaurar sessão do admin em caso de erro
      try {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token
        })
      } catch (restoreError) {
        console.error('❌ Erro crítico ao restaurar sessão:', restoreError)
      }
      
      throw signupError
    }
  } catch (error) {
    console.error('❌ createUserForEmpresa: Erro geral:', error)
    throw error
  }
}

// ===========================================
// FUNÇÃO PARA ATUALIZAR ROLE DO USUÁRIO
// ===========================================

export async function updateUserRole(userId: string, isAdmin: boolean): Promise<void> {
  try {
    console.log('🔧 Atualizando role do usuário:', userId, 'isAdmin:', isAdmin)
    
    // Verificar se o usuário atual é admin
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
    if (userError || !currentUser) {
      throw new Error('Usuário não autenticado')
    }

    // Verificar se o usuário atual é admin
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, empresa_id')
      .eq('uuid', currentUser.id)
      .single()

    if (profileError || !currentProfile?.is_admin) {
      throw new Error('Apenas administradores podem alterar roles de usuários')
    }

    // Verificar se o usuário a ser alterado pertence à mesma empresa
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('uuid', userId)
      .single()

    if (targetError) {
      throw new Error('Usuário não encontrado')
    }

    if (targetProfile.empresa_id !== currentProfile.empresa_id) {
      throw new Error('Você não pode alterar usuários de outras empresas')
    }

    // Atualizar o campo is_admin no perfil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('uuid', userId)

    if (updateError) {
      console.error('❌ Erro ao atualizar role:', updateError)
      throw new Error('Erro ao atualizar role do usuário')
    }

    console.log('✅ Role do usuário atualizada com sucesso')
  } catch (error) {
    console.error('❌ updateUserRole: Erro:', error)
    throw error
  }
} 