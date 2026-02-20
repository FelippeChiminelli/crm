import { supabase } from './supabaseClient'
import type {
  Product,
  ProductImage,
  CreateProductData,
  UpdateProductData,
  ProductFilters,
} from '../types'

// ========================================
// OPERAÇÕES DE PRODUTOS (CRUD)
// ========================================

export async function getProducts(
  empresaId: string,
  filters?: ProductFilters,
  limit: number = 50,
  offset: number = 0
): Promise<{ products: Product[]; total: number }> {
  try {
    let query = supabase
      .from('products')
      .select('*, category:product_categories(*), images:product_images(*)', { count: 'exact' })
      .eq('empresa_id', empresaId)

    query = applyProductFilters(query, filters)
    query = applyProductSort(query, filters?.sort_by)
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    const products = (data || []).map((p: any) => ({
      ...p,
      images: (p.images || []).sort((a: ProductImage, b: ProductImage) => a.position - b.position)
    }))

    return { products: products as Product[], total: count || 0 }
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    throw error
  }
}

export async function getProductById(productId: string, empresaId: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:product_categories(*), images:product_images(*)')
      .eq('id', productId)
      .eq('empresa_id', empresaId)
      .single()

    if (error) throw error

    if (data) {
      data.images = (data.images || []).sort((a: ProductImage, b: ProductImage) => a.position - b.position)
    }

    return data as Product
  } catch (error) {
    console.error('Erro ao buscar produto:', error)
    return null
  }
}

export async function createProduct(
  empresaId: string,
  productData: CreateProductData
): Promise<Product> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...productData, empresa_id: empresaId })
      .select('*, category:product_categories(*), images:product_images(*)')
      .single()

    if (error) throw error
    return data as Product
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    throw error
  }
}

export async function updateProduct(
  productId: string,
  empresaId: string,
  productData: UpdateProductData
): Promise<Product> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ ...productData, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('empresa_id', empresaId)
      .select('*, category:product_categories(*), images:product_images(*)')
      .single()

    if (error) throw error
    return data as Product
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    throw error
  }
}

export async function deleteProduct(productId: string, empresaId: string): Promise<void> {
  try {
    const { data: images } = await supabase
      .from('product_images')
      .select('url')
      .eq('product_id', productId)
      .eq('empresa_id', empresaId)

    if (images && images.length > 0) {
      for (const image of images) {
        await deleteImageFromStorage(image.url)
      }
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('empresa_id', empresaId)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar produto:', error)
    throw error
  }
}

// ========================================
// HELPERS DE FILTRO E ORDENAÇÃO
// ========================================

function applyProductFilters(query: any, filters?: ProductFilters) {
  if (!filters) return query

  if (filters.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,marca.ilike.%${filters.search}%`
    )
  }

  if (filters.categoria_id) {
    query = query.eq('categoria_id', filters.categoria_id)
  }

  if (filters.marca && filters.marca.length > 0) {
    query = query.in('marca', filters.marca)
  }

  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  if (filters.preco_min != null) {
    query = query.gte('preco', filters.preco_min)
  }

  if (filters.preco_max != null) {
    query = query.lte('preco', filters.preco_max)
  }

  if (filters.only_promotion) {
    query = query.not('preco_promocional', 'is', null)
  }

  if (filters.tipo) {
    query = query.eq('tipo', filters.tipo)
  }

  return query
}

function applyProductSort(query: any, sortBy?: ProductFilters['sort_by']) {
  if (!sortBy) return query.order('created_at', { ascending: false })

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    preco_asc: { column: 'preco', ascending: true },
    preco_desc: { column: 'preco', ascending: false },
    nome_asc: { column: 'nome', ascending: true },
    nome_desc: { column: 'nome', ascending: false },
    created_desc: { column: 'created_at', ascending: false },
    created_asc: { column: 'created_at', ascending: true },
    estoque_asc: { column: 'quantidade_estoque', ascending: true },
    estoque_desc: { column: 'quantidade_estoque', ascending: false },
  }

  const sort = sortMap[sortBy]
  if (sort) {
    query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false })
  }

  return query
}

// ========================================
// HELPERS DE STORAGE
// ========================================

export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  try {
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/product-images/')
    if (pathParts.length < 2) return
    await supabase.storage.from('product-images').remove([pathParts[1]])
  } catch (error) {
    console.error('Erro ao deletar imagem do storage:', error)
  }
}

export async function getUniqueBrands(empresaId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('marca')
      .eq('empresa_id', empresaId)
      .not('marca', 'is', null)
      .order('marca')

    if (error) throw error
    return [...new Set(data.map(p => p.marca).filter(Boolean))] as string[]
  } catch (error) {
    console.error('Erro ao buscar marcas:', error)
    return []
  }
}
