import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../services/supabaseClient'
import {
  enterImpersonation,
  exitImpersonation,
  getImpersonationState,
  type ImpersonationState,
} from '../services/admin/impersonationService'

interface ImpersonationContextType {
  isImpersonating: boolean
  empresaNome: string | null
  empresaId: string | null
  /** Entra na empresa (troca a sessao do Supabase). Chamar com sessao de parceiro ativa. */
  enter: (empresa: { id: string; nome: string }) => Promise<void>
  /** Sai da impersonacao e restaura a sessao do parceiro. */
  exit: () => Promise<void>
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined)

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(() => getImpersonationState())

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setState({ isImpersonating: false, empresa: null })
        return
      }
      setState(getImpersonationState())
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const enter = useCallback(async (empresa: { id: string; nome: string }) => {
    await enterImpersonation(empresa)
    setState(getImpersonationState())
  }, [])

  const exit = useCallback(async () => {
    await exitImpersonation()
    setState(getImpersonationState())
  }, [])

  const value = useMemo<ImpersonationContextType>(
    () => ({
      isImpersonating: state.isImpersonating,
      empresaNome: state.empresa?.nome ?? null,
      empresaId: state.empresa?.id ?? null,
      enter,
      exit,
    }),
    [state, enter, exit]
  )

  return (
    <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>
  )
}

export function useImpersonation(): ImpersonationContextType {
  const ctx = useContext(ImpersonationContext)
  if (!ctx) {
    throw new Error('useImpersonation deve ser usado dentro de ImpersonationProvider')
  }
  return ctx
}
