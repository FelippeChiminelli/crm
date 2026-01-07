import { useState, useCallback } from 'react'
import type { Vehicle, CreateVehicleData, UpdateVehicleData } from '../types'
import * as vehicleService from '../services/vehicleService'
import { useAuth } from './useAuth'
import { useToast } from '../contexts/ToastContext'

interface VehicleFormData {
  titulo_veiculo: string
  marca_veiculo: string
  modelo_veiculo: string
  ano_veiculo: number | null
  ano_fabric_veiculo: number | null
  color_veiculo: string
  combustivel_veiculo: string
  cambio_veiculo: string
  quilometragem_veiculo: number | null
  plate_veiculo: string
  price_veiculo: number | null
  promotion_price: number | null
  accessories_veiculo: string
}

interface ImageFile {
  id: string
  file?: File
  url?: string
  position: number
  uploading?: boolean
}

interface UseVehicleFormReturn {
  formData: VehicleFormData
  images: ImageFile[]
  loading: boolean
  uploading: boolean
  errors: Record<string, string>
  
  // Funções de formulário
  setFormData: (data: Partial<VehicleFormData>) => void
  handleInputChange: (field: keyof VehicleFormData, value: any) => void
  resetForm: () => void
  
  // Funções de imagens
  addImages: (files: File[]) => void
  removeImage: (imageId: string) => Promise<void>
  reorderImages: (imageIds: string[]) => void
  setMainImage: (imageId: string) => void
  
  // Submissão
  submitCreate: () => Promise<Vehicle | null>
  submitUpdate: (vehicleId: string) => Promise<Vehicle | null>
  loadVehicle: (vehicleId: string) => Promise<void>
  
  // Validação
  validate: () => boolean
}

const initialFormData: VehicleFormData = {
  titulo_veiculo: '',
  marca_veiculo: '',
  modelo_veiculo: '',
  ano_veiculo: null,
  ano_fabric_veiculo: null,
  color_veiculo: '',
  combustivel_veiculo: '',
  cambio_veiculo: '',
  quilometragem_veiculo: null,
  plate_veiculo: '',
  price_veiculo: null,
  promotion_price: null,
  accessories_veiculo: ''
}

export function useVehicleForm(): UseVehicleFormReturn {
  const { profile } = useAuth()
  const { showToast } = useToast()
  
  const [formData, setFormDataState] = useState<VehicleFormData>(initialFormData)
  const [images, setImages] = useState<ImageFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Atualizar dados do formulário
  const setFormData = useCallback((data: Partial<VehicleFormData>) => {
    setFormDataState(prev => ({ ...prev, ...data }))
    // Limpar erros dos campos atualizados
    setErrors(prev => {
      const newErrors = { ...prev }
      Object.keys(data).forEach(key => {
        delete newErrors[key]
      })
      return newErrors
    })
  }, [])

  // Handler genérico para inputs
  const handleInputChange = useCallback((field: keyof VehicleFormData, value: any) => {
    setFormData({ [field]: value })
  }, [setFormData])

  // Resetar formulário
  const resetForm = useCallback(() => {
    setFormDataState(initialFormData)
    setImages([])
    setErrors({})
  }, [])

  // Adicionar imagens
  const addImages = useCallback((files: File[]) => {
    const newImages: ImageFile[] = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      file,
      position: images.length + index,
      url: URL.createObjectURL(file)
    }))
    setImages(prev => [...prev, ...newImages])
  }, [images.length])

  // Remover imagem
  const removeImage = useCallback(async (imageId: string) => {
    const image = images.find(img => img.id === imageId)
    
    // Se for uma imagem já salva no banco, deletar do servidor
    if (image && !image.file && profile?.empresa_id) {
      try {
        await vehicleService.deleteVehicleImage(imageId, profile.empresa_id)
        showToast('Imagem removida com sucesso!', 'success')
      } catch (err) {
        showToast('Erro ao remover imagem', 'error')
        throw err
      }
    }
    
    // Remover da lista local
    setImages(prev => prev.filter(img => img.id !== imageId))
  }, [images, profile?.empresa_id, showToast])

  // Reordenar imagens
  const reorderImages = useCallback((imageIds: string[]) => {
    const reordered = imageIds.map((id, index) => {
      const image = images.find(img => img.id === id)
      return image ? { ...image, position: index } : null
    }).filter(Boolean) as ImageFile[]
    
    setImages(reordered)
  }, [images])

  // Marcar imagem como principal (move para posição 0)
  const setMainImage = useCallback((imageId: string) => {
    const imageIndex = images.findIndex(img => img.id === imageId)
    if (imageIndex === -1 || imageIndex === 0) return
    
    // Move a imagem selecionada para a primeira posição
    const reordered = [...images]
    const [selectedImage] = reordered.splice(imageIndex, 1)
    reordered.unshift(selectedImage)
    
    // Atualiza as posições
    const withUpdatedPositions = reordered.map((img, index) => ({
      ...img,
      position: index
    }))
    
    setImages(withUpdatedPositions)
    showToast('Imagem principal atualizada', 'success')
  }, [images, showToast])

  // Validar formulário
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.marca_veiculo) {
      newErrors.marca_veiculo = 'Marca é obrigatória'
    }

    if (!formData.modelo_veiculo) {
      newErrors.modelo_veiculo = 'Modelo é obrigatório'
    }

    if (!formData.price_veiculo || formData.price_veiculo <= 0) {
      newErrors.price_veiculo = 'Preço deve ser maior que zero'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Upload de imagens
  const uploadImages = useCallback(async (vehicleId: string): Promise<void> => {
    if (!profile?.empresa_id) return

    const imagesToUpload = images.filter(img => img.file)
    
    if (imagesToUpload.length === 0) return

    setUploading(true)
    try {
      for (const image of imagesToUpload) {
        if (image.file) {
          await vehicleService.uploadVehicleImage(
            profile.empresa_id,
            vehicleId,
            image.file,
            image.position
          )
        }
      }
    } finally {
      setUploading(false)
    }
  }, [images, profile?.empresa_id])

  // Criar veículo
  const submitCreate = useCallback(async (): Promise<Vehicle | null> => {
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
      // Criar veículo
      const vehicleData: CreateVehicleData = {
        titulo_veiculo: formData.titulo_veiculo || undefined,
        marca_veiculo: formData.marca_veiculo || undefined,
        modelo_veiculo: formData.modelo_veiculo || undefined,
        ano_veiculo: formData.ano_veiculo || undefined,
        ano_fabric_veiculo: formData.ano_fabric_veiculo || undefined,
        color_veiculo: formData.color_veiculo || undefined,
        combustivel_veiculo: formData.combustivel_veiculo || undefined,
        cambio_veiculo: formData.cambio_veiculo || undefined,
        quilometragem_veiculo: formData.quilometragem_veiculo || undefined,
        plate_veiculo: formData.plate_veiculo || undefined,
        price_veiculo: formData.price_veiculo || undefined,
        promotion_price: formData.promotion_price || undefined,
        accessories_veiculo: formData.accessories_veiculo || undefined
      }

      const vehicle = await vehicleService.createVehicle(profile.empresa_id, vehicleData)

      // Upload de imagens
      if (images.length > 0) {
        await uploadImages(vehicle.id)
      }

      showToast('Veículo criado com sucesso!', 'success')
      resetForm()
      return vehicle
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar veículo'
      showToast(message, 'error')
      return null
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id, formData, images, validate, uploadImages, showToast, resetForm])

  // Atualizar veículo
  const submitUpdate = useCallback(async (vehicleId: string): Promise<Vehicle | null> => {
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
      // Atualizar veículo
      const vehicleData: UpdateVehicleData = {
        titulo_veiculo: formData.titulo_veiculo || undefined,
        marca_veiculo: formData.marca_veiculo || undefined,
        modelo_veiculo: formData.modelo_veiculo || undefined,
        ano_veiculo: formData.ano_veiculo || undefined,
        ano_fabric_veiculo: formData.ano_fabric_veiculo || undefined,
        color_veiculo: formData.color_veiculo || undefined,
        combustivel_veiculo: formData.combustivel_veiculo || undefined,
        cambio_veiculo: formData.cambio_veiculo || undefined,
        quilometragem_veiculo: formData.quilometragem_veiculo || undefined,
        plate_veiculo: formData.plate_veiculo || undefined,
        price_veiculo: formData.price_veiculo || undefined,
        promotion_price: formData.promotion_price || undefined,
        accessories_veiculo: formData.accessories_veiculo || undefined
      }

      const vehicle = await vehicleService.updateVehicle(vehicleId, profile.empresa_id, vehicleData)

      // Upload de novas imagens
      if (images.some(img => img.file)) {
        await uploadImages(vehicleId)
      }

      // Reordenar todas as imagens
      const imageIds = images.map(img => img.id)
      if (imageIds.length > 0) {
        await vehicleService.reorderVehicleImages(vehicleId, profile.empresa_id, imageIds)
      }

      showToast('Veículo atualizado com sucesso!', 'success')
      return vehicle
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar veículo'
      showToast(message, 'error')
      return null
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id, formData, images, validate, uploadImages, showToast])

  // Carregar veículo para edição
  const loadVehicle = useCallback(async (vehicleId: string) => {
    if (!profile?.empresa_id) return

    setLoading(true)
    try {
      const vehicle = await vehicleService.getVehicleById(vehicleId, profile.empresa_id)
      
      if (vehicle) {
        setFormDataState({
          titulo_veiculo: vehicle.titulo_veiculo || '',
          marca_veiculo: vehicle.marca_veiculo || '',
          modelo_veiculo: vehicle.modelo_veiculo || '',
          ano_veiculo: vehicle.ano_veiculo || null,
          ano_fabric_veiculo: vehicle.ano_fabric_veiculo || null,
          color_veiculo: vehicle.color_veiculo || '',
          combustivel_veiculo: vehicle.combustivel_veiculo || '',
          cambio_veiculo: vehicle.cambio_veiculo || '',
          quilometragem_veiculo: vehicle.quilometragem_veiculo || null,
          plate_veiculo: vehicle.plate_veiculo || '',
          price_veiculo: vehicle.price_veiculo || null,
          promotion_price: vehicle.promotion_price || null,
          accessories_veiculo: vehicle.accessories_veiculo || ''
        })

        // Carregar imagens existentes
        if (vehicle.images) {
          setImages(vehicle.images.map(img => ({
            id: img.id,
            url: img.url,
            position: img.position
          })))
        }
      }
    } catch (err) {
      showToast('Erro ao carregar veículo', 'error')
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id, showToast])

  return {
    formData,
    images,
    loading,
    uploading,
    errors,
    setFormData,
    handleInputChange,
    resetForm,
    addImages,
    removeImage,
    reorderImages,
    setMainImage,
    submitCreate,
    submitUpdate,
    loadVehicle,
    validate
  }
}

