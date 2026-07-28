import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  listEmpresas,
  type AdminEmpresa,
  type PaginatedResult,
} from '../../../services/admin/partnerAdminService'
import { AdminApiError } from '../../../services/admin/adminApiClient'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 350

interface UsePartnerEmpresasResult {
  empresas: AdminEmpresa[]
  total: number
  page: number
  totalPages: number
  loading: boolean
  error: string | null
  search: string
  setSearch: (value: string) => void
  setPage: (page: number) => void
  reload: () => void
}

/** Encapsula busca, debounce e paginacao da lista de empresas (via api_admin). */
export function usePartnerEmpresas(): UsePartnerEmpresasResult {
  const [search, setSearchState] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PaginatedResult<AdminEmpresa> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSearch = useCallback((value: string) => {
    setSearchState(value)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    listEmpresas({ search: debouncedSearch, page, limit: PAGE_SIZE })
      .then((res) => {
        if (active) setResult(res)
      })
      .catch((err: unknown) => {
        if (!active) return
        const message =
          err instanceof AdminApiError
            ? err.message
            : 'Nao foi possivel carregar as empresas.'
        setError(message)
        setResult(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [debouncedSearch, page, reloadToken])

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])

  return useMemo(
    () => ({
      empresas: result?.data ?? [],
      total: result?.total ?? 0,
      page,
      totalPages: result?.total_pages ?? 0,
      loading,
      error,
      search,
      setSearch,
      setPage,
      reload,
    }),
    [result, page, loading, error, search, setSearch, reload]
  )
}
