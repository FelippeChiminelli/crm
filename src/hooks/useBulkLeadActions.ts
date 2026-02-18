import { useState, useCallback, useRef } from 'react'
import {
  getFilteredLeadIds,
  bulkMoveLeads,
  bulkAddTags,
  type GetLeadsParams,
  type BulkMoveResult,
  type BulkTagsResult
} from '../services/leadService'

export interface BulkProgress {
  current: number
  total: number
}

interface UseBulkLeadActionsReturn {
  selectedIds: Set<string>
  selectedCount: number
  isProcessing: boolean
  progress: BulkProgress | null
  isSelectAllFiltered: boolean
  allFilteredCount: number | null
  toggleSelect: (id: string) => void
  selectAllVisible: (leadIds: string[]) => void
  deselectAllVisible: (leadIds: string[]) => void
  selectAllFiltered: (filters: Omit<GetLeadsParams, 'page' | 'limit'>) => Promise<void>
  clearSelection: () => void
  isSelected: (id: string) => boolean
  executeBulkMove: (pipelineId: string, stageId: string) => Promise<BulkMoveResult>
  executeBulkAddTags: (tags: string[]) => Promise<BulkTagsResult>
}

export function useBulkLeadActions(): UseBulkLeadActionsReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BulkProgress | null>(null)
  const [isSelectAllFiltered, setIsSelectAllFiltered] = useState(false)
  const [allFilteredCount, setAllFilteredCount] = useState<number | null>(null)
  const abortRef = useRef(false)

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setIsSelectAllFiltered(false)
  }, [])

  const selectAllVisible = useCallback((leadIds: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      leadIds.forEach(id => next.add(id))
      return next
    })
  }, [])

  const deselectAllVisible = useCallback((leadIds: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      leadIds.forEach(id => next.delete(id))
      return next
    })
  }, [])

  const selectAllFiltered = useCallback(async (filters: Omit<GetLeadsParams, 'page' | 'limit'>) => {
    try {
      const ids = await getFilteredLeadIds(filters)
      setSelectedIds(new Set(ids))
      setIsSelectAllFiltered(true)
      setAllFilteredCount(ids.length)
    } catch {
      throw new Error('Erro ao buscar leads do filtro')
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setIsSelectAllFiltered(false)
    setAllFilteredCount(null)
    setProgress(null)
  }, [])

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id)
  }, [selectedIds])

  const executeBulkMove = useCallback(async (pipelineId: string, stageId: string): Promise<BulkMoveResult> => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      return { success: 0, failed: 0, errors: [] }
    }

    setIsProcessing(true)
    setProgress({ current: 0, total: ids.length })
    abortRef.current = false

    try {
      const result = await bulkMoveLeads(ids, pipelineId, stageId, (current, total) => {
        setProgress({ current, total })
      })
      clearSelection()
      return result
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [selectedIds, clearSelection])

  const executeBulkAddTags = useCallback(async (tags: string[]): Promise<BulkTagsResult> => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0 || tags.length === 0) {
      return { success: 0, failed: 0, errors: [] }
    }

    setIsProcessing(true)
    setProgress({ current: 0, total: ids.length })
    abortRef.current = false

    try {
      const result = await bulkAddTags(ids, tags, (current, total) => {
        setProgress({ current, total })
      })
      clearSelection()
      return result
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [selectedIds, clearSelection])

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isProcessing,
    progress,
    isSelectAllFiltered,
    allFilteredCount,
    toggleSelect,
    selectAllVisible,
    deselectAllVisible,
    selectAllFiltered,
    clearSelection,
    isSelected,
    executeBulkMove,
    executeBulkAddTags
  }
}
