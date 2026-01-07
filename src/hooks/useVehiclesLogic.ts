import { useState, useEffect, useCallback } from 'react'
import type { Vehicle, VehicleFilters, VehicleStats } from '../types'
import * as vehicleService from '../services/vehicleService'
import { useAuth } from './useAuth'
import { useToast } from '../contexts/ToastContext'

interface UseVehiclesLogicReturn {
  vehicles: Vehicle[]
  loading: boolean
  error: string | null
  total: number
  currentPage: number
  pageSize: number
  filters: VehicleFilters
  stats: VehicleStats | null
  brands: string[]
  fuelTypes: string[]
  transmissions: string[]
  
  // Funções
  setFilters: (filters: VehicleFilters) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  refreshVehicles: () => Promise<void>
  deleteVehicle: (vehicleId: string) => Promise<void>
  loadStats: () => Promise<void>
  exportToCSV: () => Promise<void>
  clearFilters: () => void
}

const defaultFilters: VehicleFilters = {
  search: '',
  marca: [],
  combustivel: [],
  cambio: [],
  sort_by: 'created_desc'
}

export function useVehiclesLogic(): UseVehiclesLogicReturn {
  const { profile } = useAuth()
  const { showToast } = useToast()
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState<VehicleFilters>(defaultFilters)
  const [stats, setStats] = useState<VehicleStats | null>(null)
  const [brands, setBrands] = useState<string[]>([])
  const [fuelTypes, setFuelTypes] = useState<string[]>([])
  const [transmissions, setTransmissions] = useState<string[]>([])

  // Carregar veículos
  const loadVehicles = useCallback(async () => {
    if (!profile?.empresa_id) return

    try {
      setLoading(true)
      setError(null)

      const offset = (currentPage - 1) * pageSize
      const result = await vehicleService.getVehicles(
        profile.empresa_id,
        filters,
        pageSize,
        offset
      )

      setVehicles(result.vehicles)
      setTotal(result.total)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar veículos'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id, currentPage, pageSize, filters, showToast])

  // Carregar estatísticas
  const loadStats = useCallback(async () => {
    if (!profile?.empresa_id) return

    try {
      const statsData = await vehicleService.getVehicleStats(profile.empresa_id)
      setStats(statsData)
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    }
  }, [profile?.empresa_id])

  // Carregar opções de filtros
  const loadFilterOptions = useCallback(async () => {
    if (!profile?.empresa_id) return

    try {
      const [brandsData, fuelTypesData, transmissionsData] = await Promise.all([
        vehicleService.getUniqueBrands(profile.empresa_id),
        vehicleService.getUniqueFuelTypes(profile.empresa_id),
        vehicleService.getUniqueTransmissions(profile.empresa_id)
      ])

      setBrands(brandsData)
      setFuelTypes(fuelTypesData)
      setTransmissions(transmissionsData)
    } catch (err) {
      console.error('Erro ao carregar opções de filtros:', err)
    }
  }, [profile?.empresa_id])

  // Deletar veículo
  const deleteVehicle = useCallback(async (vehicleId: string) => {
    if (!profile?.empresa_id) return

    try {
      await vehicleService.deleteVehicle(vehicleId, profile.empresa_id)
      showToast('Veículo excluído com sucesso!', 'success')
      await loadVehicles()
      await loadStats()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir veículo'
      showToast(message, 'error')
      throw err
    }
  }, [profile?.empresa_id, loadVehicles, loadStats, showToast])

  // Exportar para CSV
  const exportToCSV = useCallback(async () => {
    if (!profile?.empresa_id) return

    try {
      const csvContent = await vehicleService.exportVehiclesToCSV(profile.empresa_id)
      
      // Criar arquivo e fazer download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `veiculos_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToast('Exportação realizada com sucesso!', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao exportar veículos'
      showToast(message, 'error')
    }
  }, [profile?.empresa_id, showToast])

  // Limpar filtros
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
    setCurrentPage(1)
  }, [])

  // Refresh manual
  const refreshVehicles = useCallback(async () => {
    await loadVehicles()
  }, [loadVehicles])

  // Efeito para carregar veículos quando filtros ou página mudarem
  useEffect(() => {
    loadVehicles()
  }, [loadVehicles])

  // Efeito para carregar opções de filtros e estatísticas na montagem
  useEffect(() => {
    loadFilterOptions()
    loadStats()
  }, [loadFilterOptions, loadStats])

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  return {
    vehicles,
    loading,
    error,
    total,
    currentPage,
    pageSize,
    filters,
    stats,
    brands,
    fuelTypes,
    transmissions,
    setFilters,
    setCurrentPage,
    setPageSize,
    refreshVehicles,
    deleteVehicle,
    loadStats,
    exportToCSV,
    clearFilters
  }
}

