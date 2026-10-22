import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuthContext } from '../contexts/AuthContext'
import { getEmpresaUsers } from '../services/empresaService'
import {
  getLeadsSemContato,
  type LeadsSemContatoFilters
} from '../services/leadsSemContatoService'

const DEFAULT_DIAS = 1
const DEFAULT_LIMIT = 50

function toPositiveInt(value: string | null): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Estado da tela "Leads sem contato" guardado na URL
 * (?dias=&max=&vendedor=&page=&limit=), o mesmo formato dos links do relatório.
 */
export function useLeadsSemContatoFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo((): LeadsSemContatoFilters => ({
    diasParado: toPositiveInt(searchParams.get('dias')) ?? DEFAULT_DIAS,
    maxDiasParado: toPositiveInt(searchParams.get('max')),
    vendedor: searchParams.get('vendedor') || null
  }), [searchParams])

  const page = toPositiveInt(searchParams.get('page')) ?? 1
  const limit = toPositiveInt(searchParams.get('limit')) ?? DEFAULT_LIMIT

  const update = useCallback((changes: Record<string, string | number | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, String(value))
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setFilters = useCallback((changes: Partial<LeadsSemContatoFilters>) => {
    const params: Record<string, string | number | null> = { page: null }
    if ('diasParado' in changes) params.dias = changes.diasParado ?? DEFAULT_DIAS
    if ('maxDiasParado' in changes) params.max = changes.maxDiasParado ?? null
    if ('vendedor' in changes) params.vendedor = changes.vendedor ?? null
    update(params)
  }, [update])

  const setPage = useCallback((value: number) => update({ page: value > 1 ? value : null }), [update])
  const setLimit = useCallback((value: number) => update({ limit: value, page: null }), [update])

  return { filters, page, limit, setFilters, setPage, setLimit }
}

export function useLeadsSemContato(filters: LeadsSemContatoFilters, page: number, limit: number) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: ['leads-sem-contato', user?.id, filters, page, limit],
    queryFn: () => getLeadsSemContato(filters, page, limit),
    enabled: Boolean(user?.id) && (filters.maxDiasParado === null || filters.maxDiasParado > filters.diasParado),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000
  })
}

/** Vendedores da empresa para o filtro; só carrega para quem vê todos os leads. */
export function useVendedoresOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['leads-sem-contato', 'vendedores'],
    queryFn: async () => {
      const users = await getEmpresaUsers()
      return users
        .map(u => ({ id: u.uuid as string, nome: (u.full_name as string) || 'Sem nome' }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },
    enabled,
    staleTime: 5 * 60 * 1000
  })
}
