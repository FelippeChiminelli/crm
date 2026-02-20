import { supabase } from './supabaseClient'
import type { ProductCategory } from '../types'

// ========================================
// OPERAÇÕES DE CATEGORIAS DE PRODUTOS
// ========================================

export async function getCategories(empresaId: string): Promise<ProductCategory[]> {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome')

    if (error) throw error
    return (data || []) as ProductCategory[]
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return []
  }
}

export async function createCategory(
  empresaId: string,
  nome: string,
  descricao?: string
): Promise<ProductCategory> {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .insert({ empresa_id: empresaId, nome, descricao })
      .select()
      .single()

    if (error) throw error
    return data as ProductCategory
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    throw error
  }
}

export async function updateCategory(
  categoryId: string,
  empresaId: string,
  nome: string,
  descricao?: string
): Promise<ProductCategory> {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .update({ nome, descricao })
      .eq('id', categoryId)
      .eq('empresa_id', empresaId)
      .select()
      .single()

    if (error) throw error
    return data as ProductCategory
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    throw error
  }
}

export async function deleteCategory(
  categoryId: string,
  empresaId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', categoryId)
      .eq('empresa_id', empresaId)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar categoria:', error)
    throw error
  }
}
