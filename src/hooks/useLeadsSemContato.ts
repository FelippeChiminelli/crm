import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuthContext } from '../contexts/AuthContext'
import {
  getLeadsSemContato,
  SITUACOES_CONTATO,
  type LeadsSemContatoFilters,
  type SituacaoContato
} from '../services/leadsSemContatoService'

const DEFAULT_DIAS = 1
const DEFAULT_LIMIT = 50

type ListFilterKey = 'vendedores' | 'pipelines' | 'etapas' | 'origens' | 'situacoes'

/** Filtro em lista -> parâmetro repetido na URL (?origem=A&origem=B). */
const LIST_PARAMS: Record<ListFilterKey, string> = {
  vendedores: 'vendedor',
  pipelines: 'funil',
  etapas: 'etapa',
  origens: 'origem',
  situacoes: 'situacao'
}

const SITUACOES_VALIDAS = new Set<string>(SITUACOES_CONTATO.map(s => s.value))

type ParamValue = string | number | string[] | null

function toPositiveInt(value: string | null): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function getList(searchParams: URLSearchParams, key: string): string[] {
  return [...new Set(searchParams.getAll(key).filter(Boolean))]
}

/**
 * Estado da tela "Leads sem contato" guardado na URL
 * (?dias=&max=&vendedor=&funil=&etapa=&origem=&situacao=&page=&limit=).
 * dias, max e vendedor seguem o formato dos links do relatório do n8n.
 */
export function useLeadsSemContatoFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo((): LeadsSemContatoFilters => ({
    diasParado: toPositiveInt(searchParams.get('dias')) ?? DEFAULT_DIAS,
    maxDiasParado: toPositiveInt(searchParams.get('max')),
    vendedores: getList(searchParams, LIST_PARAMS.vendedores),
    pipelines: getList(searchParams, LIST_PARAMS.pipelines),
    etapas: getList(searchParams, LIST_PARAMS.etapas),
    origens: getList(searchParams, LIST_PARAMS.origens),
    situacoes: getList(searchParams, LIST_PARAMS.situacoes)
      .filter((s): s is SituacaoContato => SITUACOES_VALIDAS.has(s))
  }), [searchParams])

  const hasActiveFilters = filters.diasParado !== DEFAULT_DIAS
    || filters.maxDiasParado !== null
    || (Object.keys(LIST_PARAMS) as ListFilterKey[]).some(key => filters[key].length > 0)

  const page = toPositiveInt(searchParams.get('page')) ?? 1
  const limit = toPositiveInt(searchParams.get('limit')) ?? DEFAULT_LIMIT

  const update = useCallback((changes: Record<string, ParamValue>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(changes)) {
        next.delete(key)
        if (Array.isArray(value)) value.forEach(item => next.append(key, item))
        else if (value !== null && value !== '') next.set(key, String(value))
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setFilters = useCallback((changes: Partial<LeadsSemContatoFilters>) => {
    const params: Record<string, ParamValue> = { page: null }
    if ('diasParado' in changes) params.dias = changes.diasParado ?? DEFAULT_DIAS
    if ('maxDiasParado' in changes) params.max = changes.maxDiasParado ?? null
    for (const [filterKey, paramKey] of Object.entries(LIST_PARAMS) as [ListFilterKey, string][]) {
      if (filterKey in changes) params[paramKey] = changes[filterKey] ?? []
    }
    update(params)
  }, [update])

  const clearFilters = useCallback(() => {
    update({
      dias: null,
      max: null,
      page: null,
      ...Object.fromEntries(Object.values(LIST_PARAMS).map(key => [key, null]))
    })
  }, [update])

  const setPage = useCallback((value: number) => update({ page: value > 1 ? value : null }), [update])
  const setLimit = useCallback((value: number) => update({ limit: value, page: null }), [update])

  return { filters, hasActiveFilters, page, limit, setFilters, clearFilters, setPage, setLimit }
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
