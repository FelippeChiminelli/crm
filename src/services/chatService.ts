import { supabase } from './supabaseClient'
import type { 
  WhatsAppInstance, 
  ChatMessage, 
  ChatConversation, 
  ConnectInstanceData, 
  SendMessageData,
  ChatFilters,
  ConnectInstanceResponse,
  SendMessageResponse
} from '../types'
import SecureLogger from '../utils/logger'
import { getAllowedInstanceIdsForCurrentUser } from './instancePermissionService'

// ===========================================
// FUNÇÕES DE INSTÂNCIA WHATSAPP
// ===========================================

export async function getWhatsAppInstances(): Promise<WhatsAppInstance[]> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('id, name, phone_number, status, empresa_id, created_at, updated_at, auto_create_leads, default_pipeline_id, default_stage_id, default_responsible_uuid')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    SecureLogger.error('Erro ao buscar instâncias WhatsApp', error)
    throw error
  }
}

export async function deleteWhatsAppInstance(instanceId: string, deleteConversations: boolean = true): Promise<void> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    // Verificar se a instância pertence à empresa do usuário
    const { data: instance, error: fetchError } = await supabase
      .from('whatsapp_instances')
      .select('id, empresa_id, name, phone_number')
      .eq('id', instanceId)
      .eq('empresa_id', empresaId)
      .single()

    if (fetchError || !instance) {
      throw new Error('Instância não encontrada ou sem permissão')
    }

    // Obter (opcionalmente) a conversa mais recente associada à instância
    let latestConversationId: string | null = null
    try {
      const { data: convs } = await supabase
        .from('chat_conversations')
        .select('id, updated_at')
        .eq('empresa_id', empresaId)
        .eq('instance_id', instanceId)
        .order('updated_at', { ascending: false })
        .limit(1)
      latestConversationId = convs && convs.length > 0 ? convs[0].id : null
    } catch {}

    // Chamar webhook do n8n para desconectar instância
    SecureLogger.info('Enviando requisição para desconectar instância', {
      url: 'https://n8n.advcrm.com.br/webhook/delinstancia_crm',
      instanceId,
      conversationId: latestConversationId,
      instanceName: instance.name,
      instancePhone: instance.phone_number,
      deleteConversations
    })

    try {
      const response = await fetch('https://n8n.advcrm.com.br/webhook/delinstancia_crm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Alinhar com outros webhooks (instancia_crm, msginterna_crm)
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          action: 'disconnect_instance',
          instance_id: instanceId,
          conversation_id: latestConversationId,
          instance_name: instance.name,
          instance_phone: instance.phone_number,
          empresa_id: empresaId,
          delete_conversations: deleteConversations
        })
      })

      if (!response.ok) {
        SecureLogger.warn('Webhook retornou erro, mas continuando com a exclusão local')
      }
    } catch (webhookError) {
      SecureLogger.warn('Erro ao chamar webhook, mas continuando com a exclusão local', webhookError)
    }

    // Se deleteConversations for true, deletar conversas e mensagens
    if (deleteConversations) {
      // Buscar conversas relacionadas à instância
      const { data: conversations, error: convErr } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('instance_id', instanceId)

      if (convErr) {
        SecureLogger.error('Erro ao buscar conversas da instância antes da exclusão', convErr)
        throw convErr
      }

      const conversationIds: string[] = (conversations || []).map((c: any) => c.id)

      // Helper para processar em lotes grandes
      const chunkArray = <T,>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = []
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size))
        }
        return chunks
      }

      // 1) Deletar mensagens das conversas (em lotes)
      if (conversationIds.length > 0) {
        const batches = chunkArray(conversationIds, 500)
        for (const batch of batches) {
          const { error: delMsgErr } = await supabase
            .from('chat_messages')
            .delete()
            .in('conversation_id', batch)
          if (delMsgErr) {
            SecureLogger.error('Erro ao deletar mensagens da instância', delMsgErr)
            throw delMsgErr
          }
        }
      }

      // 2) Deletar conversas da instância
      const { error: delConvErr } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('instance_id', instanceId)
      if (delConvErr) {
        SecureLogger.error('Erro ao deletar conversas da instância', delConvErr)
        throw delConvErr
      }

      SecureLogger.info('Instância e conversas deletadas com sucesso', { 
        instanceId, 
        conversationsDeleted: conversationIds.length 
      })
    } else {
      // Se não deletar conversas, apenas remover a referência da instância
      const { error: updateConvErr } = await supabase
        .from('chat_conversations')
        .update({ instance_id: null })
        .eq('empresa_id', empresaId)
        .eq('instance_id', instanceId)
      
      if (updateConvErr) {
        SecureLogger.error('Erro ao atualizar conversas da instância', updateConvErr)
        throw updateConvErr
      }

      SecureLogger.info('Instância deletada, conversas mantidas', { 
        instanceId
      })
    }

    // 3) Deletar a instância do banco local
    const { error: deleteError } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', instanceId)
      .eq('empresa_id', empresaId)

    if (deleteError) throw deleteError

  } catch (error) {
    SecureLogger.error('Erro ao deletar instância WhatsApp', error)
    throw error
  }
}

export async function connectWhatsAppInstance(data: ConnectInstanceData): Promise<ConnectInstanceResponse> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    // Primeiro, criar a instância no banco
    const { data: instance, error: createError } = await supabase
      .from('whatsapp_instances')
      .insert([{
        name: data.name,
        phone_number: data.phone_number,
        status: 'connecting',
        empresa_id: empresaId
      }])
      .select()
      .single()

    if (createError) throw createError

    // Chamar webhook do n8n para conectar instância
    SecureLogger.info('Enviando requisição para webhook do n8n', {
      url: 'https://n8n.advcrm.com.br/webhook/instancia_crm',
      payload: {
        action: 'connect_instance',
        instance_id: instance.id,
        name: data.name,
        phone_number: data.phone_number,
        empresa_id: empresaId
      }
    })

    let response: Response
    try {
      response = await fetch('https://n8n.advcrm.com.br/webhook/instancia_crm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          action: 'connect_instance',
          instance_id: instance.id,
          name: data.name,
          phone_number: data.phone_number,
          empresa_id: empresaId
        })
      })

      SecureLogger.info('Resposta recebida do webhook', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (fetchError) {
      SecureLogger.error('Erro de rede ao conectar instância', fetchError)
      
      // Em desenvolvimento, simular resposta mas ainda tentar enviar
      if (import.meta.env.MODE === 'development') {
        SecureLogger.warn('Modo desenvolvimento: erro de CORS detectado, mas continuando...')
        
        // Tentar novamente com configurações diferentes
        try {
          response = await fetch('https://n8n.advcrm.com.br/webhook/instancia_crm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'connect_instance',
              instance_id: instance.id,
              name: data.name,
              phone_number: data.phone_number,
              empresa_id: empresaId
            })
          })
          
          SecureLogger.info('Segunda tentativa bem-sucedida', {
            status: response.status,
            ok: response.ok
          })
        } catch (secondError) {
          SecureLogger.error('Segunda tentativa também falhou', secondError)
          
          // Simular resposta apenas se ambas as tentativas falharem
          const result: ConnectInstanceResponse = {
            instance_id: instance.id,
            qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            status: 'pending'
          }
          return result
        }
      } else {
        throw new Error('Erro de conexão com o servidor. Verifique sua conexão com a internet.')
      }
    }

        if (!response.ok) {
      // Log do erro para debugging
      SecureLogger.error('Erro na resposta do webhook', {
        status: response.status,
        statusText: response.statusText
      })
      
      // Tentar ler o corpo da resposta para mais detalhes
      try {
        const errorBody = await response.text()
        SecureLogger.error('Corpo da resposta de erro', errorBody)
      } catch (e) {
        SecureLogger.error('Não foi possível ler o corpo da resposta de erro')
      }
      
      // Simular resposta para desenvolvimento
      if (import.meta.env.MODE === 'development') {
        SecureLogger.warn('Modo desenvolvimento: simulando resposta do webhook')
        const result: ConnectInstanceResponse = {
          instance_id: instance.id,
          qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          status: 'pending'
        }
        SecureLogger.info('Retornando QR Code simulado:', result)
        return result
      }
      
      throw new Error(`Falha ao conectar instância. Status: ${response.status}`)
    }

    // Tentar ler a resposta como JSON
    let result: ConnectInstanceResponse
    try {
      const responseText = await response.text()
      SecureLogger.info('Resposta bruta do webhook', responseText)
      
      if (!responseText.trim()) {
        throw new Error('Resposta vazia do webhook')
      }
      
      const parsedResponse = JSON.parse(responseText)
      SecureLogger.info('Resposta parseada com sucesso', parsedResponse)
      
      // Verificar se a resposta é um array e pegar o primeiro item
      if (Array.isArray(parsedResponse) && parsedResponse.length > 0) {
        const rawResult = parsedResponse[0]
        SecureLogger.info('Extraído primeiro item do array:', rawResult)
        SecureLogger.info('Estrutura do primeiro item:', {
          keys: Object.keys(rawResult)
        })
        
        // Mapear os campos da resposta do webhook para o formato esperado
        // Se o instanceId do webhook for um placeholder, usar o ID real do banco
        const webhookInstanceId = rawResult.instanceId || rawResult.instance_id
        const finalInstanceId = (webhookInstanceId && 
                                 webhookInstanceId !== 'SUA_INSTANCIA_ID' && 
                                 webhookInstanceId.length > 10) 
                                ? webhookInstanceId 
                                : instance.id
        
        result = {
          instance_id: finalInstanceId,
          qr_code: rawResult.base64 ? `data:image/png;base64,${rawResult.base64}` : '',
          status: 'pending' // Sempre pending quando QR Code é gerado
        }
        
        SecureLogger.info('Resultado mapeado:', {
          instance_id: result.instance_id,
          has_qr_code: !!result.qr_code,
          status: result.status
        })
        
      } else if (typeof parsedResponse === 'object' && parsedResponse !== null) {
        result = parsedResponse
        SecureLogger.info('Resposta é objeto direto:', result)
      } else {
        throw new Error('Formato de resposta inválido')
      }
      
      // Validar se o resultado tem os campos necessários
      if (!result.instance_id || !result.qr_code || result.qr_code === '' || !result.status) {
        SecureLogger.error('Resposta incompleta do webhook:', {
          has_instance_id: !!result.instance_id,
          has_qr_code: !!result.qr_code,
          qr_code_length: result.qr_code?.length || 0,
          has_status: !!result.status,
          result_keys: Object.keys(result)
        })
        throw new Error('Resposta incompleta do webhook')
      }
      
    } catch (parseError) {
      SecureLogger.error('Erro ao fazer parse da resposta JSON', parseError)
      
      // Em desenvolvimento, simular resposta se o parse falhar
      if (import.meta.env.MODE === 'development') {
        SecureLogger.warn('Modo desenvolvimento: simulando resposta devido a erro de parse JSON')
        result = {
          instance_id: instance.id,
          qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          status: 'pending'
        }
      } else {
        throw new Error('Resposta inválida do servidor')
      }
    }
    
    // Atualizar status no banco
    await supabase
      .from('whatsapp_instances')
      .update({ 
        status: result.status,
        qr_code: result.qr_code 
      })
      .eq('id', instance.id)

    SecureLogger.info('Retornando resultado final da conexão:', {
      instance_id: result.instance_id,
      status: result.status,
      has_qr_code: !!result.qr_code,
      qr_code_length: result.qr_code?.length || 0
    })
    
    return result
  } catch (error) {
    SecureLogger.error('Erro ao conectar instância WhatsApp', error)
    throw error
  }
}

// Reconectar instância existente: dispara webhook para gerar novo QR Code e atualiza status/qr no banco
export async function reconnectWhatsAppInstance(instanceId: string): Promise<ConnectInstanceResponse> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    // Validar instância da empresa e obter dados
    const { data: instance, error: fetchError } = await supabase
      .from('whatsapp_instances')
      .select('id, name, phone_number, status')
      .eq('id', instanceId)
      .eq('empresa_id', empresaId)
      .single()

    if (fetchError || !instance) {
      throw new Error('Instância não encontrada ou sem permissão')
    }

    SecureLogger.info('Enviando requisição para reconectar instância (n8n)', {
      url: 'https://n8n.advcrm.com.br/webhook/reconectinstancia_crm',
      instanceId: instance.id,
      instanceName: instance.name,
      instancePhone: instance.phone_number
    })

    let response: Response
    try {
      response = await fetch('https://n8n.advcrm.com.br/webhook/reconectinstancia_crm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          action: 'reconnect_instance',
          instance_id: instance.id,
          name: instance.name,
          phone_number: instance.phone_number,
          empresa_id: empresaId
        })
      })
    } catch (err) {
      SecureLogger.error('Erro de rede ao reconectar instância', err)
      if (import.meta.env.MODE === 'development') {
        // fallback: QR simulado
        return {
          instance_id: instance.id,
          qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          status: 'pending'
        }
      }
      throw new Error('Erro de conexão com o servidor de reconexão')
    }

    if (!response.ok) {
      SecureLogger.error('Webhook de reconexão respondeu com erro', { status: response.status })
      if (import.meta.env.MODE === 'development') {
        return {
          instance_id: instance.id,
          qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          status: 'pending'
        }
      }
      throw new Error(`Falha na reconexão. Status: ${response.status}`)
    }

    let result: ConnectInstanceResponse
    try {
      const responseText = await response.text()
      let parsed: any
      try {
        parsed = JSON.parse(responseText)
      } catch (e) {
        SecureLogger.warn('Resposta de reconexão não é JSON válido, usando texto bruto')
        parsed = responseText
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        const raw = parsed[0]
        result = {
          instance_id: raw.instanceId || instance.id,
          qr_code: raw.base64 ? `data:image/png;base64,${raw.base64}` : '',
          status: 'pending'
        }
      } else if (parsed && typeof parsed === 'object') {
        result = parsed
      } else {
        // fallback genérico
        result = {
          instance_id: instance.id,
          qr_code: typeof parsed === 'string' && parsed.startsWith('data:image') ? parsed : '',
          status: 'pending'
        }
      }

      if (!result.qr_code) {
        throw new Error('QR Code não retornado pelo webhook de reconexão')
      }
    } catch (parseErr) {
      SecureLogger.error('Erro ao interpretar resposta de reconexão', parseErr)
      if (import.meta.env.MODE === 'development') {
        result = {
          instance_id: instance.id,
          qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          status: 'pending'
        }
      } else {
        throw parseErr
      }
    }

    // Atualizar status/qr_code no banco
    await supabase
      .from('whatsapp_instances')
      .update({ status: result.status, qr_code: result.qr_code })
      .eq('id', instance.id)

    return result
  } catch (error) {
    SecureLogger.error('Erro ao reconectar instância WhatsApp', error)
    throw error
  }
}

// Atualizar configuração de auto-criação de leads por instância
export async function updateInstanceAutoCreateConfig(
  instanceId: string,
  autoCreateLeads: boolean,
  pipelineId: string | null,
  stageId: string | null,
  responsibleUuid: string | null
): Promise<void> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    // Validação: se auto_create_leads = true, todos campos obrigatórios
    if (autoCreateLeads && (!pipelineId || !stageId || !responsibleUuid)) {
      throw new Error('Pipeline, estágio e responsável são obrigatórios quando auto-criação está ativada')
    }

    const { error } = await supabase
      .from('whatsapp_instances')
      .update({
        auto_create_leads: autoCreateLeads,
        default_pipeline_id: pipelineId,
        default_stage_id: stageId,
        default_responsible_uuid: responsibleUuid
      })
      .eq('id', instanceId)
      .eq('empresa_id', empresaId)

    if (error) throw error
    
    SecureLogger.info('Configuração de auto-criação atualizada', {
      instanceId,
      autoCreateLeads,
      pipelineId,
      stageId,
      responsibleUuid
    })
  } catch (error) {
    SecureLogger.error('Erro ao atualizar config de auto-criação', error)
    throw error
  }
}

// ===========================================
// FUNÇÕES DE CONVERSAS
// ===========================================

export async function getChatConversations(filters: ChatFilters = {}): Promise<ChatConversation[]> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    // Verificar papel do usuário
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('uuid', user.id)
      .single()

    const isAdmin = !!profile?.is_admin

    let query = supabase
      .from('chat_conversations')
      .select(`
        id, lead_id, fone, instance_id, nome_instancia, status, updated_at, created_at, Nome_Whatsapp,
        lead:leads(id, name, phone, company, pipeline_id, tags),
        messages:chat_messages(timestamp)
      `)
      .eq('empresa_id', empresaId)

    if (filters.search) {
      const s = filters.search.replace(/%/g, '')

      // Buscar possíveis leads por nome/telefone para montar um OR robusto
      let leadIds: string[] = []
      try {
        const { data: leadsMatch } = await supabase
          .from('leads')
          .select('id')
          .eq('empresa_id', empresaId)
          .or(`name.ilike.%${s}%,phone.ilike.%${s}%`)
        leadIds = (leadsMatch || []).map((l: any) => l.id)
      } catch {}

      const parts: string[] = []
      // Conversa por telefone e nome whatsapp
      parts.push(`fone.ilike.%${s}%`)
      parts.push(`Nome_Whatsapp.ilike.%${s}%`)
      // Conversa vinculada a leads encontrados
      if (leadIds.length > 0) {
        const inList = leadIds.join(',')
        parts.push(`lead_id.in.(${inList})`)
      }

      if (parts.length > 0) {
        query = query.or(parts.join(','))
      }
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.instance_id) {
      query = query.eq('instance_id', filters.instance_id)
    }

    // Se não-admin: restringir por assigned_user_id, EXCETO quando filtro de instância for aplicado
    // e o usuário tiver permissão explícita para essa instância.
    if (!isAdmin) {
      let canViewAllForInstance = false
      if (filters.instance_id) {
        try {
          const { data: allowedIds } = await getAllowedInstanceIdsForCurrentUser()
          canViewAllForInstance = !!allowedIds?.includes(filters.instance_id)
        } catch {}
      }

      if (!canViewAllForInstance) {
        try {
          query = query.eq('assigned_user_id', user.id)
        } catch (_) {
          // Se a coluna não existir, seguir sem o filtro (RLS deve proteger no backend)
        }
      }
    }

    // Ordenar mensagens embutidas para pegar a mais recente e limitar a 1 por conversa
    query = query
      .order('timestamp', { referencedTable: 'chat_messages', ascending: false })
      .limit(1, { foreignTable: 'chat_messages' })

    // Ordenar conversas por updated_at como fallback
    const { data, error } = await query.order('updated_at', { ascending: false }).limit(200)

    if (error) throw error

    // Transformar dados para o formato esperado
    const transformedData = (data || []).map((conv: any) => {
      const transformed = {
        ...conv,
        lead_name: conv.lead?.name || 'Lead não cadastrado',
        lead_company: conv.lead?.company || '',
        lead_phone: conv.fone || '', // Usar o campo fone da conversa
        lead_id: conv.lead?.id || conv.lead_id || null, // Incluir lead_id
        lead_pipeline_id: conv.lead?.pipeline_id || null, // ID da pipeline do lead
        lead_tags: conv.lead?.tags || [], // Tags do lead
        nome_instancia: conv.nome_instancia || '', // Incluir nome da instância
        unread_count: typeof conv.unread_count === 'number' ? conv.unread_count : 0,
        last_message: conv.last_message || undefined,
        last_message_time: conv.messages?.[0]?.timestamp || conv.last_message_time || conv.updated_at
      }
      return transformed
    })

    // Ordenação defensiva no cliente (caso o banco retorne fora de ordem por nulos)
    const sorted = transformedData.sort((a: any, b: any) => {
      const ta = new Date(a.last_message_time || a.updated_at || 0).getTime()
      const tb = new Date(b.last_message_time || b.updated_at || 0).getTime()
      return tb - ta
    })

    return sorted
  } catch (error) {
    SecureLogger.error('Erro ao buscar conversas', error)
    throw error
  }
}

export async function deleteChatConversation(conversationId: string): Promise<void> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    // Verificar se a conversa pertence à empresa do usuário
    const { data: conversation, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('id, empresa_id, lead_id, instance_id')
      .eq('id', conversationId)
      .eq('empresa_id', empresaId)
      .single()

    if (fetchError || !conversation) {
      throw new Error('Conversa não encontrada ou sem permissão')
    }

    // Chamar webhook do n8n para deletar conversa no WhatsApp (não bloqueante)
    fetch('https://n8n.advcrm.com.br/webhook/delconversa_crm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete_conversation',
        conversation_id: conversationId,
        lead_id: conversation.lead_id,
        instance_id: conversation.instance_id,
        empresa_id: empresaId
      })
    }).catch(() => {
      // Log silencioso - não bloquear a operação local
      // Erro de CORS é esperado em desenvolvimento
    })

    // Deletar mensagens e conversa em paralelo para maior velocidade
    const [deleteMessagesResult, deleteConversationResult] = await Promise.all([
      supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId),
      supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('empresa_id', empresaId)
    ])

    if (deleteMessagesResult.error) {
      SecureLogger.error('Erro ao deletar mensagens da conversa', deleteMessagesResult.error)
      throw deleteMessagesResult.error
    }

    if (deleteConversationResult.error) {
      throw deleteConversationResult.error
    }
  } catch (error) {
    SecureLogger.error('Erro ao deletar conversa', error)
    throw error
  }
}

export async function linkConversationToLead(conversationId: string, leadId: string): Promise<void> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    SecureLogger.info('🔗 Vinculando conversa ao lead', { conversationId, leadId })

    // Verificar se a conversa pertence à empresa do usuário
    const { data: conversation, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('id, empresa_id, lead_id')
      .eq('id', conversationId)
      .eq('empresa_id', empresaId)
      .single()

    if (fetchError || !conversation) {
      throw new Error('Conversa não encontrada ou sem permissão')
    }

    // Verificar se o lead pertence à empresa do usuário
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, empresa_id')
      .eq('id', leadId)
      .eq('empresa_id', empresaId)
      .single()

    if (leadError || !lead) {
      throw new Error('Lead não encontrado ou sem permissão')
    }

    // Atualizar a conversa com o lead_id
    const { error: updateError } = await supabase
      .from('chat_conversations')
      .update({ lead_id: leadId })
      .eq('id', conversationId)
      .eq('empresa_id', empresaId)

    if (updateError) throw updateError

    SecureLogger.info('Conversa vinculada ao lead com sucesso', { conversationId, leadId })
  } catch (error) {
    SecureLogger.error('Erro ao vincular conversa ao lead', error)
    throw error
  }
}

// ===========================================
// FUNÇÕES DE MENSAGENS
// ===========================================

export async function getChatMessages(conversationId: string, limit = 50): Promise<ChatMessage[]> {
  try {
    SecureLogger.info('🔍 Buscando mensagens para conversation_id:', conversationId)
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, instance_id, message_type, content, media_url, direction, status, timestamp, created_at')
      .eq('conversation_id', conversationId) // Usar conversation_id em vez de lead_id
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      SecureLogger.error('❌ Erro na query de mensagens:', error)
      throw error
    }

    SecureLogger.info('✅ Mensagens encontradas:', {
      count: data?.length || 0,
      conversationId: conversationId,
      messages: data?.map(m => ({ id: m.id, content: m.content, direction: m.direction }))
    })

    return (data || []).reverse() // Inverter para ordem cronológica
  } catch (error) {
    SecureLogger.error('❌ Erro ao buscar mensagens', error)
    throw error
  }
}

export async function sendMessage(data: SendMessageData): Promise<SendMessageResponse> {
  try {
    SecureLogger.info('📤 Enviando mensagem:', {
      conversationId: data.conversation_id,
      instanceId: data.instance_id,
      content: data.content,
      direction: 'outbound'
    })

    // Obter empresa_id para o webhook
    const empresaId = await getUserEmpresaId()
    if (!empresaId) {
      throw new Error('Empresa não identificada')
    }

    // Enviar via webhook do n8n (n8n salvará no banco)
    const aletNum = Math.floor(100000 + Math.random() * 900000) // 6 dígitos
    const response = await fetch('https://n8n.advcrm.com.br/webhook/msginterna_crm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send_message',
        conversation_id: data.conversation_id,
        instance_id: data.instance_id,
        message_type: data.message_type,
        content: data.content,
        media_url: data.media_url,
        empresa_id: empresaId,
        alet_num: aletNum
      })
    })

    if (!response.ok) {
      throw new Error(`Falha ao enviar mensagem: ${response.status} ${response.statusText}`)
    }

    const result: SendMessageResponse = await response.json()
    
    SecureLogger.info('✅ Mensagem enviada com sucesso via webhook:', {
      conversationId: data.conversation_id,
      content: data.content,
      webhookResponse: result
    })

    return result
  } catch (error) {
    SecureLogger.error('❌ Erro ao enviar mensagem', error)
    throw error
  }
}

// ===========================================
// UPLOAD DE MÍDIA DO CHAT (IMAGEM/AUDIO/DOC)
// ===========================================
export async function uploadChatMedia(file: File, folder?: string): Promise<string> {
  try {
    const bucket = 'chatmedia'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeName = file.name.replace(/\s+/g, '_')
    const path = `${folder ? folder.replace(/\/$/, '') + '/' : ''}${timestamp}-${safeName}`
    const sanitizeContentType = (ct?: string) => (ct ? ct.split(';')[0].trim() : 'application/octet-stream')
    const contentType = sanitizeContentType(file.type)

    let uploadRes = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadRes.error) {
      SecureLogger.error('Erro no upload (primeira tentativa)', uploadRes.error)
      // Tentativa secundária: forçar contentType genérico
      uploadRes = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        })
      if (uploadRes.error) throw uploadRes.error
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(uploadRes.data.path)
    const publicUrl = pub.publicUrl

    SecureLogger.info('📦 Upload de mídia concluído', { path: uploadRes.data.path, publicUrl, contentType })
    return publicUrl
  } catch (error) {
    SecureLogger.error('❌ Erro no upload de mídia do chat', error)
    throw error
  }
}

// Dispara envio de mídia para webhook n8n (responsável por armazenar/enviar e criar a mensagem)
export async function sendMediaViaWebhook(params: {
  file: File
  message_type: 'image' | 'audio' | 'document' | 'video'
  conversation_id: string
  instance_id: string
  content?: string
}): Promise<void> {
  const { file, message_type, conversation_id, instance_id, content } = params
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    const form = new FormData()
    const aletNum = Math.floor(100000 + Math.random() * 900000) // 6 dígitos
    form.append('file', file)
    form.append('message_type', message_type)
    // Compatibilidade com webhook de texto (espera "type_message")
    form.append('type_message', message_type)
    form.append('conversation_id', conversation_id)
    form.append('instance_id', instance_id)
    form.append('empresa_id', empresaId)
    if (content) form.append('content', content)
    form.append('filename', file.name)
    form.append('content_type', (file.type || 'application/octet-stream').split(';')[0])
    form.append('alet_num', String(aletNum))

    SecureLogger.info('📤 Enviando mídia para webhook', {
      conversation_id,
      instance_id,
      message_type,
      size: file.size
    })

    const resp = await fetch('https://n8n.advcrm.com.br/webhook/midiascrm', {
      method: 'POST',
      body: form
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`Webhook midiascrm falhou: ${resp.status} ${resp.statusText} ${text}`)
    }

    SecureLogger.info('✅ Mídia enviada ao webhook com sucesso')
  } catch (error) {
    SecureLogger.error('❌ Erro ao enviar mídia via webhook', error)
    throw error
  }
}

export async function getActiveConversations(): Promise<number> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    // Buscar conversas que tiveram atividade nos últimos 30 dias
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, updated_at')
      .eq('empresa_id', empresaId)
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data?.length || 0
  } catch (error) {
    SecureLogger.error('Erro ao buscar conversas ativas', error)
    throw error
  }
}

// ===========================================
// AUTO-CRIAÇÃO DE LEADS DO WHATSAPP
// ===========================================

async function autoCreateLeadFromChat(
  phone: string,
  instanceId: string,
  whatsappName?: string
): Promise<string | null> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) return null

    // Chamar RPC do Supabase
    const { data, error } = await supabase.rpc('auto_create_lead_from_chat', {
      p_phone: phone,
      p_whatsapp_name: whatsappName || null,
      p_instance_id: instanceId,
      p_empresa_id: empresaId
    })

    if (error) {
      SecureLogger.error('Erro ao auto-criar lead', error)
      return null
    }

    if (data?.lead_id) {
      SecureLogger.info('Lead auto-criado ou existente vinculado', {
        leadId: data.lead_id,
        phone,
        wasCreated: data.was_created
      })
    }

    return data?.lead_id || null
  } catch (error) {
    SecureLogger.error('Erro na auto-criação de lead', error)
    return null
  }
}

export async function findOrCreateConversationByPhone(phone: string, leadId?: string, instanceId?: string): Promise<ChatConversation> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    // Limpar o telefone (remover caracteres especiais)
    const cleanPhone = phone.replace(/\D/g, '')

    SecureLogger.info('Buscando conversa por telefone', { phone: cleanPhone, leadId })

    // Buscar conversa existente pelo telefone (query simplificada)
    const { data: existingConversations, error: searchError } = await supabase
      .from('chat_conversations')
      .select('id, lead_id, fone, instance_id, nome_instancia, status, updated_at, created_at, Nome_Whatsapp')
      .eq('empresa_id', empresaId)
      .eq('fone', cleanPhone)

    if (searchError) {
      SecureLogger.error('Erro ao buscar conversas existentes', searchError)
      throw searchError
    }

    // Se encontrou uma conversa existente, usar a primeira
    if (existingConversations && existingConversations.length > 0) {
      let existingConversation = existingConversations[0]
      
      // Vincular leadId se informado e ainda não vinculado
      if (leadId && !existingConversation.lead_id) {
        const { data: updated, error: updErr } = await supabase
          .from('chat_conversations')
          .update({ lead_id: leadId, updated_at: new Date().toISOString() })
          .eq('id', existingConversation.id)
          .select('*')
          .single()
        if (!updErr && updated) {
          existingConversation = updated
        }
      } else if (!existingConversation.lead_id && existingConversation.instance_id) {
        // NOVO: Tentar auto-criar lead se conversa não tem lead vinculado
        const autoLeadId = await autoCreateLeadFromChat(
          cleanPhone,
          existingConversation.instance_id,
          existingConversation.Nome_Whatsapp
        )
        if (autoLeadId) {
          leadId = autoLeadId
          // Vincular à conversa
          const { data: updated, error: updErr } = await supabase
            .from('chat_conversations')
            .update({ lead_id: autoLeadId, updated_at: new Date().toISOString() })
            .eq('id', existingConversation.id)
            .select('*')
            .single()
          if (!updErr && updated) {
            existingConversation = updated
          }
        }
      }
      
      // Buscar dados do lead se houver lead_id
      let leadData = null
      if (existingConversation.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id, name, phone, email, company, value, status, origin, notes, pipeline_id, stage_id')
          .eq('id', existingConversation.lead_id)
          .single()
        leadData = lead
      }
      
      // Buscar dados da instância para obter o nome
      let instanceData = null
      if (existingConversation.instance_id) {
        const { data: instance } = await supabase
          .from('whatsapp_instances')
          .select('id, name')
          .eq('id', existingConversation.instance_id)
          .single()
        instanceData = instance
      }
      
      const transformed = {
        ...existingConversation,
        lead_name: leadData?.name || 'Lead não cadastrado',
        lead_company: leadData?.company || '',
        lead_phone: existingConversation.fone || '',
        lead_id: leadData?.id || existingConversation.lead_id || null,
        nome_instancia: existingConversation.nome_instancia || instanceData?.name || '',
        unread_count: (existingConversation as any).unread_count ?? 0,
        last_message: (existingConversation as any).last_message ?? undefined,
        last_message_time: (existingConversation as any).last_message_time ?? undefined
      }
      
      SecureLogger.info('Conversa existente encontrada', { 
        conversationId: existingConversation.id, 
        phone: cleanPhone,
        instanceName: instanceData?.name || 'N/A'
      })
      
      return transformed
    }

    // Se não encontrou, escolher instância
    let instance: { id: string; name: string; status?: string } | null = null

    if (instanceId) {
      // Validar e carregar a instância informada
      const { data: inst, error: instErr } = await supabase
        .from('whatsapp_instances')
        .select('id, name, status')
        .eq('empresa_id', empresaId)
        .eq('id', instanceId)
        .single()
      if (instErr || !inst) {
        throw new Error('Instância selecionada inválida ou sem permissão')
      }
      instance = inst
    } else {
      // Fallback: buscar a primeira instância disponível da empresa
      const { data: instances, error: instancesError } = await supabase
        .from('whatsapp_instances')
        .select('id, name, phone_number, status')
        .eq('empresa_id', empresaId)
        .limit(1)

      if (instancesError) {
        SecureLogger.error('Erro ao buscar instâncias', instancesError)
        throw instancesError
      }

      if (!instances || instances.length === 0) {
        throw new Error('Nenhuma instância WhatsApp disponível. Conecte uma instância primeiro.')
      }

      instance = instances[0]
    }

    SecureLogger.info('Instância selecionada para nova conversa', { 
      instanceId: instance.id, 
      instanceName: instance.name,
      instanceStatus: instance.status 
    })

    // Criar nova conversa
    const { data: newConversation, error: createError } = await supabase
      .from('chat_conversations')
      .insert({
        empresa_id: empresaId,
        instance_id: instance.id,
        fone: cleanPhone,
        lead_id: leadId || null,
        status: 'active',
        nome_instancia: instance.name, // Adicionar nome da instância
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (createError) {
      SecureLogger.error('Erro ao criar nova conversa', createError)
      throw createError
    }

    // Buscar dados do lead se houver lead_id
    let leadData = null
    if (leadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, phone, email, company, value, status, origin, notes, pipeline_id, stage_id')
        .eq('id', leadId)
        .single()
      leadData = lead
    }

    // Transformar dados da nova conversa
    const transformed = {
      ...newConversation,
      lead_name: leadData?.name || 'Lead não cadastrado',
      lead_company: leadData?.company || '',
      lead_phone: newConversation.fone || '',
      lead_id: leadData?.id || newConversation.lead_id || null
    }

    SecureLogger.info('Nova conversa criada com sucesso', { 
      conversationId: newConversation.id, 
      phone: cleanPhone, 
      instanceId: instance.id,
      leadId: leadId
    })

    return transformed
  } catch (error) {
    SecureLogger.error('Erro ao buscar/criar conversa por telefone', error)
    throw error
  }
}

export async function getConversationById(conversationId: string): Promise<ChatConversation | null> {
  try {
    const empresaId = await getUserEmpresaId()
    if (!empresaId) throw new Error('Empresa não identificada')

    const { data: conversation, error } = await supabase
      .from('chat_conversations')
      .select('id, lead_id, fone, instance_id, nome_instancia, status, updated_at, created_at, Nome_Whatsapp')
      .eq('id', conversationId)
      .eq('empresa_id', empresaId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhum resultado encontrado
        return null
      }
      throw error
    }

    // Buscar dados do lead se houver lead_id
    let leadData = null
    if (conversation.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, phone, email, company, value, status, origin, notes, pipeline_id, stage_id, tags')
        .eq('id', conversation.lead_id)
        .single()
      leadData = lead
    }

    // Buscar dados da instância para obter o nome
    let instanceData = null
    if (conversation.instance_id) {
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('id, name')
        .eq('id', conversation.instance_id)
        .single()
      instanceData = instance
    }

    const transformed = {
      ...conversation,
      lead_name: leadData?.name || 'Lead não cadastrado',
      lead_company: leadData?.company || '',
      lead_phone: conversation.fone || '',
      lead_id: leadData?.id || conversation.lead_id || null,
      lead_pipeline_id: leadData?.pipeline_id || null,
      lead_tags: leadData?.tags || [],
      nome_instancia: conversation.nome_instancia || instanceData?.name || '',
      unread_count: (conversation as any).unread_count ?? 0,
      last_message: (conversation as any).last_message ?? undefined,
      last_message_time: (conversation as any).last_message_time ?? undefined
    }

    return transformed
  } catch (error) {
    SecureLogger.error('Erro ao buscar conversa por ID', error)
    throw error
  }
}

// ===========================================
// FUNÇÕES AUXILIARES
// ===========================================

async function getUserEmpresaId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('uuid', user.id)
    .single()

  return profile?.empresa_id || null
}

// ===========================================
// WEBSOCKET/REALTIME
// ===========================================

// Função para testar se o realtime está funcionando
export function testRealtimeConnection() {
  SecureLogger.info('🧪 Testando conexão realtime...')
  
  const testChannel = supabase
    .channel('test-connection')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages'
    }, (payload) => {
      SecureLogger.info('🧪 Teste: Nova mensagem detectada via realtime', payload)
    })
    .subscribe((status, error) => {
      SecureLogger.info('🧪 Teste: Status da conexão realtime', { 
        status,
        error: error?.message
      })
    })
    
  return testChannel
}

// Função para testar realtime específico para uma conversa
export function testConversationRealtime(conversationId: string) {
  SecureLogger.info('🧪 Testando realtime para conversa específica', { conversationId })
  
  const testChannel = supabase
    .channel(`test-conversation:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      SecureLogger.info('🧪 Teste: Nova mensagem na conversa via realtime', { 
        conversationId,
        messageId: payload.new.id,
        content: payload.new.content
      })
    })
    .subscribe((status, error) => {
      SecureLogger.info('🧪 Teste: Status da subscrição da conversa', { 
        conversationId,
        status,
        error: error?.message
      })
    })
    
  return testChannel
}

export function subscribeToNewMessages(conversationId: string, callback: (message: ChatMessage) => void) {
  SecureLogger.info('🔔 Iniciando subscrição para novas mensagens', { conversationId })
  
  const channel = supabase
    .channel(`chat_messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        SecureLogger.info('📨 Nova mensagem recebida via realtime', payload)
        
        if (payload.new?.conversation_id === conversationId) {
          callback(payload.new as ChatMessage)
        }
      }
    )
    .subscribe()
    
  return channel
}

export function subscribeToInstanceStatus(instanceId: string, callback: (status: string) => void) {
  return supabase
    .channel(`whatsapp_instance:${instanceId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'whatsapp_instances',
      filter: `id=eq.${instanceId}`
    }, (payload) => {
      callback(payload.new.status)
    })
    .subscribe()
} 