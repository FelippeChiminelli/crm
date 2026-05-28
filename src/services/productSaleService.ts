import { supabase } from './supabaseClient'
import type { Product, ProductStatus } from '../types'

/**
 * Service para operações de venda de produtos/serviços.
 * Espelha o comportamento de venda do estoque de veículos (vehicleService),
 * mas leva em conta a quantidade em estoque para produtos.
 *
 * Toda venda também é registrada na tabela `product_sales` para permitir
 * análises temporais (vendas por período, top vendidos, etc).
 */

const SOLD_STATUS: ProductStatus = 'vendido'
const ACTIVE_STATUS: ProductStatus = 'ativo'

/**
 * Busca um produto retornando os campos necessários para a lógica de venda
 * e para o registro do histórico de venda.
 */
async function fetchProductForSale(productId: string, empresaId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('id, tipo, quantidade_estoque, status, preco, preco_promocional')
    .eq('id', productId)
    .eq('empresa_id', empresaId)
    .single()

  if (error) throw error
  return data as Pick<
    Product,
    'id' | 'tipo' | 'quantidade_estoque' | 'status' | 'preco' | 'preco_promocional'
  >
}

/**
 * Recupera o UUID do usuário autenticado (responsável pela venda).
 * Retorna null em caso de erro/contexto sem usuário para não impedir a venda.
 */
async function getCurrentUserUuid(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

/**
 * Calcula o preço unitário efetivo (promocional se houver, senão preço normal).
 */
function getEffectiveUnitPrice(
  product: Pick<Product, 'preco' | 'preco_promocional'>
): number | null {
  const promotional = product.preco_promocional
  if (promotional != null && promotional > 0) return promotional
  return product.preco ?? null
}

interface RecordSaleParams {
  productId: string
  empresaId: string
  quantidade: number
  unitPrice: number | null
  leadId?: string | null
  responsibleUuid?: string | null
}

/**
 * Insere um registro de venda em `product_sales`.
 * Falhas no registro do histórico são logadas mas não impedem a venda principal,
 * para manter o comportamento atual robusto caso a migration ainda não esteja aplicada.
 */
async function recordProductSale({
  productId,
  empresaId,
  quantidade,
  unitPrice,
  leadId,
  responsibleUuid,
}: RecordSaleParams): Promise<void> {
  try {
    const soldValue = unitPrice != null ? unitPrice * quantidade : null
    const { error } = await supabase.from('product_sales').insert({
      product_id: productId,
      empresa_id: empresaId,
      quantidade_vendida: quantidade,
      unit_price: unitPrice,
      sold_value: soldValue,
      lead_id: leadId ?? null,
      responsible_uuid: responsibleUuid ?? null,
    })
    if (error) {
      console.error('[productSaleService] Erro ao registrar venda em product_sales:', error)
    }
  } catch (err) {
    console.error('[productSaleService] Falha inesperada ao registrar venda:', err)
  }
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
 * Em ambos os casos, um registro é inserido em `product_sales` para histórico.
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
  const unitPrice = getEffectiveUnitPrice(product)
  const quantidade = isService ? 1 : quantidadeVendida

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

  const responsibleUuid = await getCurrentUserUuid()
  await recordProductSale({
    productId,
    empresaId,
    quantidade,
    unitPrice,
    responsibleUuid,
  })

  return data as Product
}

/**
 * Recoloca um produto/serviço como disponível ('ativo').
 * Não restaura estoque automaticamente e não apaga o histórico em `product_sales`
 * (espelha o comportamento de veículos e mantém auditoria).
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
 * Não decrementa estoque — apenas muda o status (igual ao comportamento de
 * markMultipleVehiclesAsSold para veículos).
 *
 * Também insere um registro em `product_sales` por produto, vinculando ao lead
 * quando informado.
 */
export async function markMultipleProductsAsSold(
  productIds: string[],
  empresaId: string,
  leadId?: string | null
): Promise<void> {
  if (productIds.length === 0) return

  const { error } = await supabase
    .from('products')
    .update({ status: SOLD_STATUS, updated_at: new Date().toISOString() })
    .in('id', productIds)
    .eq('empresa_id', empresaId)

  if (error) throw error

  await recordMultipleProductSales(productIds, empresaId, leadId ?? null)
}

/**
 * Insere registros em `product_sales` para múltiplos produtos.
 * Busca os preços atuais para snapshot de valor unitário.
 */
async function recordMultipleProductSales(
  productIds: string[],
  empresaId: string,
  leadId: string | null
): Promise<void> {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, preco, preco_promocional')
      .in('id', productIds)
      .eq('empresa_id', empresaId)

    if (error) {
      console.error('[productSaleService] Erro ao buscar produtos para histórico:', error)
      return
    }

    const responsibleUuid = await getCurrentUserUuid()

    const rows = (products || []).map((p: any) => {
      const unitPrice = getEffectiveUnitPrice(p)
      return {
        product_id: p.id,
        empresa_id: empresaId,
        quantidade_vendida: 1,
        unit_price: unitPrice,
        sold_value: unitPrice,
        lead_id: leadId,
        responsible_uuid: responsibleUuid,
      }
    })

    if (rows.length === 0) return

    const { error: insertError } = await supabase.from('product_sales').insert(rows)
    if (insertError) {
      console.error('[productSaleService] Erro ao registrar vendas em product_sales:', insertError)
    }
  } catch (err) {
    console.error('[productSaleService] Falha inesperada no registro de vendas:', err)
  }
}

/**
 * Recoloca múltiplos produtos como disponíveis (usado ao desmarcar venda do lead).
 * Não apaga o histórico de vendas.
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
