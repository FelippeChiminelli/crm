import { useState, useCallback } from 'react'
import {
  bulkDeleteTasks,
  bulkUpdateTasksStatus,
  bulkUpdateTasksAssignee,
  type BulkTaskResult
} from '../services/taskService'
import type { TaskStatus } from '../types'

export interface BulkProgress {
  current: number
  total: number
}

interface UseBulkTaskActionsReturn {
  selectedIds: Set<string>
  selectedCount: number
  isProcessing: boolean
  progress: BulkProgress | null
  isSelectAllFiltered: boolean
  allFilteredCount: number | null
  toggleSelect: (id: string) => void
  selectAllVisible: (taskIds: string[]) => void
  deselectAllVisible: (taskIds: string[]) => void
  selectAllFiltered: (filteredIds: string[]) => void
  clearSelection: () => void
  isSelected: (id: string) => boolean
  executeBulkDelete: () => Promise<BulkTaskResult>
  executeBulkUpdateStatus: (status: TaskStatus) => Promise<BulkTaskResult>
  executeBulkUpdateAssignee: (assignedTo: string | null) => Promise<BulkTaskResult>
}

export function useBulkTaskActions(): UseBulkTaskActionsReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BulkProgress | null>(null)
  const [isSelectAllFiltered, setIsSelectAllFiltered] = useState(false)
  const [allFilteredCount, setAllFilteredCount] = useState<number | null>(null)

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

  const selectAllVisible = useCallback((taskIds: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      taskIds.forEach(id => next.add(id))
      return next
    })
  }, [])

  const deselectAllVisible = useCallback((taskIds: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      taskIds.forEach(id => next.delete(id))
      return next
    })
  }, [])

  const selectAllFiltered = useCallback((filteredIds: string[]) => {
    setSelectedIds(new Set(filteredIds))
    setIsSelectAllFiltered(true)
    setAllFilteredCount(filteredIds.length)
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

  const executeBulkDelete = useCallback(async (): Promise<BulkTaskResult> => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      return { success: 0, failed: 0, errors: [] }
    }

    setIsProcessing(true)
    setProgress({ current: 0, total: ids.length })

    try {
      const result = await bulkDeleteTasks(ids, (current, total) => {
        setProgress({ current, total })
      })
      clearSelection()
      return result
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [selectedIds, clearSelection])

  const executeBulkUpdateStatus = useCallback(async (status: TaskStatus): Promise<BulkTaskResult> => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      return { success: 0, failed: 0, errors: [] }
    }

    setIsProcessing(true)
    setProgress({ current: 0, total: ids.length })

    try {
      const result = await bulkUpdateTasksStatus(ids, status, (current, total) => {
        setProgress({ current, total })
      })
      clearSelection()
      return result
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [selectedIds, clearSelection])

  const executeBulkUpdateAssignee = useCallback(async (assignedTo: string | null): Promise<BulkTaskResult> => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      return { success: 0, failed: 0, errors: [] }
    }

    setIsProcessing(true)
    setProgress({ current: 0, total: ids.length })

    try {
      const result = await bulkUpdateTasksAssignee(ids, assignedTo, (current, total) => {
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
    executeBulkDelete,
    executeBulkUpdateStatus,
    executeBulkUpdateAssignee
  }
}
