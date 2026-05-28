import { useAuthContext } from '../../../contexts/AuthContext'

/**
 * Regra única para visibilidade da aba "Estoque" no Analytics.
 *
 * A aba é exclusiva para o estoque GERAL de produtos/serviços.
 * Empresas do nicho `loja_veiculo` possuem sua própria página de estoque
 * (/estoque) e não devem ver essa aba no Analytics — análises de veículos
 * existem em outras visões.
 */
const HIDDEN_NICHOS = new Set<string>(['loja_veiculo'])

export function useStockAnalyticsVisibility(): { isStockTabVisible: boolean } {
  const { empresaNicho } = useAuthContext()
  const isStockTabVisible = !empresaNicho || !HIDDEN_NICHOS.has(empresaNicho)
  return { isStockTabVisible }
}
