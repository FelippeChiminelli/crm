import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listLeadProcuraMatches, listLeadProcuras } from '../services/procuraService'

export const procuraKeys = {
  procuras: (leadId: string) => ['lead-procuras', leadId] as const,
  matches: (leadId: string) => ['lead-procura-matches', leadId] as const
}

/** Procuras e veículos encontrados de um lead. */
export function useLeadProcuras(leadId: string | undefined, empresaId: string | undefined, enabled = true) {
  const queryClient = useQueryClient()
  const ready = enabled && !!leadId && !!empresaId

  const procurasQuery = useQuery({
    queryKey: procuraKeys.procuras(leadId ?? ''),
    queryFn: () => listLeadProcuras(leadId!),
    enabled: ready
  })

  const matchesQuery = useQuery({
    queryKey: procuraKeys.matches(leadId ?? ''),
    queryFn: () => listLeadProcuraMatches(leadId!, empresaId!),
    enabled: ready
  })

  const matches = matchesQuery.data ?? []

  return {
    procuras: procurasQuery.data ?? [],
    matches,
    // Carro compatível ainda em estoque e sem ação do vendedor
    novos: matches.filter((m) => m.status === 'novo' && m.vehicle?.status_veiculo === 'disponivel').length,
    loading: procurasQuery.isLoading || matchesQuery.isLoading,
    refresh: async () => {
      if (!leadId) return
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: procuraKeys.procuras(leadId) }),
        queryClient.invalidateQueries({ queryKey: procuraKeys.matches(leadId) })
      ])
    }
  }
}
