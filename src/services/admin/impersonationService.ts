import { supabase } from '../supabaseClient'
import { impersonateEmpresa } from './partnerAdminService'

/**
 * Impersonacao de empresa pelo parceiro (Aucta Admin).
 *
 * O parceiro entra no CRM completo de uma empresa vinculada a ele. O backend
 * (api_admin) emite uma sessao real de um usuario admin daquela empresa; aqui
 * apenas TROCAMOS a sessao ativa do Supabase por essa, guardando a sessao
 * original do parceiro para restaurar no "Sair".
 *
 * IMPORTANTE: a seguranca real esta no backend (require_partner + validacao de
 * posse da empresa). Este servico e o mecanismo de UX/estado no front.
 */

const STORAGE_KEY = 'aucta_impersonation'
const SUPABASE_STORAGE_KEY = 'supabase.auth.token'

interface StoredSession {
  access_token: string
  refresh_token: string
}

interface ImpersonationMeta {
  original: StoredSession
  empresa: { id: string; nome: string }
}

export interface ImpersonationState {
  isImpersonating: boolean
  empresa: { id: string; nome: string } | null
}

function readMeta(): ImpersonationMeta | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ImpersonationMeta
  } catch {
    return null
  }
}

function writeMeta(meta: ImpersonationMeta): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
}

function clearMeta(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getImpersonationState(): ImpersonationState {
  const meta = readMeta()
  return {
    isImpersonating: !!meta,
    empresa: meta?.empresa ?? null,
  }
}

/**
 * Troca a sessao do Supabase de forma tolerante a deadlock.
 *
 * O supabase-js pode NAO resolver a promise de setSession quando um callback de
 * onAuthStateChange (ex.: o AuthContext) chama outros metodos de auth e trava no
 * lock interno. Como o token e persistido no storage ANTES da emissao do evento,
 * nao dependemos da promise: disparamos o setSession e aguardamos a persistencia
 * do access_token no storage do Supabase.
 *
 * Retorna true se a nova sessao foi persistida (deve-se seguir com um reload
 * "hard" para reinicializar o app com a sessao trocada).
 */
async function swapSession(session: StoredSession): Promise<boolean> {
  void supabase.auth
    .setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    .catch(() => {
      /* deadlock/erro tratado via polling de persistencia abaixo */
    })

  return waitForStoredAccessToken(session.access_token)
}

function waitForStoredAccessToken(
  accessToken: string,
  timeoutMs = 5000
): Promise<boolean> {
  // Usa a CAUDA do token (parte da assinatura) como marcador: e unica por token.
  // O prefixo de JWTs HS256 do Supabase e identico para todos, entao um marcador
  // do inicio bateria com o token antigo ja presente no storage.
  const marker = accessToken.slice(-40)
  const start = Date.now()

  return new Promise((resolve) => {
    const check = () => {
      try {
        const raw = localStorage.getItem(SUPABASE_STORAGE_KEY)
        if (raw && raw.includes(marker)) {
          resolve(true)
          return
        }
      } catch {
        /* ignora e tenta novamente */
      }
      if (Date.now() - start > timeoutMs) {
        resolve(false)
        return
      }
      setTimeout(check, 50)
    }
    check()
  })
}

/**
 * Entra na empresa: emite a sessao no backend e troca a sessao do Supabase.
 *
 * Deve ser chamado com a sessao do PARCEIRO ativa (a chamada ao api_admin usa
 * o token atual). A sessao original e guardada para o exit().
 */
export async function enterImpersonation(empresa: {
  id: string
  nome: string
}): Promise<void> {
  const { data: current } = await supabase.auth.getSession()
  const original = current.session
  if (!original?.access_token || !original?.refresh_token) {
    throw new Error('Sessao do parceiro invalida. Faca login novamente.')
  }

  const session = await impersonateEmpresa(empresa.id)

  // Grava a meta ANTES da troca: se algo falhar no meio, um reload ainda
  // reconhece a impersonacao (e o exit consegue restaurar a sessao original).
  writeMeta({
    original: {
      access_token: original.access_token,
      refresh_token: original.refresh_token,
    },
    empresa: { id: session.empresa.id, nome: session.empresa.nome },
  })

  const swapped = await swapSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (!swapped) {
    clearMeta()
    throw new Error('Não foi possível iniciar a sessão da empresa.')
  }
}

/**
 * Sai da impersonacao: restaura a sessao original do parceiro.
 *
 * Se a restauracao falhar (ex.: refresh token expirado), faz signOut como
 * fallback seguro para nao deixar o parceiro preso na empresa.
 */
export async function exitImpersonation(): Promise<void> {
  const meta = readMeta()
  clearMeta()

  if (!meta?.original?.access_token || !meta?.original?.refresh_token) {
    await supabase.auth.signOut()
    return
  }

  const restored = await swapSession(meta.original)
  if (!restored) {
    await supabase.auth.signOut()
  }
}
