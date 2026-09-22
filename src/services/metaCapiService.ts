import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'
import SecureLogger from '../utils/logger'
import type {
  MetaCapiConfig,
  MetaCapiEvent,
  SaveMetaCapiConfigPayload,
} from '../types'

/** Webhook n8n para envio de eventos CAPI (automações). */
const N8N_SEND_WEBHOOK = 'https://n8n.advcrm.com.br/webhook/meta-capi'

export const META_CAPI_AUTOMATION_EVENT_OPTIONS = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Purchase', label: 'Purchase (Compra)' },
  { value: 'CompleteRegistration', label: 'Complete Registration (Cadastro)' },
] as const

export type MetaCapiAutomationEventName =
  (typeof META_CAPI_AUTOMATION_EVENT_OPTIONS)[number]['value']

export interface SendMetaCapiEventPayload {
  empresa_id: string
  lead_id: string
  config_id: string
  event_name: MetaCapiAutomationEventName
  automation_rule_id?: string
  automation_name?: string
}

export interface SendMetaCapiEventResult {
  success: boolean
  message: string
}

const CONFIG_COLUMNS =
  'id, empresa_id, name, dataset_id, test_event_code, ativo, created_at, updated_at'

function getCallWebhookEdgeUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL não está definida')
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/call_webhook`
}

/**
 * Encaminha POST ao n8n via Edge Function Supabase (evita CORS no browser).
 * Mesmo padrão usado em automationService para call_webhook.
 */
async function postN8nWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; status?: number; bodyText: string; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  let response: Response
  try {
    response = await fetch(getCallWebhookEdgeUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        url: webhookUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        payload,
      }),
    })
  } catch (err) {
    SecureLogger.error('Edge Function call_webhook inacessível', err)
    throw new Error(
      'Não foi possível contatar o servidor. Verifique sua conexão e tente novamente.',
    )
  }

  let result: Record<string, unknown> = {}
  try {
    result = (await response.json()) as Record<string, unknown>
  } catch {
    throw new Error('Resposta inválida ao contatar o orquestrador (n8n).')
  }

  const bodyText =
    (typeof result.body === 'string' && result.body) ||
    (typeof result.responseBody === 'string' && result.responseBody) ||
    ''

  const edgeSuccess = result.success === true && response.ok

  if (!edgeSuccess) {
    const error =
      (typeof result.error === 'string' && result.error) ||
      (typeof result.statusText === 'string' && result.statusText) ||
      bodyText ||
      `Erro ao chamar webhook (HTTP ${response.status})`
    SecureLogger.error('Webhook n8n retornou erro via call_webhook', {
      webhookUrl,
      status: result.status,
      error,
    })
    return {
      success: false,
      status: typeof result.status === 'number' ? result.status : response.status,
      bodyText,
      error,
    }
  }

  return {
    success: true,
    status: typeof result.status === 'number' ? result.status : response.status,
    bodyText,
  }
}

/** Lista todos os tokens permanentes CAPI da empresa (sem access_token). */
export async function listMetaCapiConfigs(): Promise<MetaCapiConfig[]> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não encontrada')

  const { data, error } = await supabase
    .from('meta_capi_config')
    .select(CONFIG_COLUMNS)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (error) {
    SecureLogger.error('Erro ao listar meta_capi_config', error)
    throw new Error(error.message)
  }

  return (data ?? []) as MetaCapiConfig[]
}

/** Lista os últimos eventos CAPI enviados pela empresa. */
export async function listMetaCapiEvents(
  limit = 20,
): Promise<MetaCapiEvent[]> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não encontrada')

  const { data, error } = await supabase
    .from('meta_capi_events')
    .select(`
      *,
      config:meta_capi_config(name, dataset_id)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    SecureLogger.error('Erro ao listar meta_capi_events', error)
    throw new Error(error.message)
  }

  return (data ?? []) as MetaCapiEvent[]
}

function translateConfigError(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    return 'Já existe um token permanente com este nome nesta empresa.'
  }
  if (error.code === '23502') {
    return 'A coluna dataset_id ainda está obrigatória no banco. Aplique a migração que a torna opcional.'
  }
  return error.message
}

/**
 * Persiste configuração diretamente no Supabase (RLS admin).
 * n8n resolve o dataset a partir do token permanente e envia os eventos à Meta.
 */
export async function saveMetaCapiConfig(
  payload: SaveMetaCapiConfigPayload,
): Promise<void> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não encontrada')

  const name = payload.name.trim()
  const testEventCode = payload.test_event_code?.trim() || null
  const accessToken = payload.access_token?.trim() || null

  if (payload.config_id) {
    const updates: Record<string, unknown> = {
      name,
      test_event_code: testEventCode,
      ativo: payload.ativo,
    }
    if (accessToken) {
      updates.access_token = accessToken
    }

    const { error } = await supabase
      .from('meta_capi_config')
      .update(updates)
      .eq('id', payload.config_id)
      .eq('empresa_id', empresaId)

    if (error) {
      SecureLogger.error('Erro ao atualizar meta_capi_config', error)
      throw new Error(translateConfigError(error))
    }
    return
  }

  if (!accessToken) {
    throw new Error('Token permanente é obrigatório ao cadastrar.')
  }

  const { error } = await supabase.from('meta_capi_config').insert({
    empresa_id: empresaId,
    name,
    access_token: accessToken,
    test_event_code: testEventCode,
    ativo: payload.ativo,
  })

  if (error) {
    SecureLogger.error('Erro ao inserir meta_capi_config', error)
    throw new Error(translateConfigError(error))
  }
}

/** Remove um token permanente da empresa. */
export async function deleteMetaCapiConfig(configId: string): Promise<void> {
  const { error } = await supabase
    .from('meta_capi_config')
    .delete()
    .eq('id', configId)

  if (error) {
    SecureLogger.error('Erro ao excluir meta_capi_config', error)
    throw new Error(error.message)
  }
}

function parseN8nSendResult(bodyText: string): SendMetaCapiEventResult {
  if (!bodyText.trim()) {
    return { success: true, message: 'Evento enviado com sucesso.' }
  }

  try {
    const json = JSON.parse(bodyText) as Record<string, unknown>
    const success =
      json.success === true || json.ok === true || json.status === 'success'
    const message =
      (typeof json.message === 'string' && json.message) ||
      (typeof json.error === 'string' && json.error) ||
      (success ? 'Evento enviado com sucesso.' : 'Falha ao enviar evento.')
    return { success, message }
  } catch {
    return { success: true, message: bodyText }
  }
}

/** Envia evento CAPI para a Meta via n8n (usado pelas automações). */
export async function sendMetaCapiEvent(
  payload: SendMetaCapiEventPayload,
): Promise<SendMetaCapiEventResult> {
  const url = N8N_SEND_WEBHOOK

  try {
    const result = await postN8nWebhook(url, {
      ...payload,
      event_id: `auto_${payload.automation_rule_id || 'rule'}_${payload.lead_id}_${payload.event_name}`,
    })

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Falha ao enviar evento para a Meta.',
      }
    }

    return parseN8nSendResult(result.bodyText)
  } catch (err) {
    SecureLogger.error('Erro ao enviar evento meta-capi', err)
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : 'Não foi possível contatar o orquestrador (n8n).',
    }
  }
}
