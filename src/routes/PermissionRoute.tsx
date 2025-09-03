import React from 'react'
import { useAuthContext, type UserPermissions } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

interface PermissionRouteProps {
  children: React.ReactNode
  permission?: keyof UserPermissions
  allowedRoles?: ('ADMIN' | 'VENDEDOR')[]
  fallbackPath?: string
  adminOnly?: boolean
  requireAuth?: boolean
}

/**
 * Componente para controlar acesso baseado em permissões
 * 
 * @param children - Componente filho a ser renderizado se tiver permissão
 * @param permission - Permissão específica a verificar
 * @param allowedRoles - Roles permitidas
 * @param fallbackPath - Caminho de redirecionamento se não tiver permissão
 * @param adminOnly - Se apenas admin pode acessar
 * @param requireAuth - Se requer autenticação
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  permission,
  allowedRoles,
  fallbackPath = '/dashboard',
  adminOnly = false,
  requireAuth = true
}) => {
  const { 
    isAuthenticated, 
    loading, 
    userRole, 
    isAdmin, 
    hasPermission 
  } = useAuthContext()

  // Aguardar carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Verificar autenticação
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  // Verificar se é apenas para admin
  if (adminOnly && !isAdmin) {
    return <Navigate to={fallbackPath} replace />
  }

  // Verificar roles permitidas
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to={fallbackPath} replace />
  }

  // Verificar permissão específica
  if (permission && !hasPermission(permission)) {
    return <Navigate to={fallbackPath} replace />
  }

  // Se passou por todas as verificações, renderizar o componente
  return <>{children}</>
}

// Hook para verificar permissões em componentes
export const usePermissionCheck = () => {
  const { 
    isAuthenticated, 
    isAdmin, 
    userRole, 
    hasPermission,
    canAccessPipeline,
    canAccessChatInstance 
  } = useAuthContext()

  const checkPermission = (permission: keyof UserPermissions): boolean => {
    return hasPermission(permission)
  }

  const checkRole = (allowedRoles: ('ADMIN' | 'VENDEDOR')[]): boolean => {
    return userRole ? allowedRoles.includes(userRole) : false
  }

  const checkAdminOnly = (): boolean => {
    return isAdmin
  }

  const checkPipelineAccess = (pipelineId: string): boolean => {
    return canAccessPipeline(pipelineId)
  }

  const checkChatAccess = (instanceId: string): boolean => {
    return canAccessChatInstance(instanceId)
  }

  return {
    isAuthenticated,
    isAdmin,
    userRole,
    checkPermission,
    checkRole,
    checkAdminOnly,
    checkPipelineAccess,
    checkChatAccess
  }
}

// Componente para mostrar/ocultar elementos baseado em permissões
interface ConditionalRenderProps {
  children: React.ReactNode
  permission?: keyof UserPermissions
  allowedRoles?: ('ADMIN' | 'VENDEDOR')[]
  adminOnly?: boolean
  fallback?: React.ReactNode
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  permission,
  allowedRoles,
  adminOnly = false,
  fallback = null
}) => {
  const { checkPermission, checkRole, checkAdminOnly } = usePermissionCheck()

  // Verificar se é apenas para admin
  if (adminOnly && !checkAdminOnly()) {
    return <>{fallback}</>
  }

  // Verificar roles permitidas
  if (allowedRoles && !checkRole(allowedRoles)) {
    return <>{fallback}</>
  }

  // Verificar permissão específica
  if (permission && !checkPermission(permission)) {
    return <>{fallback}</>
  }

  // Se passou por todas as verificações, renderizar o componente
  return <>{children}</>
}
