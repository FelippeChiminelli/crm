import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Configuração otimizada do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por padrão
      staleTime: 5 * 60 * 1000,
      
      // Manter dados em cache por 10 minutos após não ser usado
      gcTime: 10 * 60 * 1000,
      
      // Evitar refetch ao focar a janela para não causar sensação de reload
      refetchOnWindowFocus: false,
      
      // Retry automático com backoff exponencial
      retry: (failureCount, error: any) => {
        // Não retry para erros de autenticação
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        
        // Máximo 3 tentativas para outros erros
        return failureCount < 3
      },
      
      // Backoff exponencial para retry
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Evitar refetch automático em reconexão de rede para reduzir flicker ao voltar de outra guia
      refetchOnReconnect: false
    },
    mutations: {
      // Retry para mutations críticas
      retry: (failureCount, error: any) => {
        // Não retry para erros de cliente (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        
        // Retry até 2 vezes para erros de servidor
        return failureCount < 2
      },
      
      // Backoff para mutations
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
    }
  }
})

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools removido para não exibir widget flutuante */}
    </QueryClientProvider>
  )
}

// Hook para acessar o query client
export function useQueryClient() {
  return queryClient
}

// Utilitários para gerenciar cache
export const cacheUtils = {
  // Invalidar todas as queries de um tipo
  invalidateQueries: (queryKey: string[]) => {
    queryClient.invalidateQueries({ queryKey })
  },
  
  // Limpar cache específico
  removeQueries: (queryKey: string[]) => {
    queryClient.removeQueries({ queryKey })
  },
  
  // Prefetch de dados
  prefetchQuery: function <T>(queryKey: string[], queryFn: () => Promise<T>) {
    return queryClient.prefetchQuery({ queryKey, queryFn })
  },
  
  // Definir dados no cache manualmente
  setQueryData: function <T>(queryKey: string[], data: T) {
    queryClient.setQueryData(queryKey, data)
  },
  
  // Obter dados do cache
  getQueryData: function <T>(queryKey: string[]): T | undefined {
    return queryClient.getQueryData(queryKey)
  },
  
  // Limpar todo o cache
  clear: () => {
    queryClient.clear()
  }
}

// Query keys padronizados
export const queryKeys = {
  // Leads
  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (params: any) => [...queryKeys.leads.lists(), params] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leads.details(), id] as const,
    byPipeline: (pipelineId: string) => [...queryKeys.leads.all, 'pipeline', pipelineId] as const,
    byStage: (stageId: string) => [...queryKeys.leads.all, 'stage', stageId] as const
  },
  
  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (params: any) => [...queryKeys.tasks.lists(), params] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    byUser: (userId: string) => [...queryKeys.tasks.all, 'user', userId] as const,
    withDates: () => [...queryKeys.tasks.all, 'withDates'] as const,
    stats: (userId: string) => [...queryKeys.tasks.all, 'stats', userId] as const
  },
  
  // Events
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (params: any) => [...queryKeys.events.lists(), params] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
    calendar: (filters: any) => [...queryKeys.events.all, 'calendar', filters] as const
  },
  
  // Pipelines
  pipelines: {
    all: ['pipelines'] as const,
    lists: () => [...queryKeys.pipelines.all, 'list'] as const,
    details: () => [...queryKeys.pipelines.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.pipelines.details(), id] as const
  },
  
  // Stages
  stages: {
    all: ['stages'] as const,
    byPipeline: (pipelineId: string) => [...queryKeys.stages.all, 'pipeline', pipelineId] as const
  },
  
  // Profiles
  profiles: {
    all: ['profiles'] as const,
    current: () => [...queryKeys.profiles.all, 'current'] as const,
    detail: (id: string) => [...queryKeys.profiles.all, 'detail', id] as const
  },
  
  // Empresas
  empresas: {
    all: ['empresas'] as const,
    current: () => [...queryKeys.empresas.all, 'current'] as const
  }
} 