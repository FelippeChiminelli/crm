import { createContext, useContext, useReducer, useEffect } from 'react'
import type { ReactNode } from 'react'
import { getPipelines } from '../services/pipelineService'
import { useAuthContext } from './AuthContext'
import type { Pipeline } from '../types'

interface PipelineState {
  pipelines: Pipeline[]
  loading: boolean
  error: string | null
}

type PipelineAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PIPELINES'; payload: Pipeline[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_PIPELINE'; payload: Pipeline }
  | { type: 'UPDATE_PIPELINE'; payload: Pipeline }
  | { type: 'DELETE_PIPELINE'; payload: string }

const initialState: PipelineState = {
  pipelines: [],
  loading: true,
  error: null
}

function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_PIPELINES':
      return { ...state, pipelines: action.payload, loading: false, error: null }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'ADD_PIPELINE':
      return { 
        ...state, 
        pipelines: [action.payload, ...state.pipelines]
      }
    case 'UPDATE_PIPELINE':
      return {
        ...state,
        pipelines: state.pipelines.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      }
    case 'DELETE_PIPELINE':
      return {
        ...state,
        pipelines: state.pipelines.filter(p => p.id !== action.payload)
      }
    default:
      return state
  }
}

interface PipelineContextType {
  state: PipelineState
  dispatch: React.Dispatch<PipelineAction>
  refreshPipelines: () => Promise<void>
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined)

interface PipelineProviderProps {
  children: ReactNode
}

export function PipelineProvider({ children }: PipelineProviderProps) {
  const [state, dispatch] = useReducer(pipelineReducer, initialState)
  const { isAuthenticated, loading: authLoading } = useAuthContext()

  const refreshPipelines = async () => {
    // Não tentar carregar se ainda estiver verificando autenticação
    if (authLoading) {
      return
    }

    // Não tentar carregar se não estiver autenticado
    if (!isAuthenticated) {
      dispatch({ type: 'SET_PIPELINES', payload: [] })
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const { data, error } = await getPipelines()
      
      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message })
      } else {
        dispatch({ type: 'SET_PIPELINES', payload: data || [] })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    }
  }

  // Carregar pipelines quando a autenticação estiver pronta
  useEffect(() => {
    // Só tentar carregar quando a verificação de auth terminar
    if (!authLoading) {
      refreshPipelines()
    }
  }, [isAuthenticated, authLoading]) // CORRIGIDO: React aos changes de auth

  return (
    <PipelineContext.Provider value={{ state, dispatch, refreshPipelines }}>
      {children}
    </PipelineContext.Provider>
  )
}

export function usePipelineContext() {
  const context = useContext(PipelineContext)
  if (!context) {
    throw new Error('usePipelineContext must be used within a PipelineProvider')
  }
  return context
} 