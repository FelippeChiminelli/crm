import { useState, useEffect, useCallback } from 'react'
import type { Product, ProductFilters, ProductStats, ProductCategory } from '../types'
import * as productService from '../services/productService'
import { getProductStats, exportProductsToCSV } from '../services/productExportService'
import { getCategories } from '../services/productCategoryService'
import { useAuth } from './useAuth'
import { useToast } from '../contexts/ToastContext'

interface UseProductsLogicReturn {
  products: Product[]
  loading: boolean
  error: string | null
  total: number
  currentPage: number
  pageSize: number
  filters: ProductFilters
  stats: ProductStats | null
  brands: string[]
  categories: ProductCategory[]

  setFilters: (filters: ProductFilters) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  refreshProducts: () => Promise<void>
  deleteProduct: (productId: string) => Promise<void>
  loadStats: () => Promise<void>
  exportToCSV: () => Promise<void>
  clearFilters: () => void
  refreshCategories: () => Promise<void>
}

const defaultFilters: ProductFilters = {
  search: '',
  marca: [],
  status: [],
  sort_by: 'created_desc',
}

export function useProductsLogic(): UseProductsLogicReturn {
  const { profile } = useAuth()
  const { showToast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters)
  const [stats, setStats] = useState<ProductStats | null>(null)
  const [brands, setBrands] = useState<string[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])

  const loadProducts = useCallback(async () => {
    if (!profile?.empresa_id) return
    try {
      setLoading(true)
      setError(null)
      const offset = (currentPage - 1) * pageSize
      const result = await productService.getProducts(profile.empresa_id, filters, pageSize, offset)
      setProducts(result.products)
      setTotal(result.total)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar itens'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id, currentPage, pageSize, filters, showToast])

  const loadStats = useCallback(async () => {
    if (!profile?.empresa_id) return
    try {
      const data = await getProductStats(profile.empresa_id)
      setStats(data)
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    }
  }, [profile?.empresa_id])

  const loadFilterOptions = useCallback(async () => {
    if (!profile?.empresa_id) return
    try {
      const [brandsData, categoriesData] = await Promise.all([
        productService.getUniqueBrands(profile.empresa_id),
        getCategories(profile.empresa_id),
      ])
      setBrands(brandsData)
      setCategories(categoriesData)
    } catch (err) {
      console.error('Erro ao carregar opções de filtros:', err)
    }
  }, [profile?.empresa_id])

  const refreshCategories = useCallback(async () => {
    if (!profile?.empresa_id) return
    const data = await getCategories(profile.empresa_id)
    setCategories(data)
  }, [profile?.empresa_id])

  const deleteProduct = useCallback(async (productId: string) => {
    if (!profile?.empresa_id) return
    try {
      await productService.deleteProduct(productId, profile.empresa_id)
      showToast('Item excluído com sucesso!', 'success')
      await loadProducts()
      await loadStats()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir produto'
      showToast(message, 'error')
      throw err
    }
  }, [profile?.empresa_id, loadProducts, loadStats, showToast])

  const exportToCSV = useCallback(async () => {
    if (!profile?.empresa_id) return
    try {
      const csvContent = await exportProductsToCSV(profile.empresa_id)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.setAttribute('href', URL.createObjectURL(blob))
      link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast('Exportação realizada com sucesso!', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao exportar', 'error')
    }
  }, [profile?.empresa_id, showToast])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
    setCurrentPage(1)
  }, [])

  const refreshProducts = useCallback(async () => {
    await loadProducts()
  }, [loadProducts])

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    loadFilterOptions()
    loadStats()
  }, [loadFilterOptions, loadStats])

  useEffect(() => { setCurrentPage(1) }, [filters])

  return {
    products, loading, error, total, currentPage, pageSize,
    filters, stats, brands, categories,
    setFilters, setCurrentPage, setPageSize,
    refreshProducts, deleteProduct, loadStats,
    exportToCSV, clearFilters, refreshCategories,
  }
}
