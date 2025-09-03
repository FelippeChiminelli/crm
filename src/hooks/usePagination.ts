import { useState, useMemo } from 'react'

export interface PaginationConfig {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UsePaginationProps {
  initialPage?: number
  initialLimit?: number
}

export interface UsePaginationReturn {
  pagination: PaginationConfig
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setTotal: (total: number) => void
  nextPage: () => void
  prevPage: () => void
  canNextPage: boolean
  canPrevPage: boolean
  getOffset: () => number
  reset: () => void
}

export function usePagination({ 
  initialPage = 1, 
  initialLimit = 25 
}: UsePaginationProps = {}): UsePaginationReturn {
  const [page, setPageState] = useState(initialPage)
  const [limit, setLimitState] = useState(initialLimit)
  const [total, setTotalState] = useState(0)

  const pagination = useMemo((): PaginationConfig => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1
  }), [page, limit, total])

  const setPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPageState(newPage)
    }
  }

  const setLimit = (newLimit: number) => {
    if (newLimit > 0) {
      setLimitState(newLimit)
      setPageState(1) // Reset to first page when changing limit
    }
  }

  const setTotal = (newTotal: number) => {
    setTotalState(Math.max(0, newTotal))
  }

  const nextPage = () => {
    setPage(page + 1)
  }

  const prevPage = () => {
    setPage(page - 1)
  }

  const canNextPage = page < pagination.totalPages
  const canPrevPage = page > 1

  const getOffset = () => (page - 1) * limit

  const reset = () => {
    setPageState(initialPage)
    setLimitState(initialLimit)
    setTotalState(0)
  }

  return {
    pagination,
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    canNextPage,
    canPrevPage,
    getOffset,
    reset
  }
} 