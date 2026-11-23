import { useQuery } from '@tanstack/react-query'
import { getEmpresaUsers } from '../services/empresaService'
import { getAllLeadOrigins } from '../services/leadService'
import { getPipelines } from '../services/pipelineService'
import type { Pipeline, Stage } from '../types'

const OPTIONS_STALE_TIME = 5 * 60 * 1000

type PipelineComEtapas = Pipeline & { stages?: Pick<Stage, 'id' | 'name'>[] }

export interface FilterOption {
  value: string
  label: string
}

export interface PipelineOption extends FilterOption {
  etapas: FilterOption[]
}

/** Vendedores da empresa para o filtro; só carrega para quem vê todos os leads. */
export function useVendedoresOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['leads-sem-contato', 'vendedores'],
    queryFn: async (): Promise<FilterOption[]> => {
      const users = await getEmpresaUsers()
      return users
        .map(u => ({ value: u.uuid as string, label: (u.full_name as string) || 'Sem nome' }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    },
    enabled,
    staleTime: OPTIONS_STALE_TIME
  })
}

/** Funis ativos com suas etapas (já ordenadas por posição). */
export function usePipelinesOptions() {
  return useQuery({
    queryKey: ['leads-sem-contato', 'pipelines'],
    queryFn: async (): Promise<PipelineOption[]> => {
      const { data, error } = await getPipelines(true)
      if (error) throw error
      return ((data || []) as PipelineComEtapas[]).map(p => ({
        value: p.id,
        label: p.name,
        etapas: (p.stages || []).map(s => ({ value: s.id, label: s.name }))
      }))
    },
    staleTime: OPTIONS_STALE_TIME
  })
}

export function useOrigensOptions() {
  return useQuery({
    queryKey: ['leads-sem-contato', 'origens'],
    queryFn: async (): Promise<FilterOption[]> => {
      const origens = await getAllLeadOrigins()
      return origens.map(o => ({ value: o, label: o }))
    },
    staleTime: OPTIONS_STALE_TIME
  })
}
