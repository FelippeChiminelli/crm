import { supabase } from './supabaseClient'
import type { StockAnalyticsFilters } from '../types'

/**
 * Helpers compartilhados pelos services de analytics de estoque
 * (productInventoryService + productSalesAnalyticsService).
 */

export const STOCK_CONSTANTS = {
  LOW_STOCK_THRESHOLD: 5,
  TOP_SELLING_LIMIT: 10,
  PRODUCT_SALES_LIST_LIMIT: 200,
}

export async function getUserEmpresaId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('uuid', user.id)
    .single()

  if (!profile?.empresa_id) throw new Error('Empresa não encontrada')
  return profile.empresa_id
}

export function periodRange(filters: StockAnalyticsFilters) {
  return {
    startIso: `${filters.period.start}T00:00:00`,
    endIso: `${filters.period.end}T23:59:59`,
  }
}

/** Aplica filtros (categoria, marca, tipo) a uma query sobre `products`. */
export function applyProductScopeFilters(query: any, filters: StockAnalyticsFilters) {
  if (filters.categoria_ids && filters.categoria_ids.length > 0) {
    query = query.in('categoria_id', filters.categoria_ids)
  }
  if (filters.marcas && filters.marcas.length > 0) {
    query = query.in('marca', filters.marcas)
  }
  if (filters.tipos && filters.tipos.length > 0) {
    query = query.in('tipo', filters.tipos)
  }
  return query
}

/**
 * Retorna a lista de product_ids que entram no escopo dos filtros (categoria/marca/tipo),
 * ou null quando não há filtro algum (== sem restrição por id).
 */
export async function getScopedProductIds(
  empresaId: string,
  filters: StockAnalyticsFilters
): Promise<string[] | null> {
  const hasScope =
    (filters.categoria_ids && filters.categoria_ids.length > 0) ||
    (filters.marcas && filters.marcas.length > 0) ||
    (filters.tipos && filters.tipos.length > 0)

  if (!hasScope) return null

  let q = supabase.from('products').select('id').eq('empresa_id', empresaId)
  q = applyProductScopeFilters(q, filters)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map((r: any) => r.id)
}

/**
 * Carrega todas as vendas no período da tabela product_sales, com escopo
 * opcional por produto. Hidrata product, responsible e lead via lookups
 * manuais para evitar dependência do nome da FK.
 */
export async function fetchSalesInPeriod(
  empresaId: string,
  filters: StockAnalyticsFilters
): Promise<any[]> {
  const { startIso, endIso } = periodRange(filters)
  const scopedIds = await getScopedProductIds(empresaId, filters)

  let query = supabase
    .from('product_sales')
    .select(`
      id,
      product_id,
      quantidade_vendida,
      unit_price,
      sold_value,
      sold_at,
      lead_id,
      responsible_uuid
    `)
    .eq('empresa_id', empresaId)
    .gte('sold_at', startIso)
    .lte('sold_at', endIso)
    .order('sold_at', { ascending: false })

  if (scopedIds) {
    if (scopedIds.length === 0) return []
    query = query.in('product_id', scopedIds)
  }

  const { data, error } = await query
  if (error) throw error
  const sales = data || []
  if (sales.length === 0) return []

  const productIds = Array.from(new Set(sales.map((s: any) => s.product_id))).filter(Boolean)
  const responsibleIds = Array.from(
    new Set(sales.map((s: any) => s.responsible_uuid).filter(Boolean))
  )
  const leadIds = Array.from(new Set(sales.map((s: any) => s.lead_id).filter(Boolean)))

  const [productsRes, responsiblesRes, leadsRes] = await Promise.all([
    productIds.length
      ? supabase
          .from('products')
          .select('id, nome, tipo, marca')
          .in('id', productIds)
          .eq('empresa_id', empresaId)
      : Promise.resolve({ data: [], error: null }),
    responsibleIds.length
      ? supabase.from('profiles').select('uuid, full_name').in('uuid', responsibleIds)
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase
          .from('leads')
          .select('id, name')
          .in('id', leadIds)
          .eq('empresa_id', empresaId)
      : Promise.resolve({ data: [], error: null }),
  ])

  const productMap = new Map<string, any>(
    (productsRes.data || []).map((p: any) => [p.id, p])
  )
  const responsibleMap = new Map<string, any>(
    (responsiblesRes.data || []).map((r: any) => [r.uuid, r])
  )
  const leadMap = new Map<string, any>(
    (leadsRes.data || []).map((l: any) => [l.id, l])
  )

  return sales.map((s: any) => ({
    ...s,
    product: productMap.get(s.product_id) || null,
    responsible: s.responsible_uuid ? responsibleMap.get(s.responsible_uuid) || null : null,
    lead: s.lead_id ? leadMap.get(s.lead_id) || null : null,
  }))
}
