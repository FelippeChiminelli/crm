import { useState, useEffect } from 'react'

interface UseSidebarReturn {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
}

export function useSidebar(): UseSidebarReturn {
  // Estado para mobile (overlay)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Estado para desktop (collapsed/expanded) com persistência
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved ? JSON.parse(saved) : false
  })

  // Persistir estado da sidebar no localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const toggleMobileSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return {
    sidebarOpen,
    sidebarCollapsed,
    setSidebarOpen,
    setSidebarCollapsed,
    toggleSidebar,
    toggleMobileSidebar
  }
} 