import { supabase } from './supabaseClient'

// ===========================================
// TIPOS
// ===========================================

export interface GreetingMessage {
  id: string
  profile_uuid: string
  empresa_id: string
  message_type: 'text' | 'media'
  media_type?: 'image' | 'video' | 'audio' | 'document'
  text_content?: string
  media_url?: string
  media_filename?: string
  media_size_bytes?: number
  pipeline_id?: string
  schedule_type: 'always' | 'commercial_hours' | 'after_hours'
  is_active: boolean
  usage_count: number
  last_used_at?: string
  created_at: string
  updated_at: string
}

export interface CreateGreetingMessageData {
  message_type: 'text' | 'media'
  media_type?: 'image' | 'video' | 'audio' | 'document'
  text_content?: string
  media_url?: string
  media_filename?: string
  media_size_bytes?: number
  pipeline_id?: string
  schedule_type?: 'always' | 'commercial_hours' | 'after_hours'
  is_active?: boolean
}

export interface UpdateGreetingMessageData {
  text_content?: string
  schedule_type?: 'always' | 'commercial_hours' | 'after_hours'
  is_active?: boolean
  pipeline_id?: string
}

// ===========================================
// FUNÇÕES DE CRUD
// ===========================================

// Buscar todas as mensagens do vendedor atual
export async function getMyGreetingMessages(): Promise<{ data: GreetingMessage[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Usuário não autenticado' }
    }

    const { data, error } = await supabase
      .from('greeting_messages')
      .select('*')
      .eq('profile_uuid', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Erro ao buscar mensagens de saudação:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens de saudação:', error)
    return { data: null, error }
  }
}

// Buscar mensagens de um vendedor específico (para admins)
export async function getGreetingMessagesByProfile(profileUuid: string): Promise<{ data: GreetingMessage[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('greeting_messages')
      .select('*')
      .eq('profile_uuid', profileUuid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Erro ao buscar mensagens de saudação:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens de saudação:', error)
    return { data: null, error }
  }
}

// Criar nova mensagem
export async function createGreetingMessage(data: CreateGreetingMessageData): Promise<{ data: GreetingMessage | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Usuário não autenticado' }
    }

    // Buscar empresa_id do perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('uuid', user.id)
      .single()

    if (!profile?.empresa_id) {
      return { data: null, error: 'Empresa não encontrada' }
    }

    // Validar dados
    if (data.message_type === 'text' && !data.text_content) {
      return { data: null, error: 'Texto é obrigatório para mensagens do tipo texto' }
    }

    if (data.message_type === 'media' && (!data.media_url || !data.media_type)) {
      return { data: null, error: 'URL e tipo de mídia são obrigatórios para mensagens do tipo mídia' }
    }

    const insertData = {
      profile_uuid: user.id,
      empresa_id: profile.empresa_id,
      ...data,
      schedule_type: data.schedule_type || 'always',
      is_active: data.is_active ?? true,
    }

    const { data: newMessage, error } = await supabase
      .from('greeting_messages')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('❌ Erro ao criar mensagem de saudação:', error)
      return { data: null, error }
    }

    console.log('✅ Mensagem de saudação criada com sucesso')
    return { data: newMessage, error: null }
  } catch (error) {
    console.error('❌ Erro ao criar mensagem de saudação:', error)
    return { data: null, error }
  }
}

// Atualizar mensagem
export async function updateGreetingMessage(
  messageId: string,
  updates: UpdateGreetingMessageData
): Promise<{ data: GreetingMessage | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('greeting_messages')
      .update(updates)
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      console.error('❌ Erro ao atualizar mensagem de saudação:', error)
      return { data: null, error }
    }

    console.log('✅ Mensagem de saudação atualizada com sucesso')
    return { data, error: null }
  } catch (error) {
    console.error('❌ Erro ao atualizar mensagem de saudação:', error)
    return { data: null, error }
  }
}

// Deletar mensagem
export async function deleteGreetingMessage(messageId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('greeting_messages')
      .delete()
      .eq('id', messageId)

    if (error) {
      console.error('❌ Erro ao deletar mensagem de saudação:', error)
      return { error }
    }

    console.log('✅ Mensagem de saudação deletada com sucesso')
    return { error: null }
  } catch (error) {
    console.error('❌ Erro ao deletar mensagem de saudação:', error)
    return { error }
  }
}

// Ativar/Desativar mensagem
export async function toggleGreetingMessageStatus(
  messageId: string,
  isActive: boolean
): Promise<{ data: GreetingMessage | null; error: any }> {
  return updateGreetingMessage(messageId, { is_active: isActive })
}

// ===========================================
// FUNÇÕES DE STORAGE
// ===========================================

// Upload de arquivo de mídia via webhook n8n (para chatmedia com service_role)
export async function uploadGreetingMedia(
  file: File
): Promise<{ data: { url: string; filename: string; size: number } | null; error: any }> {
  try {
    // Obter dados do usuário e empresa
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Usuário não autenticado' }
    }

    // Buscar empresa_id do perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('uuid', user.id)
      .single()

    if (!profile?.empresa_id) {
      return { data: null, error: 'Empresa não encontrada' }
    }

    // URL do webhook n8n que fará o upload no chatmedia
    const WEBHOOK_URL = import.meta.env.VITE_GREETING_UPLOAD_WEBHOOK_URL || 'https://n8n.advcrm.com.br/webhook/greeting-upload'

    // Gerar chave aleatória (6 dígitos)
    const randomKey = Math.floor(100000 + Math.random() * 900000).toString()

    console.log('📤 Enviando arquivo para webhook:', { 
      filename: file.name, 
      size: file.size, 
      type: file.type,
      user_id: user.id,
      empresa_id: profile.empresa_id,
      random_key: randomKey
    })

    // Criar FormData com o arquivo e metadados
    const formData = new FormData()
    formData.append('file', file)
    formData.append('filename', file.name)
    formData.append('content_type', file.type || 'application/octet-stream')
    formData.append('size', file.size.toString())
    formData.append('user_id', user.id)
    formData.append('empresa_id', profile.empresa_id)
    formData.append('random_key', randomKey)

    // Enviar para o webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido')
      console.error('❌ Erro no webhook:', { status: response.status, error: errorText })
      return { 
        data: null, 
        error: `Erro ao fazer upload: ${response.status} - ${errorText}` 
      }
    }

    // Receber resposta do webhook com a URL pública
    const result = await response.json()
    
    console.log('✅ Arquivo enviado com sucesso:', result)

    // Validar resposta
    if (!result.url) {
      console.error('❌ Webhook não retornou URL:', result)
      return { 
        data: null, 
        error: 'Webhook não retornou URL válida' 
      }
    }

    return {
      data: {
        url: result.url,
        filename: file.name,
        size: file.size
      },
      error: null
    }
  } catch (error) {
    console.error('❌ Erro ao fazer upload do arquivo:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro ao fazer upload' 
    }
  }
}

// Deletar arquivo de mídia do chatmedia
export async function deleteGreetingMedia(mediaUrl: string): Promise<{ error: any }> {
  try {
    // Extrair o caminho do arquivo da URL
    const url = new URL(mediaUrl)
    const pathParts = url.pathname.split('/')
    
    // Procurar por 'chatmedia' ou 'public' no caminho
    let bucketIndex = pathParts.indexOf('chatmedia')
    if (bucketIndex === -1) {
      bucketIndex = pathParts.indexOf('public')
    }
    
    if (bucketIndex === -1) {
      console.error('❌ Bucket não encontrado na URL:', mediaUrl)
      return { error: 'URL inválida - bucket não encontrado' }
    }

    // Pegar o caminho após o bucket
    const filePath = pathParts.slice(bucketIndex + 1).join('/')

    console.log('🗑️ Deletando arquivo:', filePath)

    const { error } = await supabase.storage
      .from('chatmedia')
      .remove([filePath])

    if (error) {
      console.error('❌ Erro ao deletar arquivo:', error)
      return { error }
    }

    console.log('✅ Arquivo deletado com sucesso')
    return { error: null }
  } catch (error) {
    console.error('❌ Erro ao deletar arquivo:', error)
    return { error }
  }
}

// Atualizar contador de uso
export async function incrementUsageCount(messageId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.rpc('increment_greeting_usage', {
      message_id: messageId
    })

    if (error) {
      console.error('❌ Erro ao incrementar contador de uso:', error)
      return { error }
    }

    return { error: null }
  } catch (error) {
    console.error('❌ Erro ao incrementar contador de uso:', error)
    return { error }
  }
}

