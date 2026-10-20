import { supabase } from './supabaseClient'

export interface AppNotification {
  id: string
  tipo: string
  titulo: string
  corpo: string | null
  url: string | null
  ref_id: string | null
  lida_em: string | null
  created_at: string
}

const NOTIFICATION_COLUMNS = 'id, tipo, titulo, corpo, url, ref_id, lida_em, created_at'

// A RLS de notificacoes já restringe tudo ao usuário logado (user_id = auth.uid()).

export async function listNotifications(limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notificacoes')
    .select(NOTIFICATION_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Erro ao carregar notificações: ${error.message}`)
  return (data ?? []) as AppNotification[]
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from('notificacoes')
    .select('id', { count: 'exact', head: true })
    .is('lida_em', null)
  if (error) throw new Error(`Erro ao contar notificações: ${error.message}`)
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida_em: new Date().toISOString() })
    .eq('id', id)
    .is('lida_em', null)
  if (error) throw new Error(`Erro ao marcar notificação: ${error.message}`)
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida_em: new Date().toISOString() })
    .is('lida_em', null)
  if (error) throw new Error(`Erro ao marcar notificações: ${error.message}`)
}

/** Marca como lidas as notificações ligadas a uma entidade (ex.: ao abrir o lead). */
export async function markNotificationsReadByRef(refId: string): Promise<void> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida_em: new Date().toISOString() })
    .eq('ref_id', refId)
    .is('lida_em', null)
  if (error) throw new Error(`Erro ao marcar notificações: ${error.message}`)
}
