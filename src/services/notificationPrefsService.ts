import { supabase } from './supabaseClient'

export interface NotificationType {
  tipo: string
  nome: string
  descricao: string | null
  ativo_padrao: boolean
  editavel_usuario: boolean
}

export interface NotificationTypeWithPref extends NotificationType {
  ativo: boolean
}

/** Catálogo de tipos combinado com o que a empresa definiu (vale para todos os usuários). */
export async function listCompanyNotificationPrefs(empresaId: string): Promise<NotificationTypeWithPref[]> {
  const [typesResult, prefsResult] = await Promise.all([
    supabase
      .from('notificacao_tipos')
      .select('tipo, nome, descricao, ativo_padrao, editavel_usuario')
      .order('nome'),
    supabase.from('notificacao_pref_empresa').select('tipo, ativo').eq('empresa_id', empresaId)
  ])

  if (typesResult.error) throw new Error(`Erro ao carregar tipos: ${typesResult.error.message}`)
  if (prefsResult.error) throw new Error(`Erro ao carregar preferências: ${prefsResult.error.message}`)

  const prefs = new Map((prefsResult.data ?? []).map((p) => [p.tipo as string, p.ativo as boolean]))
  return (typesResult.data as NotificationType[]).map((type) => ({
    ...type,
    ativo: type.editavel_usuario ? prefs.get(type.tipo) ?? type.ativo_padrao : type.ativo_padrao
  }))
}

/**
 * Grava a escolha da empresa (somente admins, garantido pela RLS). Sempre
 * persiste a linha: com ela, a escolha da empresa prevalece sobre a do usuário.
 */
export async function setCompanyNotificationPref(
  empresaId: string,
  type: NotificationType,
  ativo: boolean
): Promise<void> {
  if (!type.editavel_usuario) throw new Error('Este tipo de notificação não pode ser alterado')

  const { data: sessionData } = await supabase.auth.getSession()
  const { error } = await supabase.from('notificacao_pref_empresa').upsert(
    {
      empresa_id: empresaId,
      tipo: type.tipo,
      ativo,
      updated_at: new Date().toISOString(),
      updated_by: sessionData.session?.user.id ?? null
    },
    { onConflict: 'empresa_id,tipo' }
  )

  if (error) throw new Error(`Erro ao salvar preferência: ${error.message}`)
}
