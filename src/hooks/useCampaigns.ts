import { useState, useEffect, useCallback } from 'react'
import type {
  WhatsAppCampaign,
  WhatsAppCampaignLog,
  CreateWhatsAppCampaignData,
  UpdateWhatsAppCampaignData,
  WhatsAppCampaignStats
} from '../types'
import * as campaignService from '../services/campaignService'
import { useToastContext } from '../contexts/ToastContext'
import SecureLogger from '../utils/logger'

interface UseCampaignsReturn {
  campaigns: WhatsAppCampaign[]
  loading: boolean
  error: string | null
  stats: WhatsAppCampaignStats | null
  
  // CRUD operations
  fetchCampaigns: () => Promise<void>
  createCampaign: (data: CreateWhatsAppCampaignData) => Promise<WhatsAppCampaign | null>
  updateCampaign: (id: string, data: UpdateWhatsAppCampaignData) => Promise<WhatsAppCampaign | null>
  deleteCampaign: (id: string) => Promise<boolean>
  
  // Campaign operations
  startCampaign: (id: string) => Promise<boolean>
  pauseCampaign: (id: string) => Promise<boolean>
  resumeCampaign: (id: string) => Promise<boolean>
  
  // Details
  getCampaignDetails: (id: string) => Promise<WhatsAppCampaign | null>
  getLogs: (campaignId: string) => Promise<WhatsAppCampaignLog[]>
  
  // Stats
  fetchStats: () => Promise<void>
}

/**
 * Hook customizado para gerenciar campanhas de WhatsApp
 */
export function useCampaigns(): UseCampaignsReturn {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<WhatsAppCampaignStats | null>(null)
  const toast = useToastContext()

  /**
   * Busca todas as campanhas
   */
  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await campaignService.listCampaigns()
      setCampaigns(data)
      SecureLogger.info('Campanhas carregadas com sucesso', { count: data.length })
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao carregar campanhas'
      setError(errorMsg)
      toast.showError('Erro', errorMsg)
      SecureLogger.error('Erro ao carregar campanhas', { error: err })
    } finally {
      setLoading(false)
    }
  }, [toast])

  /**
   * Busca estatísticas gerais
   */
  const fetchStats = useCallback(async () => {
    try {
      const data = await campaignService.getCampaignStats()
      setStats(data)
    } catch (err: any) {
      SecureLogger.error('Erro ao carregar estatísticas', { error: err })
    }
  }, [])

  /**
   * Cria uma nova campanha
   */
  const createCampaign = useCallback(async (data: CreateWhatsAppCampaignData): Promise<WhatsAppCampaign | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const newCampaign = await campaignService.createCampaign(data)
      setCampaigns(prev => [newCampaign, ...prev])
      toast.showSuccess('Sucesso', 'Campanha criada com sucesso!')
      SecureLogger.info('Campanha criada', { campaignId: newCampaign.id })
      return newCampaign
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao criar campanha'
      setError(errorMsg)
      toast.showError('Erro', errorMsg)
      SecureLogger.error('Erro ao criar campanha', { error: err })
      return null
    } finally {
      setLoading(false)
    }
  }, [toast])

  /**
   * Atualiza uma campanha existente
   */
  const updateCampaign = useCallback(async (
    id: string, 
    data: UpdateWhatsAppCampaignData
  ): Promise<WhatsAppCampaign | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedCampaign = await campaignService.updateCampaign(id, data)
      setCampaigns(prev => prev.map(c => c.id === id ? updatedCampaign : c))
      toast.showSuccess('Sucesso', 'Campanha atualizada com sucesso!')
      SecureLogger.info('Campanha atualizada', { campaignId: id })
      return updatedCampaign
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar campanha'
      setError(errorMsg)
      toast.showError('Erro', errorMsg)
      SecureLogger.error('Erro ao atualizar campanha', { error: err, campaignId: id })
      return null
    } finally {
      setLoading(false)
    }
  }, [toast])

  /**
   * Deleta uma campanha
   */
  const deleteCampaign = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      await campaignService.deleteCampaign(id)
      setCampaigns(prev => prev.filter(c => c.id !== id))
      toast.showSuccess('Sucesso', 'Campanha excluída com sucesso!')
      SecureLogger.info('Campanha deletada', { campaignId: id })
      return true
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao excluir campanha'
      setError(errorMsg)
      toast.showError('Erro', errorMsg)
      SecureLogger.error('Erro ao excluir campanha', { error: err, campaignId: id })
      return false
    } finally {
      setLoading(false)
    }
  }, [toast])

  /**
   * Inicia a execução de uma campanha
   */
  const startCampaign = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      await campaignService.startCampaign(id)
      
      // Recarregar campanhas do banco para pegar o status atualizado
      await fetchCampaigns()
      
      toast.showSuccess('Sucesso', 'Campanha iniciada com sucesso!')
      SecureLogger.info('Campanha iniciada', { campaignId: id })
      return true
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao iniciar campanha'
      setError(errorMsg)
      toast.showError('Erro', errorMsg)
      SecureLogger.error('Erro ao iniciar campanha', { error: err, campaignId: id })
      
      // Recarregar para garantir que o status está correto
      await fetchCampaigns()
      
      return false
    } finally {
      setLoading(false)
    }
  }, [toast, fetchCampaigns])

  /**
   * Pausa uma campanha em execução
   * n8n criará o log de 'paused'
   */
  const pauseCampaign = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      await campaignService.pauseCampaign(id)
      
      // Recarregar campanhas do banco para pegar o status atualizado
      await fetchCampaigns()
      
      toast.showSuccess('Sucesso', 'Campanha pausada com sucesso!')
      SecureLogger.info('Campanha pausada', { campaignId: id })
      return true
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao pausar campanha'
      setError(errorMsg)
      toast.showError('Erro', errorMsg)
      SecureLogger.error('Erro ao pausar campanha', { error: err, campaignId: id })
      
      // Recarregar para garantir que o status está correto
      await fetchCampaigns()
      
      return false
    } finally {
      setLoading(false)
    }
  }, [toast, fetchCampaigns])

  /**
   * Retoma uma campanha pausada
   * Frontend cria o log de 'resumed'
   */
  const resumeCampaign = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      await campaignService.resumeCampaign(id)
      
      // Recarregar campanhas do banco para pegar o status atualizado
      await fetchCampaigns()
      
      toast.showSuccess('Sucesso', 'Campanha retomada com sucesso!')
      SecureLogger.info('Campanha retomada', { campaignId: id })
      return true
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao retomar campanha'
      setError(errorMsg)
      toast.showError('Erro', errorMsg)
      SecureLogger.error('Erro ao retomar campanha', { error: err, campaignId: id })
      
      // Recarregar para garantir que o status está correto
      await fetchCampaigns()
      
      return false
    } finally {
      setLoading(false)
    }
  }, [toast, fetchCampaigns])

  /**
   * Busca detalhes de uma campanha
   */
  const getCampaignDetails = useCallback(async (id: string): Promise<WhatsAppCampaign | null> => {
    try {
      const campaign = await campaignService.getCampaignById(id)
      return campaign
    } catch (err: any) {
      SecureLogger.error('Erro ao buscar detalhes da campanha', { error: err, campaignId: id })
      return null
    }
  }, [])

  /**
   * Busca logs de uma campanha
   */
  const getLogs = useCallback(async (campaignId: string): Promise<WhatsAppCampaignLog[]> => {
    try {
      const logs = await campaignService.getCampaignLogs(campaignId)
      return logs
    } catch (err: any) {
      SecureLogger.error('Erro ao buscar logs', { error: err, campaignId })
      toast.showError('Erro', 'Erro ao carregar logs')
      return []
    }
  }, [toast])

  // Carregar campanhas e stats no mount
  useEffect(() => {
    fetchCampaigns()
    fetchStats()
  }, [fetchCampaigns, fetchStats])

  // Polling para atualizar campanhas em execução (a cada 10 segundos)
  useEffect(() => {
    const hasRunningCampaigns = campaigns.some(c => c.status === 'running')
    
    if (!hasRunningCampaigns) {
      return
    }
    
    const interval = setInterval(() => {
      fetchCampaigns()
      fetchStats()
    }, 10000) // 10 segundos
    
    return () => clearInterval(interval)
  }, [campaigns, fetchCampaigns, fetchStats])

  return {
    campaigns,
    loading,
    error,
    stats,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    getCampaignDetails,
    getLogs,
    fetchStats
  }
}

