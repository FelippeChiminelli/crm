import { supabase } from './supabaseClient'
import type { Product, ProductStatus } from '../types'

/**
 * Service para operações de venda de produtos/serviços.
 * Espelha o comportamento de venda do estoque de veículos (vehicleService),
 * mas leva em conta a quantidade em estoque para produtos.
 */

const SOLD_STATUS: ProductStatus = 'vendido'
const ACTIVE_STATUS: ProductStatus = 'ativo'

/**
 * Busca um produto retornando apenas os campos necessários para a lógica de venda.
 */
async function fetchProductForSale(productId: string, empresaId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('id, tipo, quantidade_estoque, status')
    .eq('id', productId)
    .eq('empresa_id', empresaId)
    .single()

  if (error) throw error
  return data as Pick<Product, 'id' | 'tipo' | 'quantidade_estoque' | 'status'>
}

/**
 * Marca um produto/serviço como vendido a partir do estoque.
 *
 * Regras:
 * - Para serviços (tipo='servico'): muda status para 'vendido' diretamente, sem mexer em estoque.
 * - Para produtos (tipo='produto'): decrementa o estoque pela quantidade vendida.
 *   - Se o estoque chegar a 0, o status vira 'vendido'.
 *   - Se ainda restar estoque, o status permanece 'ativo' (apenas estoque é atualizado).
 *
 * @param productId ID do produto
 * @param empresaId ID da empresa (para garantir isolamento multi-tenant)
 * @param quantidadeVendida Quantidade vendida (ignorada para serviços)
 */
export async function markProductAsSold(
  productId: string,
  empresaId: string,
  quantidadeVendida: number = 1
): Promise<Product> {
  if (quantidadeVendida <= 0) {
    throw new Error('A quantidade vendida deve ser maior que zero')
  }

  const product = await fetchProductForSale(productId, empresaId)
  const isService = (product.tipo || 'produto') === 'servico'

  let updatePayload: Record<string, unknown>

  if (isService) {
    updatePayload = {
      status: SOLD_STATUS,
      updated_at: new Date().toISOString(),
    }
  } else {
    const estoqueAtual = product.quantidade_estoque ?? 0
    const novoEstoque = Math.max(0, estoqueAtual - quantidadeVendida)
    const novoStatus: ProductStatus = novoEstoque === 0 ? SOLD_STATUS : ACTIVE_STATUS

    updatePayload = {
      quantidade_estoque: novoEstoque,
      status: novoStatus,
      updated_at: new Date().toISOString(),
    }
  }

  const { data, error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId)
    .eq('empresa_id', empresaId)
    .select('*, category:product_categories(*), images:product_images(*)')
    .single()

  if (error) throw error
  return data as Product
}

/**
 * Recoloca um produto/serviço como disponível ('ativo').
 * Não restaura estoque automaticamente (espelha o comportamento de veículos,
 * em que recolocar não desfaz a quantidade vendida).
 */
export async function markProductAsAvailable(
  productId: string,
  empresaId: string
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ status: ACTIVE_STATUS, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('empresa_id', empresaId)
    .select('*, category:product_categories(*), images:product_images(*)')
    .single()

  if (error) throw error
  return data as Product
}

/**
 * Marca múltiplos produtos como vendidos (usado pela integração com leads).
 * Não decrementa estoque — apenas muda o status, igual ao comportamento de
 * markMultipleVehiclesAsSold para veículos.
 */
export async function markMultipleProductsAsSold(
  productIds: string[],
  empresaId: string
): Promise<void> {
  if (productIds.length === 0) return

  const { error } = await supabase
    .from('products')
    .update({ status: SOLD_STATUS, updated_at: new Date().toISOString() })
    .in('id', productIds)
    .eq('empresa_id', empresaId)

  if (error) throw error
}

/**
 * Recoloca múltiplos produtos como disponíveis (usado ao desmarcar venda do lead).
 */
export async function markMultipleProductsAsAvailable(
  productIds: string[],
  empresaId: string
): Promise<void> {
  if (productIds.length === 0) return

  const { error } = await supabase
    .from('products')
    .update({ status: ACTIVE_STATUS, updated_at: new Date().toISOString() })
    .in('id', productIds)
    .eq('empresa_id', empresaId)

  if (error) throw error
}
