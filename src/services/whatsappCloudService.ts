import { supabase } from './supabaseClient'
import SecureLogger from '../utils/logger'
import type {
  ConnectWabaPayload,
  ConnectWabaResponse,
  WabaConnection,
} from '../types'

/**
 * Camada de acesso ao WhatsApp Cloud API.
 *
 * Arquitetura:
 *  - `connectWhatsAppCloud` envia os dados do Embedded Signup (capturados via
 *    postMessage no popup hosted da Meta) para o webhook do n8n. O n8n
 *    orquestra: exchange code → access_token → subscribe app → register phone
 *    → upsert em `waba_config` (com service role).
 *  - `listWhatsAppCloudConnections` e `disconnectWhatsAppCloud` consultam o
 *    Supabase diretamente via `supabase-js`. O RLS da tabela garante o
 *    isolamento por empresa.
 */

const N8N_WEBHOOK = import.meta.env.VITE_N8N_WHATSAPP_ONBOARD_WEBHOOK as
  | string
  | undefined

function ensureWebhook(): string {
  if (!N8N_WEBHOOK) {
    throw new Error('VITE_N8N_WHATSAPP_ONBOARD_WEBHOOK não está definida')
  }
  return N8N_WEBHOOK.replace(/\/$/, '')
}

const WABA_COLUMNS =
  'id, empresa_id, waba_id, phone_number_id, display_phone_number, verified_name, status, connected_at, updated_at'

/** Envia o resultado do Embedded Signup para o n8n orquestrar persistência. */
export async function connectWhatsAppCloud(
  payload: ConnectWabaPayload,
): Promise<ConnectWabaResponse> {
  const url = ensureWebhook()

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    SecureLogger.error('Webhook n8n inacessível', err)
    throw new Error(
      'Não foi possível contatar o orquestrador (n8n). Verifique se o webhook está ativo.',
    )
  }

  if (!response.ok) {
    const text = await response.text().catch(() => `HTTP ${response.status}`)
    SecureLogger.error('Webhook n8n retornou erro', {
      status: response.status,
      text,
    })
    throw new Error(text || `HTTP ${response.status}`)
  }

  return (await response.json()) as ConnectWabaResponse
}

/** Lê as conexões da empresa (RLS limita ao usuário autenticado). */
export async function listWhatsAppCloudConnections(
  empresaId: string,
): Promise<WabaConnection[]> {
  const { data, error } = await supabase
    .from('waba_config')
    .select(WABA_COLUMNS)
    .eq('empresa_id', empresaId)
    .order('connected_at', { ascending: false })

  if (error) {
    SecureLogger.error('Erro ao listar waba_config', error)
    throw new Error(error.message)
  }
  return (data ?? []) as WabaConnection[]
}

/**
 * Marca a conexão como desconectada (preserva o registro, conforme UX
 * informa no ConfirmDialog). RLS garante isolamento por empresa.
 */
export async function disconnectWhatsAppCloud(
  phoneNumberId: string,
): Promise<void> {
  const { error } = await supabase
    .from('waba_config')
    .update({ status: 'disconnected' })
    .eq('phone_number_id', phoneNumberId)

  if (error) {
    SecureLogger.error('Erro ao desconectar waba_config', error)
    throw new Error(error.message)
  }
}
