import { supabase } from './supabaseClient'
import type { ProductImage } from '../types'
import { deleteImageFromStorage } from './productService'

// ========================================
// OPERAÇÕES DE IMAGENS DE PRODUTOS
// ========================================

export async function uploadProductImage(
  empresaId: string,
  productId: string,
  file: File,
  position: number
): Promise<ProductImage> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${empresaId}/${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    const { data, error } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        empresa_id: empresaId,
        url: urlData.publicUrl,
        position,
      })
      .select()
      .single()

    if (error) throw error
    return data as ProductImage
  } catch (error) {
    console.error('Erro ao fazer upload de imagem:', error)
    throw error
  }
}

export async function deleteProductImage(
  imageId: string,
  empresaId: string
): Promise<void> {
  try {
    const { data: image } = await supabase
      .from('product_images')
      .select('url')
      .eq('id', imageId)
      .eq('empresa_id', empresaId)
      .single()

    if (image) {
      await deleteImageFromStorage(image.url)
    }

    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .eq('empresa_id', empresaId)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar imagem:', error)
    throw error
  }
}

export async function reorderProductImages(
  productId: string,
  empresaId: string,
  imageIds: string[]
): Promise<void> {
  try {
    const updates = imageIds.map((imageId, index) =>
      supabase
        .from('product_images')
        .update({ position: index })
        .eq('id', imageId)
        .eq('product_id', productId)
        .eq('empresa_id', empresaId)
    )
    await Promise.all(updates)
  } catch (error) {
    console.error('Erro ao reordenar imagens:', error)
    throw error
  }
}
