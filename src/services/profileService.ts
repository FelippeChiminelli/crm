import { supabase } from './supabaseClient'
import type { Profile, UpdateProfileData, ProfileWithRole } from '../types'

// ===========================================
// FUNÇÕES DE PERFIL PESSOAL
// ===========================================

// Buscar perfil por UUID (usado pelo AuthContext)
export async function getProfile(uuid: string): Promise<{ data: ProfileWithRole | null; error: any }> {
  try {
    console.log('🔍 Buscando perfil para UUID:', uuid)
    
    // Fazer apenas a consulta básica primeiro para não travar
    console.log('🔍 Executando query básica para profiles...')
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('uuid, full_name, phone, email, is_admin, empresa_id')
      .eq('uuid', uuid)
      .single()
    
    console.log('🔍 Query de profiles concluída, resultado:', { profile, error })

    if (error) {
      console.error('❌ Erro ao buscar perfil:', error)
      return { data: null, error }
    }

    if (!profile) {
      console.log('⚠️ Perfil não encontrado para UUID:', uuid)
      return { data: null, error: 'Perfil não encontrado' }
    }

    // Para simplificar, não buscar role agora - usar apenas is_admin
    const profileWithRole: ProfileWithRole = {
      ...profile,
      birth_date: undefined,
      gender: undefined,
      created_at: new Date().toISOString(),
      role: undefined, // Simplificado
      is_admin: profile.is_admin || false
    }

    console.log('✅ Perfil encontrado:', profileWithRole)
    return { data: profileWithRole, error: null }
  } catch (error) {
    console.error('❌ getProfile: Erro:', error)
    return { data: null, error }
  }
}

// Buscar perfil do usuário atual
export async function getCurrentUserProfile(): Promise<{ data: ProfileWithRole | null; error: any }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: null, error: userError || 'Usuário não autenticado' }
    }

    // Usar a função getProfile já implementada
    return await getProfile(user.id)
  } catch (error) {
    console.error('❌ getCurrentUserProfile: Erro:', error)
    return { data: null, error }
  }
}

// Atualizar perfil do usuário atual
export async function updateCurrentUserProfile(updateData: UpdateProfileData): Promise<{ data: Profile | null; error: any }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: null, error: userError || 'Usuário não autenticado' }
    }

    // Validar dados de entrada
    const validationError = validateProfileData(updateData)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Preparar dados para atualização
    const updatePayload: any = {}
    
    if (updateData.full_name !== undefined) {
      updatePayload.full_name = updateData.full_name.trim()
    }
    
    if (updateData.phone !== undefined) {
      updatePayload.phone = updateData.phone.trim()
    }
    
    if (updateData.birth_date !== undefined) {
      updatePayload.birth_date = updateData.birth_date || null
    }
    
    if (updateData.gender !== undefined) {
      updatePayload.gender = updateData.gender || null
    }

    // Se está tentando alterar email, verificar se é único
    if (updateData.email !== undefined && updateData.email.trim() !== '') {
      const newEmail = updateData.email.trim().toLowerCase()
      
      // Verificar se email já existe em outro perfil
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('uuid')
        .eq('email', newEmail)
        .neq('uuid', user.id)
        .single()

      if (existingProfile) {
        return { data: null, error: 'Este email já está sendo usado por outro usuário' }
      }

      updatePayload.email = newEmail
    }

    // Atualizar perfil
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('uuid', user.id)
      .select()
      .single()

    if (error) {
      return { data: null, error }
    }

    return { data: profile, error: null }
  } catch (error) {
    console.error('❌ updateCurrentUserProfile: Erro:', error)
    return { data: null, error }
  }
}

// Atualizar senha do usuário
export async function updateUserPassword(currentPassword: string, newPassword: string): Promise<{ error: any }> {
  try {
    // Validar nova senha
    if (!newPassword || newPassword.length < 6) {
      return { error: 'A nova senha deve ter pelo menos 6 caracteres' }
    }

    // Primeiro verificar senha atual fazendo login
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user || !user.email) {
      return { error: 'Usuário não autenticado' }
    }

    // Tentar login com senha atual para validação
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    })

    if (signInError) {
      return { error: 'Senha atual incorreta' }
    }

    // Atualizar senha
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    console.error('❌ updateUserPassword: Erro:', error)
    return { error: 'Erro interno do servidor' }
  }
}

// Solicitar alteração de email (requer verificação)
export async function requestEmailChange(newEmail: string, password: string): Promise<{ error: any }> {
  try {
    // Validar novo email
    if (!newEmail || !isValidEmail(newEmail)) {
      return { error: 'Email inválido' }
    }

    const normalizedEmail = newEmail.trim().toLowerCase()

    // Verificar se email já existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('uuid')
      .eq('email', normalizedEmail)
      .single()

    if (existingProfile) {
      return { error: 'Este email já está sendo usado' }
    }

    // Validar senha atual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user || !user.email) {
      return { error: 'Usuário não autenticado' }
    }

    // Verificar senha
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password
    })

    if (signInError) {
      return { error: 'Senha incorreta' }
    }

    // Solicitar mudança de email
    const { error } = await supabase.auth.updateUser({
      email: normalizedEmail
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    console.error('❌ requestEmailChange: Erro:', error)
    return { error: 'Erro interno do servidor' }
  }
}

// Buscar histórico de atividades do usuário (opcional)
export async function getUserActivityHistory(limit: number = 50): Promise<{ data: any[] | null; error: any }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: null, error: userError || 'Usuário não autenticado' }
    }

    // Buscar leads criados/modificados pelo usuário
    const { data: leadActivities } = await supabase
      .from('leads')
      .select('id, name, created_at, stage_id, stages(name)')
      .eq('responsible_uuid', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Buscar tarefas criadas pelo usuário
    const { data: taskActivities } = await supabase
      .from('tasks')
      .select('id, title, created_at, status')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Combinar e ordenar atividades
    const activities = [
      ...(leadActivities?.map(lead => ({
        type: 'lead',
        id: lead.id,
        title: `Lead: ${lead.name}`,
        description: `Etapa: ${(lead.stages as any)?.name || 'N/A'}`,
        created_at: lead.created_at
      })) || []),
      ...(taskActivities?.map(task => ({
        type: 'task',
        id: task.id,
        title: `Tarefa: ${task.title}`,
        description: `Status: ${task.status}`,
        created_at: task.created_at
      })) || [])
    ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

    return { data: activities, error: null }
  } catch (error) {
    console.error('❌ getUserActivityHistory: Erro:', error)
    return { data: null, error }
  }
}

 // Atualizar empresa_id de um perfil específico
export async function updateProfileEmpresaId(uuid: string, empresa_id: string): Promise<{ data: Profile | null; error: any }> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ empresa_id })
      .eq('uuid', uuid)
      .select()
      .single()
    if (error) {
      return { data: null, error }
    }
    return { data: profile, error: null }
  } catch (error) {
    console.error('❌ updateProfileEmpresaId: Erro:', error)
    return { data: null, error }
  }
}

// Atualizar empresa_id e is_admin de um perfil específico
export async function updateProfileEmpresaIdAndAdmin(uuid: string, empresa_id: string, is_admin: boolean = false): Promise<{ data: Profile | null; error: any }> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ empresa_id, is_admin })
      .eq('uuid', uuid)
      .select()
      .single()
    if (error) {
      return { data: null, error }
    }
    return { data: profile, error: null }
  } catch (error) {
    console.error('❌ updateProfileEmpresaIdAndAdmin: Erro:', error)
    return { data: null, error }
  }
}

// Atualizar empresa_id, is_admin e role_id de um perfil específico
export async function updateProfileEmpresaAdminRole(uuid: string, empresa_id: string, role_id: string, is_admin: boolean = false): Promise<{ data: Profile | null; error: any }> {
  try {
    console.log('🔧 updateProfileEmpresaAdminRole: Iniciando função...')
    console.log('🔧 Parâmetros recebidos:', { uuid, empresa_id, role_id, is_admin })
    
    // Verificar se o perfil existe antes do update
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('uuid', uuid)
      .single()
    console.log('🔧 Perfil existente ANTES do update:', existingProfile)
    if (selectError) {
      console.error('🔧 Erro ao buscar perfil existente:', selectError)
    }
    
    console.log('🔧 Executando update com dados:', { empresa_id, is_admin, role_id })
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ empresa_id, is_admin, role_id })
      .eq('uuid', uuid)
      .select()
      .single()
    console.log('🔧 Resultado RAW do Supabase update:', { profile, error })
    console.log('🔧 Profile retornado:', profile)
    console.log('🔧 Error retornado:', error)
    if (error) {
      console.error('🔧 Erro no update, retornando:', error)
      return { data: null, error }
    }
    console.log('🔧 Update bem-sucedido, retornando profile:', profile)
    return { data: profile, error: null }
  } catch (error) {
    console.error('❌ updateProfileEmpresaAdminRole: Erro:', error)
    return { data: null, error }
  }
}

// Buscar todos os perfis (para listagem em selects)
export async function getAllProfiles(): Promise<{ data: { uuid: string; full_name: string; email: string }[] | null; error: any }> {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('uuid, full_name, email')
      .order('full_name', { ascending: true })

    if (error) {
      return { data: null, error }
    }

    return { data: profiles, error: null }
  } catch (error) {
    console.error('❌ getAllProfiles: Erro:', error)
    return { data: null, error }
  }
}

// ===========================================
// FUNÇÕES DE VALIDAÇÃO
// ===========================================

function validateProfileData(data: UpdateProfileData): string | null {
  // Validar nome
  if (data.full_name !== undefined) {
    if (!data.full_name || data.full_name.trim().length < 2) {
      return 'Nome deve ter pelo menos 2 caracteres'
    }
    if (data.full_name.trim().length > 100) {
      return 'Nome deve ter no máximo 100 caracteres'
    }
  }

  // Validar telefone
  if (data.phone !== undefined) {
    if (!data.phone || data.phone.trim().length < 10) {
      return 'Telefone deve ter pelo menos 10 caracteres'
    }
    if (!/^[\d\s\-\(\)\+]+$/.test(data.phone.trim())) {
      return 'Telefone contém caracteres inválidos'
    }
  }

  // Validar email
  if (data.email !== undefined && data.email.trim() !== '') {
    if (!isValidEmail(data.email.trim())) {
      return 'Email inválido'
    }
  }

  // Validar data de nascimento
  if (data.birth_date !== undefined && data.birth_date !== '') {
    const birthDate = new Date(data.birth_date)
    const today = new Date()
    const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate())
    const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())

    if (birthDate < minDate || birthDate > maxDate) {
      return 'Data de nascimento deve estar entre 13 e 120 anos atrás'
    }
  }

  // Validar gênero
  if (data.gender !== undefined && data.gender !== null) {
    if (!['masculino', 'feminino'].includes(data.gender)) {
      return 'Gênero deve ser masculino ou feminino'
    }
  }

  return null
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
} 