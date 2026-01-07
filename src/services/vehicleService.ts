import { supabase } from './supabaseClient'
import type {
  Vehicle,
  VehicleImage,
  CreateVehicleData,
  UpdateVehicleData,
  VehicleFilters,
  VehicleStats,
  VehicleImportData,
  VehicleImportResult
} from '../types'

/**
 * Service para gerenciamento de veículos no estoque
 */

// ========================================
// OPERAÇÕES DE VEÍCULOS
// ========================================

/**
 * Buscar veículos com filtros e paginação
 */
export async function getVehicles(
  empresaId: string,
  filters?: VehicleFilters,
  limit: number = 50,
  offset: number = 0
): Promise<{ vehicles: Vehicle[]; total: number }> {
  try {
    let query = supabase
      .from('vehicles')
      .select('*, images:vehicle_images(*)', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filters?.search) {
      query = query.or(
        `titulo_veiculo.ilike.%${filters.search}%,marca_veiculo.ilike.%${filters.search}%,modelo_veiculo.ilike.%${filters.search}%`
      )
    }

    if (filters?.marca && filters.marca.length > 0) {
      query = query.in('marca_veiculo', filters.marca)
    }

    if (filters?.combustivel && filters.combustivel.length > 0) {
      query = query.in('combustivel_veiculo', filters.combustivel)
    }

    if (filters?.cambio && filters.cambio.length > 0) {
      query = query.in('cambio_veiculo', filters.cambio)
    }

    if (filters?.ano_min) {
      query = query.gte('ano_veiculo', filters.ano_min)
    }

    if (filters?.ano_max) {
      query = query.lte('ano_veiculo', filters.ano_max)
    }

    if (filters?.price_min) {
      query = query.gte('price_veiculo', filters.price_min)
    }

    if (filters?.price_max) {
      query = query.lte('price_veiculo', filters.price_max)
    }

    if (filters?.quilometragem_max) {
      query = query.lte('quilometragem_veiculo', filters.quilometragem_max)
    }

    if (filters?.only_promotion) {
      query = query.not('promotion_price', 'is', null)
    }

    // Aplicar ordenação
    if (filters?.sort_by) {
      switch (filters.sort_by) {
        case 'price_asc':
          query = query.order('price_veiculo', { ascending: true, nullsFirst: false })
          break
        case 'price_desc':
          query = query.order('price_veiculo', { ascending: false, nullsFirst: false })
          break
        case 'year_desc':
          query = query.order('ano_veiculo', { ascending: false, nullsFirst: false })
          break
        case 'year_asc':
          query = query.order('ano_veiculo', { ascending: true, nullsFirst: false })
          break
        case 'created_desc':
          query = query.order('created_at', { ascending: false })
          break
        case 'created_asc':
          query = query.order('created_at', { ascending: true })
          break
      }
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    // Ordenar imagens por posição
    const vehicles = (data || []).map((vehicle: any) => ({
      ...vehicle,
      images: (vehicle.images || []).sort((a: VehicleImage, b: VehicleImage) => a.position - b.position)
    }))

    return {
      vehicles: vehicles as Vehicle[],
      total: count || 0
    }
  } catch (error) {
    console.error('Erro ao buscar veículos:', error)
    throw error
  }
}

/**
 * Buscar veículo por ID
 */
export async function getVehicleById(vehicleId: string, empresaId: string): Promise<Vehicle | null> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, images:vehicle_images(*)')
      .eq('id', vehicleId)
      .eq('empresa_id', empresaId)
      .single()

    if (error) throw error

    if (data) {
      // Ordenar imagens por posição
      data.images = (data.images || []).sort((a: VehicleImage, b: VehicleImage) => a.position - b.position)
    }

    return data as Vehicle
  } catch (error) {
    console.error('Erro ao buscar veículo:', error)
    return null
  }
}

/**
 * Criar novo veículo
 */
export async function createVehicle(
  empresaId: string,
  vehicleData: CreateVehicleData
): Promise<Vehicle> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        ...vehicleData,
        empresa_id: empresaId
      })
      .select('*, images:vehicle_images(*)')
      .single()

    if (error) throw error

    return data as Vehicle
  } catch (error) {
    console.error('Erro ao criar veículo:', error)
    throw error
  }
}

/**
 * Atualizar veículo
 */
export async function updateVehicle(
  vehicleId: string,
  empresaId: string,
  vehicleData: UpdateVehicleData
): Promise<Vehicle> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .update({
        ...vehicleData,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)
      .eq('empresa_id', empresaId)
      .select('*, images:vehicle_images(*)')
      .single()

    if (error) throw error

    return data as Vehicle
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error)
    throw error
  }
}

/**
 * Deletar veículo (e suas imagens)
 */
export async function deleteVehicle(vehicleId: string, empresaId: string): Promise<void> {
  try {
    // Buscar imagens para deletar do storage
    const { data: images } = await supabase
      .from('vehicle_images')
      .select('url')
      .eq('vehicle_id', vehicleId)
      .eq('empresa_id', empresaId)

    // Deletar imagens do storage
    if (images && images.length > 0) {
      for (const image of images) {
        await deleteImageFromStorage(image.url)
      }
    }

    // Deletar imagens do banco
    await supabase
      .from('vehicle_images')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('empresa_id', empresaId)

    // Deletar veículo
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('empresa_id', empresaId)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar veículo:', error)
    throw error
  }
}

// ========================================
// OPERAÇÕES DE IMAGENS
// ========================================

/**
 * Upload de imagem para o storage
 */
export async function uploadVehicleImage(
  empresaId: string,
  vehicleId: string,
  file: File,
  position: number
): Promise<VehicleImage> {
  try {
    // Gerar nome único para o arquivo
    const fileExt = file.name.split('.').pop()
    const fileName = `${empresaId}/${vehicleId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload para o storage
    const { error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl

    // Salvar referência no banco
    const { data, error } = await supabase
      .from('vehicle_images')
      .insert({
        vehicle_id: vehicleId,
        empresa_id: empresaId,
        url: imageUrl,
        position: position
      })
      .select()
      .single()

    if (error) throw error

    return data as VehicleImage
  } catch (error) {
    console.error('Erro ao fazer upload de imagem:', error)
    throw error
  }
}

/**
 * Deletar imagem do veículo
 */
export async function deleteVehicleImage(
  imageId: string,
  empresaId: string
): Promise<void> {
  try {
    // Buscar URL da imagem
    const { data: image } = await supabase
      .from('vehicle_images')
      .select('url')
      .eq('id', imageId)
      .eq('empresa_id', empresaId)
      .single()

    if (image) {
      // Deletar do storage
      await deleteImageFromStorage(image.url)
    }

    // Deletar do banco
    const { error } = await supabase
      .from('vehicle_images')
      .delete()
      .eq('id', imageId)
      .eq('empresa_id', empresaId)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar imagem:', error)
    throw error
  }
}

/**
 * Reordenar imagens do veículo
 */
export async function reorderVehicleImages(
  vehicleId: string,
  empresaId: string,
  imageIds: string[]
): Promise<void> {
  try {
    // Atualizar posição de cada imagem
    const updates = imageIds.map((imageId, index) =>
      supabase
        .from('vehicle_images')
        .update({ position: index })
        .eq('id', imageId)
        .eq('vehicle_id', vehicleId)
        .eq('empresa_id', empresaId)
    )

    await Promise.all(updates)
  } catch (error) {
    console.error('Erro ao reordenar imagens:', error)
    throw error
  }
}

/**
 * Helper para deletar imagem do storage
 */
async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  try {
    // Extrair caminho do arquivo da URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/vehicle-images/')
    if (pathParts.length < 2) return

    const filePath = pathParts[1]

    await supabase.storage.from('vehicle-images').remove([filePath])
  } catch (error) {
    console.error('Erro ao deletar imagem do storage:', error)
    // Não lançar erro para não bloquear outras operações
  }
}

// ========================================
// ESTATÍSTICAS
// ========================================

/**
 * Obter estatísticas de veículos
 */
export async function getVehicleStats(empresaId: string): Promise<VehicleStats> {
  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('marca_veiculo, ano_veiculo, price_veiculo, promotion_price')
      .eq('empresa_id', empresaId)

    if (error) throw error

    if (!vehicles || vehicles.length === 0) {
      return {
        total_vehicles: 0,
        total_value: 0,
        average_price: 0,
        vehicles_on_promotion: 0,
        vehicles_by_brand: [],
        vehicles_by_year: []
      }
    }

    // Calcular estatísticas
    const totalVehicles = vehicles.length
    const totalValue = vehicles.reduce((sum, v) => sum + (v.price_veiculo || 0), 0)
    const averagePrice = totalValue / totalVehicles
    const vehiclesOnPromotion = vehicles.filter(v => v.promotion_price).length

    // Agrupar por marca
    const brandMap = new Map<string, { count: number; total_value: number }>()
    vehicles.forEach(v => {
      if (!v.marca_veiculo) return
      const current = brandMap.get(v.marca_veiculo) || { count: 0, total_value: 0 }
      brandMap.set(v.marca_veiculo, {
        count: current.count + 1,
        total_value: current.total_value + (v.price_veiculo || 0)
      })
    })

    const vehiclesByBrand = Array.from(brandMap.entries()).map(([brand, stats]) => ({
      brand,
      count: stats.count,
      total_value: stats.total_value
    }))

    // Agrupar por ano
    const yearMap = new Map<number, number>()
    vehicles.forEach(v => {
      if (!v.ano_veiculo) return
      yearMap.set(v.ano_veiculo, (yearMap.get(v.ano_veiculo) || 0) + 1)
    })

    const vehiclesByYear = Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year)

    return {
      total_vehicles: totalVehicles,
      total_value: totalValue,
      average_price: averagePrice,
      vehicles_on_promotion: vehiclesOnPromotion,
      vehicles_by_brand: vehiclesByBrand,
      vehicles_by_year: vehiclesByYear
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    throw error
  }
}

// ========================================
// IMPORTAÇÃO E EXPORTAÇÃO
// ========================================

/**
 * Exportar veículos para CSV
 */
export async function exportVehiclesToCSV(empresaId: string): Promise<string> {
  try {
    const { vehicles } = await getVehicles(empresaId, {}, 10000, 0)

    // Cabeçalhos do CSV
    const headers = [
      'ID',
      'Título',
      'Marca',
      'Modelo',
      'Ano Modelo',
      'Ano Fabricação',
      'Cor',
      'Combustível',
      'Câmbio',
      'Quilometragem',
      'Placa',
      'Preço',
      'Preço Promocional',
      'Acessórios',
      'Data Criação'
    ]

    // Linhas do CSV
    const rows = vehicles.map(v => [
      v.id,
      v.titulo_veiculo || '',
      v.marca_veiculo || '',
      v.modelo_veiculo || '',
      v.ano_veiculo || '',
      v.ano_fabric_veiculo || '',
      v.color_veiculo || '',
      v.combustivel_veiculo || '',
      v.cambio_veiculo || '',
      v.quilometragem_veiculo || '',
      v.plate_veiculo || '',
      v.price_veiculo || '',
      v.promotion_price || '',
      v.accessories_veiculo || '',
      v.created_at
    ])

    // Gerar CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  } catch (error) {
    console.error('Erro ao exportar veículos:', error)
    throw error
  }
}

/**
 * Importar veículos de CSV
 */
export async function importVehiclesFromCSV(
  empresaId: string,
  data: VehicleImportData[]
): Promise<VehicleImportResult> {
  const result: VehicleImportResult = {
    success: 0,
    failed: 0,
    errors: []
  }

  for (let i = 0; i < data.length; i++) {
    try {
      const vehicleData = data[i]

      // Criar veículo
      await createVehicle(empresaId, {
        titulo_veiculo: vehicleData.titulo_veiculo,
        marca_veiculo: vehicleData.marca_veiculo,
        modelo_veiculo: vehicleData.modelo_veiculo,
        ano_veiculo: vehicleData.ano_veiculo,
        ano_fabric_veiculo: vehicleData.ano_fabric_veiculo,
        color_veiculo: vehicleData.color_veiculo,
        combustivel_veiculo: vehicleData.combustivel_veiculo,
        cambio_veiculo: vehicleData.cambio_veiculo,
        quilometragem_veiculo: vehicleData.quilometragem_veiculo,
        plate_veiculo: vehicleData.plate_veiculo,
        price_veiculo: vehicleData.price_veiculo,
        promotion_price: vehicleData.promotion_price,
        accessories_veiculo: vehicleData.accessories_veiculo
      })

      result.success++
    } catch (error) {
      result.failed++
      result.errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  return result
}

/**
 * Obter marcas únicas (para filtros)
 */
export async function getUniqueBrands(empresaId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('marca_veiculo')
      .eq('empresa_id', empresaId)
      .not('marca_veiculo', 'is', null)
      .order('marca_veiculo')

    if (error) throw error

    // Remover duplicatas
    const brands = [...new Set(data.map(v => v.marca_veiculo).filter(Boolean))] as string[]
    return brands
  } catch (error) {
    console.error('Erro ao buscar marcas:', error)
    return []
  }
}

/**
 * Obter tipos de combustível únicos (para filtros)
 */
export async function getUniqueFuelTypes(empresaId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('combustivel_veiculo')
      .eq('empresa_id', empresaId)
      .not('combustivel_veiculo', 'is', null)
      .order('combustivel_veiculo')

    if (error) throw error

    const fuelTypes = [...new Set(data.map(v => v.combustivel_veiculo).filter(Boolean))] as string[]
    return fuelTypes
  } catch (error) {
    console.error('Erro ao buscar tipos de combustível:', error)
    return []
  }
}

/**
 * Obter tipos de câmbio únicos (para filtros)
 */
export async function getUniqueTransmissions(empresaId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('cambio_veiculo')
      .eq('empresa_id', empresaId)
      .not('cambio_veiculo', 'is', null)
      .order('cambio_veiculo')

    if (error) throw error

    const transmissions = [...new Set(data.map(v => v.cambio_veiculo).filter(Boolean))] as string[]
    return transmissions
  } catch (error) {
    console.error('Erro ao buscar tipos de câmbio:', error)
    return []
  }
}

