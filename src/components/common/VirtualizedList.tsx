import React, { useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight?: number
  height: number
  overscan?: number
  className?: string
  emptyMessage?: string
  loading?: boolean
  error?: string | null
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 80,
  height,
  overscan = 10,
  className = '',
  emptyMessage = 'Nenhum item encontrado',
  loading = false,
  error = null
}: VirtualizedListProps<T>) {
  // Referência para o container da lista
  const parentRef = React.useRef<HTMLDivElement>(null)

  // Configurar o virtualizador
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan
  })

  // Memoizar os itens virtuais para performance
  const virtualItems = useMemo(() => rowVirtualizer.getVirtualItems(), [rowVirtualizer])

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`} 
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`} 
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-red-500 mb-2">Erro ao carregar dados</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`} 
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Hook personalizado para listas virtualizadas com busca
export function useVirtualizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
) {
  return useMemo(() => {
    if (!searchTerm.trim()) {
      return items
    }

    const lowercaseSearch = searchTerm.toLowerCase()
    
    return items.filter(item => {
      return searchFields.some(field => {
        const value = item[field]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowercaseSearch)
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchTerm)
        }
        return false
      })
    })
  }, [items, searchTerm, searchFields])
}

// Componente específico para leads virtualizados
interface VirtualizedLeadsListProps {
  leads: any[]
  onLeadClick?: (lead: any) => void
  onLeadEdit?: (lead: any) => void
  onLeadDelete?: (lead: any) => void
  height: number
  loading?: boolean
  error?: string | null
}

export function VirtualizedLeadsList({
  leads,
  onLeadClick,
  onLeadEdit,
  onLeadDelete,
  height,
  loading = false,
  error = null
}: VirtualizedLeadsListProps) {
  const renderLead = (lead: any, _index: number) => (
    <div className="border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex-1" onClick={() => onLeadClick?.(lead)}>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-medium">
                  {lead.name?.charAt(0)?.toUpperCase() || 'L'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {lead.name}
              </p>
              {lead.company && (
                <p className="text-sm text-gray-500 truncate">
                  {lead.company}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  lead.status === 'quente' ? 'bg-red-100 text-red-800' :
                  lead.status === 'morno' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {lead.status}
                </span>
                {lead.value && (
                  <span className="text-xs text-gray-500">
                    R$ {lead.value.toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onLeadEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onLeadEdit(lead)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onLeadDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onLeadDelete(lead)
              }}
              className="text-gray-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <VirtualizedList
      items={leads}
      renderItem={renderLead}
      itemHeight={88}
      height={height}
      loading={loading}
      error={error}
      emptyMessage="Nenhum lead encontrado"
      className="bg-white border border-gray-200 rounded-lg"
    />
  )
} 