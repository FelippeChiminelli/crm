import { useState, useCallback } from 'react'
import type { Product, CreateProductData, UpdateProductData, ProductStatus, ProductType, RecurrenceType } from '../types'
import * as productService from '../services/productService'
import { uploadProductImage, reorderProductImages } from '../services/productImageService'
import { deleteProductImage } from '../services/productImageService'
import { useAuth } from './useAuth'
import { useToast } from '../contexts/ToastContext'

export interface ProductFormData {
  nome: string
  descricao: string
  sku: string
  categoria_id: string
  marca: string
  preco: number | null
  preco_promocional: number | null
  quantidade_estoque: number | null
  unidade_medida: string
  status: ProductStatus
  tipo: ProductType
  duracao_estimada: string
  recorrencia: RecurrenceType | ''
}

export interface ImageFile {
  id: string
  file?: File
  url?: string
  position: number
  uploading?: boolean
}

interface UseProductFormReturn {
  formData: ProductFormData
  images: ImageFile[]
  loading: boolean
  uploading: boolean
  errors: Record<string, string>
  setFormData: (data: Partial<ProductFormData>) => void
  handleInputChange: (field: keyof ProductFormData, value: any) => void
  resetForm: () => void
  addImages: (files: File[]) => void
  removeImage: (imageId: string) => Promise<void>
  reorderImages: (imageIds: string[]) => void
  setMainImage: (imageId: string) => void
  submitCreate: () => Promise<Product | null>
  submitUpdate: (productId: string) => Promise<Product | null>
  loadProduct: (productId: string) => Promise<void>
  validate: () => boolean
}

const initialFormData: ProductFormData = {
  nome: '',
  descricao: '',
  sku: '',
  categoria_id: '',
  marca: '',
  preco: null,
  preco_promocional: null,
  quantidade_estoque: null,
  unidade_medida: 'un',
  status: 'ativo',
  tipo: 'produto',
  duracao_estimada: '',
  recorrencia: '',
}

export function useProductForm(): UseProductFormReturn {
  const { profile } = useAuth()
  const { showToast } = useToast()

  const [formData, setFormDataState] = useState<ProductFormData>(initialFormData)
  const [images, setImages] = useState<ImageFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setFormData = useCallback((data: Partial<ProductFormData>) => {
    setFormDataState(prev => ({ ...prev, ...data }))
    setErrors(prev => {
      const newErrors = { ...prev }
      Object.keys(data).forEach(key => delete newErrors[key])
      return newErrors
    })
  }, [])

  const handleInputChange = useCallback((field: keyof ProductFormData, value: any) => {
    setFormData({ [field]: value })
  }, [setFormData])

  const resetForm = useCallback(() => {
    setFormDataState(initialFormData)
    setImages([])
    setErrors({})
  }, [])

  const addImages = useCallback((files: File[]) => {
    const newImages: ImageFile[] = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      file,
      position: images.length + index,
      url: URL.createObjectURL(file),
    }))
    setImages(prev => [...prev, ...newImages])
  }, [images.length])

  const removeImage = useCallback(async (imageId: string) => {
    const image = images.find(img => img.id === imageId)
    if (image && !image.file && profile?.empresa_id) {
      try {
        await deleteProductImage(imageId, profile.empresa_id)
        showToast('Imagem removida com sucesso!', 'success')
      } catch {
        showToast('Erro ao remover imagem', 'error')
        return
      }
    }
    setImages(prev => prev.filter(img => img.id !== imageId))
  }, [images, profile?.empresa_id, showToast])

  const reorderImages = useCallback((imageIds: string[]) => {
    const reordered = imageIds
      .map((id, index) => {
        const image = images.find(img => img.id === id)
        return image ? { ...image, position: index } : null
      })
      .filter(Boolean) as ImageFile[]
    setImages(reordered)
  }, [images])

  const setMainImage = useCallback((imageId: string) => {
    const idx = images.findIndex(img => img.id === imageId)
    if (idx <= 0) return
    const reordered = [...images]
    const [selected] = reordered.splice(idx, 1)
    reordered.unshift(selected)
    setImages(reordered.map((img, i) => ({ ...img, position: i })))
    showToast('Imagem principal atualizada', 'success')
  }, [images, showToast])

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório'
    if (!formData.preco || formData.preco <= 0) newErrors.preco = 'Preço deve ser maior que zero'
    if (formData.preco_promocional && formData.preco && formData.preco_promocional >= formData.preco) {
      newErrors.preco_promocional = 'Preço promocional deve ser menor que o preço'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const uploadImages_ = useCallback(async (productId: string): Promise<void> => {
    if (!profile?.empresa_id) return
    const toUpload = images.filter(img => img.file)
    if (toUpload.length === 0) return
    setUploading(true)
    try {
      for (const image of toUpload) {
        if (image.file) {
          await uploadProductImage(profile.empresa_id, productId, image.file, image.position)
        }
      }
    } finally {
      setUploading(false)
    }
  }, [images, profile?.empresa_id])

  const submitCreate = useCallback(async (): Promise<Product | null> => {
    if (!profile?.empresa_id) {
      showToast('Erro: empresa não identificada', 'error')
      return null
    }
    if (!validate()) {
      showToast('Preencha todos os campos obrigatórios', 'error')
      return null
    }
    setLoading(true)
    try {
      const isService = formData.tipo === 'servico'
      const data: CreateProductData = {
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        sku: isService ? undefined : (formData.sku || undefined),
        categoria_id: formData.categoria_id || undefined,
        marca: formData.marca || undefined,
        preco: formData.preco || undefined,
        preco_promocional: formData.preco_promocional || undefined,
        quantidade_estoque: isService ? undefined : (formData.quantidade_estoque ?? undefined),
        unidade_medida: isService ? undefined : (formData.unidade_medida || 'un'),
        status: formData.status,
        tipo: formData.tipo,
        duracao_estimada: isService ? (formData.duracao_estimada || undefined) : undefined,
        recorrencia: isService && formData.recorrencia ? formData.recorrencia : undefined,
      }
      const product = await productService.createProduct(profile.empresa_id, data)
      if (images.length > 0) await uploadImages_(product.id)
      const label = isService ? 'Serviço' : 'Produto'
      showToast(`${label} criado com sucesso!`, 'success')
      resetForm()
      return product
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar produto', 'error')
      return null
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id, formData, images, validate, uploadImages_, showToast, resetForm])

  const submitUpdate = useCallback(async (productId: string): Promise<Product | null> => {
    if (!profile?.empresa_id) {
      showToast('Erro: empresa não identificada', 'error')
      return null
    }
    if (!validate()) {
      showToast('Preencha todos os campos obrigatórios', 'error')
      return null
    }
    setLoading(true)
    try {
      const isService = formData.tipo === 'servico'
      const data: UpdateProductData = {
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        sku: isService ? undefined : (formData.sku || undefined),
        categoria_id: formData.categoria_id || null,
        marca: formData.marca || undefined,
        preco: formData.preco || undefined,
        preco_promocional: formData.preco_promocional || null,
        quantidade_estoque: isService ? undefined : (formData.quantidade_estoque ?? undefined),
        unidade_medida: isService ? undefined : (formData.unidade_medida || 'un'),
        status: formData.status,
        tipo: formData.tipo,
        duracao_estimada: isService ? (formData.duracao_estimada || null) : null,
        recorrencia: isService && formData.recorrencia ? formData.recorrencia : null,
      }
      const product = await productService.updateProduct(productId, profile.empresa_id, data)
      if (images.some(img => img.file)) await uploadImages_(productId)
      const savedIds = images.filter(img => !img.file).map(img => img.id)
      if (savedIds.length > 0) {
        await reorderProductImages(productId, profile.empresa_id, savedIds)
      }
      const label = isService ? 'Serviço' : 'Produto'
      showToast(`${label} atualizado com sucesso!`, 'success')
      return product
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar produto', 'error')
      return null
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id, formData, images, validate, uploadImages_, showToast])

  const loadProduct = useCallback(async (productId: string) => {
    if (!profile?.empresa_id) return
    setLoading(true)
    try {
      const product = await productService.getProductById(productId, profile.empresa_id)
      if (product) {
        setFormDataState({
          nome: product.nome || '',
          descricao: product.descricao || '',
          sku: product.sku || '',
          categoria_id: product.categoria_id || '',
          marca: product.marca || '',
          preco: product.preco || null,
          preco_promocional: product.preco_promocional || null,
          quantidade_estoque: product.quantidade_estoque ?? null,
          unidade_medida: product.unidade_medida || 'un',
          status: product.status || 'ativo',
          tipo: product.tipo || 'produto',
          duracao_estimada: product.duracao_estimada || '',
          recorrencia: product.recorrencia || '',
        })
        if (product.images) {
          setImages(product.images.map(img => ({
            id: img.id, url: img.url, position: img.position,
          })))
        }
      }
    } catch {
      showToast('Erro ao carregar produto', 'error')
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id, showToast])

  return {
    formData, images, loading, uploading, errors,
    setFormData, handleInputChange, resetForm,
    addImages, removeImage, reorderImages, setMainImage,
    submitCreate, submitUpdate, loadProduct, validate,
  }
}
