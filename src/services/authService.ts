import { supabase } from './supabaseClient'
import SecureLogger from '../utils/logger'

// Tipos para criação de perfil
export interface CreateProfileData {
  uuid: string
  full_name: string
  phone: string
  email: string
  birth_date?: string
  gender?: 'masculino' | 'feminino'
  empresa_id?: string
}

// Função helper para validar e obter empresa do usuário
export async function getUserEmpresaId(): Promise<string | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      SecureLogger.error('getUserEmpresaId: Erro de autenticação', userError)
      
      // Se o erro for de usuário não existente, limpar a sessão
      if (userError.message.includes('User from sub claim in JWT does not exist')) {
        await supabase.auth.signOut()
        return null
      }
      
      return null
    }
    
    if (!user) {
      return null
    }
    
    try {
      // Buscar empresa_id do perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('uuid', user.id)
        .single()
      
      if (profileError) {
        SecureLogger.error('getUserEmpresaId: Erro ao buscar perfil', profileError)
        return null
      }
      
      if (!profile?.empresa_id) {
        return null
      }
      
      return profile.empresa_id
    } catch (error) {
      SecureLogger.error('getUserEmpresaId: Erro geral', error)
      return null
    }
  } catch (error) {
    SecureLogger.error('getUserEmpresaId: Erro inesperado', error)
    return null
  }
}

// Validação de email
function validateEmail(email: string): void {
  if (!email?.trim()) {
    throw new Error('Email é obrigatório')
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Email inválido')
  }
}

// Validação de senha simplificada
function validatePassword(password: string): string | null {
  if (!password) {
    return 'Senha é obrigatória'
  }
  
  if (password.length < 6) {
    return 'Senha deve ter pelo menos 6 caracteres'
  }
  
  // Validações opcionais - comentadas para facilitar o cadastro
  /*
  if (!/(?=.*[a-z])/.test(password)) {
    return 'Senha deve conter pelo menos uma letra minúscula'
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return 'Senha deve conter pelo menos uma letra maiúscula'
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return 'Senha deve conter pelo menos um número'
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return 'Senha deve conter pelo menos um caractere especial (@$!%*?&)'
  }
  */
  
  return null
}

// Validação de dados de perfil
function validateProfileData(profileData: CreateProfileData): void {
  if (!profileData.uuid?.trim()) {
    throw new Error('UUID do usuário é obrigatório')
  }
  
  if (!profileData.full_name?.trim()) {
    throw new Error('Nome completo é obrigatório')
  }
  
  if (profileData.full_name.length < 2) {
    throw new Error('Nome completo deve ter pelo menos 2 caracteres')
  }
  
  if (profileData.full_name.length > 100) {
    throw new Error('Nome completo não pode ter mais de 100 caracteres')
  }
  
  if (!profileData.phone?.trim()) {
    throw new Error('Telefone é obrigatório')
  }
  
  // Validar formato do telefone (aceita formatos brasileiros mais flexíveis)
  const phoneRegex = /^(\+55\s?)?(\(?\d{2}\)?[\s\-]?)?\d{4,5}[\s\-]?\d{4}$|^\d{10,11}$|^\(\d{2}\)\s?\d{4,5}[\s\-]?\d{4}$/
  if (!phoneRegex.test(profileData.phone)) {
    throw new Error('Formato de telefone inválido. Use formato: (11) 99999-9999 ou 11999999999')
  }
  
  validateEmail(profileData.email)
  
  if (profileData.birth_date) {
    const birthDate = new Date(profileData.birth_date)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    
    if (age < 16 || age > 120) {
      throw new Error('Data de nascimento inválida')
    }
  }
  
  if (profileData.gender && !['masculino', 'feminino'].includes(profileData.gender)) {
    throw new Error('Gênero deve ser "masculino" ou "feminino"')
  }
}

// Login com e-mail e senha
export async function login(email: string, password: string) {
  try {
    // Sanitizar entrada
    const sanitizedEmail = email?.trim().toLowerCase()
    
    validateEmail(sanitizedEmail)
    
    if (!password) {
      throw new Error('Senha é obrigatória')
    }
    
    const result = await supabase.auth.signInWithPassword({ 
      email: sanitizedEmail, 
      password 
    })
    
    if (result.error) {
      // Não expor detalhes específicos do erro por segurança
      throw new Error('Email ou senha incorretos')
    }
    
    return result
  } catch (error) {
    SecureLogger.error('Erro no login:', error)
    throw error
  }
}

// Cadastro de usuário
/**
 * Realiza o cadastro do usuário no Supabase Auth e, se profileData for fornecido, cria o perfil na tabela profiles.
 * @param email Email do usuário
 * @param password Senha do usuário
 * @param profileData (Opcional) Dados do perfil para criar na tabela profiles
 */
export async function signUp(
  email: string,
  password: string,
  profileData?: CreateProfileData
): Promise<{ data: any; error: any }> {
  try {
    SecureLogger.log('🔄 Iniciando signUp para:', email)
    
    // Validar senha
    const passwordError = validatePassword(password)
    if (passwordError) {
      return { data: null, error: { message: passwordError } }
    }

    // Preparar dados do usuário com metadados do perfil
    const userData: any = {
      email,
      password,
      options: {
        data: {
          full_name: profileData?.full_name || '',
          phone: profileData?.phone || '',
          birth_date: profileData?.birth_date || null,
          gender: profileData?.gender || 'masculino'
        }
      }
    }

    // Criar usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp(userData)
    
    if (error) {
      SecureLogger.error('❌ Erro no signUp:', error)
      return { data: null, error }
    }

    if (!data.user) {
      SecureLogger.error('❌ SignUp não retornou usuário')
      return { data: null, error: { message: 'Erro ao criar usuário' } }
    }

    SecureLogger.log('✅ Usuário criado no Auth:', data.user.id)
    
    // O perfil será criado automaticamente pelo trigger
    // Não precisamos mais criar manualmente aqui
    
    return { data, error: null }
    
  } catch (error) {
    SecureLogger.error('❌ Erro no cadastro:', error)
    return { data: null, error }
  }
}

// Criar perfil na tabela profiles
export async function createProfile(profileData: CreateProfileData) {
  try {
    SecureLogger.log('🔄 Validando dados do perfil...')
    validateProfileData(profileData)
    
    // Sanitizar dados de entrada
    const sanitizedProfileData = {
      ...profileData,
      full_name: profileData.full_name.trim(),
      phone: profileData.phone.trim(),
      email: profileData.email.trim().toLowerCase(),
      birth_date: profileData.birth_date || null,
      gender: profileData.gender || null
    }
    
    SecureLogger.log('🔄 Inserindo perfil na tabela:', sanitizedProfileData)
    
    const result = await supabase
      .from('profiles')
      .insert([sanitizedProfileData])
    
    if (result.error) {
      SecureLogger.error('❌ createProfile: Erro ao inserir na tabela:', result.error)
      
      if (result.error.message.includes('duplicate key')) {
        throw new Error('Perfil já existe para este usuário')
      }
      
      throw new Error('Erro ao criar perfil. Tente novamente.')
    }
    
    SecureLogger.log('✅ Perfil criado com sucesso')
    return result
  } catch (error) {
    SecureLogger.error('❌ createProfile: Erro geral:', error)
    throw error
  }
}

// Logout
export async function logout() {
  try {
    const result = await supabase.auth.signOut()
    
    if (result.error) {
      throw new Error('Erro ao fazer logout')
    }
    
    return result
  } catch (error) {
    SecureLogger.error('Erro no logout:', error)
    throw error
  }
}

// Obter usuário logado
export function getUser() {
  return supabase.auth.getUser()
}

// Recuperar senha
export async function resetPassword(email: string) {
  try {
    const sanitizedEmail = email?.trim().toLowerCase()
    
    validateEmail(sanitizedEmail)
    
    const result = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    
    if (result.error) {
      throw new Error('Erro ao enviar email de recuperação')
    }
    
    return result
  } catch (error) {
    SecureLogger.error('Erro ao recuperar senha:', error)
    throw error
  }
}

// Atualizar senha
export async function updatePassword(newPassword: string) {
  try {
    validatePassword(newPassword)
    
    const result = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (result.error) {
      throw new Error('Erro ao atualizar senha')
    }
    
    return result
  } catch (error) {
    SecureLogger.error('Erro ao atualizar senha:', error)
    throw error
  }
}

// Verificar se usuário está autenticado
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  } catch (error) {
    SecureLogger.error('Erro ao verificar autenticação:', error)
    return false
  }
}

// Obter perfil do usuário atual
export async function getCurrentUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('uuid', user.id)
      .single()
    
    if (error) {
      throw new Error('Erro ao carregar perfil do usuário')
    }
    
    return { data: profile, error: null }
  } catch (error) {
    SecureLogger.error('Erro ao obter perfil:', error)
    return { data: null, error }
  }
} 