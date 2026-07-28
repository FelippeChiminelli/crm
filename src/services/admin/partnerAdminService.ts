import { adminApiGet, adminApiPost } from './adminApiClient'

export interface AdminEmpresa {
  id: string
  nome: string
  cnpj?: string | null
  email?: string | null
  telefone?: string | null
  ativo: boolean
  plano?: string | null
  nicho?: string | null
  parceiro_id?: string | null
  created_at?: string | null
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface ListEmpresasParams {
  search?: string
  page?: number
  limit?: number
}

/** Lista todas as empresas (cross-tenant) via api_admin. Requer usuario parceiro. */
export async function listEmpresas(
  params: ListEmpresasParams = {}
): Promise<PaginatedResult<AdminEmpresa>> {
  return adminApiGet<PaginatedResult<AdminEmpresa>>('/api/admin/empresas', {
    search: params.search,
    page: params.page,
    limit: params.limit,
  })
}

export interface EmpresasStats {
  total: number
  ativas: number
  inativas: number
}

/** Totais de empresas do parceiro (total, ativas, inativas) via api_admin. */
export async function getEmpresasStats(): Promise<EmpresasStats> {
  return adminApiGet<EmpresasStats>('/api/admin/empresas/stats')
}

export interface ImpersonationSession {
  access_token: string
  refresh_token: string
  expires_in?: number | null
  empresa: { id: string; nome: string }
  usuario: { uuid: string; email?: string | null }
}

/**
 * Emite uma sessao para o parceiro operar o CRM da empresa (impersonacao).
 *
 * O backend valida que a empresa pertence ao parceiro e retorna uma sessao de
 * um usuario real (admin) daquela empresa. Requer usuario parceiro.
 */
export async function impersonateEmpresa(
  empresaId: string
): Promise<ImpersonationSession> {
  return adminApiPost<ImpersonationSession>(
    `/api/admin/empresas/${empresaId}/impersonate`
  )
}
