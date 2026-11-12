import { useAuthContext } from '../contexts/AuthContext'

/** A empresa do usuário é uma loja de veículos (empresas.nicho = 'loja_veiculo')? */
export function useIsLojaVeiculo(): boolean {
  const { empresaNicho } = useAuthContext()
  return empresaNicho === 'loja_veiculo'
}
