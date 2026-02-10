import { useState, useEffect, useCallback, useRef } from 'react'
import { useToastContext } from '../../../contexts/ToastContext'
import type {
  CustomDashboard,
  DashboardWidget,
  CreateCustomDashboardData,
  UpdateCustomDashboardData,
  CreateDashboardWidgetData,
  UpdateDashboardWidgetData,
  AnalyticsPeriod
} from '../../../types'
import {
  getCustomDashboards,
  getCustomDashboardById,
  createCustomDashboard,
  updateCustomDashboard,
  deleteCustomDashboard,
  duplicateCustomDashboard,
  createDashboardWidget,
  updateDashboardWidget,
  updateWidgetPositions,
  deleteDashboardWidget,
  createDashboardShare,
  updateDashboardShare,
  deleteDashboardShare,
  shareWithCompany,
  unshareWithCompany,
  setDefaultDashboard
} from '../../../services/customDashboardService'

interface UseCustomDashboardReturn {
  // Estados
  dashboards: CustomDashboard[]
  activeDashboard: CustomDashboard | null
  loading: boolean
  saving: boolean
  
  // Ações de Dashboard
  loadDashboards: () => Promise<void>
  selectDashboard: (id: string) => Promise<void>
  createDashboard: (data: CreateCustomDashboardData) => Promise<CustomDashboard>
  updateDashboard: (id: string, data: UpdateCustomDashboardData) => Promise<void>
  deleteDashboard: (id: string) => Promise<void>
  duplicateDashboard: (id: string) => Promise<CustomDashboard>
  setAsDefault: (id: string) => Promise<void>
  
  // Ações de Widget
  addWidget: (data: Omit<CreateDashboardWidgetData, 'dashboard_id'>) => Promise<DashboardWidget>
  updateWidget: (id: string, data: UpdateDashboardWidgetData) => Promise<void>
  removeWidget: (id: string) => Promise<void>
  updateWidgetLayout: (widgets: Array<{ id: string; position_x: number; position_y: number; width: number; height: number }>) => Promise<void>
  
  // Ações de Compartilhamento
  shareWithUser: (userId: string, permission: 'view' | 'edit') => Promise<void>
  shareWithAll: (permission: 'view' | 'edit') => Promise<void>
  updateSharePermission: (shareId: string, permission: 'view' | 'edit') => Promise<void>
  removeShare: (shareId: string) => Promise<void>
  removeShareAll: () => Promise<void>
  
  // Permissões
  canEdit: boolean
  isOwner: boolean
  
  // Período do dashboard
  period: AnalyticsPeriod
  setPeriod: (period: AnalyticsPeriod) => void
}

export function useCustomDashboard(): UseCustomDashboardReturn {
  const { showSuccess, showError } = useToastContext()
  
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([])
  const [activeDashboard, setActiveDashboard] = useState<CustomDashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Período padrão: últimos 30 dias
  const [period, setPeriod] = useState<AnalyticsPeriod>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  })
  
  // Ref para evitar múltiplas chamadas
  const loadingRef = useRef(false)
  
  // Carregar dashboards
  const loadDashboards = useCallback(async () => {
    if (loadingRef.current) return
    
    try {
      loadingRef.current = true
      setLoading(true)
      
      const data = await getCustomDashboards()
      setDashboards(data)
      
      // Se não tem dashboard ativo, tentar carregar o default ou o primeiro
      if (!activeDashboard && data.length > 0) {
        const defaultDb = data.find(d => d.is_default)
        setActiveDashboard(defaultDb || data[0])
      }
    } catch (error) {
      console.error('Erro ao carregar dashboards:', error)
      showError('Erro ao carregar dashboards personalizados')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [activeDashboard, showError])
  
  // Selecionar dashboard
  const selectDashboard = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const dashboard = await getCustomDashboardById(id)
      if (dashboard) {
        setActiveDashboard(dashboard)
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      showError('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }, [showError])
  
  // Criar dashboard
  const handleCreateDashboard = useCallback(async (data: CreateCustomDashboardData) => {
    try {
      setSaving(true)
      const newDashboard = await createCustomDashboard(data)
      setDashboards(prev => [newDashboard, ...prev])
      setActiveDashboard(newDashboard)
      showSuccess('Dashboard criado com sucesso!')
      return newDashboard
    } catch (error) {
      console.error('Erro ao criar dashboard:', error)
      showError('Erro ao criar dashboard')
      throw error
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])
  
  // Atualizar dashboard
  const handleUpdateDashboard = useCallback(async (id: string, data: UpdateCustomDashboardData) => {
    try {
      setSaving(true)
      const updated = await updateCustomDashboard(id, data)
      setDashboards(prev => prev.map(d => d.id === id ? updated : d))
      if (activeDashboard?.id === id) {
        setActiveDashboard(updated)
      }
      showSuccess('Dashboard atualizado!')
    } catch (error) {
      console.error('Erro ao atualizar dashboard:', error)
      showError('Erro ao atualizar dashboard')
      throw error
    } finally {
      setSaving(false)
    }
  }, [activeDashboard, showSuccess, showError])
  
  // Deletar dashboard
  const handleDeleteDashboard = useCallback(async (id: string) => {
    try {
      setSaving(true)
      await deleteCustomDashboard(id)
      setDashboards(prev => prev.filter(d => d.id !== id))
      
      // Se deletou o ativo, selecionar outro
      if (activeDashboard?.id === id) {
        const remaining = dashboards.filter(d => d.id !== id)
        setActiveDashboard(remaining[0] || null)
      }
      
      showSuccess('Dashboard excluído!')
    } catch (error) {
      console.error('Erro ao excluir dashboard:', error)
      showError('Erro ao excluir dashboard')
      throw error
    } finally {
      setSaving(false)
    }
  }, [activeDashboard, dashboards, showSuccess, showError])
  
  // Duplicar dashboard
  const handleDuplicateDashboard = useCallback(async (id: string) => {
    try {
      setSaving(true)
      const duplicated = await duplicateCustomDashboard(id)
      setDashboards(prev => [duplicated, ...prev])
      setActiveDashboard(duplicated)
      showSuccess('Dashboard duplicado!')
      return duplicated
    } catch (error) {
      console.error('Erro ao duplicar dashboard:', error)
      showError('Erro ao duplicar dashboard')
      throw error
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])
  
  // Definir como padrão
  const handleSetAsDefault = useCallback(async (id: string) => {
    try {
      setSaving(true)
      await setDefaultDashboard(id)
      setDashboards(prev => prev.map(d => ({
        ...d,
        is_default: d.id === id
      })))
      if (activeDashboard) {
        setActiveDashboard(prev => prev ? { ...prev, is_default: prev.id === id } : null)
      }
      showSuccess('Dashboard definido como padrão!')
    } catch (error) {
      console.error('Erro ao definir dashboard padrão:', error)
      showError('Erro ao definir dashboard padrão')
      throw error
    } finally {
      setSaving(false)
    }
  }, [activeDashboard, showSuccess, showError])
  
  // =====================================================
  // WIDGETS
  // =====================================================
  
  // Adicionar widget
  const handleAddWidget = useCallback(async (data: Omit<CreateDashboardWidgetData, 'dashboard_id'>) => {
    if (!activeDashboard) throw new Error('Nenhum dashboard selecionado')
    
    try {
      setSaving(true)
      const newWidget = await createDashboardWidget({
        ...data,
        dashboard_id: activeDashboard.id
      })
      
      setActiveDashboard(prev => {
        if (!prev) return null
        return {
          ...prev,
          widgets: [...(prev.widgets || []), newWidget]
        }
      })
      
      showSuccess('Widget adicionado!')
      return newWidget
    } catch (error) {
      console.error('Erro ao adicionar widget:', error)
      showError('Erro ao adicionar widget')
      throw error
    } finally {
      setSaving(false)
    }
  }, [activeDashboard, showSuccess, showError])
  
  // Atualizar widget
  const handleUpdateWidget = useCallback(async (id: string, data: UpdateDashboardWidgetData) => {
    try {
      setSaving(true)
      const updated = await updateDashboardWidget(id, data)
      
      setActiveDashboard(prev => {
        if (!prev) return null
        return {
          ...prev,
          widgets: (prev.widgets || []).map(w => w.id === id ? updated : w)
        }
      })
    } catch (error) {
      console.error('Erro ao atualizar widget:', error)
      showError('Erro ao atualizar widget')
      throw error
    } finally {
      setSaving(false)
    }
  }, [showError])
  
  // Remover widget
  const handleRemoveWidget = useCallback(async (id: string) => {
    try {
      setSaving(true)
      await deleteDashboardWidget(id)
      
      setActiveDashboard(prev => {
        if (!prev) return null
        return {
          ...prev,
          widgets: (prev.widgets || []).filter(w => w.id !== id)
        }
      })
      
      showSuccess('Widget removido!')
    } catch (error) {
      console.error('Erro ao remover widget:', error)
      showError('Erro ao remover widget')
      throw error
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])
  
  // Atualizar layout dos widgets (drag & drop / resize)
  const handleUpdateWidgetLayout = useCallback(async (
    widgets: Array<{ id: string; position_x: number; position_y: number; width: number; height: number }>
  ) => {
    try {
      // Atualizar estado local imediatamente (optimistic update)
      // Reordenar o array para seguir a ordem do parâmetro (após drag & drop)
      setActiveDashboard(prev => {
        if (!prev) return null
        const prevWidgets = prev.widgets || []
        
        // Criar array reordenado: seguir a ordem do parâmetro widgets
        const reordered = widgets
          .map(u => {
            const existing = prevWidgets.find(w => w.id === u.id)
            if (!existing) return null
            return {
              ...existing,
              position_x: u.position_x,
              position_y: u.position_y,
              width: u.width,
              height: u.height
            }
          })
          .filter(Boolean) as typeof prevWidgets

        // Adicionar widgets que não estavam no parâmetro (caso edge)
        prevWidgets.forEach(w => {
          if (!reordered.find(r => r.id === w.id)) {
            reordered.push(w)
          }
        })

        return { ...prev, widgets: reordered }
      })
      
      // Salvar no backend
      await updateWidgetPositions(widgets)
    } catch (error) {
      console.error('Erro ao atualizar layout:', error)
      // Recarregar para reverter em caso de erro
      if (activeDashboard) {
        await selectDashboard(activeDashboard.id)
      }
    }
  }, [activeDashboard, selectDashboard])
  
  // =====================================================
  // COMPARTILHAMENTO
  // =====================================================
  
  // Compartilhar com usuário
  const handleShareWithUser = useCallback(async (userId: string, permission: 'view' | 'edit') => {
    if (!activeDashboard) throw new Error('Nenhum dashboard selecionado')
    
    try {
      setSaving(true)
      const newShare = await createDashboardShare({
        dashboard_id: activeDashboard.id,
        shared_with_user_id: userId,
        permission
      })
      
      setActiveDashboard(prev => {
        if (!prev) return null
        return {
          ...prev,
          shares: [...(prev.shares || []), newShare]
        }
      })
      
      showSuccess('Dashboard compartilhado!')
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
      showError('Erro ao compartilhar dashboard')
      throw error
    } finally {
      setSaving(false)
    }
  }, [activeDashboard, showSuccess, showError])
  
  // Compartilhar com toda empresa
  const handleShareWithAll = useCallback(async (permission: 'view' | 'edit') => {
    if (!activeDashboard) throw new Error('Nenhum dashboard selecionado')
    
    try {
      setSaving(true)
      const newShare = await shareWithCompany(activeDashboard.id, permission)
      
      setActiveDashboard(prev => {
        if (!prev) return null
        // Remover share antigo com all e adicionar novo
        const shares = (prev.shares || []).filter(s => !s.shared_with_all)
        return {
          ...prev,
          shares: [...shares, newShare]
        }
      })
      
      showSuccess('Dashboard compartilhado com a empresa!')
    } catch (error) {
      console.error('Erro ao compartilhar com empresa:', error)
      showError('Erro ao compartilhar dashboard')
      throw error
    } finally {
      setSaving(false)
    }
  }, [activeDashboard, showSuccess, showError])
  
  // Atualizar permissão de compartilhamento
  const handleUpdateSharePermission = useCallback(async (shareId: string, permission: 'view' | 'edit') => {
    try {
      setSaving(true)
      const updated = await updateDashboardShare(shareId, { permission })
      
      setActiveDashboard(prev => {
        if (!prev) return null
        return {
          ...prev,
          shares: (prev.shares || []).map(s => s.id === shareId ? updated : s)
        }
      })
    } catch (error) {
      console.error('Erro ao atualizar permissão:', error)
      showError('Erro ao atualizar permissão')
      throw error
    } finally {
      setSaving(false)
    }
  }, [showError])
  
  // Remover compartilhamento
  const handleRemoveShare = useCallback(async (shareId: string) => {
    try {
      setSaving(true)
      await deleteDashboardShare(shareId)
      
      setActiveDashboard(prev => {
        if (!prev) return null
        return {
          ...prev,
          shares: (prev.shares || []).filter(s => s.id !== shareId)
        }
      })
      
      showSuccess('Compartilhamento removido!')
    } catch (error) {
      console.error('Erro ao remover compartilhamento:', error)
      showError('Erro ao remover compartilhamento')
      throw error
    } finally {
      setSaving(false)
    }
  }, [showSuccess, showError])
  
  // Remover compartilhamento com toda empresa
  const handleRemoveShareAll = useCallback(async () => {
    if (!activeDashboard) throw new Error('Nenhum dashboard selecionado')
    
    try {
      setSaving(true)
      await unshareWithCompany(activeDashboard.id)
      
      setActiveDashboard(prev => {
        if (!prev) return null
        return {
          ...prev,
          shares: (prev.shares || []).filter(s => !s.shared_with_all)
        }
      })
      
      showSuccess('Compartilhamento com empresa removido!')
    } catch (error) {
      console.error('Erro ao remover compartilhamento:', error)
      showError('Erro ao remover compartilhamento')
      throw error
    } finally {
      setSaving(false)
    }
  }, [activeDashboard, showSuccess, showError])
  
  // Permissões
  const canEdit = activeDashboard?.user_permission === 'owner' || activeDashboard?.user_permission === 'edit'
  const isOwner = activeDashboard?.user_permission === 'owner'
  
  // Carregar dashboards na montagem
  useEffect(() => {
    loadDashboards()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    // Estados
    dashboards,
    activeDashboard,
    loading,
    saving,
    
    // Ações de Dashboard
    loadDashboards,
    selectDashboard,
    createDashboard: handleCreateDashboard,
    updateDashboard: handleUpdateDashboard,
    deleteDashboard: handleDeleteDashboard,
    duplicateDashboard: handleDuplicateDashboard,
    setAsDefault: handleSetAsDefault,
    
    // Ações de Widget
    addWidget: handleAddWidget,
    updateWidget: handleUpdateWidget,
    removeWidget: handleRemoveWidget,
    updateWidgetLayout: handleUpdateWidgetLayout,
    
    // Ações de Compartilhamento
    shareWithUser: handleShareWithUser,
    shareWithAll: handleShareWithAll,
    updateSharePermission: handleUpdateSharePermission,
    removeShare: handleRemoveShare,
    removeShareAll: handleRemoveShareAll,
    
    // Permissões
    canEdit,
    isOwner,
    
    // Período
    period,
    setPeriod
  }
}
