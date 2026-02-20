import { supabase } from './supabaseClient'
import type {
  ProductStats,
  ProductImportData,
  ProductImportResult,
} from '../types'
import { createProduct, getProducts } from './productService'
import { getCategories, createCategory } from './productCategoryService'

// ========================================
// ESTATÍSTICAS DE PRODUTOS
// ========================================

export async function getProductStats(empresaId: string): Promise<ProductStats> {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('preco, preco_promocional, quantidade_estoque, status, tipo, categoria_id, category:product_categories(nome)')
      .eq('empresa_id', empresaId)

    if (error) throw error

    if (!products || products.length === 0) {
      return {
        total_products: 0,
        total_services: 0,
        total_value: 0,
        average_price: 0,
        products_on_promotion: 0,
        products_by_category: [],
        products_by_status: [],
      }
    }

    const total = products.filter((p: any) => (p.tipo || 'produto') === 'produto').length
    const totalServices = products.filter((p: any) => p.tipo === 'servico').length
    const totalValue = products.reduce((sum, p) => sum + (p.preco || 0) * (p.quantidade_estoque || 0), 0)
    const withPrice = products.filter(p => p.preco && p.preco > 0)
    const averagePrice = withPrice.length > 0
      ? withPrice.reduce((sum, p) => sum + (p.preco || 0), 0) / withPrice.length
      : 0
    const onPromotion = products.filter(p => p.preco_promocional).length

    const categoryMap = new Map<string, { count: number; total_value: number }>()
    products.forEach((p: any) => {
      const catName = p.category?.nome || 'Sem categoria'
      const current = categoryMap.get(catName) || { count: 0, total_value: 0 }
      categoryMap.set(catName, {
        count: current.count + 1,
        total_value: current.total_value + (p.preco || 0),
      })
    })

    const statusMap = new Map<string, number>()
    products.forEach(p => {
      const s = p.status || 'ativo'
      statusMap.set(s, (statusMap.get(s) || 0) + 1)
    })

    return {
      total_products: total,
      total_services: totalServices,
      total_value: totalValue,
      average_price: averagePrice,
      products_on_promotion: onPromotion,
      products_by_category: Array.from(categoryMap.entries()).map(([category_name, stats]) => ({
        category_name,
        count: stats.count,
        total_value: stats.total_value,
      })),
      products_by_status: Array.from(statusMap.entries()).map(([status, count]) => ({
        status: status as any,
        count,
      })),
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    throw error
  }
}

// ========================================
// EXPORTAÇÃO CSV
// ========================================

export async function exportProductsToCSV(empresaId: string): Promise<string> {
  try {
    const { products } = await getProducts(empresaId, {}, 10000, 0)

    const headers = [
      'ID', 'Tipo', 'Nome', 'Descrição', 'SKU', 'Categoria', 'Marca',
      'Preço', 'Preço Promocional', 'Qtd Estoque', 'Unidade',
      'Status', 'Duração Estimada', 'Recorrência', 'Data Criação',
    ]

    const rows = products.map(p => [
      p.id,
      p.tipo || 'produto',
      p.nome || '',
      p.descricao || '',
      p.sku || '',
      p.category?.nome || '',
      p.marca || '',
      p.preco ?? '',
      p.preco_promocional ?? '',
      p.quantidade_estoque ?? 0,
      p.unidade_medida || 'un',
      p.status || 'ativo',
      p.duracao_estimada || '',
      p.recorrencia || '',
      p.created_at,
    ])

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')
  } catch (error) {
    console.error('Erro ao exportar produtos:', error)
    throw error
  }
}

// ========================================
// IMPORTAÇÃO CSV
// ========================================

export async function importProductsFromCSV(
  empresaId: string,
  data: ProductImportData[]
): Promise<ProductImportResult> {
  const result: ProductImportResult = { success: 0, failed: 0, errors: [] }

  const categories = await getCategories(empresaId)
  const categoryMap = new Map(categories.map(c => [c.nome.toLowerCase(), c.id]))

  for (let i = 0; i < data.length; i++) {
    try {
      const item = data[i]
      if (!item.nome) throw new Error('Nome é obrigatório')

      let categoriaId: string | undefined
      if (item.categoria_nome) {
        const existing = categoryMap.get(item.categoria_nome.toLowerCase())
        if (existing) {
          categoriaId = existing
        } else {
          const newCat = await createCategory(empresaId, item.categoria_nome)
          categoryMap.set(item.categoria_nome.toLowerCase(), newCat.id)
          categoriaId = newCat.id
        }
      }

      const status = item.status as any
      const validStatuses = ['ativo', 'inativo', 'esgotado']
      const validTipos = ['produto', 'servico']
      const validRecorrencias = ['unico', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual']
      const tipo = item.tipo as any

      await createProduct(empresaId, {
        nome: item.nome,
        descricao: item.descricao,
        sku: item.sku,
        categoria_id: categoriaId,
        marca: item.marca,
        preco: item.preco,
        preco_promocional: item.preco_promocional,
        quantidade_estoque: item.quantidade_estoque,
        unidade_medida: item.unidade_medida,
        status: validStatuses.includes(status) ? status : 'ativo',
        tipo: validTipos.includes(tipo) ? tipo : 'produto',
        duracao_estimada: item.duracao_estimada || undefined,
        recorrencia: item.recorrencia && validRecorrencias.includes(item.recorrencia) ? item.recorrencia as any : undefined,
      })

      result.success++
    } catch (error) {
      result.failed++
      result.errors.push({
        row: i + 2,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  }

  return result
}
