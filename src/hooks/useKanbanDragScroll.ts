import { useRef, useState, useCallback, useEffect } from 'react'

interface UseKanbanDragScrollOptions {
  enabled?: boolean
}

export function useKanbanDragScroll({ enabled = true }: UseKanbanDragScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const dragStartRef = useRef<{ x: number; scrollLeft: number } | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Não iniciar drag se estiver clicando em um elemento interativo ou em um card
    const target = e.target as HTMLElement
    
    // Verificar se é um elemento interativo
    const isInteractiveElement = 
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('a') ||
      target.closest('[role="button"]')
    
    // Verificar se está dentro de um card (cards têm cursor-move e estão dentro de StageColumn)
    // O container principal tem overflow-x-auto, então verificamos se NÃO está dentro de um card
    const isCard = target.closest('.cursor-move') || 
                   target.closest('[data-sortable-id]') ||
                   target.closest('[data-dnd-kit-sortable]')
    
    if (isInteractiveElement || isCard) {
      return
    }

    if (!enabled || !containerRef.current) return

    e.preventDefault()
    setIsDragging(true)

    const container = containerRef.current
    dragStartRef.current = {
      x: e.clientX,
      scrollLeft: container.scrollLeft
    }

    // Mudar cursor para grabbing
    container.style.cursor = 'grabbing'
    container.style.userSelect = 'none'
  }, [enabled])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return

    const container = containerRef.current
    const deltaX = e.clientX - dragStartRef.current.x
    container.scrollLeft = dragStartRef.current.scrollLeft - deltaX
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)
    dragStartRef.current = null

    if (containerRef.current) {
      containerRef.current.style.cursor = isHovering ? 'grab' : 'default'
      containerRef.current.style.userSelect = ''
    }
  }, [isDragging, isHovering])

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || isDragging) return
    
    // Verificar se o mouse está sobre um elemento interativo
    const target = e.target as HTMLElement
    const isInteractiveElement = 
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('a') ||
      target.closest('[role="button"]') ||
      target.closest('.cursor-move') ||
      target.closest('[data-sortable-id]') ||
      target.closest('[data-dnd-kit-sortable]')
    
    if (isInteractiveElement) {
      return
    }
    
    setIsHovering(true)
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
    }
  }, [enabled, isDragging])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    if (!isDragging && containerRef.current) {
      containerRef.current.style.cursor = 'default'
    }
  }, [isDragging])

  // Adicionar event listeners globais para mouse move e up
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return {
    containerRef,
    isDragging,
    isHovering,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    }
  }
}

