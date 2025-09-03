import React, { useState, useEffect, useCallback } from 'react'
import { userHasPermission, getUserPermissions } from '../services/roleService'
import type { Permission } from '../types'

interface UsePermissionsReturn {
  permissions: Permission[]
  loading: boolean
  error: string | null
  hasPermission: (permissionName: string) => boolean
  checkPermission: (permissionName: string) => Promise<boolean>
  refreshPermissions: () => Promise<void>
}

export function usePermissions(): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cache de permissões verificadas para otimizar performance
  const [permissionCache, setPermissionCache] = useState<Map<string, boolean>>(new Map())

  // Carregar permissões do usuário
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: permError } = await getUserPermissions()
      
      if (permError) {
        setError(permError)
        return
      }

      setPermissions(data || [])
      
      // Limpar cache quando recarregar permissões
      setPermissionCache(new Map())
    } catch (err) {
      setError('Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }, [])

  // Verificar permissão específica (local - mais rápido)
  const hasPermission = useCallback((permissionName: string): boolean => {
    // Verificar no cache primeiro
    if (permissionCache.has(permissionName)) {
      return permissionCache.get(permissionName)!
    }

    // Verificar nas permissões carregadas
    const hasLocalPermission = permissions.some(permission => 
      permission.name === permissionName && permission.is_active
    )

    // Salvar no cache
    setPermissionCache(prev => new Map(prev).set(permissionName, hasLocalPermission))

    return hasLocalPermission
  }, [permissions, permissionCache])

  // Verificar permissão específica no servidor (mais preciso)
  const checkPermission = useCallback(async (permissionName: string): Promise<boolean> => {
    try {
      const result = await userHasPermission(permissionName)
      
      // Atualizar cache
      setPermissionCache(prev => new Map(prev).set(permissionName, result))
      
      return result
    } catch (err) {
      console.error('Erro ao verificar permissão:', err)
      return false
    }
  }, [])

  // Recarregar permissões
  const refreshPermissions = useCallback(async () => {
    await loadPermissions()
  }, [loadPermissions])

  // Carregar permissões na inicialização
  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  return {
    permissions,
    loading,
    error,
    hasPermission,
    checkPermission,
    refreshPermissions
  }
}

// Hook específico para verificar uma única permissão
export function usePermission(permissionName: string) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkPermission() {
      try {
        setLoading(true)
        const result = await userHasPermission(permissionName)
        setHasPermission(result)
      } catch (err) {
        setHasPermission(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [permissionName])

  return { hasPermission, loading }
}

// Hook para verificar múltiplas permissões
export function useMultiplePermissions(permissionNames: string[]) {
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkPermissions() {
      try {
        setLoading(true)
        const results: { [key: string]: boolean } = {}

        // Verificar todas as permissões em paralelo
        const checks = permissionNames.map(async (permName) => {
          const result = await userHasPermission(permName)
          results[permName] = result
        })

        await Promise.all(checks)
        setPermissions(results)
      } catch (err) {
        // Em caso de erro, negar todas as permissões
        const deniedResults: { [key: string]: boolean } = {}
        permissionNames.forEach(permName => {
          deniedResults[permName] = false
        })
        setPermissions(deniedResults)
      } finally {
        setLoading(false)
      }
    }

    if (permissionNames.length > 0) {
      checkPermissions()
    } else {
      setLoading(false)
    }
  }, [permissionNames])

  return { permissions, loading }
}

// Componente para renderização condicional baseada em permissões
interface PermissionGateProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

export function PermissionGate({ 
  permission, 
  children, 
  fallback = null, 
  loading: loadingComponent = null 
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermission(permission)

  if (loading) {
    return <>{loadingComponent}</>
  }

  if (hasPermission) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

// Constantes de permissões para facilitar o uso
export const PERMISSIONS = {
  // Leads
  LEADS_VIEW: 'leads.view',
  LEADS_CREATE: 'leads.create',
  LEADS_EDIT: 'leads.edit',
  LEADS_DELETE: 'leads.delete',
  LEADS_EXPORT: 'leads.export',

  // Pipelines
  PIPELINES_VIEW: 'pipelines.view',
  PIPELINES_CREATE: 'pipelines.create',
  PIPELINES_EDIT: 'pipelines.edit',
  PIPELINES_DELETE: 'pipelines.delete',

  // Tarefas
  TASKS_VIEW: 'tasks.view',
  TASKS_CREATE: 'tasks.create',
  TASKS_EDIT: 'tasks.edit',
  TASKS_DELETE: 'tasks.delete',

  // Relatórios
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_ADVANCED: 'reports.advanced',

  // Administração
  ADMIN_USERS: 'admin.users',
  ADMIN_COMPANY: 'admin.company',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_SETTINGS: 'admin.settings',

  // Agenda
  AGENDA_VIEW: 'agenda.view',
  AGENDA_CREATE: 'agenda.create',
  AGENDA_EDIT: 'agenda.edit',
  AGENDA_DELETE: 'agenda.delete'
} as const 