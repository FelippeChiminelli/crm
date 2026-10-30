import { supabase } from './supabaseClient'
import { getUserEmpresaId } from './authService'

/** Endereço público do servidor MCP (Assistentes de IA). */
export const MCP_SERVER_URL =
  import.meta.env.VITE_MCP_SERVER_URL || 'https://mcp.auctatech.com.br/mcp'

export interface McpConfig {
  habilitado: boolean
  permite_conteudo_chat: boolean
  updated_at: string | null
}

export interface McpAcesso {
  created_at: string
  usuario: string | null
  ferramenta: string
  linhas: number | null
  duracao_ms: number | null
  erro: string | null
}

const CONFIG_PADRAO: McpConfig = {
  habilitado: false,
  permite_conteudo_chat: false,
  updated_at: null,
}

export async function getMcpConfig(): Promise<McpConfig> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não encontrada')

  const { data, error } = await supabase
    .from('mcp_empresa_config')
    .select('habilitado, permite_conteudo_chat, updated_at')
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ?? CONFIG_PADRAO
}

export async function saveMcpConfig(
  changes: Pick<McpConfig, 'habilitado' | 'permite_conteudo_chat'>
): Promise<McpConfig> {
  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não encontrada')
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('mcp_empresa_config')
    .upsert(
      {
        empresa_id: empresaId,
        habilitado: changes.habilitado,
        // Leitura de conversas só existe com a integração ligada
        permite_conteudo_chat: changes.habilitado && changes.permite_conteudo_chat,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'empresa_id' }
    )
    .select('habilitado, permite_conteudo_chat, updated_at')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function listMcpAcessos(limite = 30): Promise<McpAcesso[]> {
  const { data, error } = await supabase.rpc('mcp_ultimos_acessos', { p_limite: limite })
  if (error) throw new Error(error.message)
  return (data ?? []) as McpAcesso[]
}
