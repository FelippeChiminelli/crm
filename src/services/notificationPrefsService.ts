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

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) throw new Error('Usuário não autenticado')
  return userId
}

/** Catálogo de tipos combinado com as preferências do usuário logado. */
export async function listNotificationTypesWithPrefs(): Promise<NotificationTypeWithPref[]> {
  const userId = await getCurrentUserId()

  const [typesResult, prefsResult] = await Promise.all([
    supabase
      .from('notificacao_tipos')
      .select('tipo, nome, descricao, ativo_padrao, editavel_usuario')
      .order('nome'),
    supabase.from('notificacao_pref_usuario').select('tipo, ativo').eq('user_id', userId)
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
 * Grava a preferência. Só mantém linha quando difere do padrão do tipo,
 * assim mudanças futuras no `ativo_padrao` valem para quem nunca alterou.
 */
export async function setNotificationPref(type: NotificationType, ativo: boolean): Promise<void> {
  if (!type.editavel_usuario) throw new Error('Este tipo de notificação não pode ser alterado')
  const userId = await getCurrentUserId()

  const { error } =
    ativo === type.ativo_padrao
      ? await supabase
          .from('notificacao_pref_usuario')
          .delete()
          .eq('user_id', userId)
          .eq('tipo', type.tipo)
      : await supabase
          .from('notificacao_pref_usuario')
          .upsert({ user_id: userId, tipo: type.tipo, ativo }, { onConflict: 'user_id,tipo' })

  if (error) throw new Error(`Erro ao salvar preferência: ${error.message}`)
}
