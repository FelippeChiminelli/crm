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
      .select('uuid, full_name, email, phone, birth_date, gender, created_at, is_admin, ver_todos_leads')
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

// Função para traduzir mensagens de erro do Supabase Auth
function translateAuthError(errorMessage: string): string {
  const errorTranslations: Record<string, string> = {
    // Erros de autenticação
    'User already registered': 'Este e-mail já está cadastrado no sistema.',
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'E-mail ainda não foi confirmado. Verifique sua caixa de entrada.',
    'Invalid email or password': 'E-mail ou senha inválidos.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'O formato do e-mail é inválido.',
    'Signup requires a valid password': 'É necessário informar uma senha válida.',
    'A user with this email address has already been registered': 'Este e-mail já está em uso.',
    'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
    'For security purposes, you can only request this once every 60 seconds': 'Por segurança, aguarde 60 segundos antes de tentar novamente.',
    
    // Erros de rede/servidor
    'Failed to fetch': 'Erro de conexão. Verifique sua internet e tente novamente.',
    'Network request failed': 'Falha na conexão. Verifique sua internet.',
    'Request timeout': 'A requisição demorou muito. Tente novamente.',
    
    // Erros de sessão
    'Session expired': 'Sua sessão expirou. Por favor, faça login novamente.',
    'JWT expired': 'Sua sessão expirou. Por favor, faça login novamente.',
    'Refresh token not found': 'Sessão inválida. Por favor, faça login novamente.',
    
    // Erros de permissão
    'Permission denied': 'Você não tem permissão para realizar esta ação.',
    'Insufficient permissions': 'Permissões insuficientes para esta operação.',
    
    // Erros de dados
    'duplicate key value': 'Este registro já existe no sistema.',
    'violates foreign key constraint': 'Não é possível completar a operação. Dados relacionados não encontrados.',
    'null value in column': 'Campo obrigatório não preenchido.',
  }
  
  // Verificar se a mensagem contém alguma das chaves conhecidas
  for (const [key, translation] of Object.entries(errorTranslations)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return translation
    }
  }
  
  // Se não encontrar tradução, retornar mensagem genérica amigável
  if (errorMessage.includes('auth') || errorMessage.includes('Auth')) {
    return 'Erro de autenticação. Verifique seus dados e tente novamente.'
  }
  
  return `Ocorreu um erro: ${errorMessage}`
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
      throw new Error('Acesso negado. Apenas administradores podem adicionar novos usuários à empresa.')
    }
    
    // Verificar se empresa pode adicionar mais usuários
    const canAdd = await canAddMoreUsers()
    if (!canAdd) {
      throw new Error('Limite de usuários atingido para o seu plano atual. Entre em contato com o suporte para fazer upgrade.')
    }
    
    const currentEmpresa = await getCurrentEmpresa()
    if (!currentEmpresa) {
      throw new Error('Não foi possível identificar sua empresa. Por favor, faça login novamente.')
    }
    
    // Validar dados do usuário
    if (!userData.fullName?.trim()) {
      throw new Error('Por favor, informe o nome completo do usuário.')
    }
    
    if (userData.fullName.trim().length < 3) {
      throw new Error('O nome completo deve ter pelo menos 3 caracteres.')
    }
    
    if (!userData.email?.trim()) {
      throw new Error('Por favor, informe o e-mail do usuário.')
    }
    
    // Validar formato do e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userData.email.trim())) {
      throw new Error('O e-mail informado não é válido. Verifique e tente novamente.')
    }
    
    if (!userData.phone?.trim()) {
      throw new Error('Por favor, informe o telefone do usuário.')
    }
    
    // Validar formato do telefone (mínimo 10 dígitos)
    const phoneDigits = userData.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      throw new Error('O telefone deve ter pelo menos 10 dígitos (DDD + número).')
    }
    
    if (!userData.password) {
      throw new Error('Por favor, defina uma senha para o usuário.')
    }
    
    if (userData.password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres para maior segurança.')
    }
    
    // Verificar se e-mail já existe na tabela profiles
    const { data: existingAuthUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', userData.email.trim())
      .single()
    
    if (existingAuthUser) {
      throw new Error('Este e-mail já está em uso. Por favor, utilize outro e-mail.')
    }
    
    // Preparar dados de role ANTES de criar o usuário (como admin)
    const isAdminRoleRequested = userData.role === 'ADMIN'
    let requestedRoleId: string | null = null
    try {
      const roleName = isAdminRoleRequested ? 'Admin' : 'Vendedor'
      
      // Buscar role existente
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .eq('empresa_id', currentEmpresa.id)
        .eq('is_active', true)
        .single()
      
      if (roleData) {
        requestedRoleId = roleData.id
        console.log(`✅ Role ID (pré-cálculo) para ${roleName}:`, requestedRoleId)
      } else if (roleError?.code === 'PGRST116' || !roleData) {
        // Role não encontrado, criar automaticamente via RPC
        console.log(`🔧 Role ${roleName} não encontrado, criando automaticamente...`)
        
        const { data: createResult, error: createError } = await supabase.rpc('create_role_rpc', {
          name: roleName,
          description: roleName === 'Admin' ? 'Administrador da empresa' : 'Vendedor/Atendente',
          empresa_id: currentEmpresa.id,
          is_system_role: true
        })
        
        if (createError) {
          console.warn(`⚠️ Erro ao criar role ${roleName} via RPC:`, createError.message)
        } else if (createResult?.success && createResult?.role_id) {
          requestedRoleId = createResult.role_id
          console.log(`✅ Role ${roleName} criado com sucesso:`, requestedRoleId)
        } else {
          console.warn(`⚠️ Resposta inesperada ao criar role:`, createResult)
        }
      }
    } catch (roleLookupError) {
      console.warn('⚠️ Erro ao buscar/criar role antes da criação:', roleLookupError)
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
        
        // Tratar erro de usuário já existente - tentar vincular à empresa
        if (authError?.message?.includes('already registered') || authError?.message?.includes('User already')) {
          console.log('🔄 Usuário já existe no auth, tentando vincular à empresa...')
          
          // Restaurar sessão do admin antes de continuar
          try {
            await supabase.auth.setSession({
              access_token: adminSession.access_token,
              refresh_token: adminSession.refresh_token
            })
          } catch (restoreErr) {
            console.warn('⚠️ Erro ao restaurar sessão:', restoreErr)
          }
          
          // Verificar se já existe profile para esse email
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('uuid, empresa_id')
            .eq('email', userData.email.trim())
            .single()
          
          if (existingProfile) {
            if (existingProfile.empresa_id === currentEmpresa.id) {
              throw new Error('Este usuário já faz parte da sua empresa. Verifique na lista de usuários.')
            } else {
              throw new Error('Este e-mail pertence a um usuário de outra empresa. Utilize um e-mail diferente.')
            }
          }
          
          // O usuário existe no auth mas não tem profile - criar via RPC
          console.log('🔧 Criando profile para usuário existente via RPC...')
          
          try {
            const { data: createProfileResult, error: createProfileError } = await supabase.rpc('create_profile_with_empresa_rpc', {
              user_uuid: authError?.message?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || '',
              full_name: userData.fullName.trim(),
              phone: userData.phone.trim(),
              email: userData.email.trim(),
              empresa_id: currentEmpresa.id,
              birth_date: userData.birthDate,
              gender: userData.gender
            })
            
            if (createProfileError || !createProfileResult?.success) {
              console.error('❌ Erro ao criar profile via RPC:', createProfileError || createProfileResult?.message)
              throw new Error('Este e-mail já está em uso no sistema. Por favor, utilize outro e-mail.')
            }
            
            // Atualizar role_id e is_admin
            if (createProfileResult?.profile?.uuid && requestedRoleId) {
              await supabase.rpc('update_profile_role_rpc', {
                user_uuid: createProfileResult.profile.uuid,
                role_id: requestedRoleId
              })
            }
            
            console.log('✅ Profile criado e vinculado com sucesso:', createProfileResult.profile?.uuid)
            
            return {
              success: true,
              user: {
                id: createProfileResult.profile?.uuid,
                email: userData.email.trim()
              },
              profile: createProfileResult.profile,
              message: `Usuário ${userData.fullName} vinculado com sucesso à empresa!`
            }
          } catch (rpcErr: any) {
            console.error('❌ Falha ao criar profile via RPC:', rpcErr)
            throw new Error('Este e-mail já está em uso no sistema. Por favor, utilize outro e-mail.')
          }
        }
        
        // Traduzir mensagens de erro comuns do Supabase Auth
        const errorMessage = authError?.message || 'Erro desconhecido'
        const translatedError = translateAuthError(errorMessage)
        throw new Error(translatedError)
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
      throw new Error('Sua sessão expirou. Por favor, faça login novamente.')
    }

    // Verificar se o usuário atual é admin
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, empresa_id')
      .eq('uuid', currentUser.id)
      .single()

    if (profileError || !currentProfile?.is_admin) {
      throw new Error('Acesso negado. Apenas administradores podem alterar permissões de usuários.')
    }

    // Verificar se o usuário a ser alterado pertence à mesma empresa
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('uuid', userId)
      .single()

    if (targetError) {
      throw new Error('Usuário não encontrado. Ele pode ter sido removido.')
    }

    if (targetProfile.empresa_id !== currentProfile.empresa_id) {
      throw new Error('Operação não permitida. Este usuário não pertence à sua empresa.')
    }

    // Atualizar o campo is_admin no perfil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('uuid', userId)

    if (updateError) {
      console.error('❌ Erro ao atualizar role:', updateError)
      throw new Error('Não foi possível atualizar as permissões. Tente novamente em alguns instantes.')
    }

    console.log('✅ Role do usuário atualizada com sucesso')
  } catch (error) {
    console.error('❌ updateUserRole: Erro:', error)
    throw error
  }
}

// ===========================================
// FUNÇÃO PARA EXCLUIR USUÁRIO DA EMPRESA
// ===========================================

export async function deleteEmpresaUser(userId: string): Promise<void> {
  try {
    console.log('🗑️ deleteEmpresaUser: Iniciando exclusão do usuário:', userId)
    
    // Verificar se o usuário atual é admin
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
    if (userError || !currentUser) {
      throw new Error('Sua sessão expirou. Por favor, faça login novamente.')
    }

    // Impedir que o usuário exclua a si mesmo
    if (currentUser.id === userId) {
      throw new Error('Não é possível excluir sua própria conta. Peça para outro administrador fazer isso.')
    }

    // Verificar se o usuário atual é admin
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, empresa_id')
      .eq('uuid', currentUser.id)
      .single()

    if (profileError || !currentProfile?.is_admin) {
      throw new Error('Acesso negado. Apenas administradores podem excluir usuários.')
    }

    // Verificar se o usuário a ser excluído pertence à mesma empresa
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('empresa_id, full_name')
      .eq('uuid', userId)
      .single()

    if (targetError) {
      throw new Error('Usuário não encontrado. Ele pode já ter sido excluído.')
    }

    if (targetProfile.empresa_id !== currentProfile.empresa_id) {
      throw new Error('Operação não permitida. Este usuário não pertence à sua empresa.')
    }

    console.log('🗑️ deleteEmpresaUser: Excluindo usuário:', targetProfile.full_name)

    // Primeiro, remover registros relacionados na tabela user_roles (se existir)
    try {
      const { error: userRolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
      
      if (userRolesError) {
        console.warn('⚠️ Erro ao remover user_roles (pode não existir):', userRolesError.message)
      }
    } catch (e) {
      console.warn('⚠️ Tabela user_roles pode não existir:', e)
    }

    // Tentar usar função RPC para excluir o usuário completamente (auth + profile)
    try {
      const { data: result, error: rpcError } = await supabase.rpc('delete_empresa_user', {
        target_user_id: userId
      })
      
      if (!rpcError && result?.success) {
        console.log('✅ deleteEmpresaUser: Usuário excluído via RPC')
        return
      }
      
      if (rpcError) {
        console.log('⚠️ deleteEmpresaUser: RPC não disponível:', rpcError.message)
      }
    } catch (rpcError) {
      console.log('⚠️ deleteEmpresaUser: RPC não disponível, usando método alternativo')
    }

    // Método alternativo: Apenas desativar/remover o perfil
    // Nota: A exclusão completa do auth.users requer service_role ou uma função RPC
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('uuid', userId)

    if (deleteError) {
      console.error('❌ deleteEmpresaUser: Erro ao excluir perfil:', deleteError)
      throw new Error('Não foi possível excluir o usuário. Ele pode ter dados vinculados (leads, tarefas, etc). Tente transferir os dados primeiro.')
    }

    console.log('✅ deleteEmpresaUser: Perfil do usuário excluído com sucesso')
    console.log('⚠️ Nota: O registro em auth.users pode permanecer. Configure uma função RPC para exclusão completa.')
    
  } catch (error) {
    console.error('❌ deleteEmpresaUser: Erro geral:', error)
    throw error
  }
}

// ===========================================
// FUNÇÕES PARA CONTAGEM E TRANSFERÊNCIA
// ===========================================

export interface UserRecordsCounts {
  leads: number
  tasks: number
  conversations: number
  bookings: number
  events: number
  total: number
}

// Buscar contagem de registros do usuário
export async function getUserRecordsCounts(userId: string): Promise<UserRecordsCounts> {
  try {
    console.log('📊 getUserRecordsCounts: Buscando contagens para:', userId)
    
    const [leadsResult, tasksResult, conversationsResult, bookingsResult, eventsResult] = await Promise.all([
      // Leads onde o usuário é responsável
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('responsible_uuid', userId),
      
      // Tarefas atribuídas ao usuário
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', userId),
      
      // Conversas atribuídas ao usuário
      supabase
        .from('chat_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_user_id', userId),
      
      // Agendamentos atribuídos ao usuário
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', userId),
      
      // Eventos criados pelo usuário
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', userId)
    ])
    
    const counts: UserRecordsCounts = {
      leads: leadsResult.count || 0,
      tasks: tasksResult.count || 0,
      conversations: conversationsResult.count || 0,
      bookings: bookingsResult.count || 0,
      events: eventsResult.count || 0,
      total: 0
    }
    
    counts.total = counts.leads + counts.tasks + counts.conversations + counts.bookings + counts.events
    
    console.log('✅ getUserRecordsCounts: Contagens encontradas:', counts)
    return counts
  } catch (error) {
    console.error('❌ getUserRecordsCounts: Erro:', error)
    throw error
  }
}

// Transferir registros de um usuário para outro
export async function transferUserRecords(
  fromUserId: string, 
  toUserId: string,
  options?: {
    transferLeads?: boolean
    transferTasks?: boolean
    transferConversations?: boolean
    transferBookings?: boolean
  }
): Promise<{ success: boolean; transferred: UserRecordsCounts }> {
  try {
    console.log('🔄 transferUserRecords: Transferindo de', fromUserId, 'para', toUserId)
    
    const transferAll = !options
    const transferred: UserRecordsCounts = {
      leads: 0,
      tasks: 0,
      conversations: 0,
      bookings: 0,
      events: 0,
      total: 0
    }
    
    // Transferir leads
    if (transferAll || options?.transferLeads) {
      const { data, error } = await supabase
        .from('leads')
        .update({ responsible_uuid: toUserId })
        .eq('responsible_uuid', fromUserId)
        .select('id')
      
      if (error) {
        console.error('❌ Erro ao transferir leads:', error)
        throw new Error(`Erro ao transferir leads: ${error.message}`)
      }
      transferred.leads = data?.length || 0
      console.log(`✅ ${transferred.leads} leads transferidos`)
    }
    
    // Transferir tarefas
    if (transferAll || options?.transferTasks) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ assigned_to: toUserId })
        .eq('assigned_to', fromUserId)
        .select('id')
      
      if (error) {
        console.error('❌ Erro ao transferir tarefas:', error)
        throw new Error(`Erro ao transferir tarefas: ${error.message}`)
      }
      transferred.tasks = data?.length || 0
      console.log(`✅ ${transferred.tasks} tarefas transferidas`)
    }
    
    // Transferir conversas
    if (transferAll || options?.transferConversations) {
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({ assigned_user_id: toUserId })
        .eq('assigned_user_id', fromUserId)
        .select('id')
      
      if (error) {
        console.error('❌ Erro ao transferir conversas:', error)
        throw new Error(`Erro ao transferir conversas: ${error.message}`)
      }
      transferred.conversations = data?.length || 0
      console.log(`✅ ${transferred.conversations} conversas transferidas`)
    }
    
    // Transferir agendamentos
    if (transferAll || options?.transferBookings) {
      const { data, error } = await supabase
        .from('bookings')
        .update({ assigned_to: toUserId })
        .eq('assigned_to', fromUserId)
        .select('id')
      
      if (error) {
        console.error('❌ Erro ao transferir agendamentos:', error)
        throw new Error(`Erro ao transferir agendamentos: ${error.message}`)
      }
      transferred.bookings = data?.length || 0
      console.log(`✅ ${transferred.bookings} agendamentos transferidos`)
    }
    
    transferred.total = transferred.leads + transferred.tasks + transferred.conversations + transferred.bookings
    
    console.log('✅ transferUserRecords: Transferência concluída:', transferred)
    return { success: true, transferred }
  } catch (error) {
    console.error('❌ transferUserRecords: Erro:', error)
    throw error
  }
} 